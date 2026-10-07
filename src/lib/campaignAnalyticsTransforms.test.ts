import { describe, expect, it } from "vitest";

import {
  availableTimeRanges,
  campaignLifespan,
  sliceDailyPoints,
} from "./campaignAnalyticsTransforms";

const TZ = "Africa/Algiers";
const NOW = new Date("2026-10-07T12:00:00Z");
const point = (date: string, entries = 1) => ({ date, entries, winners: 0 });

describe("campaignLifespan", () => {
  it("runs from the start date to today while the campaign is live", () => {
    const lifespan = campaignLifespan(
      [point("2026-09-20")],
      { start_date: "2026-09-18T08:00:00Z", end_date: "2026-12-01T00:00:00Z" },
      TZ,
      NOW,
    );
    expect(lifespan).toEqual({
      start: "2026-09-18",
      end: "2026-10-07",
      days: 20,
    });
  });

  it("stops at the end date once the campaign is over", () => {
    const lifespan = campaignLifespan(
      [point("2026-03-02")],
      { start_date: "2026-03-01T08:00:00Z", end_date: "2026-03-10T08:00:00Z" },
      TZ,
      NOW,
    );
    expect(lifespan).toEqual({
      start: "2026-03-01",
      end: "2026-03-10",
      days: 10,
    });
  });

  it("falls back to the first entry without a start date, and keeps late entries", () => {
    const lifespan = campaignLifespan(
      [point("2026-03-05"), point("2026-03-20")],
      { start_date: null, end_date: "2026-03-10T08:00:00Z" },
      TZ,
      NOW,
    );
    expect(lifespan).toEqual({
      start: "2026-03-05",
      end: "2026-03-20",
      days: 16,
    });
  });

  it("is null when there is nothing to anchor the dates on", () => {
    expect(
      campaignLifespan([], { start_date: null, end_date: null }, TZ, NOW),
    ).toBeNull();
  });
});

describe("availableTimeRanges", () => {
  it("only offers ranges that show more than the shorter one", () => {
    expect(availableTimeRanges(5)).toEqual(["1w"]);
    expect(availableTimeRanges(7)).toEqual(["1w"]);
    expect(availableTimeRanges(20)).toEqual(["1w", "1m"]);
    expect(availableTimeRanges(45)).toEqual(["1w", "1m", "3m"]);
    expect(availableTimeRanges(400)).toEqual(["1w", "1m", "3m", "6m"]);
  });
});

describe("sliceDailyPoints", () => {
  const lifespan = { start: "2026-09-18", end: "2026-10-07", days: 20 };
  const data = [point("2026-09-20", 4), point("2026-10-05", 2)];

  it("keeps the last days of the range and fills the days without entries", () => {
    const week = sliceDailyPoints(data, lifespan, "1w");
    expect(week).toHaveLength(7);
    expect(week[0].date).toBe("2026-10-01");
    expect(week[6]).toEqual(point("2026-10-07", 0));
    expect(week.find((p) => p.date === "2026-10-05")?.entries).toBe(2);
  });

  it("never goes back before the campaign started", () => {
    const month = sliceDailyPoints(data, lifespan, "1m");
    expect(month).toHaveLength(20);
    expect(month[0].date).toBe("2026-09-18");
  });
});
