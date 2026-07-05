"use client";
import React, { useState } from "react";
import { EquipmentValidationSchema } from "@/lib/validations/equipment.validation";
import { useFormik } from "formik";
import ErrorText from "../common/ErrorText";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { equipmentCategories } from "@/utils/constants";
import { useAuthStore } from "@/store/useAuthStore";
import { EquipmentRow } from "./EquipmentColumns";

export interface EquipmentFormValues {
  name: string;
  category: string;
  brand: string;
  model: string;
  description: string;
  dailyRate: number | "";
  quantity: number | "";
}

interface EquipmentFormProps {
  equipment?: EquipmentRow;
  loading?: boolean;
  update?: boolean;
  submitText?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

const defaultValues: EquipmentFormValues = {
  name: "",
  category: "",
  brand: "",
  model: "",
  description: "",
  dailyRate: "",
  quantity: "",
};

export default function EquipmentForm({
  loading = false,
  update = false,
  submitText = "Save Equipment",
  onCancel,
  onSuccess,
  equipment,
}: EquipmentFormProps) {
  const { user } = useAuthStore();
  const [serverError, setServerError] = useState<string | null>(null);
  const formik = useFormik<EquipmentFormValues>({
    initialValues: {
      name: equipment?.name || "",
      category: equipment?.category || "",
      brand: equipment?.brand || "",
      model: equipment?.model || "",
      description: equipment?.description || "",
      dailyRate: equipment?.dailyRate || "",
      quantity: equipment?.quantity || "",
    },
    validationSchema: EquipmentValidationSchema,
    enableReinitialize: true,

    onSubmit: async (values, { setSubmitting }) => {
      setServerError(null);
      try {
        const res = await fetch(
          update ? `/api/equipment/${equipment?._id}` : "/api/equipment",
          {
            method: update ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ ...values, createdBy: user?.id }),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          setServerError(
            data.message ?? "Equipment creation failed. Please try again."
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
        {/* Equipment Name */}
        <div>
          <label className="label">
            <span className="label-text">Equipment Name</span>
          </label>

          <input
            name="name"
            className={`input input-bordered w-full ${
              formik.touched.name && formik.errors.name ? "input-error" : ""
            }`}
            value={formik.values.name}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />

          {formik.touched.name && formik.errors.name && (
            <p className="mt-1 text-sm text-error">{formik.errors.name}</p>
          )}
        </div>

        {/* Category */}
        <div>
          <label className="label">
            <span className="label-text">Category</span>
          </label>

          <select
            name="category"
            className={`select select-bordered w-full ${
              formik.touched.category && formik.errors.category
                ? "select-error"
                : ""
            }`}
            value={formik.values.category}
            onChange={formik.handleChange}
          >
            <option value="" disabled>
              Select a category
            </option>

            {equipmentCategories.map((category) => (
              <option key={category} value={category}>
                {category}
              </option>
            ))}
          </select>
          {formik.touched.category && formik.errors.category && (
            <p className="mt-1 text-sm text-error">{formik.errors.category}</p>
          )}
        </div>

        {/* Brand */}
        <div>
          <label className="label">
            <span className="label-text">Brand</span>
          </label>

          <input
            name="brand"
            className={`input input-bordered w-full ${
              formik.touched.brand && formik.errors.brand ? "input-error" : ""
            }`}
            value={formik.values.brand}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />

          {formik.touched.brand && formik.errors.brand && (
            <p className="mt-1 text-sm text-error">{formik.errors.brand}</p>
          )}
        </div>

        {/* Model */}
        <div>
          <label className="label">
            <span className="label-text">Model</span>
          </label>

          <input
            name="model"
            className={`input input-bordered w-full ${
              formik.touched.model && formik.errors.model ? "input-error" : ""
            }`}
            value={formik.values.model}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />

          {formik.touched.model && formik.errors.model && (
            <p className="mt-1 text-sm text-error">{formik.errors.model}</p>
          )}
        </div>

        {/* Daily Rate */}
        <div>
          <label className="label">
            <span className="label-text">Daily Rate</span>
          </label>

          <input
            type="number"
            name="dailyRate"
            className={`input input-bordered w-full ${
              formik.touched.dailyRate && formik.errors.dailyRate
                ? "input-error"
                : ""
            }`}
            value={formik.values.dailyRate}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />

          {formik.touched.dailyRate && formik.errors.dailyRate && (
            <p className="mt-1 text-sm text-error">{formik.errors.dailyRate}</p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className="label">
            <span className="label-text">Quantity</span>
          </label>

          <input
            type="number"
            name="quantity"
            className={`input input-bordered w-full ${
              formik.touched.quantity && formik.errors.quantity
                ? "input-error"
                : ""
            }`}
            value={formik.values.quantity}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />

          {formik.touched.quantity && formik.errors.quantity && (
            <p className="mt-1 text-sm text-error">{formik.errors.quantity}</p>
          )}
        </div>

        {/* Description */}
        <div className="md:col-span-2">
          <label className="label">
            <span className="label-text">Description</span>
          </label>

          <textarea
            name="description"
            rows={4}
            className={`textarea textarea-bordered w-full ${
              formik.touched.description && formik.errors.description
                ? "textarea-error"
                : ""
            }`}
            value={formik.values.description}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />

          {formik.touched.description && formik.errors.description && (
            <p className="mt-1 text-sm text-error">
              {formik.errors.description}
            </p>
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
