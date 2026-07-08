"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import dayjs from "dayjs";
import { toast } from "sonner";
import {
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  AlertTriangle,
  Boxes,
  Users,
  DollarSign,
  TrendingUp,
  Wallet,
  PiggyBank,
} from "lucide-react";

interface DashboardStats {
  equipment: {
    totalItems: number;
    totalUnits: number;
    available: number;
    maintenance: number;
    inactive: number;
  };
  rentals: {
    reserved: number;
    rented: number;
    returned: number;
    cancelled: number;
    overdue: number;
    total: number;
  };
  revenue: {
    deposits: number;
    rentalCharges: number;
    refunds: number;
    net: number;
    last30Days: {
      deposits: number;
      rentalCharges: number;
      refunds: number;
      net: number;
    };
    monthly: { label: string; net: number }[];
  };
  customers: {
    total: number;
  };
  topEquipment: { equipmentId: string; name: string; rentalCount: number }[];
  recentRentals: any[];
  upcomingReturns: any[];
}

function StatCard({
  label,
  value,
  sub,
  icon: Icon,
  iconBg,
  iconColor,
}: {
  label: string;
  value: string | number;
  sub?: string;
  icon: React.ElementType;
  iconBg: string;
  iconColor: string;
}) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-white p-5 shadow-md shadow-gray-200/50 transition hover:shadow-lg hover:shadow-gray-200/70">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium text-gray-500">{label}</p>
          <p className="mt-1 break-words text-2xl font-bold text-gray-900">
            {value}
          </p>
          {sub && <p className="mt-1 truncate text-xs text-gray-400">{sub}</p>}
        </div>
        <span
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${iconBg}`}
        >
          <Icon className={`h-5 w-5 ${iconColor}`} />
        </span>
      </div>
    </div>
  );
}

function Panel({
  title,
  children,
  className = "",
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`rounded-2xl border border-gray-100 bg-white p-4 sm:p-5 shadow-md shadow-gray-200/50 ${className}`}
    >
      <h2 className="mb-4 text-lg font-semibold text-gray-900">{title}</h2>
      {children}
    </div>
  );
}

function customerName(c: any) {
  if (!c) return "—";
  return `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim() || "—";
}

