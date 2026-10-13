import { fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentProps } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exporter = vi.hoisted(() => ({
  exportToCSV: vi.fn(),
  exportToExcel: vi.fn(),
}));
vi.mock("../../lib/exportUtils", () => exporter);

import type { ExportColumn } from "../../lib/codeExport";
import { ExportFileDialog } from "./ExportFileDialog";

type Scope = "all" | "big";

const columns: ExportColumn[] = [
  { name: "Name", meaning: "What the thing is called.", example: "Alpha" },
  { name: "Size", meaning: "How big it is.", example: "12" },
];

const rows = [
  { Name: "Alpha", Size: 12 },
  { Name: "Beta", Size: 3 },
  { Name: "Gamma", Size: 40 },
  { Name: "Delta", Size: 50 },
];

const filterRows = (all: typeof rows, scope: Scope) =>
  scope === "big" ? all.filter((row) => Number(row.Size) > 10) : all;

function renderDialog(
  props: Partial<ComponentProps<typeof ExportFileDialog<Scope>>> = {},
) {
  const onOpenChange = vi.fn();
  const onExported = vi.fn();
  render(
    <ExportFileDialog<Scope>
      open
      onOpenChange={onOpenChange}
      title="Export the things"
      description="One row per thing."
      fileBaseName="things_2026-10-13"
      sheetName="Things"
      columns={columns}
      rows={rows}
      scopes={[
        { id: "all", label: "Every thing" },
        { id: "big", label: "Big things" },
      ]}
      defaultScope="all"
      filterRows={filterRows}
      notes={["Dates are written YYYY-MM-DD."]}
      onExported={onExported}
      {...props}
    />,
  );
  return { onOpenChange, onExported };
}

beforeEach(() => {
  exporter.exportToCSV.mockClear();
  exporter.exportToExcel.mockClear();
});

describe("ExportFileDialog", () => {
  it("is a dialog that says what the file is", () => {
    renderDialog();
    const dialog = screen.getByRole("dialog", { name: "Export the things" });
    expect(within(dialog).getByText("One row per thing.")).toBeTruthy();
    // Nothing is downloaded by opening it.
    expect(exporter.exportToCSV).not.toHaveBeenCalled();
  });

  it("explains every column: its name, what it holds and an example", () => {
    renderDialog();
    const table = screen.getByRole("region", { name: "Columns of the file" });
    const rowsOfTable = within(table).getAllByRole("row").slice(1);
    expect(rowsOfTable).toHaveLength(2);
    expect(within(rowsOfTable[0]).getByRole("rowheader").textContent).toBe(
      "Name",
    );
    expect(
      within(rowsOfTable[0]).getByText("What the thing is called."),
    ).toBeTruthy();
    expect(within(rowsOfTable[0]).getByText("Alpha")).toBeTruthy();
    expect(
      within(table).getByText("Dates are written YYYY-MM-DD."),
    ).toBeTruthy();
  });

  it("shows the first three rows as they will be written", () => {
    renderDialog();
    const preview = screen.getByRole("region", { name: "Preview of the file" });
    const body = within(preview).getAllByRole("row").slice(1);
    expect(body).toHaveLength(3);
    expect(
      within(preview)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Name", "Size"]);
    expect(within(body[0]).getByText("Alpha")).toBeTruthy();
    expect(within(preview).queryByText("Delta")).toBeNull();
  });

  it("counts the rows of every choice, and the rows to export", () => {
    renderDialog();
    expect(
      screen.getByRole("radio", { name: /Every thing \(4\)/ }),
    ).toBeTruthy();
    expect(
      screen.getByRole("radio", { name: /Big things \(3\)/ }),
    ).toBeTruthy();
    expect(
      screen.getByText(/things_2026-10-13\.csv/).closest("p")?.textContent,
    ).toContain("4 rows · 2 columns");
  });

  it("downloads exactly the rows chosen, as CSV by default", () => {
    const { onExported, onOpenChange } = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: /Big things/ }));
    expect(
      screen.getByText(/things_2026-10-13\.csv/).closest("p")?.textContent,
    ).toContain("3 rows");
    fireEvent.click(
      screen.getByRole("button", { name: "Export 3 rows as CSV" }),
    );

    expect(exporter.exportToCSV).toHaveBeenCalledTimes(1);
    expect(exporter.exportToCSV).toHaveBeenCalledWith(
      [
        { Name: "Alpha", Size: 12 },
        { Name: "Gamma", Size: 40 },
        { Name: "Delta", Size: 50 },
      ],
      "things_2026-10-13",
    );
    expect(onExported).toHaveBeenCalledWith({
      count: 3,
      fileName: "things_2026-10-13.csv",
      format: "csv",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("downloads an Excel workbook when that format is chosen", () => {
    const { onExported } = renderDialog();
    fireEvent.click(screen.getByRole("radio", { name: /^Excel/ }));
    expect(screen.getByText(/things_2026-10-13\.xlsx/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Export 4 rows as Excel" }),
    );
    expect(exporter.exportToExcel).toHaveBeenCalledWith(
      rows,
      "things_2026-10-13",
      "Things",
    );
    expect(exporter.exportToCSV).not.toHaveBeenCalled();
    expect(onExported).toHaveBeenCalledWith(
      expect.objectContaining({
        format: "xlsx",
        fileName: "things_2026-10-13.xlsx",
      }),
    );
  });

  it("says row, not rows, for a single one", () => {
    renderDialog({ rows: [{ Name: "Alpha", Size: 12 }] });
    expect(
      screen.getByRole("button", { name: "Export 1 row as CSV" }),
    ).toBeTruthy();
  });

  it("cannot export an empty choice, and says so", () => {
    renderDialog({ rows: [{ Name: "Beta", Size: 3 }] });
    fireEvent.click(screen.getByRole("radio", { name: /Big things \(0\)/ }));
    const button = screen.getByRole("button", { name: "Export 0 rows as CSV" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    expect(
      screen.getByText("Nothing to export with this choice of rows."),
    ).toBeTruthy();
    fireEvent.click(button);
    expect(exporter.exportToCSV).not.toHaveBeenCalled();
  });

  it("closes without downloading on Cancel", () => {
    const { onOpenChange, onExported } = renderDialog();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(exporter.exportToCSV).not.toHaveBeenCalled();
    expect(onExported).not.toHaveBeenCalled();
  });

  it("starts again from the default choice each time it opens", () => {
    const { rerender } = render(
      <ExportFileDialog<Scope>
        open
        onOpenChange={() => {}}
        title="T"
        description="D"
        fileBaseName="f"
        columns={columns}
        rows={rows}
        scopes={[
          { id: "all", label: "Every thing" },
          { id: "big", label: "Big things" },
        ]}
        defaultScope="all"
        filterRows={filterRows}
      />,
    );
    fireEvent.click(screen.getByRole("radio", { name: /Big things/ }));
    fireEvent.click(screen.getByRole("radio", { name: /^Excel/ }));
    const common = {
      onOpenChange: () => {},
      title: "T",
      description: "D",
      fileBaseName: "f",
      columns,
      rows,
      scopes: [
        { id: "all" as const, label: "Every thing" },
        { id: "big" as const, label: "Big things" },
      ],
      defaultScope: "all" as const,
      filterRows,
    };
    rerender(<ExportFileDialog<Scope> open={false} {...common} />);
    rerender(<ExportFileDialog<Scope> open {...common} />);
    expect(
      (screen.getByRole("radio", { name: /Every thing/ }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    expect(
      (screen.getByRole("radio", { name: /^CSV/ }) as HTMLInputElement).checked,
    ).toBe(true);
  });
});
