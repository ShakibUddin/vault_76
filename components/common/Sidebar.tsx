"use client";

import { useAuthStore } from "@/store/useAuthStore";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

const navigation = [
  {
    name: "Dashboard",
    href: "/dashboard",
  },
  {
    name: "Equipments",
    href: "/equipments",
  },
  {
    name: "Customers",
    href: "/customers",
  },
  {
    name: "Rentals",
    href: "/rentals",
  },
  {
    name: "Payments",
    href: "/payments",
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
      {/* Logo */}
      <div className="border-b border-base-300 p-6">
        <h1 className="text-2xl font-bold text-primary">Vault 76</h1>

        <p className="text-sm text-base-content/60">Equipment Rental System</p>
        <span>Hi, {user?.firstName}</span>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4">
        <ul className="menu w-full">
          {navigation.map((item) => (
            <li key={item.href}>
              <Link
                href={item.href}
                className={pathname === item.href ? "active" : ""}
              >
                {item.name}
              </Link>
            </li>
          ))}
        </ul>
      </nav>

      {/* Logout */}
      <div className="border-t border-base-300 p-4">
        <button
          onClick={handleLogout}
          className="btn btn-error w-full"
          disabled={loggingOut}
        >
          Logout
        </button>
      </div>
    </aside>
  );
}
