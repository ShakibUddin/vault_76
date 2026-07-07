"use client";

import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import {
  LayoutDashboard,
  Wrench,
  Users,
  ClipboardList,
  CreditCard,
} from "lucide-react";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
  },
  {
    name: "Equipments",
    href: "/equipments",
    icon: Wrench,
  },
  {
    name: "Customers",
    href: "/customers",
    icon: Users,
  },
  {
    name: "Rentals",
    href: "/rentals",
    icon: ClipboardList,
  },
  {
    name: "Payments",
    href: "/payments",
    icon: CreditCard,
  },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  const [loggingOut, setLoggingOut] = useState(false);
  const { user, isLoading, setUser } = useAuthStore();

  if (isLoading) return null; // or a skeleton
  async function handleLogout() {
    try {
      setLoggingOut(true);
      const response = await fetch("/api/auth/logout", {
        method: "POST",
      });

      if (!response.ok) {
        toast.error("Logout failed.");
        throw new Error("Logout failed.");
      }
      setUser(null);
      setLoggingOut(false);
      router.replace("/login");
      router.refresh();
    } catch (error) {
      setLoggingOut(false);
      console.error(error);
    }
  }

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-base-300 bg-base-100">
      {/* Header */}
      <div className="border-b border-base-300 p-6">
        <h1 className="text-3xl font-bold text-primary">Vault 76</h1>

        <p className="mt-1 text-sm text-base-content/60">
          Equipment Rental System
        </p>

        <div className="mt-4 rounded-box bg-base-200 p-3">
          <div className="text-sm text-base-content/60">Logged in as</div>
          <div className="font-semibold">
            {user?.firstName} {user?.lastName}
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="menu gap-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active = pathname === item.href;

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  className={`flex items-center gap-3 rounded-lg transition-all ${
                    active
                      ? "bg-primary text-primary-content"
                      : "hover:bg-base-200"
                  }`}
                >
                  <Icon size={18} />
                  <span>{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer */}
      <div className="border-t border-base-300 p-4">
        <button
          onClick={handleLogout}
          className="btn bg-primary text-white w-full"
          disabled={loggingOut}
        >
          {loggingOut ? (
            <>
              <span className="loading loading-spinner loading-xs" />
              Logging out...
            </>
          ) : (
            <>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="h-4 w-4"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a2 2 0 01-2 2H6a2 2 0 01-2-2V7a2 2 0 012-2h5a2 2 0 012 2v1"
                />
              </svg>
              Logout
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
