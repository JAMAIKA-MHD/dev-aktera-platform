import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";

import { ImportFileDialog } from "./ImportFileDialog";

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
});
