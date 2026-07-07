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
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: string;
}) {
  return (
    <div className="stat rounded-box bg-base-200">
      <div className="stat-title">{label}</div>
      <div className={`stat-value text-2xl ${accent ?? ""}`}>{value}</div>
      {sub && <div className="stat-desc">{sub}</div>}
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
      <div className="flex items-center justify-center p-16">
        <span className="loading loading-spinner loading-lg" />
      </div>
    );
  }

  if (!stats) {
    return (
      <div className="p-8">
        <p className="text-base-content/70">Couldn't load dashboard data.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 p-8">
      <div>
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <p className="text-base-content/70">
          Overview of your rental business.
        </p>
      </div>

      {/* Overdue banner — surfaced up top since it needs action */}
      {stats.rentals.overdue > 0 && (
        <div className="alert alert-warning">
          <span>
            {stats.rentals.overdue} rental
            {stats.rentals.overdue > 1 ? "s are" : " is"} overdue for return.{" "}
            <Link href="/rentals?status=Rented" className="link">
              View rentals
            </Link>
          </span>
        </div>
      )}

      {/* Top-level stats */}
      <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
        <StatCard
          label="Active Rentals"
          value={stats.rentals.rented + stats.rentals.reserved}
          sub={`${stats.rentals.rented} rented, ${stats.rentals.reserved} reserved`}
        />
        <StatCard
          label="Available Units"
          value={stats.equipment.available}
          sub={`of ${stats.equipment.totalUnits} total units`}
        />
        <StatCard label="Total Customers" value={stats.customers.total} />
        <StatCard
          label="Net Revenue"
          value={`$${stats.revenue.net.toFixed(2)}`}
          sub="all-time"
          accent="text-success"
        />
      </div>

      {/* Revenue breakdown */}
      <div>
        <h2 className="mb-3 text-xl font-semibold">Revenue (Last 30 Days)</h2>

        <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
          <StatCard
            label="Deposits Collected"
            value={`$${stats.revenue.last30Days.deposits.toFixed(2)}`}
            accent="text-info"
          />
          <StatCard
            label="Rental Charges"
            value={`$${stats.revenue.last30Days.rentalCharges.toFixed(2)}`}
            accent="text-success"
          />
          <StatCard
            label="Refunds"
            value={`$${stats.revenue.last30Days.refunds.toFixed(2)}`}
            accent="text-warning"
          />
          <StatCard
            label="Net (30d)"
            value={`$${stats.revenue.last30Days.net.toFixed(2)}`}
          />
        </div>
      </div>

      {/* Revenue trend chart */}
      <div className="rounded-box bg-base-200 p-4">
        <h2 className="mb-3 text-xl font-semibold">
          Net Revenue — Last 6 Months
        </h2>

        <div className="h-64 w-full">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={stats.revenue.monthly}>
              <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
              <XAxis dataKey="label" />
              <YAxis />
              <Tooltip
                formatter={(value: number) => [`$${value.toFixed(2)}`, "Net"]}
              />
              <Bar
                dataKey="net"
                fill="currentColor"
                className="text-primary"
                radius={[4, 4, 0, 0]}
              />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Rental status breakdown */}
        <div className="rounded-box bg-base-200 p-4">
          <h2 className="mb-3 text-xl font-semibold">Rentals by Status</h2>

          <div className="space-y-2">
            <StatusBar
              label="Reserved"
              count={stats.rentals.reserved}
              total={stats.rentals.total}
              colorClass="bg-info"
            />
            <StatusBar
              label="Rented"
              count={stats.rentals.rented}
              total={stats.rentals.total}
              colorClass="bg-success"
            />
            <StatusBar
              label="Returned"
              count={stats.rentals.returned}
              total={stats.rentals.total}
              colorClass="bg-neutral"
            />
            <StatusBar
              label="Cancelled"
              count={stats.rentals.cancelled}
              total={stats.rentals.total}
              colorClass="bg-error"
            />
          </div>
        </div>

        {/* Top rented equipment */}
        <div className="rounded-box bg-base-200 p-4">
          <h2 className="mb-3 text-xl font-semibold">Top Rented Equipment</h2>

          {stats.topEquipment.length === 0 ? (
            <p className="text-sm text-base-content/60">No rentals yet.</p>
          ) : (
            <ul className="space-y-2">
              {stats.topEquipment.map((eq) => (
                <li
                  key={eq.equipmentId}
                  className="flex items-center justify-between"
                >
                  <span>{eq.name}</span>
                  <span className="badge badge-neutral">
                    {eq.rentalCount} rentals
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Upcoming returns */}
        <div className="rounded-box bg-base-200 p-4">
          <h2 className="mb-3 text-xl font-semibold">
            Upcoming Returns (7 days)
          </h2>

          {stats.upcomingReturns.length === 0 ? (
            <p className="text-sm text-base-content/60">Nothing due soon.</p>
          ) : (
            <ul className="space-y-3">
              {stats.upcomingReturns.map((r) => (
                <li
                  key={r._id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {r.equipmentId?.name ?? "Deleted equipment"}
                    </div>
                    <div className="text-base-content/60">
                      {customerName(r.customerId)}
                    </div>
                  </div>
                  <span className="text-base-content/70">
                    {dayjs(r.expectedReturnDate).format("MMM D")}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {/* Recent activity */}
        <div className="rounded-box bg-base-200 p-4">
          <h2 className="mb-3 text-xl font-semibold">Recent Rentals</h2>

          {stats.recentRentals.length === 0 ? (
            <p className="text-sm text-base-content/60">No rentals yet.</p>
          ) : (
            <ul className="space-y-3">
              {stats.recentRentals.map((r) => (
                <li
                  key={r._id}
                  className="flex items-center justify-between text-sm"
                >
                  <div>
                    <div className="font-medium">
                      {r.equipmentId?.name ?? "Deleted equipment"}
                    </div>
                    <div className="text-base-content/60">
                      {customerName(r.customerId)}
                    </div>
                  </div>
                  <span className="badge badge-outline">{r.status}</span>
                </li>
              ))}
            </ul>
          )}
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
      <div className="mb-1 flex justify-between text-sm">
        <span>{label}</span>
        <span className="text-base-content/60">{count}</span>
      </div>
      <div className="h-2 w-full overflow-hidden rounded-full bg-base-300">
        <div className={`h-full ${colorClass}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}