export default function Dashboard() {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    let active = true;

    async function fetchStats() {
      setIsLoading(true);

      try {
        const res = await fetch("/api/dashboard/stats");
        const json = await res.json();

        if (!res.ok) {
          if (active) toast.error(json.message ?? "Failed to load dashboard.");
          return;
        }

        if (active) setStats(json);
      } catch {
        if (active) toast.error("Network error while loading dashboard.");
      } finally {
        if (active) setIsLoading(false);
      }
    }

    fetchStats();

    return () => {
      active = false;
    };
  }, []);

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gray-50">
        <span className="loading loading-spinner loading-lg text-primary" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="min-h-screen bg-gray-50 p-4 sm:p-8">
        <p className="text-gray-500">Couldn't load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="mx-auto max-w-7xl space-y-6 p-4 sm:space-y-8 sm:p-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 sm:text-3xl">
            Dashboard
          </h1>
          <p className="text-sm text-gray-500 sm:text-base">
            Overview of your rental business.
          </p>
        </div>

        {/* Overdue banner */}
        {stats.rentals.overdue > 0 && (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 shadow-sm sm:items-center">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-amber-100">
              <AlertTriangle className="h-5 w-5 text-amber-600" />
            </span>
            <span className="text-sm text-amber-900">
              {stats.rentals.overdue} rental
              {stats.rentals.overdue > 1 ? "s are" : " is"} overdue for return.{" "}
              <Link
                href="/rentals?status=Rented"
                className="font-semibold underline underline-offset-2"
              >
                View rentals
              </Link>
            </span>
          </div>
        )}

        {/* Top-level stats */}
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <StatCard
            label="Active Rentals"
            value={stats.rentals.rented + stats.rentals.reserved}
            sub={`${stats.rentals.rented} rented, ${stats.rentals.reserved} reserved`}
            icon={Boxes}
            iconBg="bg-blue-50"
            iconColor="text-blue-600"
          />
          <StatCard
            label="Available Units"
            value={stats.equipment.available}
            sub={`of ${stats.equipment.totalUnits} total units`}
            icon={TrendingUp}
            iconBg="bg-violet-50"
            iconColor="text-violet-600"
          />
          <StatCard
            label="Total Customers"
            value={stats.customers.total}
            icon={Users}
            iconBg="bg-amber-50"
            iconColor="text-amber-600"
          />
          <StatCard
            label="Net Revenue"
            value={`$${stats.revenue.net.toFixed(2)}`}
            sub="all-time"
            icon={DollarSign}
            iconBg="bg-emerald-50"
            iconColor="text-emerald-600"
          />
        </div>

        {/* Revenue breakdown */}
        <div className="space-y-3">
          <h2 className="text-lg font-semibold text-gray-900 sm:text-xl">
            Revenue (Last 30 Days)
          </h2>

          <div className="grid grid-cols-1 gap-4 lg:grid-cols-3">
            <StatCard
              label="Deposits Collected"
              value={`$${stats.revenue.last30Days.deposits.toFixed(2)}`}
              icon={PiggyBank}
              iconBg="bg-sky-50"
              iconColor="text-sky-600"
            />
            <StatCard
              label="Rental Charges"
              value={`$${stats.revenue.last30Days.rentalCharges.toFixed(2)}`}
              icon={Wallet}
              iconBg="bg-emerald-50"
              iconColor="text-emerald-600"
            />
            <StatCard
              label="Net (30d)"
              value={`$${stats.revenue.last30Days.net.toFixed(2)}`}
              icon={TrendingUp}
              iconBg="bg-gray-100"
              iconColor="text-gray-700"
            />
          </div>
        </div>

        {/* Revenue trend chart */}
        <Panel title="Net Revenue — Last 6 Months">
          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                data={stats.revenue.monthly}
                margin={{ left: -20, right: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis
                  dataKey="label"
                  stroke="#9ca3af"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  stroke="#9ca3af"
                  fontSize={11}
                  tickLine={false}
                  axisLine={false}
                />
                <Tooltip
                  cursor={{ fill: "#f3f4f6" }}
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e5e7eb",
                    boxShadow: "0 4px 12px rgba(0,0,0,0.08)",
                  }}
                  formatter={(value) => {
                    const amount =
                      typeof value === "number" ? value : Number(value ?? 0);
                    return [`$${amount.toFixed(2)}`, "Net"];
                  }}
                />
                <Bar dataKey="net" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Panel>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Rental status breakdown */}
          <Panel title="Rentals by Status">
            <div className="space-y-4">
              <StatusBar
                label="Refreshed / Reserved"
                count={stats.rentals.reserved}
                total={stats.rentals.total}
                colorClass="bg-sky-500"
              />
              <StatusBar
                label="Rented"
                count={stats.rentals.rented}
                total={stats.rentals.total}
                colorClass="bg-emerald-500"
              />
              <StatusBar
                label="Returned"
                count={stats.rentals.returned}
                total={stats.rentals.total}
                colorClass="bg-gray-400"
              />
              <StatusBar
                label="Cancelled"
                count={stats.rentals.cancelled}
                total={stats.rentals.total}
                colorClass="bg-red-500"
              />
            </div>
          </Panel>

          {/* Top rented equipment */}
          <Panel title="Top Rented Equipment">
            {stats.topEquipment.length === 0 ? (
              <p className="text-sm text-gray-400">No rentals yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats.topEquipment.map((eq) => (
                  <li
                    key={eq.equipmentId}
                    className="flex items-center justify-between gap-4 py-2.5 first:pt-0 last:pb-0"
                  >
                    <span className="text-sm font-medium text-gray-700 truncate">
                      {eq.name}
                    </span>
                    <span className="shrink-0 rounded-full bg-gray-100 px-2.5 py-1 text-xs font-semibold text-gray-600">
                      {eq.rentalCount} rentals
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>

        <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
          {/* Upcoming returns */}
          <Panel title="Upcoming Returns (7 days)">
            {stats.upcomingReturns.length === 0 ? (
              <p className="text-sm text-gray-400">Nothing due soon.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats.upcomingReturns.map((r) => (
                  <li
                    key={r._id}
                    className="flex items-center justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-gray-800 truncate">
                        {r.equipmentId?.name ?? "Deleted equipment"}
                      </div>
                      <div className="text-gray-400 truncate">
                        {customerName(r.customerId)}
                      </div>
                    </div>
                    <span className="shrink-0 font-medium text-gray-500">
                      {dayjs(r.expectedReturnDate).format("MMM D")}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>

          {/* Recent activity */}
          <Panel title="Recent Rentals">
            {stats.recentRentals.length === 0 ? (
              <p className="text-sm text-gray-400">No rentals yet.</p>
            ) : (
              <ul className="divide-y divide-gray-100">
                {stats.recentRentals.map((r) => (
                  <li
                    key={r._id}
                    className="flex items-center justify-between gap-4 py-2.5 text-sm first:pt-0 last:pb-0"
                  >
                    <div className="min-w-0">
                      <div className="font-medium text-gray-800 truncate">
                        {r.equipmentId?.name ?? "Deleted equipment"}
                      </div>
                      <div className="text-gray-400 truncate">
                        {customerName(r.customerId)}
                      </div>
                    </div>
                    <span className="shrink-0 rounded-full border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-600">
                      {r.status}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </Panel>
        </div>
      </div>
    </div>
  );
}

function StatusBar({
  label,
  count,
  total,
  colorClass,
}: {
  label: string;
  count: number;
  total: number;
  colorClass: string;
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0;

  return (
    <div>
      <div className="mb-1.5 flex justify-between text-sm">
        <span className="font-medium text-gray-700 truncate pr-2">{label}</span>
        <span className="text-gray-400 shrink-0">{count}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-gray-100">
        <div
          className={`h-full rounded-full ${colorClass} transition-all`}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
