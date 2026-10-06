// Building blocks of DataTable (data-table.tsx): the sortable header cell, the pagination
// bar and the responsive column classes. Split out to keep each file short.
import {
  flexRender,
  type Header,
  type Table as TanstackTable,
} from "@tanstack/react-table";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { cn } from "../../lib/utils";
import { Button } from "./button";
import { TableHead } from "./table";

// The column is hidden while the TABLE (its @container, not the screen) is narrower than
// 42 / 56 / 64 / 72 rem: in the dashboard, the side menu already takes part of the screen.
// Literal classes, so that Tailwind generates them.
export const HIDDEN_BELOW = {
  sm: "hidden @2xl:table-cell",
  md: "hidden @4xl:table-cell",
  lg: "hidden @5xl:table-cell",
  xl: "hidden @6xl:table-cell",
} as const;

export type HiddenBelow = keyof typeof HIDDEN_BELOW;

export function hiddenBelowClass(breakpoint: HiddenBelow | undefined) {
  return breakpoint ? HIDDEN_BELOW[breakpoint] : undefined;
}

// A header cell; when the column can be sorted, its label is a button and aria-sort tells
// assistive technologies the current order.
export function DataTableHead<TData>({
  header,
  className,
}: {
  header: Header<TData, unknown>;
  className?: string;
}) {
  const column = header.column;
  const canSort = column.getCanSort();
  const sorted = column.getIsSorted();
  const label = header.isPlaceholder
    ? null
    : flexRender(column.columnDef.header, header.getContext());
  const ariaSort = !canSort
    ? undefined
    : sorted === "asc"
      ? "ascending"
      : sorted === "desc"
        ? "descending"
        : "none";

  return (
    <TableHead
      aria-sort={ariaSort}
      className={cn(
        "h-11 px-3 text-xs font-bold uppercase tracking-wide text-muted-foreground @2xl:px-4",
        column.columnDef.meta?.className,
        className,
      )}
    >
      {canSort ? (
        <button
          type="button"
          onClick={column.getToggleSortingHandler()}
          className="-mx-1 inline-flex items-center gap-1.5 rounded px-1 uppercase outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring"
        >
          {label}
          {sorted === "asc" ? (
            <ArrowUp className="size-3.5" aria-hidden />
          ) : sorted === "desc" ? (
            <ArrowDown className="size-3.5" aria-hidden />
          ) : (
            <ArrowUpDown className="size-3.5 opacity-50" aria-hidden />
          )}
        </button>
      ) : (
        label
      )}
    </TableHead>
  );
}

// "Rows 11–20 of 23", Previous / Next. Only shown when there is more than one page.
export function DataTablePagination<TData>({
  table,
}: {
  table: TanstackTable<TData>;
}) {
  if (table.getPageCount() <= 1) return null;
  const total = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(total, (pageIndex + 1) * pageSize);

  return (
    <nav
      aria-label="Pagination"
      className="flex items-center justify-end gap-3 text-xs text-muted-foreground"
    >
      <span>
        Rows {from}–{to} of {total}
      </span>
      <Button
        variant="outline"
        size="sm"
        onClick={() => table.previousPage()}
        disabled={!table.getCanPreviousPage()}
      >
        Previous
      </Button>
      <Button
        variant="outline"
        size="sm"
        onClick={() => table.nextPage()}
        disabled={!table.getCanNextPage()}
      >
        Next
      </Button>
    </nav>
  );
}
