"use client";
import React, { useEffect, useMemo, useState } from "react";
import { RentalValidationSchema } from "@/lib/validations/rental.validation";
import { useFormik } from "formik";
import { toast } from "sonner";
import { RentalRow } from "./RentalColumns";
import dayjs from "dayjs";
import { ALL_RENTAL_STATUSES } from "@/utils/constants";

export interface RentalFormValues {
  equipment: string;
  customer: string;
  quantity: number | "";
  status: string;
  rentalDate: string;
  expectedReturnDate: string;
  actualReturnDate: string;
  securityDeposit: number | "";
  notes: string;
}

interface EquipmentOption {
  _id: string;
  name: string;
  dailyRate: number;
  quantity: number;
  status: "available" | "maintenance" | "inactive";
}

interface CustomerOption {
  _id: string;
  firstName: string;
  lastName: string;
}

interface RentalFormProps {
  rental?: RentalRow;
  loading?: boolean;
  update?: boolean;
  submitText?: string;
  onCancel: () => void;
  onSuccess: () => void;
}

// Mirrors the backend STATUS_TRANSITIONS map so the UI never offers a
// transition the API will reject anyway.
const STATUS_TRANSITIONS: Record<string, string[]> = {
  Reserved: ["Reserved", "Rented", "Cancelled"],
  Rented: ["Rented", "Returned", "Cancelled"],
  Returned: [],
  Cancelled: [],
};

function toDateInputValue(value?: string | Date) {
  if (!value) return "";
  const d = dayjs(value);
  return d.isValid() ? d.format("YYYY-MM-DD") : "";
}

