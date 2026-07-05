"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import EquipmentForm from "@/components/equipment/EquipmentForm";
import {
  EquipmentRow,
  getEquipmentColumns,
} from "@/components/equipment/EquipmentColumns";
import DataTable from "@/components/common/DataTable";
import { useDebounce } from "@/hooks/useDebounce";

interface EquipmentApiResponse {
  data: EquipmentRow[];
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalRows: number;
}

export default function EquipmentPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingEquipment, setEditingEquipment] = useState<EquipmentRow | null>(
    null
  );

  const [rows, setRows] = useState<EquipmentRow[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageCount, setPageCount] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");

  // Debounce search input by 500ms
  const debouncedSearch = useDebounce(searchTerm, 500);

  const fetchEquipment = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        pageIndex: String(pageIndex),
        pageSize: String(pageSize),
      });

      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }

      const res = await fetch(`/api/equipment?${params}`);

      const json = await res.json();

      if (!res.ok) {
        return;
      }

      setRows(json.data);
      setPageCount(json.pageCount);
      setTotalRows(json.totalRows);
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, pageSize, debouncedSearch]);

  useEffect(() => {
    fetchEquipment();
  }, [fetchEquipment]);

  const handleSaveEquipmentSuccess = () => {
    setIsOpen(false);
    setEditingEquipment(null);
    setPageIndex(0);
    fetchEquipment();
  };

  const handleDelete = async (row: EquipmentRow) => {
    if (!confirm(`Delete "${row.name}"? This cannot be undone.`)) {
      return;
    }

    const res = await fetch(`/api/equipment/${row._id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      fetchEquipment();
    }
  };

  const columns = useMemo(
    () =>
      getEquipmentColumns({
        onEdit: setEditingEquipment,
        onDelete: handleDelete,
      }),
    []
  );

  return (
    <>
      <div className="space-y-6 p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold">Equipment</h1>

            <p className="text-base-content/70">
              Manage your rental equipment.
            </p>
          </div>

          <button className="btn btn-primary" onClick={() => setIsOpen(true)}>
            + Create Equipment
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by name, brand, model or category..."
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
          emptyMessage="No equipment found. Create your first item to get started."
        />
      </div>

      {/* Create */}
      <dialog className={`modal ${isOpen ? "modal-open" : ""}`}>
        <div className="modal-box max-w-4xl">
          <h2 className="text-2xl font-bold">Create Equipment</h2>

          <p className="mb-6 text-base-content/70">
            Fill in the information below.
          </p>

          <EquipmentForm
            submitText="Create Equipment"
            onCancel={() => setIsOpen(false)}
            onSuccess={handleSaveEquipmentSuccess}
          />
        </div>

        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setIsOpen(false)}>close</button>
        </form>
      </dialog>

      {/* Edit */}
      <dialog className={`modal ${editingEquipment ? "modal-open" : ""}`}>
        <div className="modal-box max-w-4xl">
          <h2 className="text-2xl font-bold">Edit Equipment</h2>

          <p className="mb-6 text-base-content/70">
            Update the information below.
          </p>

          {editingEquipment && (
            <EquipmentForm
              equipment={editingEquipment}
              update
              submitText="Save Changes"
              onCancel={() => setEditingEquipment(null)}
              onSuccess={handleSaveEquipmentSuccess}
            />
          )}
        </div>

        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setEditingEquipment(null)}>close</button>
        </form>
      </dialog>
    </>
  );
}
