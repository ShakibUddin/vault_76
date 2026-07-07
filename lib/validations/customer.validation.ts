import * as Yup from "yup";

export const createCustomerSchema = Yup.object({
    firstName: Yup.string()
        .trim()
        .max(50)
        .required(),

    lastName: Yup.string()
        .trim()
        .max(50)
        .required(),

    email: Yup.string()
        .trim()
        .email()
        .max(100)
        .required(),

    phone: Yup.string()
        .trim()
        .max(20)
        .required(),

    address: Yup.string()
        .trim()
        .max(500)
        .default(""),

    createdBy: Yup.string()
        .trim()
        .max(500)
        .required(),
});

export const CustomerValidationSchema = Yup.object({
    firstName: Yup.string()
        .trim()
        .max(50, "First name cannot exceed 50 characters.")
        .required("First name is required."),

    lastName: Yup.string()
        .trim()
        .max(50, "Last name cannot exceed 50 characters.")
        .required("Last name is required."),

    email: Yup.string()
        .trim()
        .email("Please enter a valid email address.")
        .max(100, "Email cannot exceed 100 characters.")
        .required("Email is required."),

    phone: Yup.string()
        .trim()
        .max(20, "Phone number cannot exceed 20 characters.")
        .required("Phone number is required."),

    address: Yup.string()
        .trim()
        .max(500, "Address cannot exceed 500 characters."),
});