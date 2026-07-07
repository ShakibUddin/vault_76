"use client";

import { ColumnDef } from "@tanstack/react-table";
import dayjs from "dayjs";

export interface PaymentRow {
  _id: string;
  type: "Deposit" | "Rental" | "Refund";
  amount: number;
  quantity?: number;
  dailyRate?: number;
  daysCharged?: number;
  lateDays?: number;
  depositApplied?: number;
  method: string;
  notes?: string;
  equipment?: { _id: string; name: string } | null;
  customer?: { _id: string; firstName: string; lastName: string } | null;
  rentalId?: string;
  createdAt: string;
}

interface GetPaymentColumnsArgs {
  onView: (row: PaymentRow) => void;
}

const typeBadgeClass: Record<PaymentRow["type"], string> = {
  Deposit: "badge-info",
  Rental: "badge-success",
  Refund: "badge-warning",
};

export function getPaymentColumns({
  onView,
}: GetPaymentColumnsArgs): ColumnDef<PaymentRow>[] {
  return [
    {
      header: "Date",
      accessorKey: "createdAt",
      cell: ({ row }) => dayjs(row.original.createdAt).format("MMM D, YYYY"),
    },
    {
      header: "Type",
      accessorKey: "type",
      cell: ({ row }) => (
        <span className={`badge ${typeBadgeClass[row.original.type]}`}>
          {row.original.type}
        </span>
      ),
    },
    {
      header: "Customer",
      accessorFn: (row) =>
        row.customer
          ? `${row.customer.firstName} ${row.customer.lastName}`
          : "—",
    },
    {
      header: "Equipment",
      accessorFn: (row) => row.equipment?.name ?? "—",
    },
    {
      header: "Amount",
      accessorKey: "amount",
      cell: ({ row }) => `$${row.original.amount.toFixed(2)}`,
    },
    {
      header: "Method",
      accessorKey: "method",
    },
    {
      header: "Actions",
      id: "actions",
      cell: ({ row }) => (
        <button
          className="btn btn-ghost btn-sm"
          onClick={() => onView(row.original)}
        >
          View
        </button>
      ),
    },
  ];
}
