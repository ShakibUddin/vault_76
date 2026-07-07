import { NextRequest, NextResponse } from "next/server";
import mongoose, { PipelineStage, Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Rental from "@/models/Rental";
import Equipment from "@/models/Equipment";
import Customer from "@/models/Customer";
import { getAuthUser } from "@/lib/auth";

const ACTIVE_STATUSES = ["Reserved", "Rented"] as const;

type Conflict = {
    status: number;
    message: string;
};

function daysBetween(start: Date, end: Date) {
    const ms = end.getTime() - start.getTime();
    return Math.max(Math.ceil(ms / (1000 * 60 * 60 * 24)), 1);
}

export async function GET(request: NextRequest) {
    try {
        const authUser = await getAuthUser();

        if (!authUser) {
            return NextResponse.json(
                { message: "Not authenticated." },
                { status: 401 }
            );
        }

        const { searchParams } = new URL(request.url);

        const pageIndex = Math.max(
            Number(searchParams.get("pageIndex") ?? 0),
            0
        );

        const pageSize = Math.min(
            Math.max(Number(searchParams.get("pageSize") ?? 10), 1),
            100
        );

        const skip = pageIndex * pageSize;

        const search = searchParams.get("search")?.trim() ?? "";
        const status = searchParams.get("status")?.trim() ?? "";
        const equipmentId = searchParams.get("equipmentId")?.trim() ?? "";
        const customerId = searchParams.get("customerId")?.trim() ?? "";

        await connectToDatabase();

        const match: Record<string, unknown> = {
            createdBy: new Types.ObjectId(authUser.userId),
        };

        if (status) {
            match.status = status;
        }

        if (equipmentId && Types.ObjectId.isValid(equipmentId)) {
            match.equipmentId = new Types.ObjectId(equipmentId);
        }

        if (customerId && Types.ObjectId.isValid(customerId)) {
            match.customerId = new Types.ObjectId(customerId);
        }

        const pipeline: PipelineStage[] = [
            { $match: match },
            {
                $lookup: {
                    from: "equipment",
                    localField: "equipmentId",
                    foreignField: "_id",
                    as: "equipment",
                },
            },
            { $unwind: "$equipment" },
            {
                $lookup: {
                    from: "customers",
                    localField: "customerId",
                    foreignField: "_id",
                    as: "customer",
                },
            },
            { $unwind: "$customer" },
        ];

        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { "equipment.name": { $regex: search, $options: "i" } },
                        { "equipment.brand": { $regex: search, $options: "i" } },
                        { "customer.firstName": { $regex: search, $options: "i" } },
                        { "customer.lastName": { $regex: search, $options: "i" } },
                        { "customer.email": { $regex: search, $options: "i" } },
                        { "customer.phone": { $regex: search, $options: "i" } },
                    ],
                },
            });
        }

        pipeline.push({ $sort: { createdAt: -1 } });

        const countPipeline = [...pipeline, { $count: "total" }];
        const dataPipeline = [
            ...pipeline,
            { $skip: skip },
            { $limit: pageSize },
        ];

        const [rentals, countResult] = await Promise.all([
            Rental.aggregate(dataPipeline),
            Rental.aggregate(countPipeline),
        ]);

        const totalCount = countResult[0]?.total ?? 0;

        return NextResponse.json({
            data: rentals,
            pageIndex,
            pageSize,
            totalCount,
            pageCount: Math.ceil(totalCount / pageSize),
            hasNextPage: skip + rentals.length < totalCount,
            hasPreviousPage: pageIndex > 0,
            totalRows: totalCount,
        });
    } catch (err) {
        console.error("Get rentals error:", err);

        return NextResponse.json(
            { message: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}

export async function POST(request: NextRequest) {
    const session = await mongoose.startSession();

    try {
        const authUser = await getAuthUser();

        if (!authUser) {
            return NextResponse.json(
                { message: "Not authenticated." },
                { status: 401 }
            );
        }

        const body = await request.json();

        const {
            equipmentId,
            customerId,
            quantity,
            rentalDate,
            expectedReturnDate,
            securityDeposit,
            notes,
            status,
        } = body;

        const requestedStatus: "Reserved" | "Rented" =
            status === "Reserved" ? "Reserved" : "Rented";

        if (
            !equipmentId ||
            !customerId ||
            !rentalDate ||
            !expectedReturnDate
        ) {
            return NextResponse.json(
                { message: "Missing required fields." },
                { status: 400 }
            );
        }

        if (
            !Types.ObjectId.isValid(equipmentId) ||
            !Types.ObjectId.isValid(customerId)
        ) {
            return NextResponse.json(
                { message: "Invalid equipment or customer id." },
                { status: 400 }
            );
        }

        const qty = Math.max(Number(quantity) || 1, 1);
        const startDate = new Date(rentalDate);
        const endDate = new Date(expectedReturnDate);

        if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
            return NextResponse.json(
                { message: "Invalid rental dates." },
                { status: 400 }
            );
        }

        if (endDate <= startDate) {
            return NextResponse.json(
                {
                    message:
                        "Expected return date must be after the rental date.",
                },
                { status: 400 }
            );
        }

        await connectToDatabase();

        let createdRental: any = null;
        let conflict: Conflict | null = null;

        await session.withTransaction(async () => {
            const equipment = await Equipment.findById(equipmentId).session(
                session
            );

            if (!equipment) {
                conflict = { status: 404, message: "Equipment not found." };
                return;
            }

            if (equipment.status !== "available") {
                conflict = {
                    status: 409,
                    message: `Equipment is currently marked as "${equipment.status}" and cannot be rented.`,
                };
                return;
            }

            const customer = await Customer.findById(customerId).session(
                session
            );

            if (!customer) {
                conflict = { status: 404, message: "Customer not found." };
                return;
            }

            // Block renting the same equipment to the same customer while
            // they already have an active (not returned/cancelled) rental of it.
            const existingActiveForCustomer = await Rental.findOne({
                equipmentId,
                customerId,
                status: { $in: ACTIVE_STATUSES },
            }).session(session);

            if (existingActiveForCustomer) {
                conflict = {
                    status: 409,
                    message:
                        "This customer already has an active rental for this equipment. Return or cancel it before renting again.",
                };
                return;
            }

            // Sum quantities of overlapping active rentals for this equipment
            // to figure out how many units are free for the requested window.
            const overlapping = await Rental.find({
                equipmentId,
                status: { $in: ACTIVE_STATUSES },
                rentalDate: { $lte: endDate },
                expectedReturnDate: { $gte: startDate },
            }).session(session);

            const reservedQty = overlapping.reduce(
                (sum, r) => sum + r.quantity,
                0
            );

            const availableQty = equipment.quantity - reservedQty;

            if (availableQty < qty) {
                conflict = {
                    status: 409,
                    message:
                        availableQty > 0
                            ? `Only ${availableQty} unit(s) of this equipment are available for the selected dates.`
                            : "No units of this equipment are available for the selected dates.",
                };
                return;
            }

            const days = daysBetween(startDate, endDate);
            const totalAmount = equipment.dailyRate * qty * days;

            const [rental] = await Rental.create(
                [
                    {
                        equipmentId,
                        customerId,
                        quantity: qty,
                        rentalDate: startDate,
                        expectedReturnDate: endDate,
                        dailyRate: equipment.dailyRate,
                        securityDeposit: Number(securityDeposit) || 0,
                        totalAmount,
                        status: requestedStatus, // was hardcoded "Rented"
                        notes: notes?.trim() ?? "",
                        createdBy: authUser.userId,
                    },
                ],
                { session }
            );

            createdRental = rental;
        });


        if (conflict) {
            const { message, status: conflictStatus } = conflict!;

            return NextResponse.json(
                { message },
                { status: conflictStatus }
            );
        }

        return NextResponse.json(
            {
                message: "Rental created successfully.",
                data: createdRental,
            },
            { status: 201 }
        );
    } catch (err: any) {
        console.error("Create rental error:", err);

        return NextResponse.json(
            { message: "Something went wrong. Please try again." },
            { status: 500 }
        );
    } finally {
        await session.endSession();
    }
}