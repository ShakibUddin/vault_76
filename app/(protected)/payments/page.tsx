"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  PaymentRow,
  getPaymentColumns,
} from "@/components/payment/PaymentColumns";
import DataTable from "@/components/common/DataTable";
import { useDebounce } from "@/hooks/useDebounce";
import { toast } from "sonner";
import dayjs from "dayjs";

interface PaymentSummaryEntry {
  total: number;
  count: number;
}

interface PaymentApiResponse {
  data: PaymentRow[];
  pageIndex: number;
  pageSize: number;
  pageCount: number;
  totalRows: number;
  summary: Record<string, PaymentSummaryEntry>;
  message?: string;
}

const TYPE_OPTIONS = ["", "Deposit", "Rental", "Refund"] as const;
const METHOD_OPTIONS = [
  "",
  "Cash",
  "Card",
  "Bank Transfer",
  "Mobile Banking",
  "Other",
] as const;

function summaryValue(
  summary: Record<string, PaymentSummaryEntry>,
  type: string
) {
  return summary?.[type]?.total ?? 0;
}

export default function PaymentPage() {
  const [viewingPayment, setViewingPayment] = useState<PaymentRow | null>(null);

  const [rows, setRows] = useState<PaymentRow[]>([]);
  const [pageIndex, setPageIndex] = useState(0);
  const [pageSize, setPageSize] = useState(10);
  const [pageCount, setPageCount] = useState(0);
  const [totalRows, setTotalRows] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const [searchTerm, setSearchTerm] = useState("");
  const [typeFilter, setTypeFilter] = useState<string>("");
  const [methodFilter, setMethodFilter] = useState<string>("");

  const [summary, setSummary] = useState<Record<string, PaymentSummaryEntry>>(
    {}
  );

  const debouncedSearch = useDebounce(searchTerm, 500);

  const fetchPayments = useCallback(async () => {
    setIsLoading(true);

    try {
      const params = new URLSearchParams({
        pageIndex: String(pageIndex),
        pageSize: String(pageSize),
      });

      if (debouncedSearch.trim()) params.set("search", debouncedSearch.trim());
      if (typeFilter) params.set("type", typeFilter);
      if (methodFilter) params.set("method", methodFilter);

      const res = await fetch(`/api/payment?${params}`);
      const json: PaymentApiResponse = await res.json();

      if (!res.ok) {
        toast.error(json.message ?? "Failed to load payments.");
        return;
      }

      setRows(json.data);
      setPageCount(json.pageCount);
      setTotalRows(json.totalRows);
      setSummary(json.summary ?? {});
    } catch {
      toast.error("Network error while loading payments.");
    } finally {
      setIsLoading(false);
    }
  }, [pageIndex, pageSize, debouncedSearch, typeFilter, methodFilter]);

  useEffect(() => {
    fetchPayments();
  }, [fetchPayments]);

  const columns = useMemo(
    () => getPaymentColumns({ onView: setViewingPayment }),
    []
  );

  const deposits = summaryValue(summary, "Deposit");
  const rentalCharges = summaryValue(summary, "Rental");
  const refunds = summaryValue(summary, "Refund");
  const netCollected = deposits + rentalCharges - refunds;

  return (
    <>
      <div className="space-y-6 p-8">
        <div>
          <h1 className="text-3xl font-bold">Payments</h1>
          <p className="text-base-content/70">
            Deposits, rental charges, and refunds. Records are generated
            automatically and can't be edited here.
          </p>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          <div className="card border border-base-300 bg-base-100 shadow-sm transition-all hover:shadow-md">
            <div className="card-body p-6">
              <p className="text-sm font-medium text-base-content/60">
                Deposits Held
              </p>

              <h2 className="mt-2 text-3xl font-bold text-info">
                ${deposits.toFixed(2)}
              </h2>

              <p className="mt-2 text-xs text-base-content/50">
                Active security deposits
              </p>
            </div>
          </div>

          <div className="card border border-base-300 bg-base-100 shadow-sm transition-all hover:shadow-md">
            <div className="card-body p-6">
              <p className="text-sm font-medium text-base-content/60">
                Rental Charges
              </p>

              <h2 className="mt-2 text-3xl font-bold text-success">
                ${rentalCharges.toFixed(2)}
              </h2>

              <p className="mt-2 text-xs text-base-content/50">
                Revenue from rentals
              </p>
            </div>
          </div>

          <div className="card border border-base-300 bg-base-100 shadow-sm transition-all hover:shadow-md">
            <div className="card-body p-6">
              <p className="text-sm font-medium text-base-content/60">
                Net Collected
              </p>

              <h2 className="mt-2 text-3xl font-bold text-primary">
                ${netCollected.toFixed(2)}
              </h2>

              <p className="mt-2 text-xs text-base-content/50">
                Total payments received
              </p>
            </div>
          </div>
        </div>

        <div className="flex flex-col gap-4 md:flex-row md:items-center">
          <input
            type="text"
            placeholder="Search by customer, equipment, notes..."
            className="input input-bordered w-full max-w-sm"
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setPageIndex(0);
            }}
          />

          <select
            className="select select-bordered w-full max-w-xs"
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPageIndex(0);
            }}
          >
            {TYPE_OPTIONS.map((t) => (
              <option key={t || "all"} value={t}>
                {t || "All Types"}
              </option>
            ))}
          </select>

          <select
            className="select select-bordered w-full max-w-xs"
            value={methodFilter}
            onChange={(e) => {
              setMethodFilter(e.target.value);
              setPageIndex(0);
            }}
          >
            {METHOD_OPTIONS.map((m) => (
              <option key={m || "all"} value={m}>
                {m || "All Methods"}
              </option>
            ))}
          </select>
        </div>

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
          emptyMessage="No payments found."
        />
      </div>

      {/* View detail — read-only, no form */}
      <dialog className={`modal ${viewingPayment ? "modal-open" : ""}`}>
        <div className="modal-box max-w-lg">
          <h2 className="text-2xl font-bold">Payment Detail</h2>

          {viewingPayment && (
            <div className="mt-4 space-y-3 text-sm">
              <DetailRow label="Type" value={viewingPayment.type} />
              <DetailRow
                label="Amount"
                value={`$${viewingPayment.amount.toFixed(2)}`}
              />
              <DetailRow label="Method" value={viewingPayment.method} />
              <DetailRow
                label="Customer"
                value={
                  viewingPayment.customer
                    ? `${viewingPayment.customer.firstName} ${viewingPayment.customer.lastName}`
                    : "—"
                }
              />
              <DetailRow
                label="Equipment"
                value={viewingPayment.equipment?.name ?? "—"}
              />

              {viewingPayment.type === "Rental" && (
                <>
                  <DetailRow
                    label="Daily Rate"
                    value={
                      viewingPayment.dailyRate !== undefined
                        ? `$${viewingPayment.dailyRate.toFixed(2)}`
                        : "—"
                    }
                  />
                  <DetailRow
                    label="Quantity"
                    value={viewingPayment.quantity ?? "—"}
                  />
                  <DetailRow
                    label="Days Charged"
                    value={viewingPayment.daysCharged ?? "—"}
                  />
                  <DetailRow
                    label="Late Days"
                    value={viewingPayment.lateDays ?? 0}
                  />
                  <DetailRow
                    label="Deposit Applied"
                    value={
                      viewingPayment.depositApplied !== undefined
                        ? `$${viewingPayment.depositApplied.toFixed(2)}`
                        : "$0.00"
                    }
                  />
                </>
              )}

              {viewingPayment.type === "Refund" && (
                <DetailRow
                  label="Deposit Applied"
                  value={
                    viewingPayment.depositApplied !== undefined
                      ? `$${viewingPayment.depositApplied.toFixed(2)}`
                      : "$0.00"
                  }
                />
              )}

              <DetailRow
                label="Date"
                value={dayjs(viewingPayment.createdAt).format(
                  "MMM D, YYYY h:mm A"
                )}
              />

              {viewingPayment.notes && (
                <div>
                  <div className="font-medium text-base-content/60">Notes</div>
                  <p className="mt-1">{viewingPayment.notes}</p>
                </div>
              )}
            </div>
          )}

          <div className="modal-action">
            <button className="btn" onClick={() => setViewingPayment(null)}>
              Close
            </button>
          </div>
        </div>

        <form method="dialog" className="modal-backdrop">
          <button onClick={() => setViewingPayment(null)}>close</button>
        </form>
      </dialog>
    </>
  );
}

function DetailRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex justify-between border-b border-base-200 pb-2">
      <span className="text-base-content/60">{label}</span>
      <span className="font-medium">{value}</span>
    </div>
  );
}
