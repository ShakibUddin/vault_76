"use client";
import React, { useState } from "react";
import { CustomerValidationSchema } from "@/lib/validations/customer.validation";
import { useFormik } from "formik";
import ErrorText from "../common/ErrorText";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";
import { CustomerRow } from "./CustomerColumns";

export interface CustomerFormValues {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  address: string;
}

interface CustomerFormProps {
  customer?: CustomerRow;
  loading?: boolean;
  update?: boolean;
  submitText?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

export default function CustomerForm({
  loading = false,
  update = false,
  submitText = "Save Customer",
  onCancel,
  onSuccess,
  customer,
}: CustomerFormProps) {
  const { user } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);
  const formik = useFormik<CustomerFormValues>({
    initialValues: {
      firstName: customer?.firstName || "",
      lastName: customer?.lastName || "",
      email: customer?.email || "",
      phone: customer?.phone || "",
      address: customer?.address || "",
    },
    validationSchema: CustomerValidationSchema,
    enableReinitialize: true,

    onSubmit: async (values, { setSubmitting }) => {
      setServerError(null);
      try {
        const res = await fetch(
          update ? `/api/customer/${customer?._id}` : "/api/customer",
          {
            method: update ? "PATCH" : "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              ...values,
              createdBy: user?.id,
            }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          setServerError(
            data.message ?? "Customer creation failed. Please try again."
          );
          return;
        }
        toast.success(data.message);
        formik.resetForm();
        onSuccess?.();
      } catch {
        setServerError("Network error. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <form onSubmit={formik.handleSubmit}>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* First Name */}
        <div>
          <label className="label">
            <span className="label-text">First Name</span>
          </label>

          <input
            name="firstName"
            className={`input input-bordered w-full ${
              formik.touched.firstName && formik.errors.firstName
                ? "input-error"
                : ""
            }`}
            value={formik.values.firstName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />

          {formik.touched.firstName && formik.errors.firstName && (
            <p className="mt-1 text-sm text-error">{formik.errors.firstName}</p>
          )}
        </div>

        {/* Last Name */}
        <div>
          <label className="label">
            <span className="label-text">Last Name</span>
          </label>

          <input
            name="lastName"
            className={`input input-bordered w-full ${
              formik.touched.lastName && formik.errors.lastName
                ? "input-error"
                : ""
            }`}
            value={formik.values.lastName}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />

          {formik.touched.lastName && formik.errors.lastName && (
            <p className="mt-1 text-sm text-error">{formik.errors.lastName}</p>
          )}
        </div>

        {/* Email */}
        <div>
          <label className="label">
            <span className="label-text">Email</span>
          </label>

          <input
            type="email"
            name="email"
            className={`input input-bordered w-full ${
              formik.touched.email && formik.errors.email ? "input-error" : ""
            }`}
            value={formik.values.email}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />

          {formik.touched.email && formik.errors.email && (
            <p className="mt-1 text-sm text-error">{formik.errors.email}</p>
          )}
        </div>

        {/* Phone */}
        <div>
          <label className="label">
            <span className="label-text">Phone</span>
          </label>

          <input
            type="tel"
            name="phone"
            className={`input input-bordered w-full ${
              formik.touched.phone && formik.errors.phone ? "input-error" : ""
            }`}
            value={formik.values.phone}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />

          {formik.touched.phone && formik.errors.phone && (
            <p className="mt-1 text-sm text-error">{formik.errors.phone}</p>
          )}
        </div>

        {/* Address */}
        <div className="md:col-span-2">
          <label className="label">
            <span className="label-text">Address</span>
          </label>

          <textarea
            name="address"
            rows={4}
            className={`textarea textarea-bordered w-full ${
              formik.touched.address && formik.errors.address
                ? "textarea-error"
                : ""
            }`}
            value={formik.values.address}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />

          {formik.touched.address && formik.errors.address && (
            <p className="mt-1 text-sm text-error">{formik.errors.address}</p>
          )}
        </div>
      </div>
      {serverError ? <ErrorText message={serverError} /> : <></>}
      <div className="modal-action">
        <button type="button" className="btn btn-ghost" onClick={onCancel}>
          Cancel
        </button>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={loading || formik.isSubmitting}
        >
          {loading || formik.isSubmitting ? (
            <>
              <span className="loading loading-spinner loading-sm"></span>
              Saving...
            </>
          ) : (
            submitText
          )}
        </button>
      </div>
    </form>
  );
}
