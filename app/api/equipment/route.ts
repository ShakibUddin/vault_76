import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import * as Yup from "yup";
import { connectToDatabase } from "@/lib/mongodb";
import Equipment from "@/models/Equipment";
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
                    name: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    brand: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    model: {
                        $regex: search,
                        $options: "i",
                    },
                },
                {
                    category: {
                        $regex: search,
                        $options: "i",
                    },
                },
            ];
        }

        const [equipment, totalCount] = await Promise.all([
            Equipment.find(filter)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(pageSize)
                .lean(),

            Equipment.countDocuments(filter),
        ]);

        return NextResponse.json({
            data: equipment,
            pageIndex,
            pageSize,
            totalCount,
            pageCount: Math.ceil(totalCount / pageSize),
            hasNextPage: skip + equipment.length < totalCount,
            hasPreviousPage: pageIndex > 0,
            totalRows: totalCount,
        });
    } catch (err) {
        console.error("Get equipment error:", err);

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
            return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
        }

        const body = await request.json();
        await connectToDatabase();

        const equipment = await Equipment.create({
            ...body,
            createdBy: authUser.userId,
        });

        return NextResponse.json(
            { message: "Equipment created successfully." },
            { status: 201 }
        );
    } catch (err) {
        console.error("Create equipment error:", err);
        return NextResponse.json(
            { message: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}