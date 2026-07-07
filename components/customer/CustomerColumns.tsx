"use client";

import { ColumnDef } from "@tanstack/react-table";
import { ICustomer } from "@/models/Customer";

// The API returns lean() documents, so _id comes through as a plain object.
export interface CustomerRow extends ICustomer {
  _id: string;
}

interface GetColumnsOptions {
  onEdit: (row: CustomerRow) => void;
  onDelete: (row: CustomerRow) => void;
}

export function getCustomerColumns({
  onEdit,
  onDelete,
}: GetColumnsOptions): ColumnDef<CustomerRow>[] {
  return [
    {
      id: "name",
      header: "Name",
      cell: ({ row }) => (
        <div className="font-medium">
          {row.original.firstName} {row.original.lastName}
        </div>
      ),
    },
    {
      accessorKey: "email",
      header: "Email",
    },
    {
      accessorKey: "phone",
      header: "Phone",
    },
    {
      accessorKey: "address",
      header: "Address",
      cell: ({ row }) => (
        <div className="max-w-xs truncate" title={row.original.address}>
          {row.original.address}
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
