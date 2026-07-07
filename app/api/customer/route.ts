import { NextRequest, NextResponse } from "next/server";
import { connectToDatabase } from "@/lib/mongodb";
import Customer from "@/models/Customer";
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

        await connectToDatabase();

        const filter: Record<string, unknown> = {
            createdBy: authUser.userId,
        };

        if (search) {
            filter.$or = [
                {
                    firstName: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    lastName: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    email: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    phone: {
                        $regex: search,
                        $options: "i",
                    },
                },
            ];
        }

        const [customers, totalCount] = await Promise.all([
            Customer.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize)
                .lean(),

            Customer.countDocuments(filter),
        ]);

        return NextResponse.json({
            data: customers,
            pageIndex,
            pageSize,
            totalCount,
            pageCount: Math.ceil(totalCount / pageSize),
            hasNextPage: skip + customers.length < totalCount,
            hasPreviousPage: pageIndex > 0,
            totalRows: totalCount,
        });
    } catch (err) {
        console.error("Get customers error:", err);

        return NextResponse.json(
            {
                message: "Something went wrong. Please try again.",
            },
            {
                status: 500,
            }
        );
    }
}

export async function POST(request: NextRequest) {
    try {
        const authUser = await getAuthUser();

        if (!authUser) {
            return NextResponse.json(
                { message: "Not authenticated." },
                { status: 401 }
            );
        }

        const body = await request.json();

        await connectToDatabase();

        await Customer.create({
            ...body,
            createdBy: authUser.userId,
        });

        return NextResponse.json(
            {
                message: "Customer created successfully.",
            },
            {
                status: 201,
            }
        );
    } catch (err: any) {
        console.error("Create customer error:", err);

        // Duplicate email/phone (if unique indexes exist)
        if (err.code === 11000) {
            const field = Object.keys(err.keyPattern)[1] || Object.keys(err.keyPattern)[0];

            return NextResponse.json(
                {
                    message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`,
                },
                {
                    status: 409,
                }
            );
        }

        return NextResponse.json(
            {
                message: "Something went wrong. Please try again.",
            },
            {
                status: 500,
            }
        );
    }
}