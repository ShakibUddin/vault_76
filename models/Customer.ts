import mongoose, { Model, Schema, Types } from "mongoose";

export interface ICustomer {
    firstName: string;
    lastName: string;
    email: string;
    phone: string;
    address?: string;

    createdBy: Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

export interface ICustomerMethods { }

export type CustomerModel = Model<ICustomer, {}, ICustomerMethods>;

const customerSchema = new Schema<
    ICustomer,
    CustomerModel,
    ICustomerMethods
>(
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
            trim: true,
            lowercase: true,
            maxlength: 100,
        },

        phone: {
            type: String,
            required: [true, "Phone number is required."],
            trim: true,
            maxlength: 20,
        },

        address: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
    },
    {
        timestamps: true,
    }
);

/**
 * Helpful indexes for searching and filtering.
 */
customerSchema.index({ firstName: 1 });
customerSchema.index({ lastName: 1 });
customerSchema.index({ email: 1 });
customerSchema.index({ phone: 1 });
customerSchema.index({ createdBy: 1 });

// Prevent duplicate emails per user.
customerSchema.index(
    { createdBy: 1, email: 1 },
    { unique: true }
);

const Customer =
    (mongoose.models.Customer as CustomerModel) ||
    mongoose.model<ICustomer, CustomerModel>(
        "Customer",
        customerSchema
    );

export default Customer;