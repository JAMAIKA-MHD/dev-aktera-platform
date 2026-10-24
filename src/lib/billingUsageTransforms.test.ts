import { describe, expect, it } from "vitest";

import {
  buildQuotaRows,
  formatMonthLabel,
  usagePercent,
} from "./billingUsageTransforms";

const day = (n: number, cumulative: number | null) => ({
  date: `2026-10-0${n}`,
  entries: cumulative === null ? null : 0,
  cumulative,
});

describe("usagePercent", () => {
  it("caps at 100 and has no value without a limit", () => {
    expect(usagePercent(45, 1000)).toBe(5);
    expect(usagePercent(1500, 1000)).toBe(100);
    expect(usagePercent(12, null)).toBeNull();
  });
});

describe("buildQuotaRows", () => {
  it("stops the used line today and projects from there to the month total", () => {
    const rows = buildQuotaRows(
      [day(1, 10), day(2, 20), day(3, null), day(4, null)],
      40,
    );
    expect(rows).toEqual([
      { day: 1, date: "2026-10-01", used: 10 },
      { day: 2, date: "2026-10-02", used: 20, projected: 20 },
      { day: 3, date: "2026-10-03", projected: 30 },
      { day: 4, date: "2026-10-04", projected: 40 },
    ]);
  });

  it("has no projection on the last day of the month", () => {
    const rows = buildQuotaRows([day(1, 10), day(2, 20)], 20);
    expect(rows.every((row) => row.projected === undefined)).toBe(true);
  });
});

describe("formatMonthLabel", () => {
  it("names the month whatever the browser timezone", () => {
    expect(formatMonthLabel("2026-10")).toBe("Oct 26");
  });
});
