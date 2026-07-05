"use client";

import Link from "next/link";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";

interface RegisterFormValues {
  firstName: string;
  lastName: string;
  email: string;
  password: string;
  confirmPassword: string;
}

const validationSchema = Yup.object({
  firstName: Yup.string()
    .max(50, "First name cannot exceed 50 characters.")
    .required("First name is required."),

  lastName: Yup.string()
    .max(50, "Last name cannot exceed 50 characters.")
    .required("Last name is required."),

  email: Yup.string()
    .email("Please enter a valid email address.")
    .required("Email is required."),

  password: Yup.string()
    .min(8, "Password must be at least 8 characters.")
    .matches(/[A-Z]/, "Must contain at least one uppercase letter.")
    .matches(/[a-z]/, "Must contain at least one lowercase letter.")
    .matches(/[0-9]/, "Must contain at least one number.")
    .required("Password is required."),

  confirmPassword: Yup.string()
    .oneOf([Yup.ref("password")], "Passwords do not match.")
    .required("Please confirm your password."),
});

export default function Signup() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const formik = useFormik<RegisterFormValues>({
    initialValues: {
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      confirmPassword: "",
    },

    validationSchema,

    onSubmit: async (values, { setSubmitting }) => {
      const { confirmPassword, ...payload } = values;
      setServerError(null);
      try {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          setServerError(
            data.message ?? "Registration failed. Please try again."
          );
          return;
        }
        toast.success("Registration successful, please login.");
        router.push("/login"); // redirect to wherever makes sense
        router.refresh();
      } catch {
        setServerError("Network error. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200 px-4 py-10">
      <div className="card w-full max-w-lg bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="text-center text-3xl font-bold">Create Account</h1>

          <p className="text-center text-base-content/70">
            Create your account to start renting equipment.
          </p>

          <form
            onSubmit={formik.handleSubmit}
            className="mt-6 space-y-5"
            noValidate
          >
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label htmlFor="firstName" className="label">
                  <span className="label-text">First Name</span>
                </label>

                <input
                  id="firstName"
                  name="firstName"
                  type="text"
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
                  <p className="mt-1 text-sm text-error">
                    {formik.errors.firstName}
                  </p>
                )}
              </div>

              <div>
                <label htmlFor="lastName" className="label">
                  <span className="label-text">Last Name</span>
                </label>

                <input
                  id="lastName"
                  name="lastName"
                  type="text"
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
                  <p className="mt-1 text-sm text-error">
                    {formik.errors.lastName}
                  </p>
                )}
              </div>
            </div>

            <div>
              <label htmlFor="email" className="label">
                <span className="label-text">Email</span>
              </label>

              <input
                id="email"
                name="email"
                type="email"
                className={`input input-bordered w-full ${
                  formik.touched.email && formik.errors.email
                    ? "input-error"
                    : ""
                }`}
                value={formik.values.email}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />

              {formik.touched.email && formik.errors.email && (
                <p className="mt-1 text-sm text-error">{formik.errors.email}</p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="label">
                <span className="label-text">Password</span>
              </label>

              <input
                id="password"
                name="password"
                type="password"
                className={`input input-bordered w-full ${
                  formik.touched.password && formik.errors.password
                    ? "input-error"
                    : ""
                }`}
                value={formik.values.password}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />

              {formik.touched.password && formik.errors.password && (
                <p className="mt-1 text-sm text-error">
                  {formik.errors.password}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="confirmPassword" className="label">
                <span className="label-text">Confirm Password</span>
              </label>

              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                className={`input input-bordered w-full ${
                  formik.touched.confirmPassword &&
                  formik.errors.confirmPassword
                    ? "input-error"
                    : ""
                }`}
                value={formik.values.confirmPassword}
                onChange={formik.handleChange}
                onBlur={formik.handleBlur}
              />

              {formik.touched.confirmPassword &&
                formik.errors.confirmPassword && (
                  <p className="mt-1 text-sm text-error">
                    {formik.errors.confirmPassword}
                  </p>
                )}
            </div>
            {serverError && (
              <p className="text-error text-sm text-center mb-2">
                {serverError}
              </p>
            )}
            <button
              type="submit"
              className={`btn btn-primary w-full ${
                formik.isSubmitting ? "btn-disabled" : ""
              }`}
              disabled={formik.isSubmitting}
            >
              {formik.isSubmitting ? (
                <>
                  <span className="loading loading-spinner loading-sm"></span>
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </button>
          </form>

          <div className="divider">OR</div>

          <p className="text-center text-sm">
            Already have an account?{" "}
            <Link href="/login" className="link link-primary font-semibold">
              Sign In
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
