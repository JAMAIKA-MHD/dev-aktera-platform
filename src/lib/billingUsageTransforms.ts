/**
 * Presentation helpers of the billing usage view. The counts come from the
 * `get_billing_usage_analytics` RPC; nothing here adds up entries.
 */
import { BillingDailyUsage } from "../types";

/** Share of a limit used, 0 to 100; null when there is no limit. */
export function usagePercent(used: number, limit: number | null) {
  if (limit === null || limit <= 0) return null;
  return Math.min(100, Math.round((used / limit) * 100));
}

export interface QuotaRow {
  /** Day of the month, starting at 1. */
  day: number;
  date: string;
  /** Entries used since the 1st; absent on days still to come. */
  used?: number;
  /** Straight line from today's total to the projected month total. */
  projected?: number;
}

/**
 * One row per day of the month: what was used so far, then the projection up to the last
 * day. Today carries both values so the two lines meet.
 */
export function buildQuotaRows(
  daily: BillingDailyUsage[],
  projectedEntries: number,
): QuotaRow[] {
  const lastUsedIndex = daily.reduce(
    (last, point, index) => (point.cumulative === null ? last : index),
    -1,
  );
  const usedSoFar =
    lastUsedIndex >= 0 ? (daily[lastUsedIndex].cumulative ?? 0) : 0;
  const daysToCome = daily.length - 1 - lastUsedIndex;

  return daily.map((point, index) => {
    const row: QuotaRow = { day: index + 1, date: point.date };
    if (point.cumulative !== null) row.used = point.cumulative;
    if (lastUsedIndex >= 0 && daysToCome > 0 && index >= lastUsedIndex) {
      const progress = (index - lastUsedIndex) / daysToCome;
      row.projected = Math.round(
        usedSoFar + (projectedEntries - usedSoFar) * progress,
      );
    }
    return row;
  });
}

/** "2026-10" -> "Oct 26". */
export function formatMonthLabel(month: string): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  return isNaN(date.getTime())
    ? month
    : date.toLocaleDateString("en-US", {
        month: "short",
        year: "2-digit",
        timeZone: "UTC",
      });
}

/** "2026-10" -> "October 2026". */
export function formatMonthName(month: string): string {
  const date = new Date(`${month}-01T00:00:00Z`);
  return isNaN(date.getTime())
    ? month
    : date.toLocaleDateString("en-US", {
        month: "long",
        year: "numeric",
        timeZone: "UTC",
      });
}

/** Amounts are stored in Algerian dinars. */
export function formatAmount(amount: number): string {
  return `${Number(amount).toLocaleString("en-US", { maximumFractionDigits: 2 })} DA`;
}
