import { NextRequest, NextResponse } from "next/server";
import { PipelineStage, Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { getAuthUser } from "@/lib/auth";

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
        const type = searchParams.get("type")?.trim() ?? "";
        const method = searchParams.get("method")?.trim() ?? "";
        const rentalId = searchParams.get("rentalId")?.trim() ?? "";
        const equipmentId = searchParams.get("equipmentId")?.trim() ?? "";
        const customerId = searchParams.get("customerId")?.trim() ?? "";

        // Validate ids up front — an invalid ObjectId passed to $match
        // wouldn't throw, it'd just silently match nothing, which looks
        // identical to "no payments" from the client's perspective.
        for (const [label, value] of [
            ["rentalId", rentalId],
            ["equipmentId", equipmentId],
            ["customerId", customerId],
        ] as const) {
            if (value && !Types.ObjectId.isValid(value)) {
                return NextResponse.json(
                    { message: `Invalid ${label}.` },
                    { status: 400 }
                );
            }
        }

        await connectToDatabase();

        const match: Record<string, unknown> = {
            createdBy: new Types.ObjectId(authUser.userId),
        };

        if (type) match.type = type;
        if (method) match.method = method;
        if (rentalId) match.rentalId = new Types.ObjectId(rentalId);
        if (equipmentId) match.equipmentId = new Types.ObjectId(equipmentId);
        if (customerId) match.customerId = new Types.ObjectId(customerId);

        const pipeline: PipelineStage[] = [
            { $match: match },
            {
                $lookup: {
                    from: "equipment", // matches the actual collection name, not "equipments"
                    localField: "equipmentId",
                    foreignField: "_id",
                    as: "equipment",
                },
            },
            { $unwind: { path: "$equipment", preserveNullAndEmptyArrays: true } },
            {
                $lookup: {
                    from: "customers",
                    localField: "customerId",
                    foreignField: "_id",
                    as: "customer",
                },
            },
            { $unwind: { path: "$customer", preserveNullAndEmptyArrays: true } },
        ];

        if (search) {
            pipeline.push({
                $match: {
                    $or: [
                        { "equipment.name": { $regex: search, $options: "i" } },
                        { "customer.firstName": { $regex: search, $options: "i" } },
                        { "customer.lastName": { $regex: search, $options: "i" } },
                        { "customer.email": { $regex: search, $options: "i" } },
                        { "customer.phone": { $regex: search, $options: "i" } },
                        { notes: { $regex: search, $options: "i" } },
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

        // Sum of amounts across the FULL filtered set (not just the current
        // page) — useful for a "total collected" summary on the payments page.
        const summaryPipeline = [
            ...pipeline,
            {
                $group: {
                    _id: "$type",
                    total: { $sum: "$amount" },
                    count: { $sum: 1 },
                },
            },
        ];

        const [payments, countResult, summaryResult] = await Promise.all([
            Payment.aggregate(dataPipeline),
            Payment.aggregate(countPipeline),
            Payment.aggregate(summaryPipeline),
        ]);

        const totalCount = countResult[0]?.total ?? 0;

        const summary = summaryResult.reduce(
            (acc, row) => {
                acc[row._id as string] = { total: row.total, count: row.count };
                return acc;
            },
            {} as Record<string, { total: number; count: number }>
        );

        return NextResponse.json({
            data: payments,
            pageIndex,
            pageSize,
            totalCount,
            pageCount: Math.ceil(totalCount / pageSize),
            hasNextPage: skip + payments.length < totalCount,
            hasPreviousPage: pageIndex > 0,
            totalRows: totalCount,
            summary,
        });
    } catch (err) {
        console.error("Get payments error:", err);

        return NextResponse.json(
            { message: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}