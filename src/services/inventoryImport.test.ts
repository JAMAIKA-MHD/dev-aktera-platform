import { describe, expect, it, vi } from "vitest";

vi.mock("../lib/supabase", () => ({ supabase: {} }));

import {
  parseRawCodes,
  validateAndPrepareImportService,
  type TemplateItemRow,
} from "./inventoryService";

const slots = (
  count: number,
  filled: Record<number, string> = {},
): TemplateItemRow[] =>
  Array.from({ length: count }, (_, index) => ({
    id: `i${index + 1}`,
    prize_template_id: "t1",
    item_index: index + 1,
    item_value: filled[index + 1] ?? null,
    source_type: "manual" as const,
  }));

const validate = (
  rawRows: Record<string, unknown>[],
  items: TemplateItemRow[] = slots(5),
  mode: "append" | "replace" = "append",
) =>
  validateAndPrepareImportService({
    mode,
    rawInput: { rawRows },
    currentItems: items,
    totalStock: items.length,
  });

describe("importing the Expires column", () => {
  it("reads the codes of the exported file, whatever the other columns hold", () => {
    const parsed = parseRawCodes({
      rawRows: [
        {
          Index: 1,
          Code: "AAA",
          Status: "Available",
          Expires: "2099-12-31",
          "Used on": "",
        },
        { Index: 2, Code: "BBB", Status: "Empty", Expires: "", "Used on": "" },
      ],
    });
    expect(parsed.map((row) => row.code)).toEqual(["AAA", "BBB"]);
    expect(parsed[0].expiresAt).toBe("2099-12-31T22:59:59.000Z");
    // An empty cell is a date left empty, not a date missing from the file.
    expect(parsed[1].expiresAt).toBeNull();
  });

  it("does not invent a date when the file has no Expires column", () => {
    const [row] = parseRawCodes({ rawRows: [{ Code: "AAA" }] });
    expect(row.expiresAt).toBeUndefined();
    expect(row.expiresInvalid).toBeUndefined();
  });

  it("reads dates written 31/12/2026 and Excel date numbers", () => {
    const parsed = parseRawCodes({
      rawRows: [
        { Code: "AAA", Expires: "31/12/2026" },
        { Code: "BBB", Expires: 46387 },
      ],
    });
    expect(parsed.map((row) => row.expiresAt)).toEqual([
      "2026-12-31T22:59:59.000Z",
      "2026-12-31T22:59:59.000Z",
    ]);
  });

  it("puts each date with its code in the slot it fills", () => {
    const result = validate([
      { Code: "AAA", Expires: "2099-12-31" },
      { Code: "BBB", Expires: "" },
    ]);
    expect(result.success).toBe(true);
    expect(result.itemsToSave).toEqual([
      { id: "i1", item_value: "AAA", expires_at: "2099-12-31T22:59:59.000Z" },
      { id: "i2", item_value: "BBB", expires_at: null },
    ]);
  });

  it("leaves the dates alone when the file has no Expires column", () => {
    const result = validate([{ Code: "AAA" }, { Code: "BBB" }]);
    expect(result.itemsToSave).toEqual([
      { id: "i1", item_value: "AAA" },
      { id: "i2", item_value: "BBB" },
    ]);
    expect("expires_at" in result.itemsToSave[0]).toBe(false);
  });

  it("sets the dates in Replace All mode too", () => {
    const result = validate(
      [{ Code: "NEW", Expires: "2099-01-01" }],
      slots(3, { 1: "OLD" }),
      "replace",
    );
    expect(result.itemsToSave).toEqual([
      { id: "i1", item_value: "NEW", expires_at: "2099-01-01T22:59:59.000Z" },
    ]);
  });

  it("refuses the whole file when a date is not a date, and names the line", () => {
    const result = validate([
      { Code: "AAA", Expires: "2099-12-31" },
      { Code: "BBB", Expires: "soon" },
    ]);
    expect(result.success).toBe(false);
    expect(result.itemsToSave).toEqual([]);
    expect(result.errorMessage).toContain("line 2");
    expect(result.errorMessage).toContain('"soon"');
  });

  it("keeps the date of a line when a duplicate code is replaced", () => {
    const first = validate([
      { Code: "DUP", Expires: "2099-12-31" },
      { Code: "DUP", Expires: "2099-06-30" },
    ]);
    expect(first.conflicts).toHaveLength(1);
    const dates = first.rawParsedCodes.map((row) => row.expiresAt);
    expect(dates).toEqual([
      "2099-12-31T22:59:59.000Z",
      "2099-06-30T22:59:59.000Z",
    ]);
  });
});
