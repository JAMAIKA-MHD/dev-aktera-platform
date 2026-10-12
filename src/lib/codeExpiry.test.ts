import { describe, expect, it } from "vitest";
import {
  algiersEndOfDayToIso,
  computeCodeCounts,
  expiryWarning,
  isCodeExpired,
  isoToAlgiersDay,
} from "./codeExpiry";

const NOW = new Date("2026-10-12T12:00:00Z");

describe("algiersEndOfDayToIso", () => {
  it("is the end of that day in Algiers, stored in UTC", () => {
    expect(algiersEndOfDayToIso("2026-12-31")).toBe("2026-12-31T22:59:59.000Z");
  });

  it("rejects text that is not a real date", () => {
    expect(algiersEndOfDayToIso("")).toBeNull();
    expect(algiersEndOfDayToIso("31/12/2026")).toBeNull();
    expect(algiersEndOfDayToIso("2026-02-31")).toBeNull();
  });

  it("round-trips with isoToAlgiersDay", () => {
    const iso = algiersEndOfDayToIso("2027-03-01");
    expect(isoToAlgiersDay(iso)).toBe("2027-03-01");
  });
});

describe("isoToAlgiersDay", () => {
  it("shows the Algiers day, not the UTC day", () => {
    // 23:30 UTC is already the next day in Algiers (UTC+1).
    expect(isoToAlgiersDay("2026-10-12T23:30:00Z")).toBe("2026-10-13");
  });

  it("is empty without a usable value", () => {
    expect(isoToAlgiersDay(null)).toBe("");
    expect(isoToAlgiersDay("nope")).toBe("");
  });
});

describe("isCodeExpired", () => {
  it("never expires without a date", () => {
    expect(isCodeExpired(null, NOW)).toBe(false);
    expect(isCodeExpired(undefined, NOW)).toBe(false);
  });

  it("is expired once the instant is reached", () => {
    expect(isCodeExpired("2026-10-12T11:59:59Z", NOW)).toBe(true);
    expect(isCodeExpired("2026-10-12T12:00:00Z", NOW)).toBe(true);
    expect(isCodeExpired("2026-10-12T12:00:01Z", NOW)).toBe(false);
  });
});

describe("expiryWarning", () => {
  it("warns about a past date only", () => {
    expect(expiryWarning("2026-01-01T00:00:00Z", NOW)).toMatch(/past/);
    expect(expiryWarning("2027-01-01T00:00:00Z", NOW)).toBeNull();
    expect(expiryWarning(null, NOW)).toBeNull();
  });
});

describe("computeCodeCounts", () => {
  it("splits available, used and expired; ignores empty slots", () => {
    const counts = computeCodeCounts(
      [
        { item_value: "A" },
        { item_value: "B", expires_at: "2027-01-01T00:00:00Z" },
        { item_value: "C", expires_at: "2026-01-01T00:00:00Z" },
        { item_value: "D", is_used: true },
        {
          item_value: "E",
          is_redeemed: true,
          expires_at: "2026-01-01T00:00:00Z",
        },
        { item_value: null },
        { item_value: "  " },
      ],
      NOW,
    );
    expect(counts).toEqual({ available: 2, used: 2, expired: 1 });
  });
});
