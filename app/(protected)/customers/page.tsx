"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import CustomerForm from "@/components/customer/CustomerForm";
import {
  CustomerRow,
  getCustomerColumns,
} from "@/components/customer/CustomerColumns";
import DataTable from "@/components/common/DataTable";
import { useDebounce } from "@/hooks/useDebounce";

interface CustomerApiResponse {
  data: CustomerRow[];
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalRows: number;
}

export default function CustomersPage() {
  const [isOpen, setIsOpen] = useState(false);
  const [editingCustomer, setEditingCustomer] = useState<CustomerRow | null>(
    null
  );

  const [rows, setRows] = useState<CustomerRow[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageCount, setPageCount] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");

  // Debounce search input by 500ms
  const debouncedSearch = useDebounce(searchTerm, 500);

  const fetchCustomer = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        pageIndex: String(pageIndex),
        pageSize: String(pageSize),
      });

      if (debouncedSearch.trim()) {
        params.set("search", debouncedSearch.trim());
      }

      const res = await fetch(`/api/customer?${params}`);

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
    fetchCustomer();
  }, [fetchCustomer]);

  const handleSaveCustomerSuccess = () => {
    setIsOpen(false);
    setEditingCustomer(null);
    setPageIndex(0);
    fetchCustomer();
  };

  const handleDelete = async (row: CustomerRow) => {
    if (!confirm(`Delete "${row.firstName}"? This cannot be undone.`)) {
      return;
    }

    const res = await fetch(`/api/customer/${row._id}`, {
      method: "DELETE",
    });

    if (res.ok) {
      fetchCustomer();
    }
  };

  const columns = useMemo(
    () =>
      getCustomerColumns({
        onEdit: setEditingCustomer,
        onDelete: handleDelete,
      }),
    []
  );

  return (
    <>
      <div className="space-y-6 p-8">
        <div className="flex flex-col justify-between gap-4 md:flex-row md:items-center">
          <div>
            <h1 className="text-3xl font-bold">Customer</h1>

            <p className="text-base-content/70">Manage your customers.</p>
          </div>

          <button className="btn btn-primary" onClick={() => setIsOpen(true)}>
            + Create Customer
          </button>
        </div>

        <input
          type="text"
          placeholder="Search by name, email, address..."
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
          emptyMessage="No customer found. Create your first customer to get started."
        />
      </div>

      {/* Create */}
      <dialog className={`modal ${isOpen ? "modal-open" : ""}`}>
        <div className="modal-box max-w-4xl">
          <h2 className="text-2xl font-bold">Create Customer</h2>

          <p className="mb-6 text-base-content/70">
            Fill in the information below.
          </p>

          <CustomerForm
            submitText="Create Customer"
            onCancel={() => setIsOpen(false)}
            onSuccess={handleSaveCustomerSuccess}
          />
        </div>

        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setIsOpen(false)}>close</button>
        </form>
      </dialog>

      {/* Edit */}
      <dialog className={`modal ${editingCustomer ? "modal-open" : ""}`}>
        <div className="modal-box max-w-4xl">
          <h2 className="text-2xl font-bold">Edit Customer</h2>

          <p className="mb-6 text-base-content/70">
            Update the information below.
          </p>

          {editingCustomer && (
            <CustomerForm
              customer={editingCustomer}
              update
              submitText="Save Changes"
              onCancel={() => setEditingCustomer(null)}
              onSuccess={handleSaveCustomerSuccess}
            />
          )}
        </div>

        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setEditingCustomer(null)}>close</button>
        </form>
      </dialog>
    </>
  );
}
