import { fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

const exporter = vi.hoisted(() => ({ exportToCSV: vi.fn() }));
vi.mock("../../lib/exportUtils", () => exporter);

import { codeFileColumns, importTemplateRows } from "../../lib/codeExport";
import { parseRawCodes } from "../../services/inventoryService";
import { ImportFileDialog } from "./ImportFileDialog";

beforeEach(() => exporter.exportToCSV.mockClear());

function setup(open = true, category: "voucher" | "physical" = "voucher") {
  const onOpenChange = vi.fn();
  const onModeChange = vi.fn();
  const onImport = vi.fn();
  render(
    <ImportFileDialog
      open={open}
      onOpenChange={onOpenChange}
      category={category}
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
      "A CSV or Excel file with one code per row. Keep these columns:",
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

  it("shows every column of the file, with three example rows", () => {
    setup();
    const template = screen.getByRole("region", { name: "File template" });
    expect(
      within(template)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Index", "Code", "Status", "Expires", "Used on"]);
    const rows = within(template).getAllByRole("row").slice(1);
    expect(rows).toHaveLength(3);
    expect(
      within(rows[0])
        .getAllByRole("cell")
        .map((cell) => cell.textContent),
    ).toEqual(["1", "CODE-0001", "", "", ""]);
  });

  it("leaves the optional columns empty in the examples", () => {
    setup();
    const template = screen.getByRole("region", { name: "File template" });
    for (const row of within(template).getAllByRole("row").slice(1)) {
      const cells = within(row).getAllByRole("cell");
      expect(cells.slice(2).map((cell) => cell.textContent)).toEqual([
        "",
        "",
        "",
      ]);
    }
  });

  it("has no Expires column for a Physical Item", () => {
    setup(true, "physical");
    const template = screen.getByRole("region", { name: "File template" });
    expect(
      within(template)
        .getAllByRole("columnheader")
        .map((header) => header.textContent),
    ).toEqual(["Index", "Code", "Status", "Used on"]);
    expect(template.textContent).not.toContain("Expires");
  });

  it("says in one line what is needed", () => {
    setup();
    expect(screen.getByText(/Only Code is needed\./).textContent).toContain(
      "Expires: a day, 2026-12-31.",
    );
    expect(screen.getByText(/Only Code is needed\./).textContent).toContain(
      "Status and Used on are filled by AKTERA: leave them empty.",
    );
  });

  it("downloads the template as a file that can be filled in", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Download template" }));
    expect(exporter.exportToCSV).toHaveBeenCalledWith(
      importTemplateRows("voucher"),
      "octoreach_codes_template",
    );
  });

  it("shows the same columns as the codes file", () => {
    for (const category of ["voucher", "physical"] as const) {
      expect(Object.keys(importTemplateRows(category)[0])).toEqual(
        codeFileColumns(category),
      );
    }
  });

  it("is a template the importer reads: its codes and slot numbers come back", () => {
    const parsed = parseRawCodes({ rawRows: importTemplateRows("voucher") });
    expect(parsed.map((row) => row.code)).toEqual([
      "CODE-0001",
      "CODE-0002",
      "CODE-0003",
    ]);
    expect(parsed.map((row) => row.explicitIndex)).toEqual([1, 2, 3]);
    // Empty Expires cells mean no date: nothing is refused.
    expect(parsed.every((row) => row.expiresAt === null)).toBe(true);
    expect(parsed.some((row) => row.expiresInvalid)).toBe(false);
  });

  it("does not download the template by clicking Cancel", () => {
    setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(exporter.exportToCSV).not.toHaveBeenCalled();
  });
});
