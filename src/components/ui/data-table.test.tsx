import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ColumnDef } from "@tanstack/react-table";
import { describe, expect, it, vi } from "vitest";

import { DataTable, type DataTableProps } from "./data-table";

interface Fruit {
  id: string;
  name: string;
  color: string;
  stock: number;
}

const FRUITS: Fruit[] = Array.from({ length: 12 }, (_, index) => ({
  id: `f${index + 1}`,
  name: `Fruit ${String(index + 1).padStart(2, "0")}`,
  color: index % 2 === 0 ? "red" : "green",
  stock: (index * 7) % 12,
}));

const columns: ColumnDef<Fruit, unknown>[] = [
  { id: "name", accessorKey: "name", header: "Name" },
  {
    id: "color",
    accessorKey: "color",
    header: "Color",
    enableSorting: false,
    filterFn: "equalsString",
  },
  {
    id: "stock",
    accessorKey: "stock",
    header: "Stock",
    cell: ({ row }) => (
      <>
        {row.original.stock}
        <button type="button">Edit</button>
      </>
    ),
  },
];

function renderTable(props: Partial<DataTableProps<Fruit>> = {}) {
  return render(
    <DataTable
      columns={columns}
      data={FRUITS}
      ariaLabel="Fruits"
      getRowId={(fruit) => fruit.id}
      {...props}
    />,
  );
}

// Body rows only (the header row is in <thead>).
const bodyRows = () =>
  within(screen.getByRole("table", { name: "Fruits" }))
    .getAllByRole("row")
    .filter((row) => row.closest("tbody"));
const firstCells = () =>
  bodyRows().map((row) => within(row).getAllByRole("cell")[0].textContent);

