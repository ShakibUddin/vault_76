"use client";

import { ColumnDef } from "@tanstack/react-table";
import { IRental } from "@/models/Rental";

export interface RentalRow extends Omit<IRental, "equipment" | "customer"> {
  _id: string;

  equipment: {
    _id: string;
    name: string;
  };

  customer: {
    _id: string;
    firstName: string;
    lastName: string;
  };
}

const statusBadgeClass: Record<RentalRow["status"], string> = {
  Reserved: "badge-warning",
  Rented: "badge-primary",
  Returned: "badge-success",
  Cancelled: "badge-error",
};

interface GetColumnsOptions {
  onEdit: (row: RentalRow) => void;
  onDelete: (row: RentalRow) => void;
}

export function getRentalColumns({
  onEdit,
  onDelete,
}: GetColumnsOptions): ColumnDef<RentalRow>[] {
  return [
    {
      accessorKey: "equipment.name",
      header: "Equipment",
      cell: ({ row }) => (
        <div className="font-medium">{row.original.equipment.name}</div>
      ),
    },
    {
      accessorKey: "customer.name",
      header: "Customer",
      cell: ({ row }) =>
        row.original.customer.firstName + " " + row.original.customer.lastName,
    },
    {
      accessorKey: "quantity",
      header: "Qty",
    },
    {
      accessorKey: "status",
      header: "Status",
      cell: ({ row }) => (
        <span className={`badge ${statusBadgeClass[row.original.status]}`}>
          {row.original.status}
        </span>
      ),
    },
    {
      accessorKey: "rentalDate",
      header: "Rental Date",
      cell: ({ row }) => new Date(row.original.rentalDate).toLocaleDateString(),
    },
    {
      accessorKey: "expectedReturnDate",
      header: "Expected Return",
      cell: ({ row }) =>
        new Date(row.original.expectedReturnDate).toLocaleDateString(),
    },
    {
      accessorKey: "securityDeposit",
      header: "Deposit",
      cell: ({ row }) => `$${row.original.securityDeposit.toFixed(2)}`,
    },
    {
      accessorKey: "notes",
      header: "Notes",
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.notes}>
          {row.original.notes}
        </div>
      ),
    },
    {
      id: "actions",
      header: "",
      cell: ({ row }) => (
        <div className="flex justify-end gap-2">
          <button
            className="btn btn-ghost btn-xs"
            onClick={() => onEdit(row.original)}
          >
            Edit
          </button>

          <button
            className="btn btn-ghost btn-xs text-error"
            onClick={() => onDelete(row.original)}
          >
            Delete
          </button>
        </div>
      ),
    },
  ];
}
