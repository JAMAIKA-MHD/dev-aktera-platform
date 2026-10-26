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

// Page indexes to show between Previous and Next: all of them while they fit, otherwise the
// first, the last and the neighbours of the current page, with "gap" where pages are skipped.
export function pageWindow(
  pageIndex: number,
  pageCount: number,
): (number | "gap")[] {
  if (pageCount <= 7) return Array.from({ length: pageCount }, (_, i) => i);
  const shown = new Set([0, pageCount - 1]);
  // Three pages around the current one, kept inside the list at both edges.
  const from = Math.min(Math.max(pageIndex - 1, 1), pageCount - 4);
  for (let i = from; i < from + 3; i++) shown.add(i);
  const pages = [...shown].sort((a, b) => a - b);
  return pages.flatMap((page, i): (number | "gap")[] =>
    i > 0 && page - pages[i - 1] > 1 ? ["gap", page] : [page],
  );
}

// "Rows 11–20 of 23", Previous / Next, with numbered page buttons in between when
// `pageNumbers` is set. Only shown when there is more than one page.
export function DataTablePagination<TData>({
  table,
  pageNumbers = false,
}: {
  table: TanstackTable<TData>;
  pageNumbers?: boolean;
}) {
  const pageCount = table.getPageCount();
  if (pageCount <= 1) return null;
  const total = table.getFilteredRowModel().rows.length;
  const { pageIndex, pageSize } = table.getState().pagination;
  const from = total === 0 ? 0 : pageIndex * pageSize + 1;
  const to = Math.min(total, (pageIndex + 1) * pageSize);

  return (
    <nav
      aria-label="Pagination"
      className="flex flex-wrap items-center justify-end gap-x-3 gap-y-2 text-xs text-muted-foreground"
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
      {pageNumbers && (
        <div className="flex items-center gap-1">
          {pageWindow(pageIndex, pageCount).map((page, i) =>
            page === "gap" ? (
              <span key={`gap-${i}`} aria-hidden className="px-1">
                …
              </span>
            ) : (
              <Button
                key={page}
                variant={page === pageIndex ? "secondary" : "ghost"}
                size="sm"
                aria-label={`Page ${page + 1}`}
                aria-current={page === pageIndex ? "page" : undefined}
                onClick={() => table.setPageIndex(page)}
                className={cn(
                  "min-w-8 px-2",
                  page === pageIndex && "font-semibold text-foreground",
                )}
              >
                {page + 1}
              </Button>
            ),
          )}
        </div>
      )}
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