describe("DataTable", () => {
  it("renders the first page of rows under its accessible name", () => {
    renderTable();
    expect(bodyRows()).toHaveLength(10);
    expect(firstCells()[0]).toBe("Fruit 01");
    expect(screen.getByText("Rows 1–10 of 12")).toBeTruthy();
  });

  it("sorts a column both ways and exposes aria-sort", async () => {
    const user = userEvent.setup();
    renderTable({ pageSize: 20 });
    const header = screen.getByRole("columnheader", { name: /Name/ });
    expect(header.getAttribute("aria-sort")).toBe("none");

    await user.click(within(header).getByRole("button"));
    expect(header.getAttribute("aria-sort")).toBe("ascending");
    expect(firstCells()[0]).toBe("Fruit 01");

    await user.click(within(header).getByRole("button"));
    expect(header.getAttribute("aria-sort")).toBe("descending");
    expect(firstCells()[0]).toBe("Fruit 12");
  });

  it("does not offer sorting on a column that disables it", () => {
    renderTable();
    const header = screen.getByRole("columnheader", { name: "Color" });
    expect(header.getAttribute("aria-sort")).toBeNull();
    expect(within(header).queryByRole("button")).toBeNull();
  });

  it("applies the initial sorting", () => {
    renderTable({
      initialSorting: [{ id: "stock", desc: true }],
      pageSize: 20,
    });
    const stocks = bodyRows().map((row) =>
      Number(
        within(row).getAllByRole("cell")[2].textContent?.replace("Edit", ""),
      ),
    );
    expect(stocks).toEqual([...stocks].sort((a, b) => b - a));
  });

  it("filters rows with the global filter", () => {
    renderTable({ globalFilter: "fruit 1" });
    expect(firstCells()).toEqual(["Fruit 10", "Fruit 11", "Fruit 12"]);
  });

  it("filters rows with a column filter", () => {
    renderTable({ columnFilters: [{ id: "color", value: "green" }] });
    expect(bodyRows()).toHaveLength(6);
    expect(bodyRows().every((row) => row.textContent?.includes("green"))).toBe(
      true,
    );
  });

  it("pages with Previous and Next, disabled at the edges", async () => {
    const user = userEvent.setup();
    renderTable();
    const previous = screen.getByRole("button", { name: "Previous" });
    const next = screen.getByRole("button", { name: "Next" });
    expect((previous as HTMLButtonElement).disabled).toBe(true);

    await user.click(next);
    expect(screen.getByText("Rows 11–12 of 12")).toBeTruthy();
    expect(bodyRows()).toHaveLength(2);
    expect((next as HTMLButtonElement).disabled).toBe(true);

    await user.click(previous);
    expect(screen.getByText("Rows 1–10 of 12")).toBeTruthy();
  });

  it("goes back to the first page when the filters really change", async () => {
    const user = userEvent.setup();
    const { rerender } = renderTable();
    await user.click(screen.getByRole("button", { name: "Next" }));
    expect(screen.getByText("Rows 11–12 of 12")).toBeTruthy();

    // Same filters in a new array: the page is kept.
    rerender(
      <DataTable
        columns={columns}
        data={FRUITS}
        ariaLabel="Fruits"
        getRowId={(fruit) => fruit.id}
        columnFilters={[]}
      />,
    );
    expect(screen.getByText("Rows 11–12 of 12")).toBeTruthy();

    rerender(
      <DataTable
        columns={columns}
        data={FRUITS}
        ariaLabel="Fruits"
        getRowId={(fruit) => fruit.id}
        globalFilter="fruit"
      />,
    );
    expect(screen.getByText("Rows 1–10 of 12")).toBeTruthy();
  });

  it("stays on an existing page when the data shrinks", async () => {
    const user = userEvent.setup();
    const { rerender } = renderTable();
    await user.click(screen.getByRole("button", { name: "Next" }));
    rerender(
      <DataTable
        columns={columns}
        data={FRUITS.slice(0, 4)}
        ariaLabel="Fruits"
        getRowId={(fruit) => fruit.id}
      />,
    );
    expect(firstCells()).toEqual([
      "Fruit 01",
      "Fruit 02",
      "Fruit 03",
      "Fruit 04",
    ]);
  });

  it("hides the pagination when everything fits on one page", () => {
    renderTable({ pageSize: 20 });
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });

  it("opens a row on click and on Enter, but not from a control inside it", async () => {
    const user = userEvent.setup();
    const onRowOpen = vi.fn();
    renderTable({ onRowOpen });

    await user.click(bodyRows()[1]);
    expect(onRowOpen).toHaveBeenLastCalledWith(FRUITS[1]);

    bodyRows()[2].focus();
    await user.keyboard("{Enter}");
    expect(onRowOpen).toHaveBeenLastCalledWith(FRUITS[2]);

    onRowOpen.mockClear();
    await user.click(
      within(bodyRows()[3]).getByRole("button", { name: "Edit" }),
    );
    expect(onRowOpen).not.toHaveBeenCalled();
  });

  it("makes rows focusable only when they can be opened", () => {
    const { unmount } = renderTable();
    expect(bodyRows()[0].getAttribute("tabindex")).toBeNull();
    unmount();
    renderTable({ onRowOpen: vi.fn() });
    expect(bodyRows()[0].getAttribute("tabindex")).toBe("0");
  });

  it("shows skeleton rows while loading, without pagination", () => {
    renderTable({ loading: true });
    expect(screen.getAllByTestId("data-table-skeleton")).toHaveLength(5);
    expect(screen.queryByText("Fruit 01")).toBeNull();
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
    expect(screen.getByRole("table").getAttribute("aria-busy")).toBe("true");
  });

  it("shows the empty state when there is no data", () => {
    renderTable({ data: [], emptyState: <p>Nothing here yet</p> });
    expect(screen.getByText("Nothing here yet")).toBeTruthy();
  });

  it("shows the no-results state when filters leave no row", () => {
    renderTable({
      globalFilter: "banana",
      emptyState: <p>Nothing here yet</p>,
      noResultsState: <p>No match</p>,
    });
    expect(screen.getByText("No match")).toBeTruthy();
    expect(screen.queryByText("Nothing here yet")).toBeNull();
  });

  it("hides a column while the table is narrow, with literal container-query classes", () => {
    renderTable({ hiddenColumnsBelow: { stock: "md" } });
    const header = screen.getByRole("columnheader", { name: /Stock/ });
    expect(header.className).toContain("hidden @4xl:table-cell");
    expect(within(bodyRows()[0]).getAllByRole("cell")[2].className).toContain(
      "hidden @4xl:table-cell",
    );
  });
});
