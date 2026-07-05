import mongoose, { Model, Schema, Types } from "mongoose";

export interface IEquipment {
    name: string;
    category: string;
    brand: string;
    model: string;
    description?: string;

    dailyRate: number;
    quantity: number;

    status: "available" | "maintenance" | "inactive";

    createdBy: Types.ObjectId;

    createdAt: Date;
    updatedAt: Date;
}

export interface IEquipmentMethods { }

export type EquipmentModel = Model<IEquipment, {}, IEquipmentMethods>;

const equipmentSchema = new Schema<
    IEquipment,
    EquipmentModel,
    IEquipmentMethods
>(
    {
        name: {
            type: String,
            required: [true, "Equipment name is required."],
            trim: true,
            maxlength: 100,
        },

        category: {
            type: String,
            required: [true, "Category is required."],
            trim: true,
            maxlength: 50,
        },

        brand: {
            type: String,
            required: [true, "Brand is required."],
            trim: true,
            maxlength: 50,
        },

        model: {
            type: String,
            required: [true, "Model is required."],
            trim: true,
            maxlength: 50,
        },

        description: {
            type: String,
            trim: true,
            maxlength: 500,
            default: "",
        },

        dailyRate: {
            type: Number,
            required: [true, "Daily rate is required."],
            min: 0,
        },

        quantity: {
            type: Number,
            required: [true, "Quantity is required."],
            min: 0,
            default: 0,
        },

        status: {
            type: String,
            enum: ["available", "maintenance", "inactive"],
            default: "available",
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
equipmentSchema.index({ name: 1 });
equipmentSchema.index({ category: 1 });
equipmentSchema.index({ status: 1 });
equipmentSchema.index({ createdBy: 1 });

const Equipment =
    (mongoose.models.Equipment as EquipmentModel) ||
    mongoose.model<IEquipment, EquipmentModel>(
        "Equipment",
        equipmentSchema
    );

export default Equipment;