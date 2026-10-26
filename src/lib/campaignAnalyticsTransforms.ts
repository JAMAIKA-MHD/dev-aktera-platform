/**
 * Pure transforms shared by the campaign analytics dashboard and the
 * exported campaign report, so both always present the same numbers.
 */
import { ALGERIA_WILAYAS, resolveWilayaCode, Wilaya } from "./algeriaWilayas";
import {
  CampaignDailyPoint,
  CampaignLocationCount,
  CampaignPrizeDailyWins,
} from "../types";

// Categorical series colors, assigned in fixed order (never by rank).
export const SERIES_COLORS_LIGHT = [
  "#2a78d6",
  "#eb6834",
  "#1baf7a",
  "#eda100",
  "#e87ba4",
  "#008300",
  "#4a3aa7",
  "#e34948",
];
export const SERIES_COLORS_DARK = [
  "#3987e5",
  "#d95926",
  "#199e70",
  "#c98500",
  "#d55181",
  "#008300",
  "#9085e9",
  "#e66767",
];
export const OTHER_SERIES_COLOR = "#898781";

// One-hue sequential ramps (fewer -> more) for the wilaya map.
export const WILAYA_RAMP_LIGHT = [
  "#b7d3f6",
  "#86b6ef",
  "#5598e7",
  "#2a78d6",
  "#184f95",
];
export const WILAYA_RAMP_DARK = [
  "#184f95",
  "#256abf",
  "#3987e5",
  "#6da7ec",
  "#b7d3f6",
];

export const WEEKDAY_LABELS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

const MAX_PRIZE_SERIES = 7;
const OTHER_PRIZES_KEY = "other";

export const formatDayLabel = (isoDate: string): string => {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return isNaN(date.getTime())
    ? isoDate
    : date.toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        timeZone: "UTC",
      });
};

