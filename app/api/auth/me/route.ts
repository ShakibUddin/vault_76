import { NextResponse } from "next/server";
import { getAuthUser } from "@/lib/auth";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";

export async function GET() {
    const authUser = await getAuthUser();

    if (!authUser) {
        return NextResponse.json({ message: "Not authenticated." }, { status: 401 });
    }

    await connectToDatabase();
    const user = await User.findById(authUser.userId);

    if (!user) {
        return NextResponse.json({ message: "User not found." }, { status: 404 });
    }

    return NextResponse.json({
        user: {
            id: user._id,
            firstName: user.firstName,
            lastName: user.lastName,
            email: user.email,
        },
    });
}