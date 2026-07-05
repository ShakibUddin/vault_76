import { NextRequest, NextResponse } from "next/server";
import * as Yup from "yup";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { signToken, setAuthCookie } from "@/lib/auth";

const loginSchema = Yup.object({
    email: Yup.string().trim().email().lowercase().required(),
    password: Yup.string().required(),
});

// Generic message used for both "no such user" and "wrong password".
// This prevents attackers from using the endpoint to enumerate registered emails.
const INVALID_CREDENTIALS_MESSAGE = "Invalid email or password.";

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();
        const data = await loginSchema.validate(body, { abortEarly: false });

        await connectToDatabase();

        // Explicitly select password since the schema excludes it by default.
        const user = await User.findOne({ email: data.email }).select("+password");

        if (!user) {
            return NextResponse.json(
                { message: INVALID_CREDENTIALS_MESSAGE },
                { status: 401 }
            );
        }

        const isValidPassword = await user.comparePassword(data.password);
        if (!isValidPassword) {
            return NextResponse.json(
                { message: INVALID_CREDENTIALS_MESSAGE },
                { status: 401 }
            );
        }

        const token = signToken({ userId: user._id.toString(), email: user.email });
        await setAuthCookie(token);

        return NextResponse.json(
            {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                },
            },
            { status: 200 }
        );
    } catch (err) {
        if (err instanceof Yup.ValidationError) {
            return NextResponse.json(
                { message: "Validation failed.", errors: err.errors },
                { status: 400 }
            );
        }

        console.error("Login error:", err);
        return NextResponse.json(
            { message: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}