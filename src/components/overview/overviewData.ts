import {
  CircleCheck,
  Clock,
  FileText,
  Gamepad2,
  Gift,
  Pause,
  Ticket,
  type LucideIcon,
} from "lucide-react";

import type { Campaign } from "../../types";

// The fixed vocabulary of the Overview: dates, game types, statuses, filters. The account's own
// figures are computed in overviewMetrics.ts.

export type Accent = "k1" | "k2" | "k3" | "k4";
export type RangeKey = "7d" | "30d";
export type Scale = "weeks" | "months";
export type TimelineFilter =
  "all" | "active" | "scheduled" | "paused" | "ending";
export type ActivityFilter = "all" | "campaign" | "reward" | "team";

// ── Dates ────────────────────────────────────────────────────────────────────

export const DAY = 24 * 3600 * 1000;
const DAY_NAMES = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTH_NAMES = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
];

export const startOfDay = (time: number) => {
  const date = new Date(time);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate(),
  ).getTime();
};
export const addDays = (time: number, days: number) => {
  const date = new Date(time);
  return new Date(
    date.getFullYear(),
    date.getMonth(),
    date.getDate() + days,
  ).getTime();
};
/** "Sat 14 Nov" */
export const shortDate = (time: number) => {
  const date = new Date(time);
  return `${DAY_NAMES[date.getDay()]} ${date.getDate()} ${MONTH_NAMES[date.getMonth()]}`;
};
/** "Sat 14 Nov 2026" */
export const longDate = (time: number) =>
  `${shortDate(time)} ${new Date(time).getFullYear()}`;
/** "2026-11-14": the local day, for a date field. toISOString would give the UTC day before. */
export const isoDate = (time: number) => {
  const date = new Date(time);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${date.getFullYear()}-${month}-${day}`;
};
/** "14 Nov" */
export const dayMonth = (time: number) => shortDate(time).slice(4);
/** "19:40" */
export const clockTime = (time: number) => {
  const date = new Date(time);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${pad(date.getHours())}:${pad(date.getMinutes())}`;
};

// ── Game types ───────────────────────────────────────────────────────────────

export const GAME_TYPES = {
  lucky_wheel: { label: "Lucky Spin", caption: "A wheel with prizes" },
  quiz: { label: "Quiz", caption: "Questions and scores" },
  scratch_card: { label: "Scratch card", caption: "Reveal a hidden prize" },
  mystery_box: {
    label: "Mystery box",
    caption: "Pick a box, win what is inside",
  },
  hit_it: { label: "Hit It", caption: "Tap fast to score" },
} as const satisfies Record<
  Campaign["gameType"],
  { label: string; caption: string }
>;
export type GameKey = keyof typeof GAME_TYPES;
export const GAME_LIST = (Object.keys(GAME_TYPES) as GameKey[]).map((id) => ({
  id,
  ...GAME_TYPES[id],
}));

// ── Performance snapshot ─────────────────────────────────────────────────────

export const PERFORMANCE_RANGES: Record<
  RangeKey,
  { tab: string; days: number }
> = {
  "7d": { tab: "7 days", days: 7 },
  "30d": { tab: "30 days", days: 30 },
};

// ── Campaign timeline ────────────────────────────────────────────────────────

export const CAMPAIGN_STATUSES = {
  active: { label: "Active", tone: "ok", icon: CircleCheck },
  scheduled: { label: "Scheduled", tone: "info", icon: Clock },
  paused: { label: "Paused", tone: "warn", icon: Pause },
} as const;

export interface TimelineCampaign {
  id: string;
  name: string;
  game: GameKey;
  status: keyof typeof CAMPAIGN_STATUSES;
  ending?: boolean;
  start: number;
  end: number;
  dates: string;
  rightLabel: string;
  rightTone?: "danger" | "warning";
  prize: string | null;
}

export const TIMELINE_FILTERS: {
  key: TimelineFilter;
  label: string;
  matches: (campaign: TimelineCampaign) => boolean;
}[] = [
  { key: "all", label: "All", matches: () => true },
  { key: "active", label: "Active", matches: (c) => c.status === "active" },
  {
    key: "scheduled",
    label: "Scheduled",
    matches: (c) => c.status === "scheduled",
  },
  { key: "paused", label: "Paused", matches: (c) => c.status === "paused" },
  { key: "ending", label: "Ending soon", matches: (c) => Boolean(c.ending) },
];

export interface TimelineScale {
  tab: string;
  subtitle: string;
  start: number;
  days: number;
  ticks: { time: number; label: string }[];
}

