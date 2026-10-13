import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exporter = vi.hoisted(() => ({ exportToCSV: vi.fn() }));
vi.mock("../../lib/exportUtils", () => exporter);

import { parseRawCodes } from "../../services/inventoryService";
import { IMPORT_TEMPLATE_ROWS, ImportFileDialog } from "./ImportFileDialog";

beforeEach(() => exporter.exportToCSV.mockClear());

function setup(open = true) {
  const onOpenChange = vi.fn();
  const onModeChange = vi.fn();
  const onImport = vi.fn();
  render(
    <ImportFileDialog
      open={open}
      onOpenChange={onOpenChange}
      mode="append"
      onModeChange={onModeChange}
      onImport={onImport}
    />,
  );
  return { onOpenChange, onModeChange, onImport };
}

const choose = (file: File) =>
  fireEvent.change(screen.getByLabelText("File to import"), {
    target: { files: [file] },
  });

describe("ImportFileDialog", () => {
  it("renders nothing while closed", () => {
    setup(false);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is short: a title, one sentence, the file, the mode and two buttons", () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: "Import codes" });
    expect(dialog.textContent).toContain(
      "A CSV or Excel file with one code per row, in a Code column.",
    );
    expect(screen.getAllByRole("radio")).toHaveLength(2);
    expect(screen.getByRole("button", { name: "Cancel" })).toBeTruthy();
    expect(screen.getByRole("button", { name: "Import" })).toBeTruthy();
  });

  it("accepts CSV and Excel files", () => {
    setup();
    expect(
      screen.getByLabelText<HTMLInputElement>("File to import").accept,
    ).toBe(".csv,.xlsx,.xls");
  });

  it("cannot import before a file is chosen", () => {
    const { onImport } = setup();
    const button = screen.getByRole("button", { name: "Import" });
    expect((button as HTMLButtonElement).disabled).toBe(true);
    fireEvent.click(button);
    expect(onImport).not.toHaveBeenCalled();
  });

  it("closes, then imports the chosen file", () => {
    const { onImport, onOpenChange } = setup();
    const file = new File(["Code\nA"], "codes.csv");
    choose(file);
    fireEvent.click(screen.getByRole("button", { name: "Import" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onImport).toHaveBeenCalledWith(file);
  });

  it("shows the current mode and reports a change", () => {
    const { onModeChange } = setup();
    expect(
      (screen.getByRole("radio", { name: "Append" }) as HTMLInputElement)
        .checked,
    ).toBe(true);
    fireEvent.click(screen.getByRole("radio", { name: "Replace All" }));
    expect(onModeChange).toHaveBeenCalledWith("replace");
  });

  it("cancels without importing", () => {
    const { onImport, onOpenChange } = setup();
    choose(new File(["x"], "codes.csv"));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onImport).not.toHaveBeenCalled();
  });

  it("shows the structure of the file: an Index column (optional) and a Code column", () => {
    setup();
    const template = screen.getByRole("region", { name: "File template" });
    expect(
      within(template)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Index", "Code"]);
    expect(within(template).getAllByRole("row")).toHaveLength(4);
    expect(within(template).getByText("CODE-0001")).toBeTruthy();
    expect(within(template).getByText("Index is optional.")).toBeTruthy();
  });

  it("downloads the template as a file that can be filled in", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Download template" }));
    expect(exporter.exportToCSV).toHaveBeenCalledWith(
      IMPORT_TEMPLATE_ROWS,
      "octoreach_codes_template",
    );
  });

  it("is a template the importer reads: its codes and slot numbers come back", () => {
    const parsed = parseRawCodes({ rawRows: IMPORT_TEMPLATE_ROWS });
    expect(parsed.map((row) => row.code)).toEqual([
      "CODE-0001",
      "CODE-0002",
      "CODE-0003",
    ]);
    expect(parsed.map((row) => row.explicitIndex)).toEqual([1, 2, 3]);
    // Without the Index column the codes are read just the same.
    expect(
      parseRawCodes({
        rawRows: IMPORT_TEMPLATE_ROWS.map(({ Code }) => ({ Code })),
      }).map((row) => row.code),
    ).toEqual(["CODE-0001", "CODE-0002", "CODE-0003"]);
  });

  it("does not download the template by clicking Import or Cancel", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(exporter.exportToCSV).not.toHaveBeenCalled();
  });
});
