import { ALL_RENTAL_STATUSES } from "@/utils/constants";
import * as Yup from "yup";

export const createRentalSchema = Yup.object({
    equipmentId: Yup.string().trim().required(),

    customerId: Yup.string().trim().required(),

    quantity: Yup.number()
        .integer()
        .min(1)
        .required(),

    status: Yup.string()
        .oneOf(["Rented", "Reserved"])
        .required(),

    rentalDate: Yup.date().required(),

    expectedReturnDate: Yup.date()
        .min(Yup.ref("rentalDate"))
        .required(),

    securityDeposit: Yup.number()
        .min(0),

    notes: Yup.string()
        .trim()
        .max(500)
        .default(""),

    createdBy: Yup.string()
        .trim()
        .required(),
});

export const RentalValidationSchema = Yup.object({
    equipment: Yup.string().required("Equipment is required."),

    customer: Yup.string().required("Customer is required."),

    quantity: Yup.number()
        .typeError("Quantity is required.")
        .integer("Quantity must be a whole number.")
        .min(1, "Quantity must be at least 1.")
        .required("Quantity is required."),

    status: Yup.string()
        .oneOf(ALL_RENTAL_STATUSES)
        .required("Status is required."),

    rentalDate: Yup.date()
        .typeError("Rental date is required.")
        .required("Rental date is required."),

    expectedReturnDate: Yup.date()
        .typeError("Expected return date is required.")
        .min(
            Yup.ref("rentalDate"),
            "Return date cannot be before rental date."
        )
        .required("Expected return date is required."),

    securityDeposit: Yup.number()
        .typeError("Security deposit is required.")
        .min(0, "Security deposit cannot be negative."),

    notes: Yup.string().max(
        500,
        "Notes cannot exceed 500 characters."
    ),
});