export const formatDuration = (seconds: number | null): string => {
  if (seconds === null) return "—";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

export const formatRate = (rate: number | null): string =>
  rate === null ? "—" : `${rate.toFixed(1)}%`;

export const TIME_RANGES = [
  { key: "1w", label: "1 week", days: 7 },
  { key: "1m", label: "1 month", days: 30 },
  { key: "3m", label: "3 months", days: 90 },
  { key: "6m", label: "6 months", days: 180 },
] as const;

export type TimeRangeKey = (typeof TIME_RANGES)[number]["key"];

const DAY_MS = 86_400_000;
const dayToMs = (isoDay: string) => Date.parse(`${isoDay}T00:00:00Z`);
const msToDay = (ms: number) => new Date(ms).toISOString().slice(0, 10);

/** Calendar day (YYYY-MM-DD) of an instant in the analytics timezone. */
export function toAnalyticsDay(
  value: string | Date,
  timezone: string,
): string | null {
  const date = typeof value === "string" ? new Date(value) : value;
  if (isNaN(date.getTime())) return null;
  try {
    return date.toLocaleDateString("en-CA", { timeZone: timezone });
  } catch {
    return date.toISOString().slice(0, 10);
  }
}

export interface CampaignLifespan {
  start: string; // YYYY-MM-DD
  end: string; // YYYY-MM-DD
  days: number;
}

/**
 * The days a campaign has actually existed so far: from its start date (or its
 * first entry, whichever is earlier) to today, or to its end date once it is
 * over. Entries recorded outside the scheduled dates still count.
 */
export function campaignLifespan(
  data: CampaignDailyPoint[],
  campaign: { start_date: string | null; end_date: string | null },
  timezone: string,
  now: Date = new Date(),
): CampaignLifespan | null {
  const today = toAnalyticsDay(now, timezone);
  const firstEntry = data[0]?.date ?? null;
  const lastEntry = data[data.length - 1]?.date ?? null;
  const scheduledStart = campaign.start_date
    ? toAnalyticsDay(campaign.start_date, timezone)
    : null;
  const scheduledEnd = campaign.end_date
    ? toAnalyticsDay(campaign.end_date, timezone)
    : null;

  const starts = [scheduledStart, firstEntry].filter(
    (day): day is string => day !== null,
  );
  if (starts.length === 0 || today === null) return null;
  const start = starts.sort()[0];
  if (start > today && lastEntry === null) return null; // Not started yet.

  let end =
    scheduledEnd !== null && scheduledEnd < today ? scheduledEnd : today;
  if (lastEntry !== null && lastEntry > end) end = lastEntry;
  if (end < start) end = start;

  return {
    start,
    end,
    days: Math.round((dayToMs(end) - dayToMs(start)) / DAY_MS) + 1,
  };
}

/**
 * A range is offered only when it shows more than the previous, shorter one:
 * "3 months" is pointless for a campaign that has existed for three weeks.
 */
export function availableTimeRanges(lifespanDays: number): TimeRangeKey[] {
  return TIME_RANGES.filter(
    (range, index) => index === 0 || lifespanDays > TIME_RANGES[index - 1].days,
  ).map((range) => range.key);
}

/**
 * One point per day for the last `range` of the campaign's lifespan (never
 * before its start), with zero for the days without entries.
 */
export function sliceDailyPoints(
  data: CampaignDailyPoint[],
  lifespan: CampaignLifespan,
  rangeKey: TimeRangeKey,
): CampaignDailyPoint[] {
  const range = TIME_RANGES.find((r) => r.key === rangeKey) ?? TIME_RANGES[0];
  const endMs = dayToMs(lifespan.end);
  const fromMs = Math.max(
    dayToMs(lifespan.start),
    endMs - (range.days - 1) * DAY_MS,
  );
  const byDay = new Map(data.map((point) => [point.date, point]));
  const points: CampaignDailyPoint[] = [];
  for (let ms = fromMs; ms <= endMs; ms += DAY_MS) {
    const date = msToDay(ms);
    points.push(byDay.get(date) ?? { date, entries: 0, winners: 0 });
  }
  return points;
}

export interface PrizeSeries {
  key: string;
  name: string;
  /** Index into the categorical palette; null for the folded "Other prizes" series. */
  colorIndex: number | null;
  totalWins: number;
}

export interface PrizeSeriesRow {
  date: string;
  values: Record<string, number>;
}

/**
 * Pivots sparse "wins per day per prize" rows into one row per day with a
 * value for every prize series. Series order is stable (by name) so a prize
 * keeps its color between refreshes; beyond the palette size the smallest
 * prizes fold into "Other prizes".
 */
export function buildPrizeSeries(
  data: CampaignPrizeDailyWins[],
  days: CampaignDailyPoint[],
): { series: PrizeSeries[]; rows: PrizeSeriesRow[] } {
  const totals = new Map<string, { name: string; wins: number }>();
  for (const row of data) {
    const key = row.prize_id ?? "removed";
    const current = totals.get(key) ?? { name: row.prize_name, wins: 0 };
    current.wins += row.wins;
    totals.set(key, current);
  }

  const byName = (
    a: [string, { name: string; wins: number }],
    b: [string, { name: string; wins: number }],
  ) => a[1].name.localeCompare(b[1].name);
  const ordered = [...totals.entries()].sort(byName);
  const kept =
    ordered.length > MAX_PRIZE_SERIES + 1
      ? [...ordered]
          .sort((a, b) => b[1].wins - a[1].wins)
          .slice(0, MAX_PRIZE_SERIES)
          .sort(byName)
      : ordered;
  const keptKeys = new Set(kept.map(([key]) => key));

  const series: PrizeSeries[] = kept.map(([key, value], index) => ({
    key,
    name: value.name,
    colorIndex: index,
    totalWins: value.wins,
  }));
  if (kept.length < ordered.length) {
    series.push({
      key: OTHER_PRIZES_KEY,
      name: "Other prizes",
      colorIndex: null,
      totalWins: ordered
        .filter(([key]) => !keptKeys.has(key))
        .reduce((sum, [, value]) => sum + value.wins, 0),
    });
  }

  const byDate = new Map<string, Record<string, number>>();
  for (const row of data) {
    const rawKey = row.prize_id ?? "removed";
    const key = keptKeys.has(rawKey) ? rawKey : OTHER_PRIZES_KEY;
    const bucket = byDate.get(row.date) ?? {};
    bucket[key] = (bucket[key] ?? 0) + row.wins;
    byDate.set(row.date, bucket);
  }

  const rows = days.map((day) => {
    const bucket = byDate.get(day.date) ?? {};
    const values: Record<string, number> = {};
    for (const s of series) values[s.key] = bucket[s.key] ?? 0;
    return { date: day.date, values };
  });

  return { series, rows };
}

export interface WilayaCount extends Wilaya {
  count: number;
}

export interface WilayaBreakdown {
  counts: Map<number, number>;
  ranked: WilayaCount[];
  /** Participants whose location label does not match any wilaya. */
  unmatchedCount: number;
  maxCount: number;
  totalLocated: number;
}

/** Groups raw location labels by wilaya and ranks wilayas by participants. */
export function buildWilayaBreakdown(
  locations: CampaignLocationCount[],
): WilayaBreakdown {
  const counts = new Map<number, number>();
  let unmatchedCount = 0;
  for (const item of locations) {
    const code = resolveWilayaCode(item.location);
    if (code === null) unmatchedCount += item.count;
    else counts.set(code, (counts.get(code) ?? 0) + item.count);
  }
  const ranked = ALGERIA_WILAYAS.filter((w) => counts.has(w.code))
    .map((w) => ({ ...w, count: counts.get(w.code) ?? 0 }))
    .sort((a, b) => b.count - a.count || a.code - b.code);
  return {
    counts,
    ranked,
    unmatchedCount,
    maxCount: ranked[0]?.count ?? 0,
    totalLocated: ranked.reduce((sum, w) => sum + w.count, 0),
  };
}

/** Picks the ramp step for a count; null means "no participants". */
export function wilayaRampStep(
  count: number,
  maxCount: number,
  steps: number,
): number | null {
  if (count <= 0 || maxCount <= 0) return null;
  return Math.min(steps - 1, Math.ceil((count / maxCount) * steps) - 1);
}
