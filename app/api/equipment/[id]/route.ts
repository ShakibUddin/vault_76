import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import * as Yup from "yup";

import { connectToDatabase } from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth";
import Equipment from "@/models/Equipment";

const updateEquipmentSchema = Yup.object({
    name: Yup.string().trim().max(100),
    category: Yup.string().trim().max(50),
    brand: Yup.string().trim().max(50),
    model: Yup.string().trim().max(50),
    description: Yup.string().trim().max(500),
    dailyRate: Yup.number().min(0),
    quantity: Yup.number().integer().min(0),
    status: Yup.string().oneOf([
        "available",
        "maintenance",
        "inactive",
    ]),
});

interface RouteParams {
    params: Promise<{
        id: string;
    }>;
}

/**
 * Validate a MongoDB ObjectId before querying the database.
 */
function isValidObjectId(id: string): boolean {
    return mongoose.Types.ObjectId.isValid(id);
}

/**
 * GET /api/equipment/:id
 * Returns a single equipment item belonging to the authenticated user.
 */
export async function GET(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const authUser = await getAuthUser();

        if (!authUser) {
            return NextResponse.json(
                { message: "Not authenticated." },
                { status: 401 }
            );
        }

        const { id } = await params;

        if (!isValidObjectId(id)) {
            return NextResponse.json(
                { message: "Invalid equipment ID." },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const equipment = await Equipment.findOne({
            _id: id,
            createdBy: authUser.userId,
        }).lean();

        if (!equipment) {
            return NextResponse.json(
                { message: "Equipment not found." },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                data: equipment,
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error("Fetch equipment error:", error);

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

/**
 * PATCH /api/equipment/:id
 * Updates an equipment item belonging to the authenticated user.
 */
export async function PATCH(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const authUser = await getAuthUser();

        if (!authUser) {
            return NextResponse.json(
                { message: "Not authenticated." },
                { status: 401 }
            );
        }

        const { id } = await params;

        if (!isValidObjectId(id)) {
            return NextResponse.json(
                { message: "Invalid equipment ID." },
                { status: 400 }
            );
        }

        const body = await request.json();

        const data = await updateEquipmentSchema.validate(body, {
            abortEarly: false,
            stripUnknown: true,
        });

        if (Object.keys(data).length === 0) {
            return NextResponse.json(
                {
                    message: "No valid fields provided.",
                },
                {
                    status: 400,
                }
            );
        }

        await connectToDatabase();

        const equipment = await Equipment.findOneAndUpdate(
            {
                _id: id,
                createdBy: authUser.userId,
            },
            {
                $set: data,
            },
            {
                new: true,
                runValidators: true,
            }
        ).lean();

        if (!equipment) {
            return NextResponse.json(
                {
                    message: "Equipment not found.",
                },
                {
                    status: 404,
                }
            );
        }

        return NextResponse.json(
            {
                message: "Equipment updated successfully.",
                data: equipment,
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        if (error instanceof Yup.ValidationError) {
            return NextResponse.json(
                {
                    message: "Validation failed.",
                    errors: error.errors,
                },
                {
                    status: 400,
                }
            );
        }

        if (error instanceof mongoose.Error.ValidationError) {
            return NextResponse.json(
                {
                    message: "Validation failed.",
                    errors: Object.values(error.errors).map((e) => e.message),
                },
                {
                    status: 400,
                }
            );
        }

        console.error("Update equipment error:", error);

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

/**
 * DELETE /api/equipment/:id
 * Deletes an equipment item belonging to the authenticated user.
 */
export async function DELETE(
    request: NextRequest,
    { params }: RouteParams
) {
    try {
        const authUser = await getAuthUser();

        if (!authUser) {
            return NextResponse.json(
                { message: "Not authenticated." },
                { status: 401 }
            );
        }

        const { id } = await params;

        if (!isValidObjectId(id)) {
            return NextResponse.json(
                { message: "Invalid equipment ID." },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const equipment = await Equipment.findOneAndDelete({
            _id: id,
            createdBy: authUser.userId,
        }).lean();

        if (!equipment) {
            return NextResponse.json(
                {
                    message: "Equipment not found.",
                },
                {
                    status: 404,
                }
            );
        }

        return NextResponse.json(
            {
                message: "Equipment deleted successfully.",
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error("Delete equipment error:", error);

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