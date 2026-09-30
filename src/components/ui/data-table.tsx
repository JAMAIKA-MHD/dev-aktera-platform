// Generic data table: shadcn Table + TanStack Table v8 (sorting, filtering, pagination).
// It knows nothing about the rows it shows: columns, filters and what "opening" a row means
// come from the caller (e.g. the Player Studio campaigns page).
import {
  useState,
  type KeyboardEvent,
  type MouseEvent,
  type ReactNode,
} from "react";
import {
  flexRender,
  getCoreRowModel,
  getFilteredRowModel,
  getPaginationRowModel,
  getSortedRowModel,
  useReactTable,
  type ColumnDef,
  type ColumnFiltersState,
  type FilterFnOption,
  type PaginationState,
  type RowData,
  type SortingState,
} from "@tanstack/react-table";

import { cn } from "../../lib/utils";
import {
  DataTableHead,
  DataTablePagination,
  hiddenBelowClass,
  type HiddenBelow,
} from "./data-table-parts";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "./table";

declare module "@tanstack/react-table" {
  // Extra classes for a column's header and cells (alignment, width).
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  interface ColumnMeta<TData extends RowData, TValue> {
    className?: string;
  }
}

const SKELETON_ROWS = 5;

export interface DataTableProps<TData> {
  columns: ColumnDef<TData, unknown>[];
  data: TData[];
  ariaLabel: string;
  getRowId: (row: TData) => string;
  onRowOpen?: (row: TData) => void;
  globalFilter?: string;
  globalFilterFn?: FilterFnOption<TData>;
  columnFilters?: ColumnFiltersState;
  initialSorting?: SortingState;
  pageSize?: number;
  loading?: boolean;
  emptyState?: ReactNode;
  noResultsState?: ReactNode;
  hiddenColumnsBelow?: Partial<Record<string, HiddenBelow>>;
}

// A click on a control inside the row (the "Open" button, a link) is handled by that control.
function isFromControl(target: EventTarget) {
  return (
    target instanceof Element &&
    target.closest("button, a, input, select, textarea") !== null
  );
}

export function DataTable<TData>({
  columns,
  data,
  ariaLabel,
  getRowId,
  onRowOpen,
  globalFilter = "",
  globalFilterFn = "includesString",
  columnFilters = [],
  initialSorting = [],
  pageSize = 10,
  loading = false,
  emptyState,
  noResultsState,
  hiddenColumnsBelow = {},
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(initialSorting);
  const [pagination, setPagination] = useState<PaginationState>({
    pageIndex: 0,
    pageSize,
  });

  // Back to the first page when the filters really change. TanStack's automatic reset is
  // off: it would also fire on every render where the caller passes a new (but equal)
  // filters array, and "Next" would bounce back to page 1.
  const filterKey = JSON.stringify([globalFilter, columnFilters]);
  const [appliedFilterKey, setAppliedFilterKey] = useState(filterKey);
  if (filterKey !== appliedFilterKey) {
    setAppliedFilterKey(filterKey);
    setPagination((current) => ({ ...current, pageIndex: 0 }));
  }

  const table = useReactTable({
    data,
    columns,
    getRowId: (row) => getRowId(row),
    state: { sorting, globalFilter, columnFilters, pagination },
    onSortingChange: setSorting,
    onPaginationChange: setPagination,
    autoResetPageIndex: false,
    globalFilterFn,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
  });

  // Fewer rows than before (data refetched): stay on the last page that still exists.
  const pageCount = table.getPageCount();
  if (pageCount > 0 && pagination.pageIndex >= pageCount) {
    setPagination((current) => ({ ...current, pageIndex: pageCount - 1 }));
  }

  const columnClass = (id: string, extra?: string) =>
    cn(hiddenBelowClass(hiddenColumnsBelow[id]), extra);
  const visibleColumns = table.getVisibleLeafColumns();
  const rows = table.getRowModel().rows;

  const fullWidthRow = (content: ReactNode) => (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={visibleColumns.length} className="p-0">
        {content}
      </TableCell>
    </TableRow>
  );

  const openOnClick = (row: TData) => (event: MouseEvent) => {
    if (!isFromControl(event.target)) onRowOpen?.(row);
  };
  const openOnKey = (row: TData) => (event: KeyboardEvent) => {
    if (event.key === "Enter" && !isFromControl(event.target)) {
      event.preventDefault();
      onRowOpen?.(row);
    }
  };

  const skeleton = Array.from({ length: SKELETON_ROWS }, (_, index) => (
    <TableRow
      key={`skeleton-${index}`}
      data-testid="data-table-skeleton"
      className="hover:bg-transparent"
    >
      {visibleColumns.map((column) => (
        <TableCell
          key={column.id}
          className={columnClass(column.id, "px-3 py-4 @2xl:px-4")}
        >
          <div className="h-3 w-3/4 animate-pulse rounded bg-muted-foreground/15" />
        </TableCell>
      ))}
    </TableRow>
  ));

  const body = rows.map((row) => (
    <TableRow
      key={row.id}
      tabIndex={onRowOpen ? 0 : undefined}
      onClick={onRowOpen ? openOnClick(row.original) : undefined}
      onKeyDown={onRowOpen ? openOnKey(row.original) : undefined}
      className={cn(
        onRowOpen &&
          "cursor-pointer outline-none focus-visible:bg-muted focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring",
      )}
    >
      {row.getVisibleCells().map((cell) => (
        <TableCell
          key={cell.id}
          className={columnClass(
            cell.column.id,
            cn("px-3 py-3 @2xl:px-4", cell.column.columnDef.meta?.className),
          )}
        >
          {flexRender(cell.column.columnDef.cell, cell.getContext())}
        </TableCell>
      ))}
    </TableRow>
  ));

  return (
    <div className="flex flex-col gap-3">
      <div className="@container overflow-hidden rounded-xl border border-border bg-background">
        <Table aria-label={ariaLabel} aria-busy={loading || undefined}>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id} className="hover:bg-transparent">
                {headerGroup.headers.map((header) => (
                  <DataTableHead
                    key={header.id}
                    header={header}
                    className={columnClass(header.column.id)}
                  />
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {loading
              ? skeleton
              : data.length === 0
                ? fullWidthRow(emptyState)
                : rows.length === 0
                  ? fullWidthRow(noResultsState)
                  : body}
          </TableBody>
        </Table>
      </div>
      {!loading && <DataTablePagination table={table} />}
    </div>
  );
}
