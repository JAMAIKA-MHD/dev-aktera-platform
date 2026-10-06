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
