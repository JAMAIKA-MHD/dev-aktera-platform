/**
 * Presentation helpers of the cross-campaign analytics view. The numbers themselves come
 * from the `get_program_analytics` RPC; nothing here adds up entries.
 */
import { toAnalyticsDay } from "./campaignAnalyticsTransforms";
import { ProgramDecaySeries } from "../types";

export const PROGRAM_TIMEZONE = "Africa/Algiers";

export const PROGRAM_PERIODS = [
  { key: "30d", label: "30 days", days: 30 },
  { key: "90d", label: "90 days", days: 90 },
  { key: "12m", label: "12 months", days: 365 },
  { key: "all", label: "All time", days: null },
] as const;

export type ProgramPeriodKey = (typeof PROGRAM_PERIODS)[number]["key"];

const DAY_MS = 86_400_000;

/** First day (YYYY-MM-DD) of a period ending today; null for "All time". */
export function programPeriodStart(
  periodKey: ProgramPeriodKey,
  now: Date = new Date(),
  timezone: string = PROGRAM_TIMEZONE,
): string | null {
  const period = PROGRAM_PERIODS.find((p) => p.key === periodKey);
  if (!period || period.days === null) return null;
  const today = toAnalyticsDay(now, timezone);
  if (today === null) return null;
  const start = Date.parse(`${today}T00:00:00Z`) - (period.days - 1) * DAY_MS;
  return new Date(start).toISOString().slice(0, 10);
}

export interface DecayRow {
  /** Days since launch, starting at 1 on the day of the first entry. */
  day: number;
  [campaignId: string]: number;
}

/**
 * One row per day since launch with a value for each campaign still running on that day,
 * so every campaign's line stops where its own life stops.
 */
export function buildDecayRows(series: ProgramDecaySeries[]): DecayRow[] {
  const length = Math.max(0, ...series.map((s) => s.points.length));
  return Array.from({ length }, (_, index) => {
    const row: DecayRow = { day: index + 1 };
    for (const s of series) {
      if (index < s.points.length) row[s.campaign_id] = s.points[index];
    }
    return row;
  });
}

/** Share of a limit used, 0 to 100; null when there is no limit. */
export function usagePercent(used: number, limit: number | null) {
  if (limit === null || limit <= 0) return null;
  return Math.min(100, Math.round((used / limit) * 100));
}
