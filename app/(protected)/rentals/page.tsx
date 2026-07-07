"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { RentalRow, getRentalColumns } from "@/components/rental/RentalColumns";
import DataTable from "@/components/common/DataTable";
import { useDebounce } from "@/hooks/useDebounce";
import RentalForm from "@/components/rental/RentalForm";
import { toast } from "sonner";

interface RentalApiResponse {
  data: RentalRow[];
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalRows: number;
  message?: string;
}

function customerDisplayName(row: RentalRow) {
  const c = row.customer as any;
  if (!c) return "this customer";
  return c.name ?? `${c.firstName ?? ""} ${c.lastName ?? ""}`.trim();
}

export default function RentalPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingRental, setEditingRental] = useState<RentalRow | null>(null);

  const [rows, setRows] = useState<RentalRow[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageCount, setPageCount] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");

  const debouncedSearch = useDebounce(searchTerm, 500);

  const fetchRentals = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        pageIndex: String(pageIndex),
        pageSize: String(pageSize),
      });

      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }

      const res = await fetch(`/api/rental?${params}`);
      const json: RentalApiResponse = await res.json();

      if (!res.ok) {
        toast.error(json.message ?? "Failed to load rentals.");
        return;
      }

      setRows(json.data);
      setPageCount(json.pageCount);
      setTotalRows(json.totalRows);
    } catch {
      toast.error("Network error while loading rentals.");
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchRentals();
  }, [fetchRentals]);

  const handleSaveRentalSuccess = () => {
    setIsOpen(false);
    setEditingRental(null);
    setPageIndex(0);
    fetchRentals();
  };

  const handleDelete = useCallback(
    async (row: RentalRow) => {
      if (
        !confirm(
          `Delete rental for "${customerDisplayName(
            row
          )}"?\n\nThis cannot be undone.`
        )
      ) {
        return;
      }

      try {
        const res = await fetch(`/api/rental/${row._id}`, {
          method: "DELETE",
        });

        const data = await res.json().catch(() => ({}));

        if (!res.ok) {
          // e.g. active ("Rented") or historical ("Returned") rentals are
          // protected server-side — surface the reason instead of failing silently.
          toast.error(data.message ?? "Failed to delete rental.");
          return;
        }

        toast.success(data.message ?? "Rental deleted.");
        fetchRentals();
      } catch {
        toast.error("Network error while deleting rental.");
      }
    },
    [fetchRentals]
  );

  const columns = useMemo(
    () =>
      getRentalColumns({
        onEdit: setEditingRental,
        onDelete: handleDelete,
      }),
    [handleDelete]
  );

  return (
    <>
      <div className="space-y-6 p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold">Rentals</h1>
            <p className="text-base-content/70">Manage equipment rentals.</p>
          </div>

          <button className="btn btn-primary" onClick={() => setIsOpen(true)}>
            + Create Rental
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by equipment, customer, status..."
          className="input input-bordered w-full max-w-sm"
          value={searchTerm}
          onChange={(e) => {
            setSearchTerm(e.target.value);
            setPageIndex(0);
          }}
        />

        <DataTable
          columns={columns}
          data={rows}
          pageIndex={pageIndex}
          pageSize={pageSize}
          pageCount={pageCount}
          totalRows={totalRows}
          isLoading={isLoading}
          onPageChange={setPageIndex}
          onPageSizeChange={(size) => {
            setPageSize(size);
            setPageIndex(0);
          }}
          emptyMessage="No rentals found. Create your first rental to get started."
        />
      </div>

      {/* Create */}
      <dialog className={`modal ${isOpen ? "modal-open" : ""}`}>
        <div className="modal-box max-w-4xl">
          <h2 className="text-2xl font-bold">Create Rental</h2>
          <p className="mb-6 text-base-content/70">
            Fill in the information below.
          </p>

          <RentalForm
            submitText="Create Rental"
            onCancel={() => setIsOpen(false)}
            onSuccess={handleSaveRentalSuccess}
          />
        </div>

        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setIsOpen(false)}>close</button>
        </form>
      </dialog>

      {/* Edit */}
      <dialog className={`modal ${editingRental ? "modal-open" : ""}`}>
        <div className="modal-box max-w-4xl">
          <h2 className="text-2xl font-bold">Edit Rental</h2>
          <p className="mb-6 text-base-content/70">
            Update the information below.
          </p>

          {editingRental && (
            <RentalForm
              rental={editingRental}
              update
              submitText="Save Changes"
              onCancel={() => setEditingRental(null)}
              onSuccess={handleSaveRentalSuccess}
            />
          )}
        </div>

        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setEditingRental(null)}>close</button>
        </form>
      </dialog>
    </>
  );
}
