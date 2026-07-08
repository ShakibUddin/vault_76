"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";

import { useAuthStore } from "@/store/useAuthStore";

import {
  ClipboardList,
  CreditCard,
  LayoutDashboard,
  LogOut,
  Users,
  Wrench,
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

  if (isLoading) return null;

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

      toast.success("Logged out successfully.");

      router.replace("/login");
      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Something went wrong.");
    } finally {
      setLoggingOut(false);
    }
  }

  return (
    <aside className="flex h-screen w-20 md:w-72 flex-col border-r border-base-300 bg-base-100 shadow-xl transition-all duration-300">
      {/* Logo Section */}
      <div className="border-b border-base-300 px-3 md:px-6 py-5">
        <Link
          href="/dashboard"
          className="flex items-center justify-center md:justify-start gap-4 transition-opacity hover:opacity-90"
        >
          <div className="flex h-12 w-12 md:h-14 md:w-14 shrink-0 items-center justify-center rounded-2xl bg-primary/10">
            <Image
              src="/logo.png"
              alt="EquipRent Logo"
              width={32}
              height={32}
              className="md:h-10 md:w-10"
              priority
            />
          </div>

          <div className="hidden md:block">
            <h1 className="text-2xl font-extrabold tracking-tight">
              Equip<span className="text-primary">Rent</span>
            </h1>
            <p className="text-xs uppercase tracking-[0.2em] text-base-content/60">
              Equipment Rental
            </p>
          </div>
        </Link>

        {/* Profile Summary - Only visible on desktop */}
        <div className="hidden md:block mt-6 rounded-2xl border border-base-300 bg-base-200 p-4">
          <p className="text-xs uppercase tracking-wide text-base-content/50">
            Logged in as
          </p>
          <p className="mt-1 text-base font-semibold truncate">
            {user?.firstName} {user?.lastName}
          </p>
          <p className="text-sm text-base-content/60 truncate">{user?.email}</p>
        </div>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-2 md:px-4 py-5">
        <ul className="space-y-2">
          {navigation.map((item) => {
            const Icon = item.icon;
            const active =
              pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <li key={item.href}>
                <Link
                  href={item.href}
                  title={item.name} /* Tooltip on mobile hover */
                  className={`flex items-center justify-center md:justify-start gap-3 rounded-xl p-3 md:px-4 md:py-3 font-medium transition-all duration-200 ${
                    active
                      ? "bg-primary text-primary-content shadow-md"
                      : "text-base-content hover:bg-base-200 hover:text-primary"
                  }`}
                >
                  <Icon size={20} className="shrink-0" />
                  <span className="hidden md:block truncate">{item.name}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Footer / Logout */}
      <div className="border-t border-base-300 p-3 md:p-4">
        <button
          onClick={handleLogout}
          disabled={loggingOut}
          title="Logout"
          className="btn btn-primary w-full rounded-xl flex items-center justify-center md:gap-2 px-0 md:px-4"
        >
          {loggingOut ? (
            <>
              <span className="loading loading-spinner loading-xs" />
              <span className="hidden md:block">Logging out...</span>
            </>
          ) : (
            <>
              <LogOut size={18} className="shrink-0" />
              <span className="hidden md:block">Logout</span>
            </>
          )}
        </button>
      </div>
    </aside>
  );
}
