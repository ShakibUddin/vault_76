"use client";

import { ColumnDef } from "@tanstack/react-table";
import { IEquipment } from "@/models/Equipment";

// The API returns lean() documents, so _id comes through as a plain object.
export interface EquipmentRow extends IEquipment {
  _id: string;
}

const statusBadgeClass: Record<IEquipment["status"], string> = {
  available: "badge-success",
  maintenance: "badge-warning",
  inactive: "badge-neutral",
};

interface GetColumnsOptions {
  onEdit: (row: EquipmentRow) => void;
  onDelete: (row: EquipmentRow) => void;
}

export function getEquipmentColumns({
  onEdit,
  onDelete,
}: GetColumnsOptions): ColumnDef<EquipmentRow>[] {
  return [
    {
      accessorKey: "name",
      header: "Name",
      cell: ({ row }) => <div className="font-medium">{row.original.name}</div>,
    },
    {
      accessorKey: "category",
      header: "Category",
    },
    {
      accessorKey: "brand",
      header: "Brand / Model",
      cell: ({ row }) => (
        <span>
          {row.original.brand} <span className="text-base-content/50">/</span>{" "}
          {row.original.model}
        </span>
      ),
    },
    {
      accessorKey: "dailyRate",
      header: "Daily Rate",
      cell: ({ row }) => `$${row.original.dailyRate.toFixed(2)}`,
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
