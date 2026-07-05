import mongoose, { Schema, Document, Model } from "mongoose";
import bcrypt from "bcryptjs";

/**
 * User document shape.
 * `password` is excluded from queries by default (select: false)
 * so it never accidentally leaks in API responses.
 */
export interface IUser extends Document {
    firstName: string;
    lastName: string;
    email: string;
    password: string;
    createdAt: Date;
    updatedAt: Date;
    comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
    {
        firstName: {
            type: String,
            required: [true, "First name is required."],
            trim: true,
            maxlength: 50,
        },
        lastName: {
            type: String,
            required: [true, "Last name is required."],
            trim: true,
            maxlength: 50,
        },
        email: {
            type: String,
            required: [true, "Email is required."],
            unique: true,
            lowercase: true,
            trim: true,
            // Basic sanity check; full validation happens in the API layer via Yup.
            match: [/^\S+@\S+\.\S+$/, "Please enter a valid email address."],
        },
        password: {
            type: String,
            required: [true, "Password is required."],
            minlength: 8,
            select: false, // never returned by default on .find()/.findOne()
        },
    },
    { timestamps: true }
);

// Hash the password before saving, but only if it was modified/new.
userSchema.pre("save", async function () {
    if (!this.isModified("password")) return;

    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
});

// Instance method to compare a plaintext candidate against the stored hash.
userSchema.methods.comparePassword = async function (
    candidate: string
): Promise<boolean> {
    return bcrypt.compare(candidate, this.password);
};

// Prevent model overwrite errors during Next.js hot reload.
const User: Model<IUser> =
    mongoose.models.User || mongoose.model<IUser>("User", userSchema);

export default User;