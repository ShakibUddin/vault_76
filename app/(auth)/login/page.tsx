"use client";

import Link from "next/link";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRouter, useSearchParams } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { useAuthStore } from "@/store/useAuthStore";

interface LoginFormValues {
  email: string;
  password: string;
}

const validationSchema = Yup.object({
  email: Yup.string()
    .email("Please enter a valid email address.")
    .required("Email is required."),
  password: Yup.string()
    .min(8, "Password must be at least 8 characters.")
    .required("Password is required."),
});

export default function Login() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const setUser = useAuthStore((state) => state.setUser);
  const [serverError, setServerError] = useState<string | null>(null);
  const formik = useFormik<LoginFormValues>({
    initialValues: { email: "", password: "" },
    validationSchema,
    onSubmit: async (values, { setSubmitting }) => {
      setServerError(null);
      try {
        const res = await fetch("/api/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(values),
        });

        const data = await res.json();

        if (!res.ok) {
          setServerError(data.message ?? "Login failed. Please try again.");
          return;
        }
        toast.success("Loggedin successfully.");

        setUser(data.user); // update Zustand immediately, no extra fetch needed
        router.push(searchParams.get("from") ?? "/dashboard");
        router.refresh();
      } catch {
        setServerError("Network error. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="flex min-h-screen items-center justify-center bg-base-200 px-4">
      <div className="card w-full max-w-md bg-base-100 shadow-xl">
        <div className="card-body">
          <h1 className="text-3xl font-bold text-center">Sign In</h1>

          <p className="text-center text-base-content/70">
            Welcome back! Please sign in to continue.
          </p>

          <form
            onSubmit={formik.handleSubmit}
            className="mt-4 space-y-5"
            noValidate
          >
            {/* Email */}
            <div>
              <label htmlFor="email" className="label">
                <span className="label-text">Email</span>
              </label>

              <input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
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

            {/* Password */}
            <div>
              <div className="flex justify-between">
                <label htmlFor="password" className="label">
                  <span className="label-text">Password</span>
                </label>

                <Link
                  href="/forgot-password"
                  className="label-text-alt link link-hover"
                >
                  Forgot Password?
                </Link>
              </div>

              <input
                id="password"
                name="password"
                type="password"
                placeholder="••••••••"
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
                  Signing In...
                </>
              ) : (
                "Sign In"
              )}
            </button>
          </form>

          <div className="divider">OR</div>

          <p className="text-center text-sm">
            Don't have an account?{" "}
            <Link href="/signup" className="link link-primary font-semibold">
              Sign Up
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