/** The two views of the timeline, from the week and the month of `now`. */
export function timelineScales(now: number): Record<Scale, TimelineScale> {
  const date = new Date(now);
  // Monday of this week.
  const weekStart = addDays(now, -((date.getDay() + 6) % 7));
  const WEEKS = 8;
  const MONTHS = 4;
  const monthStart = (offset: number) =>
    new Date(date.getFullYear(), date.getMonth() + offset, 1).getTime();
  const monthLabel = (time: number, withYear: boolean) => {
    const month = new Date(time);
    const name = MONTH_NAMES[month.getMonth()];
    return withYear ? `${name} ${month.getFullYear()}` : name;
  };
  const lastMonth = monthStart(MONTHS - 1);
  return {
    weeks: {
      tab: "Weeks",
      subtitle: `Next ${WEEKS} weeks`,
      start: weekStart,
      days: WEEKS * 7,
      ticks: Array.from({ length: WEEKS }, (_, index) => {
        const time = addDays(weekStart, index * 7);
        return { time, label: dayMonth(time) };
      }),
    },
    months: {
      tab: "Months",
      subtitle: `${monthLabel(monthStart(0), true)} – ${monthLabel(lastMonth, true)}`,
      start: monthStart(0),
      days: Math.round((monthStart(MONTHS) - monthStart(0)) / DAY),
      ticks: Array.from({ length: MONTHS }, (_, index) => {
        const time = monthStart(index);
        return {
          time,
          label: monthLabel(time, new Date(time).getMonth() === 0),
        };
      }),
    },
  };
}

/** Room left after the last campaign ends, to see it end and to schedule the next one. */
export const EXTENDED_MARGIN_WEEKS = 4;

/**
 * The full timeline's range: the usual view, grown to the earliest start and to a few weeks
 * past the latest end of the campaigns shown, so every campaign can be followed to its end.
 */
export function extendedTimelineScale(
  scale: Scale,
  base: TimelineScale,
  campaigns: Pick<TimelineCampaign, "start" | "end">[],
): TimelineScale {
  const baseEnd = base.start + base.days * DAY;
  const earliest = Math.min(base.start, ...campaigns.map((c) => c.start));
  const latest = Math.max(
    baseEnd,
    ...campaigns.map((c) => addDays(c.end, EXTENDED_MARGIN_WEEKS * 7)),
  );

  if (scale === "weeks") {
    const day = new Date(earliest);
    const start = startOfDay(addDays(earliest, -((day.getDay() + 6) % 7)));
    const weeks = Math.ceil((latest - start) / (7 * DAY));
    return {
      ...base,
      subtitle: `${weeks} weeks`,
      start,
      days: weeks * 7,
      ticks: Array.from({ length: weeks }, (_, index) => {
        const time = addDays(start, index * 7);
        return { time, label: dayMonth(time) };
      }),
    };
  }

  const first = new Date(earliest);
  const last = new Date(latest);
  const months =
    (last.getFullYear() - first.getFullYear()) * 12 +
    last.getMonth() -
    first.getMonth() +
    1;
  const monthStart = (offset: number) =>
    new Date(first.getFullYear(), first.getMonth() + offset, 1).getTime();
  const label = (time: number, index: number) => {
    const month = new Date(time);
    const name = MONTH_NAMES[month.getMonth()];
    return index === 0 || month.getMonth() === 0
      ? `${name} ${month.getFullYear()}`
      : name;
  };
  return {
    ...base,
    subtitle: `${months} months`,
    start: monthStart(0),
    days: Math.round((monthStart(months) - monthStart(0)) / DAY),
    ticks: Array.from({ length: months }, (_, index) => {
      const time = monthStart(index);
      return { time, label: label(time, index) };
    }),
  };
}

// ── Team activity ────────────────────────────────────────────────────────────

export const ACTIVITY_LIMIT = 6;
/** Enough rows for each filter to have something to show. */
export const ACTIVITY_FETCHED = 40;
export const ACTIVITY_FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "campaign", label: "Campaigns" },
  { key: "reward", label: "Rewards" },
  { key: "team", label: "Team access" },
];

// ── Help panel ───────────────────────────────────────────────────────────────

export const HELP_SUGGESTIONS: Record<
  "full" | "empty",
  {
    label: string;
    accent: Accent;
    icon: LucideIcon;
    to: "create" | "prizes" | "support";
  }[]
> = {
  full: [
    {
      label: "How to top up voucher stock",
      accent: "k3",
      icon: Ticket,
      to: "prizes",
    },
    {
      label: "Schedule the next campaign",
      accent: "k4",
      icon: Clock,
      to: "create",
    },
    {
      label: "Read the campaign guide",
      accent: "k1",
      icon: FileText,
      to: "support",
    },
  ],
  empty: [
    {
      label: "Create your first campaign",
      accent: "k1",
      icon: FileText,
      to: "create",
    },
    {
      label: "Choose the right game type",
      accent: "k4",
      icon: Gamepad2,
      to: "create",
    },
    {
      label: "Add prizes and vouchers",
      accent: "k3",
      icon: Gift,
      to: "prizes",
    },
  ],
};