export default function RentalForm({
  update = false,
  submitText = "Save Rental",
  onCancel,
  onSuccess,
  rental,
}: RentalFormProps) {
  const [equipmentOptions, setEquipmentOptions] = useState<EquipmentOption[]>(
    []
  );
  const [customerOptions, setCustomerOptions] = useState<CustomerOption[]>([]);
  const [optionsLoading, setOptionsLoading] = useState(true);
  const [serverError, setServerError] = useState<string | null>(null);

  const currentStatus = (rental as any)?.status as string | undefined;
  const isTerminal =
    update && currentStatus
      ? STATUS_TRANSITIONS[currentStatus]?.length === 0
      : false;

  const formik = useFormik<RentalFormValues>({
    initialValues: {
      equipment: rental?.equipment?._id || "",
      customer: rental?.customer?._id || "",
      quantity: rental?.quantity || 1,
      status: currentStatus || "Rented",
      rentalDate: toDateInputValue((rental as any)?.rentalDate),
      expectedReturnDate: toDateInputValue((rental as any)?.expectedReturnDate),
      actualReturnDate: toDateInputValue((rental as any)?.actualReturnDate),
      securityDeposit: rental?.securityDeposit ?? "",
      notes: (rental as any)?.notes || "",
    },

    validationSchema: RentalValidationSchema,
    enableReinitialize: true,

    onSubmit: async (values, { setSubmitting }) => {
      console.log({ values });

      setServerError(null);

      // Client-side guard mirroring the backend transition rules —
      // avoids a round-trip for an update we already know will 409.
      if (update && values.status === "Returned" && !values.actualReturnDate) {
        setServerError("Please provide the actual return date.");
        setSubmitting(false);
        return;
      }

      try {
        const payload: Record<string, unknown> = {
          quantity: Number(values.quantity) || 1,
          status: values.status,
          rentalDate: values.rentalDate,
          expectedReturnDate: values.expectedReturnDate,
          securityDeposit:
            values.securityDeposit === "" ? 0 : Number(values.securityDeposit),
          notes: values.notes,
        };

        // equipmentId/customerId are only relevant (and only editable) on
        // create — the API rejects them on PATCH.
        if (!update) {
          payload.equipmentId = values.equipment;
          payload.customerId = values.customer;
        }

        if (values.status === "Returned" && values.actualReturnDate) {
          payload.actualReturnDate = values.actualReturnDate;
        }

        const res = await fetch(
          update ? `/api/rental/${rental?._id}` : "/api/rental",
          {
            method: update ? "PATCH" : "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(payload),
          }
        );

        const data = await res.json();

        if (!res.ok) {
          setServerError(
            data.message ?? "Something went wrong. Please try again."
          );
          return;
        }

        toast.success(data.message);
        formik.resetForm();
        onSuccess();
      } catch {
        setServerError("Network error. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  useEffect(() => {
    let active = true;

    async function loadData() {
      setOptionsLoading(true);

      try {
        const [equipmentRes, customerRes] = await Promise.all([
          fetch("/api/equipment"),
          fetch("/api/customer"),
        ]);

        const [equipmentJson, customerJson] = await Promise.all([
          equipmentRes.json(),
          customerRes.json(),
        ]);

        if (!active) return;

        if (equipmentRes.ok) setEquipmentOptions(equipmentJson.data ?? []);
        if (customerRes.ok) setCustomerOptions(customerJson.data ?? []);

        if (!equipmentRes.ok || !customerRes.ok) {
          toast.error("Failed to load equipment/customer options.");
        }
      } catch {
        if (active) toast.error("Failed to load equipment/customer options.");
      } finally {
        if (active) setOptionsLoading(false);
      }
    }

    loadData();

    return () => {
      active = false;
    };
  }, []);

  const availableStatusOptions = useMemo(() => {
    // Creating a rental: allow only sensible initial statuses.
    if (!update) {
      return ["Reserved", "Rented"];
    }

    // Editing but no current status.
    if (!currentStatus) {
      return ALL_RENTAL_STATUSES;
    }

    // Current status + allowed transitions (remove duplicates).
    return [currentStatus, ...(STATUS_TRANSITIONS[currentStatus] ?? [])].filter(
      (status, index, array) => array.indexOf(status) === index
    );
  }, [update, currentStatus]);

  const selectedEquipment = equipmentOptions.find(
    (e) => e._id === formik.values.equipment
  );

  if (isTerminal) {
    return (
      <div className="space-y-4">
        <p className="text-base-content/70">
          This rental is already{" "}
          <span className="font-semibold">{currentStatus}</span> and can no
          longer be edited.
        </p>
        <div className="flex justify-end">
          <button type="button" className="btn" onClick={onCancel}>
            Close
          </button>
        </div>
      </div>
    );
  }

  return (
    <form onSubmit={formik.handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {/* Equipment */}
        <div>
          <label className="label">
            <span className="label-text">Equipment</span>
          </label>

          <select
            name="equipment"
            className={`select select-bordered w-full ${
              formik.touched.equipment && formik.errors.equipment
                ? "select-error"
                : ""
            }`}
            value={formik.values.equipment}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            disabled={update || optionsLoading}
          >
            <option value="">Select Equipment</option>

            {equipmentOptions.map((eq) => (
              <option
                key={eq._id}
                value={eq._id}
                disabled={eq.status !== "available"}
              >
                {eq.name} {eq.status !== "available" ? `(${eq.status})` : ""}
              </option>
            ))}
          </select>

          {update && (
            <p className="mt-1 text-xs text-base-content/60">
              Equipment can't be changed after creation. Cancel this rental and
              create a new one instead.
            </p>
          )}

          {formik.touched.equipment && formik.errors.equipment && (
            <p className="mt-1 text-sm text-error">{formik.errors.equipment}</p>
          )}
        </div>

        {/* Customer */}
        <div>
          <label className="label">
            <span className="label-text">Customer</span>
          </label>

          <select
            name="customer"
            className={`select select-bordered w-full ${
              formik.touched.customer && formik.errors.customer
                ? "select-error"
                : ""
            }`}
            value={formik.values.customer}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
            disabled={update || optionsLoading}
          >
            <option value="">Select Customer</option>

            {customerOptions.map((c) => (
              <option key={c._id} value={c._id}>
                {c.firstName} {c.lastName}
              </option>
            ))}
          </select>

          {formik.touched.customer && formik.errors.customer && (
            <p className="mt-1 text-sm text-error">{formik.errors.customer}</p>
          )}
        </div>

        {/* Quantity */}
        <div>
          <label className="label">
            <span className="label-text">Quantity</span>
          </label>

          <input
            type="number"
            min={1}
            max={selectedEquipment?.quantity}
            name="quantity"
            className={`input input-bordered w-full ${
              formik.touched.quantity && formik.errors.quantity
                ? "input-error"
                : ""
            }`}
            disabled={update}
            value={formik.values.quantity}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />

          {selectedEquipment && (
            <p className="mt-1 text-xs text-base-content/60">
              {selectedEquipment.quantity} unit(s) total — availability for your
              dates is confirmed on save.
            </p>
          )}

          {formik.touched.quantity && formik.errors.quantity && (
            <p className="mt-1 text-sm text-error">{formik.errors.quantity}</p>
          )}
        </div>

        {/* Status */}
        <div>
          <label className="label">
            <span className="label-text">Status</span>
          </label>

          <select
            name="status"
            className={`select select-bordered w-full ${
              formik.touched.status && formik.errors.status
                ? "select-error"
                : ""
            }`}
            value={formik.values.status}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          >
            {availableStatusOptions.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          {formik.touched.status && formik.errors.status && (
            <p className="mt-1 text-sm text-error">{formik.errors.status}</p>
          )}
        </div>

        {/* Rental Date */}
        <div>
          <label className="label">
            <span className="label-text">Rental Date</span>
          </label>

          <input
            type="date"
            name="rentalDate"
            className={`input input-bordered w-full ${
              formik.touched.rentalDate && formik.errors.rentalDate
                ? "input-error"
                : ""
            }`}
            disabled={update}
            value={formik.values.rentalDate}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />

          {formik.touched.rentalDate && formik.errors.rentalDate && (
            <p className="mt-1 text-sm text-error">
              {formik.errors.rentalDate}
            </p>
          )}
        </div>

        {/* Expected Return Date */}
        <div>
          <label className="label">
            <span className="label-text">Expected Return Date</span>
          </label>

          <input
            type="date"
            name="expectedReturnDate"
            min={formik.values.rentalDate || undefined}
            className={`input input-bordered w-full ${
              formik.touched.expectedReturnDate &&
              formik.errors.expectedReturnDate
                ? "input-error"
                : ""
            }`}
            value={formik.values.expectedReturnDate}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />

          {formik.touched.expectedReturnDate &&
            formik.errors.expectedReturnDate && (
              <p className="mt-1 text-sm text-error">
                {formik.errors.expectedReturnDate}
              </p>
            )}
        </div>

        {/* Actual Return Date — only relevant once marking as Returned */}
        {formik.values.status === "Returned" && (
          <div>
            <label className="label">
              <span className="label-text">Actual Return Date</span>
            </label>

            <input
              type="date"
              name="actualReturnDate"
              min={formik.values.rentalDate || undefined}
              className="input input-bordered w-full"
              value={formik.values.actualReturnDate}
              onChange={formik.handleChange}
              onBlur={formik.handleBlur}
            />
          </div>
        )}

        {/* Security Deposit */}
        <div>
          <label className="label">
            <span className="label-text">Security Deposit</span>
          </label>

          <input
            type="number"
            min={0}
            step="0.01"
            name="securityDeposit"
            placeholder="0.00"
            disabled={update}
            className={`input input-bordered w-full ${
              formik.touched.securityDeposit && formik.errors.securityDeposit
                ? "input-error"
                : ""
            }`}
            value={formik.values.securityDeposit}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />

          {formik.touched.securityDeposit && formik.errors.securityDeposit && (
            <p className="mt-1 text-sm text-error">
              {formik.errors.securityDeposit}
            </p>
          )}
        </div>

        {/* Notes */}
        <div className="md:col-span-2">
          <label className="label">
            <span className="label-text">Notes</span>
          </label>

          <textarea
            name="notes"
            rows={4}
            className={`textarea textarea-bordered w-full ${
              formik.touched.notes && formik.errors.notes
                ? "textarea-error"
                : ""
            }`}
            value={formik.values.notes}
            onChange={formik.handleChange}
            onBlur={formik.handleBlur}
          />

          {formik.touched.notes && formik.errors.notes && (
            <p className="mt-1 text-sm text-error">{formik.errors.notes}</p>
          )}
        </div>
      </div>

      {serverError && (
        <div className="alert alert-error">
          <span>{serverError}</span>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <button
          type="button"
          className="btn"
          onClick={onCancel}
          disabled={formik.isSubmitting}
        >
          Cancel
        </button>

        <button
          type="submit"
          className="btn btn-primary"
          disabled={formik.isSubmitting}
        >
          {formik.isSubmitting ? "Saving..." : submitText}
        </button>
      </div>
    </form>
  );
}
