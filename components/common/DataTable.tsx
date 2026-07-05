"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
} from "@tanstack/react-table";

interface DataTableProps<TData> {
  columns: ColumnDef<TData, any>[];
  data: TData[];

  // Server-side pagination state — the parent owns this, not the table.
  pageIndex: number; // 0-based
  pageSize: number;
  pageCount: number;
  totalRows: number;

  onPageChange: (pageIndex: number) => void;
  onPageSizeChange: (pageSize: number) => void;

  isLoading?: boolean;
  emptyMessage?: string;
}

const PAGE_SIZE_OPTIONS = [10, 25, 50, 100];

/**
 * Generic, reusable data table with server-side pagination.
 *
 * This component is "dumb" — it only renders whatever `data` it's given
 * and reports page/size changes upward. All fetching, filtering, and
 * sorting logic lives in the parent (or the API), keeping this reusable
 * across any entity (Equipment, Bookings, Users, etc.).
 */
export default function DataTable<TData>({
  columns,
  data,
  pageIndex,
  pageSize,
  pageCount,
  totalRows,
  onPageChange,
  onPageSizeChange,
  isLoading = false,
  emptyMessage = "No records found.",
}: DataTableProps<TData>) {
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    manualPagination: true, // pagination happens on the server, not client-side
    pageCount,
  });

  const startRow = totalRows === 0 ? 0 : pageIndex * pageSize + 1;
  const endRow = Math.min((pageIndex + 1) * pageSize, totalRows);

  const canPreviousPage = pageIndex > 0;
  const canNextPage = pageIndex < pageCount - 1;

  return (
    <div className="w-full">
      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-base-300">
        <table className="table">
          <thead>
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th key={header.id} className="bg-base-200">
                    {header.isPlaceholder
                      ? null
                      : flexRender(
                          header.column.columnDef.header,
                          header.getContext()
                        )}
                  </th>
                ))}
              </tr>
            ))}
          </thead>

          <tbody>
            {isLoading ? (
              // Skeleton rows while fetching, so the layout doesn't jump.
              Array.from({ length: pageSize }).map((_, i) => (
                <tr key={`skeleton-${i}`}>
                  {columns.map((_, j) => (
                    <td key={j}>
                      <div className="skeleton h-4 w-full"></div>
                    </td>
                  ))}
                </tr>
              ))
            ) : table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="py-10 text-center text-base-content/60"
                >
                  {emptyMessage}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id} className="hover">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext()
                      )}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="mt-4 flex flex-col items-center justify-between gap-3 sm:flex-row">
        <div className="text-sm text-base-content/70">
          {totalRows === 0
            ? "0 results"
            : `Showing ${startRow}–${endRow} of ${totalRows}`}
        </div>

        <div className="flex items-center gap-3">
          {/* Page size selector */}
          <select
            className="select select-bordered select-sm"
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            disabled={isLoading}
          >
            {PAGE_SIZE_OPTIONS.map((size) => (
              <option key={size} value={size}>
                {size} / page
              </option>
            ))}
          </select>

          {/* Prev / Next */}
          <div className="join">
            <button
              className="join-item btn btn-sm"
              onClick={() => onPageChange(pageIndex - 1)}
              disabled={!canPreviousPage || isLoading}
            >
              «
            </button>

            <button className="join-item btn btn-sm pointer-events-none">
              Page {pageCount === 0 ? 0 : pageIndex + 1} of {pageCount}
            </button>

            <button
              className="join-item btn btn-sm"
              onClick={() => onPageChange(pageIndex + 1)}
              disabled={!canNextPage || isLoading}
            >
              »
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
