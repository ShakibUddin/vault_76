import * as Yup from "yup";

export const createEquipmentSchema = Yup.object({
    name: Yup.string()
        .trim()
        .max(100)
        .required(),

    category: Yup.string()
        .trim()
        .required(),

    brand: Yup.string()
        .trim()
        .max(50)
        .required(),

    model: Yup.string()
        .trim()
        .max(50)
        .required(),

    description: Yup.string()
        .trim()
        .max(500)
        .default(""),

    dailyRate: Yup.number()
        .positive()
        .required(),

    quantity: Yup.number()
        .integer()
        .min(0)
        .required(),

    createdBy: Yup.string()
        .trim()
        .max(500)
        .required(),
});

export const EquipmentValidationSchema = Yup.object({
    name: Yup.string()
        .max(100, "Equipment name cannot exceed 100 characters.")
        .required("Equipment name is required."),

    category: Yup.string().required("Category is required."),

    brand: Yup.string()
        .max(50, "Brand cannot exceed 50 characters.")
        .required("Brand is required."),

    model: Yup.string()
        .max(50, "Model cannot exceed 50 characters.")
        .required("Model is required."),

    description: Yup.string().max(
        500,
        "Description cannot exceed 500 characters."
    ),

    dailyRate: Yup.number()
        .typeError("Daily rate is required.")
        .positive("Daily rate must be greater than zero.")
        .required("Daily rate is required."),

    quantity: Yup.number()
        .typeError("Quantity is required.")
        .integer("Quantity must be a whole number.")
        .min(0, "Quantity cannot be negative.")
        .required("Quantity is required."),
});