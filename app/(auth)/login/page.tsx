"use client";

import Link from "next/link";
import Image from "next/image";
import { useFormik } from "formik";
import * as Yup from "yup";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  CalendarCheck2,
  Headphones,
} from "lucide-react";
import { useAuthStore } from "@/store/useAuthStore";
import ErrorText from "@/components/common/ErrorText";

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
  const setUser = useAuthStore((state) => state.setUser);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

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
        router.push("/dashboard");
        router.refresh();
      } catch {
        setServerError("Network error. Please try again.");
      } finally {
        setSubmitting(false);
      }
    },
  });

  return (
    <div className="relative min-h-screen w-full overflow-hidden">
      {/* Full-bleed background */}
      <Image
        src="/background.png"
        alt="Equipment yard"
        fill
        priority
        className="object-cover"
      />
      {/* Scrim for text legibility */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/55 via-black/25 to-black/10" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/10" />

      {/* Content */}
      <div className="relative flex min-h-screen flex-col justify-between p-6 sm:p-10">
        {/* Logo */}
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-400">
            <svg
              viewBox="0 0 24 24"
              className="h-6 w-6 text-black"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
            >
              <path
                d="M3 21h6l1-4h6l2 4h3"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d="M7 17V9l6-4v6l3 2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <circle cx="7" cy="17" r="1.5" />
            </svg>
          </div>
          <div>
            <p className="text-2xl font-extrabold leading-none text-white drop-shadow-md">
              Equip<span className="text-amber-400">Rent</span>
            </p>
            <p className="text-[11px] font-medium tracking-wider text-white/90 drop-shadow">
              RENT. BUILD. ACHIEVE.
            </p>
          </div>
        </div>

        {/* Middle: headline (left) + floating card (right) */}
        <div className="flex flex-1 flex-col items-center justify-center gap-10 py-10 lg:flex-row lg:items-center lg:justify-between">
          {/* Headline + badges — hidden on small screens to keep card the focus */}
          <div className="hidden max-w-md lg:block">
            <h2 className="text-4xl font-extrabold leading-tight text-white drop-shadow-lg">
              The Right Equipment.
              <br />
              For Every Project.
            </h2>
            <p className="mt-3 text-white/90 drop-shadow">
              Rent high-quality equipment for construction, landscaping, and
              industrial projects.
            </p>

            <div className="mt-6 flex flex-wrap gap-6">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90">
                  <ShieldCheck className="h-5 w-5 text-gray-800" />
                </span>
                <span className="text-sm font-medium text-white drop-shadow">
                  Reliable
                  <br />
                  Equipment
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90">
                  <CalendarCheck2 className="h-5 w-5 text-gray-800" />
                </span>
                <span className="text-sm font-medium text-white drop-shadow">
                  Flexible
                  <br />
                  Rentals
                </span>
              </div>
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 items-center justify-center rounded-full bg-white/90">
                  <Headphones className="h-5 w-5 text-gray-800" />
                </span>
                <span className="text-sm font-medium text-white drop-shadow">
                  24/7
                  <br />
                  Support
                </span>
              </div>
            </div>
          </div>

          {/* Floating card */}
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl sm:p-8 min-h-[500px]">
            <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-amber-50">
              <svg
                viewBox="0 0 24 24"
                className="h-7 w-7 text-amber-500"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
              >
                <circle cx="12" cy="8" r="4" />
                <path
                  d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"
                  strokeLinecap="round"
                />
              </svg>
            </div>

            <h1 className="text-center text-2xl font-bold text-gray-900">
              Welcome Back!
            </h1>
            <p className="mt-1 text-center text-sm text-gray-500">
              Login to your account to continue
            </p>

            <form
              onSubmit={formik.handleSubmit}
              className="mt-6 space-y-4"
              noValidate
            >
              {/* Email */}
              <div>
                <label
                  htmlFor="email"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="email"
                    name="email"
                    type="email"
                    placeholder="Enter your email"
                    className={`w-full rounded-lg border py-2.5 pl-10 pr-3 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 ${
                      formik.touched.email && formik.errors.email
                        ? "border-red-400"
                        : "border-gray-300"
                    }`}
                    value={formik.values.email}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                </div>
                {formik.touched.email && formik.errors.email && (
                  <p className="mt-1 text-sm text-red-500">
                    {formik.errors.email}
                  </p>
                )}
              </div>

              {/* Password */}
              <div>
                <label
                  htmlFor="password"
                  className="mb-1.5 block text-sm font-medium text-gray-700"
                >
                  Password
                </label>
                <div className="relative">
                  <Lock className="pointer-events-none absolute left-3 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-400" />
                  <input
                    id="password"
                    name="password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Enter your password"
                    className={`w-full rounded-lg border py-2.5 pl-10 pr-10 text-sm outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100 ${
                      formik.touched.password && formik.errors.password
                        ? "border-red-400"
                        : "border-gray-300"
                    }`}
                    value={formik.values.password}
                    onChange={formik.handleChange}
                    onBlur={formik.handleBlur}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    tabIndex={-1}
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" />
                    ) : (
                      <Eye className="h-5 w-5" />
                    )}
                  </button>
                </div>
                {formik.touched.password && formik.errors.password && (
                  <p className="mt-1 text-sm text-red-500">
                    {formik.errors.password}
                  </p>
                )}
              </div>

              {serverError ? <ErrorText message={serverError} /> : null}

              <button
                type="submit"
                disabled={formik.isSubmitting}
                className="flex w-full items-center justify-center gap-2 rounded-lg bg-amber-400 py-2.5 text-sm font-semibold text-black transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-70"
              >
                {formik.isSubmitting ? (
                  <>
                    <span className="loading loading-spinner loading-sm"></span>
                    Signing In...
                  </>
                ) : (
                  "Log In"
                )}
              </button>
            </form>

            <p className="mt-5 text-center text-sm text-gray-600">
              Don't have an account?{" "}
              <Link
                href="/signup"
                className="font-semibold text-amber-600 hover:text-amber-700"
              >
                Sign Up
              </Link>
            </p>
          </div>
        </div>

        {/* Bottom trust bar */}
        <div className="flex flex-wrap justify-center gap-6 text-sm font-medium text-white drop-shadow lg:justify-start">
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-amber-400" /> Well Maintained
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-amber-400" /> Trusted by Pros
          </span>
          <span className="flex items-center gap-1.5">
            <ShieldCheck className="h-4 w-4 text-amber-400" /> Available Near
            You
          </span>
        </div>
      </div>
    </div>
  );
}
