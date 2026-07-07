import { NextRequest, NextResponse } from "next/server";
import mongoose from "mongoose";
import * as Yup from "yup";

import { connectToDatabase } from "@/lib/mongodb";
import { getAuthUser } from "@/lib/auth";
import Customer from "@/models/Customer";

const updateCustomerSchema = Yup.object({
    firstName: Yup.string().trim().max(50),
    lastName: Yup.string().trim().max(50),
    email: Yup.string().trim().email().max(100),
    phone: Yup.string().trim().max(20),
    address: Yup.string().trim().max(500),
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
 * GET /api/customers/:id
 * Returns a single customer belonging to the authenticated user.
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
                { message: "Invalid customer ID." },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const customer = await Customer.findOne({
            _id: id,
            createdBy: authUser.userId,
        }).lean();

        if (!customer) {
            return NextResponse.json(
                { message: "Customer not found." },
                { status: 404 }
            );
        }

        return NextResponse.json(
            {
                data: customer,
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error("Fetch customer error:", error);

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
 * PATCH /api/customers/:id
 * Updates a customer belonging to the authenticated user.
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
                { message: "Invalid customer ID." },
                { status: 400 }
            );
        }

        const body = await request.json();

        const data = await updateCustomerSchema.validate(body, {
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

        const customer = await Customer.findOneAndUpdate(
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

        if (!customer) {
            return NextResponse.json(
                {
                    message: "Customer not found.",
                },
                {
                    status: 404,
                }
            );
        }

        return NextResponse.json(
            {
                message: "Customer updated successfully.",
                data: customer,
            },
            {
                status: 200,
            }
        );
    } catch (error: any) {
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

        // Duplicate email/phone
        if (error.code === 11000) {
            const field =
                Object.keys(error.keyPattern)[1] ??
                Object.keys(error.keyPattern)[0];

            return NextResponse.json(
                {
                    message: `${field.charAt(0).toUpperCase() + field.slice(1)} already exists.`,
                },
                {
                    status: 409,
                }
            );
        }

        console.error("Update customer error:", error);

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
 * DELETE /api/customers/:id
 * Deletes a customer belonging to the authenticated user.
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
                { message: "Invalid customer ID." },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const customer = await Customer.findOneAndDelete({
            _id: id,
            createdBy: authUser.userId,
        }).lean();

        if (!customer) {
            return NextResponse.json(
                {
                    message: "Customer not found.",
                },
                {
                    status: 404,
                }
            );
        }

        return NextResponse.json(
            {
                message: "Customer deleted successfully.",
            },
            {
                status: 200,
            }
        );
    } catch (error) {
        console.error("Delete customer error:", error);

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