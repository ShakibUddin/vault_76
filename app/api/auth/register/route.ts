import { NextRequest, NextResponse } from "next/server";
import * as Yup from "yup";
import { connectToDatabase } from "@/lib/mongodb";
import User from "@/models/User";
import { signToken, setAuthCookie } from "@/lib/auth";

// Server-side validation must mirror (or exceed) client-side validation.
// Never trust the client — anyone can hit this endpoint directly.
const registerSchema = Yup.object({
    firstName: Yup.string().trim().max(50).required(),
    lastName: Yup.string().trim().max(50).required(),
    email: Yup.string().trim().email().lowercase().required(),
    password: Yup.string()
        .min(8)
        .matches(/[A-Z]/, "Must contain at least one uppercase letter.")
        .matches(/[a-z]/, "Must contain at least one lowercase letter.")
        .matches(/[0-9]/, "Must contain at least one number.")
        .required(),
});

export async function POST(request: NextRequest) {
    try {
        const body = await request.json();

        // Validate input shape/rules before touching the database.
        const data = await registerSchema.validate(body, { abortEarly: false });

        await connectToDatabase();

        // Check for an existing account with this email.
        const existingUser = await User.findOne({ email: data.email });
        if (existingUser) {
            // Generic message avoids confirming which emails are registered.
            return NextResponse.json(
                { message: "An account with this email already exists." },
                { status: 409 }
            );
        }

        // Password hashing happens automatically in the User model's pre-save hook.
        const user = await User.create({
            firstName: data.firstName,
            lastName: data.lastName,
            email: data.email,
            password: data.password,
        });

        // Never return the password hash, even implicitly.
        return NextResponse.json(
            {
                user: {
                    id: user._id,
                    firstName: user.firstName,
                    lastName: user.lastName,
                    email: user.email,
                },
            },
            { status: 201 }
        );
    } catch (err) {
        if (err instanceof Yup.ValidationError) {
            return NextResponse.json(
                { message: "Validation failed.", errors: err.errors },
                { status: 400 }
            );
        }

        // Handle race-condition duplicate key errors from the unique index.
        if (
            typeof err === "object" &&
            err !== null &&
            "code" in err &&
            (err as { code: number }).code === 11000
        ) {
            return NextResponse.json(
                { message: "An account with this email already exists." },
                { status: 409 }
            );
        }

        console.error("Register error:", err);
        return NextResponse.json(
            { message: "Something went wrong. Please try again." },
            { status: 500 }
        );
    }
}