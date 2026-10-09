import { describe, expect, it } from "vitest";

import {
  buildDecayRows,
  programPeriodStart,
  usagePercent,
} from "./programAnalyticsTransforms";

const series = (campaign_id: string, points: number[]) => ({
  campaign_id,
  campaign_name: campaign_id,
  launch_date: "2026-09-01",
  entries: points.reduce((sum, n) => sum + n, 0),
  points,
});

describe("programPeriodStart", () => {
  it("counts today as the last day of the period", () => {
    const now = new Date("2026-10-09T12:00:00Z");
    expect(programPeriodStart("30d", now)).toBe("2026-09-10");
    expect(programPeriodStart("90d", now)).toBe("2026-07-12");
  });

  it("uses the analytics timezone to decide what today is", () => {
    // 23:30 UTC on the 9th is already the 10th in Algiers (UTC+1).
    const now = new Date("2026-10-09T23:30:00Z");
    expect(programPeriodStart("30d", now)).toBe("2026-09-11");
  });

  it("has no start for all time", () => {
    expect(programPeriodStart("all")).toBeNull();
  });
});

describe("buildDecayRows", () => {
  it("aligns campaigns on their launch day and stops each at its own length", () => {
    expect(buildDecayRows([series("a", [5, 3, 1]), series("b", [4])])).toEqual([
      { day: 1, a: 5, b: 4 },
      { day: 2, a: 3 },
      { day: 3, a: 1 },
    ]);
  });

  it("returns no rows without campaigns", () => {
    expect(buildDecayRows([])).toEqual([]);
  });
});

describe("usagePercent", () => {
  it("caps at 100 and has no value without a limit", () => {
    expect(usagePercent(45, 1000)).toBe(5);
    expect(usagePercent(1500, 1000)).toBe(100);
    expect(usagePercent(12, null)).toBeNull();
  });
});
