import mongoose, { Model, Schema, Types } from "mongoose";

export type RentalStatus =
    | "Reserved"
    | "Rented"
    | "Returned"
    | "Cancelled";

export interface IRental {
    equipmentId: Types.ObjectId;
    customerId: Types.ObjectId;

    quantity: number;

    rentalDate: Date;
    expectedReturnDate: Date;
    actualReturnDate?: Date;

    dailyRate: number;
    securityDeposit: number;

    totalAmount?: number;

    status: RentalStatus;

    notes?: string;

    createdBy: Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

export interface IRentalMethods { }

export type RentalModel = Model<IRental, {}, IRentalMethods>;

const rentalSchema = new Schema<
    IRental,
    RentalModel,
    IRentalMethods
>(
    {
        equipmentId: {
            type: Schema.Types.ObjectId,
            ref: "Equipment",
            required: [true, "Equipment is required."],
            index: true,
        },

        customerId: {
            type: Schema.Types.ObjectId,
            ref: "Customer",
            required: [true, "Customer is required."],
            index: true,
        },

        quantity: {
            type: Number,
            required: [true, "Quantity is required."],
            min: 1,
            default: 1,
        },

        rentalDate: {
            type: Date,
            required: [true, "Rental date is required."],
        },

        expectedReturnDate: {
            type: Date,
            required: [true, "Expected return date is required."],
        },

        actualReturnDate: {
            type: Date,
        },

        // Snapshot of the equipment price at rental time.
        dailyRate: {
            type: Number,
            required: true,
            min: 0,
        },

        securityDeposit: {
            type: Number,
            required: true,
            min: 0,
            default: 0,
        },

        // Optional snapshot of total rental amount.
        totalAmount: {
            type: Number,
            min: 0,
            default: 0,
        },

        status: {
            type: String,
            enum: ["Reserved", "Rented", "Returned", "Cancelled"],
            default: "Rented",
            required: true,
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

/**
 * Helpful indexes
 */
rentalSchema.index({ equipmentId: 1 });
rentalSchema.index({ customerId: 1 });
rentalSchema.index({ status: 1 });
rentalSchema.index({ rentalDate: -1 });
rentalSchema.index({ expectedReturnDate: 1 });
rentalSchema.index({ createdBy: 1 });

const Rental =
    (mongoose.models.Rental as RentalModel) ||
    mongoose.model<IRental, RentalModel>(
        "Rental",
        rentalSchema
    );

export default Rental;