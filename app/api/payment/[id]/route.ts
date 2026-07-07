import { NextRequest, NextResponse } from "next/server";
import { Types } from "mongoose";
import { connectToDatabase } from "@/lib/mongodb";
import Payment from "@/models/Payment";
import { getAuthUser } from "@/lib/auth";

function isValidId(id: string) {
    return Types.ObjectId.isValid(id);
}

export async function GET(
    _request: NextRequest,
    { params }: { params: Promise<{ id: string }> }
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

        if (!isValidId(id)) {
            return NextResponse.json(
                { message: "Invalid payment id." },
                { status: 400 }
            );
        }

        await connectToDatabase();

        const payment = await Payment.findOne({
            _id: id,
            createdBy: authUser.userId,
        })
            .populate("equipmentId", "name brand model dailyRate")
            .populate("customerId", "firstName lastName email phone")
            .populate(
                "rentalId",
                "quantity rentalDate expectedReturnDate actualReturnDate status totalAmount"
            )
            .lean();

        if (!payment) {
            return NextResponse.json(
                { message: "Payment not found." },
                { status: 404 }
            );
        }

        return NextResponse.json({ data: payment });
    } catch (err) {
        console.error("Get payment error:", err);

        return NextResponse.json(
            { message: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}