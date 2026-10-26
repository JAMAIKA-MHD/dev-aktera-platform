import { describe, expect, it } from "vitest";
import {
  DEFAULT_EXPIRY_POLICY,
  daysFromAmount,
  describeExpiry,
  formatDuration,
  policyFromReward,
  policyToStored,
  splitDays,
} from "./expiryPolicy";

describe("daysFromAmount", () => {
  it("counts days, weeks (7) and months (30)", () => {
    expect(daysFromAmount("10", "days")).toBe(10);
    expect(daysFromAmount("2", "weeks")).toBe(14);
    expect(daysFromAmount("3", "months")).toBe(90);
  });

  it("refuses what is not a whole positive number, or too long", () => {
    for (const bad of ["", " ", "0", "-3", "1.5", "abc", "1e3"]) {
      expect(daysFromAmount(bad, "days")).toBeNull();
    }
    expect(daysFromAmount("3650", "days")).toBe(3650);
    expect(daysFromAmount("3651", "days")).toBeNull();
    expect(daysFromAmount("200", "months")).toBeNull();
  });
});

describe("splitDays / formatDuration", () => {
  it("shows the largest unit that divides evenly", () => {
    expect(splitDays(30)).toEqual({ amount: 1, unit: "months" });
    expect(splitDays(60)).toEqual({ amount: 2, unit: "months" });
    expect(splitDays(14)).toEqual({ amount: 2, unit: "weeks" });
    expect(splitDays(45)).toEqual({ amount: 45, unit: "days" });
    expect(splitDays(1)).toEqual({ amount: 1, unit: "days" });
  });

  it("writes it in words, singular or plural", () => {
    expect(formatDuration(1)).toBe("1 day");
    expect(formatDuration(45)).toBe("45 days");
    expect(formatDuration(7)).toBe("1 week");
    expect(formatDuration(30)).toBe("1 month");
    expect(formatDuration(90)).toBe("3 months");
  });
});

describe("policyToStored", () => {
  it("stores nothing for no expiry", () => {
    expect(policyToStored(DEFAULT_EXPIRY_POLICY)).toEqual({
      ok: true,
      expiresAt: null,
      expiryDays: null,
    });
  });

  it("stores the end of the picked day, and no period", () => {
    expect(
      policyToStored({
        ...DEFAULT_EXPIRY_POLICY,
        mode: "date",
        day: "2099-12-31",
      }),
    ).toEqual({
      ok: true,
      expiresAt: "2099-12-31T22:59:59.000Z",
      expiryDays: null,
    });
  });

  it("stores the period in days, and no date", () => {
    expect(
      policyToStored({
        ...DEFAULT_EXPIRY_POLICY,
        mode: "after_delivery",
        amount: "2",
        unit: "weeks",
      }),
    ).toEqual({ ok: true, expiresAt: null, expiryDays: 14 });
  });

  it("ignores what was typed for the other kind", () => {
    const form = {
      mode: "none" as const,
      day: "2099-12-31",
      amount: "10",
      unit: "days" as const,
    };
    expect(policyToStored(form)).toEqual({
      ok: true,
      expiresAt: null,
      expiryDays: null,
    });
  });

  it("explains what is missing or wrong", () => {
    const date = policyToStored({
      ...DEFAULT_EXPIRY_POLICY,
      mode: "date",
      day: "",
    });
    expect(date).toEqual({ ok: false, error: "Pick the expiry date." });
    const bad = policyToStored({
      ...DEFAULT_EXPIRY_POLICY,
      mode: "after_delivery",
      amount: "0",
    });
    if (bad.ok !== false) throw new Error("expected an error");
    expect(bad.error).toMatch(/whole number of days/);
  });
});

describe("policyFromReward / describeExpiry", () => {
  it("rebuilds the form from a reward, whichever way it expires", () => {
    expect(policyFromReward({})).toEqual(DEFAULT_EXPIRY_POLICY);
    expect(
      policyFromReward({ expiresAt: "2099-06-30T22:59:59.000Z" }),
    ).toMatchObject({
      mode: "date",
      day: "2099-06-30",
    });
    expect(policyFromReward({ expiryDays: 60 })).toMatchObject({
      mode: "after_delivery",
      amount: "2",
      unit: "months",
    });
  });

  it("round-trips through the form", () => {
    for (const reward of [
      { expiresAt: "2099-06-30T22:59:59.000Z", expiryDays: null },
      { expiresAt: null, expiryDays: 45 },
      { expiresAt: null, expiryDays: null },
    ]) {
      const result = policyToStored(policyFromReward(reward));
      expect(result).toEqual({ ok: true, ...reward });
    }
  });

  it("says it in words", () => {
    expect(describeExpiry({})).toBe("no expiry");
    expect(describeExpiry({ expiresAt: "2099-06-30T22:59:59.000Z" })).toBe(
      "until 2099-06-30",
    );
    expect(describeExpiry({ expiryDays: 30 })).toBe("1 month after delivery");
    // A period wins if both were ever present.
    expect(
      describeExpiry({ expiresAt: "2099-06-30T22:59:59.000Z", expiryDays: 7 }),
    ).toBe("1 week after delivery");
  });
});
