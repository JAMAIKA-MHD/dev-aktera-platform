/**
 * Presentation helpers of the cross-campaign analytics view. The numbers themselves come
 * from the `get_program_analytics` RPC; nothing here adds up entries.
 */
import { toAnalyticsDay } from "./campaignAnalyticsTransforms";

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
