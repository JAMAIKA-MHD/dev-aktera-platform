import { describe, expect, it } from "vitest";

import { programPeriodStart } from "./programAnalyticsTransforms";

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
