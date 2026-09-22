import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  formatDzPhone,
  formatPhoneInput,
  isValidDzMobile,
  normalizeDzPhone,
} from "./phone";

describe("normalizeDzPhone", () => {
  it.each([
    ["0555123456", "0555123456"],
    ["+213555123456", "0555123456"],
    ["213555123456", "0555123456"],
    ["555123456", "0555123456"],
    ["05 55 12 34 56", "0555123456"],
    ["+213 555 12 34 56", "0555123456"],
    ["0555-12-34-56", "0555123456"],
    ["(0661) 12.34.56", "0661123456"],
    ["712345678", "0712345678"],
  ])("normalizes %j to %j", (raw, expected) => {
    expect(normalizeDzPhone(raw)).toBe(expected);
  });

  it("keeps only the digits when no rule applies", () => {
    expect(normalizeDzPhone("abc")).toBe("");
    expect(normalizeDzPhone("")).toBe("");
    expect(normalizeDzPhone("021 12 34 56")).toBe("021123456");
  });
});

describe("isValidDzMobile", () => {
  it.each([
    "0555123456",
    "+213555123456",
    "213555123456",
    "555123456",
    "05 55 12 34 56",
    "0655123456",
    "0755123456",
  ])("accepts %j", (raw) => {
    expect(isValidDzMobile(raw)).toBe(true);
  });

  it.each([
    ["0455123456", "wrong mobile prefix"],
    ["055512345", "too short"],
    ["05551234567", "too long"],
    ["021123456", "landline"],
    ["", "empty"],
    ["abc", "no digits"],
  ])("rejects %j (%s)", (raw) => {
    expect(isValidDzMobile(raw)).toBe(false);
  });

  // These inputs are rejected by the server too. The client must not accept more than the server does.
  it.each([
    ["+2130555123456", "extra 0 after +213"],
    ["00213555123456", "00 international prefix"],
    ["٠٥٥٥١٢٣٤٥٦", "Arabic-Indic digits"],
  ])("rejects %j like the server (%s)", (raw) => {
    expect(isValidDzMobile(raw)).toBe(false);
  });
});

describe("formatDzPhone", () => {
  it("formats a valid number as 0555 12 34 56", () => {
    expect(formatDzPhone("0555123456")).toBe("0555 12 34 56");
    expect(formatDzPhone("+213 661 12 34 56")).toBe("0661 12 34 56");
  });

  it("returns invalid input unchanged", () => {
    expect(formatDzPhone("0455123456")).toBe("0455123456");
    expect(formatDzPhone("05 55")).toBe("05 55");
    expect(formatDzPhone("")).toBe("");
  });
});

describe("formatPhoneInput", () => {
  it.each([
    ["", ""],
    ["0", "0"],
    ["0555", "0555"],
    ["05551", "0555 1"],
    ["0555123456", "0555 12 34 56"],
    ["05 55-12.34/56", "0555 12 34 56"], // any separator the player types
    ["055512345678", "0555 12 34 56"], // no more than a full number
    ["555123456", "555 12 34 56"], // the leading 0 left out
    ["+", "+"],
    ["+213", "+213"],
    ["+213555123456", "+213 555 12 34 56"],
    ["213555123456", "213 555 12 34 56"],
    ["+2135551234567", "+213 555 12 34 56"],
  ])("groups %j as %j", (raw, shown) => {
    expect(formatPhoneInput(raw)).toBe(shown);
  });

  it("keeps a number the server accepts", () => {
    for (const raw of ["0555123456", "+213555123456", "555123456"]) {
      expect(isValidDzMobile(formatPhoneInput(raw))).toBe(true);
      expect(normalizeDzPhone(formatPhoneInput(raw))).toBe("0555123456");
    }
  });
});

describe("server contract", () => {
  // Turns the "keep both in sync" comment into a failing test when the copies diverge.
  it("uses the same normalizeDzPhone code as select-prize", () => {
    const extract = (source: string): string => {
      const match = source.match(/normalizeDzPhone = \([\s\S]*?\n\s*\};/);
      if (!match) throw new Error("normalizeDzPhone not found");
      return match[0].replace(/\s+/g, "");
    };
    const read = (path: string) =>
      readFileSync(new URL(path, import.meta.url), "utf8");

    const server = read("../../../../supabase/functions/select-prize/index.ts");
    const client = read("./phone.ts");

    expect(extract(client)).toBe(extract(server));
  });
});
