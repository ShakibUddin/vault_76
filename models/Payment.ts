import mongoose, { Model, Schema, Types } from "mongoose";

export type PaymentType = "Deposit" | "Rental" | "Refund";
export type PaymentMethod =
    | "Cash"
    | "Card"
    | "Bank Transfer"
    | "Mobile Banking"
    | "Other";

export interface IPayment {
    rentalId: Types.ObjectId;
    equipmentId: Types.ObjectId;
    customerId: Types.ObjectId;

    type: PaymentType;
    amount: number;

    // Breakdown fields — only meaningful for type "Rental", but kept
    // here (rather than re-derived later) so an invoice/audit can
    // show exactly how the amount was calculated after the fact.
    quantity?: number;
    dailyRate?: number;
    daysCharged?: number;
    lateDays?: number;
    depositApplied?: number; // how much of the existing deposit was credited toward this charge

    method: PaymentMethod;
    notes?: string;

    createdBy: Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

export interface IPaymentMethods { }

export type PaymentModel = Model<IPayment, {}, IPaymentMethods>;

const paymentSchema = new Schema<IPayment, PaymentModel, IPaymentMethods>(
    {
        rentalId: {
            type: Schema.Types.ObjectId,
            ref: "Rental",
            required: true,
            index: true,
        },

        equipmentId: {
            type: Schema.Types.ObjectId,
            ref: "Equipment",
            required: true,
            index: true,
        },

        customerId: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            required: true,
            index: true,
        },

        type: {
            type: String,
            enum: ["Deposit", "Rental", "Refund"],
            required: true,
        },

        amount: {
            type: Number,
            required: true,
            min: 0,
        },

        depositApplied: {
            type: Number,
            min: 0,
            default: 0,
        },

        quantity: {
            type: Number,
            min: 1,
        },

        dailyRate: {
            type: Number,
            min: 0,
        },

        daysCharged: {
            type: Number,
            min: 0,
        },

        lateDays: {
            type: Number,
            min: 0,
            default: 0,
        },

        method: {
            type: String,
            enum: ["Cash", "Card", "Bank Transfer", "Mobile Banking", "Other"],
            default: "Cash",
        },

        notes: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },

        createdBy: {
            type: Schema.Types.ObjectId,
            ref: "User",
            required: true,
            index: true,
        },
    },
    {
        timestamps: true,
    }
);

paymentSchema.index({ rentalId: 1 });
paymentSchema.index({ customerId: 1 });
paymentSchema.index({ type: 1 });
paymentSchema.index({ createdBy: 1 });

const Payment =
    (mongoose.models.Payment as PaymentModel) ||
    mongoose.model<IPayment, PaymentModel>("Payment", paymentSchema);

export default Payment;