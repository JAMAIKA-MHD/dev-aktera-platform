import {
  CircleCheck,
  CircleHelp,
  Clock,
  FerrisWheel,
  FileText,
  Gift,
  LayoutGrid,
  Pause,
  Ticket,
  type LucideIcon,
} from "lucide-react";

// Everything the Overview page shows. It is all MOCK data, kept here so that each block can be
// wired to real data on its own. Nothing here fetches anything.

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

const at = (month: number, day: number, hour = 0, minute = 0, year = 2026) =>
  new Date(year, month - 1, day, hour, minute).getTime();
const endOfDay = (month: number, day: number) => at(month, day, 23, 59);

export const NOW = at(10, 29, 19, 40);

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

// ── Game types ───────────────────────────────────────────────────────────────

export const GAME_TYPES = {
  spin: {
    label: "Lucky Spin",
    caption: "A wheel with prizes",
    accent: "k4",
    icon: FerrisWheel,
  },
  quiz: {
    label: "Quiz",
    caption: "Questions and scores",
    accent: "k2",
    icon: CircleHelp,
  },
  scratch: {
    label: "Scratch card",
    caption: "Reveal a hidden prize",
    accent: "k1",
    icon: Ticket,
  },
  memory: {
    label: "Memory match",
    caption: "Match pairs to win",
    accent: "k3",
    icon: LayoutGrid,
  },
} as const satisfies Record<
  string,
  { label: string; caption: string; accent: Accent; icon: LucideIcon }
>;
export type GameKey = keyof typeof GAME_TYPES;
export const GAME_LIST = Object.values(GAME_TYPES);

// ── Needs attention ──────────────────────────────────────────────────────────

export const ATTENTION_VISIBLE = 3;
export const ATTENTION_ITEMS: {
  tone: "danger" | "warning" | "info";
  badgeTone: "bad" | "warn" | "info";
  icon: LucideIcon;
  badge: string;
  sentence: string;
  action: string;
  to: "create" | "prizes" | "campaigns";
}[] = [
  {
    tone: "danger",
    badgeTone: "bad",
    icon: Clock,
    badge: "Urgent · 28 h left",
    sentence:
      "Autumn Gift Wheel ends Fri 30 Oct, 23:59 with nothing scheduled after it.",
    action: "Schedule next campaign",
    to: "create",
  },
  {
    tone: "danger",
    badgeTone: "bad",
    icon: Ticket,
    badge: "Urgent · 4 units left",
    sentence: "Free coffee voucher is almost out of stock (4 of 100 left).",
    action: "Restock voucher",
    to: "prizes",
  },
  {
    tone: "warning",
    badgeTone: "warn",
    icon: Ticket,
    badge: "Soon · 9.5% left",
    sentence: "Cinema ticket is running low (38 of 400 left).",
    action: "Restock voucher",
    to: "prizes",
  },
  {
    tone: "info",
    badgeTone: "info",
    icon: Gift,
    badge: "In 27 days",
    sentence: "Black Friday Quiz starts 25 Nov but has no prize yet.",
    action: "Add missing prize",
    to: "campaigns",
  },
  {
    tone: "info",
    badgeTone: "info",
    icon: FileText,
    badge: "Draft · 6 days",
    sentence:
      "Spring Teaser has been a draft for 6 days and was never launched.",
    action: "Review draft",
    to: "campaigns",
  },
];

// ── Vouchers running low ─────────────────────────────────────────────────────

export const LOW_VOUCHERS = [
  {
    name: "Free coffee voucher",
    left: 4,
    total: 100,
    value: 4,
    variant: "danger",
  },
  {
    name: "Cinema ticket",
    left: 38,
    total: 400,
    value: 9.5,
    variant: "warning",
  },
] as const;

// ── Performance snapshot ─────────────────────────────────────────────────────

export const PERFORMANCE: Record<
  RangeKey,
  {
    tab: string;
    days: number;
    participants: string;
    participantsDelta: string;
    claimed: string;
    available: string;
    claimedShare: number;
    redemption: string;
    redemptionDelta: string;
  }
> = {
  "7d": {
    tab: "7 days",
    days: 7,
    participants: "18.4K",
    participantsDelta: "12%",
    claimed: "6.2K",
    available: "9.0K",
    claimedShare: 69,
    redemption: "24.5%",
    redemptionDelta: "2.1 pts",
  },
  "30d": {
    tab: "30 days",
    days: 30,
    participants: "74.1K",
    participantsDelta: "9%",
    claimed: "24.8K",
    available: "36.0K",
    claimedShare: 69,
    redemption: "24.5%",
    redemptionDelta: "1.4 pts",
  },
};

/** A gentle upward trend with a small sine wobble, between 0 and 1. */
export const sparkValues = (points: number) =>
  Array.from({ length: points }, (_, index) => {
    const progress = index / (points - 1);
    const wobble = Math.sin(progress * Math.PI * (points > 10 ? 9 : 3.5));
    return 0.2 + 0.6 * progress + 0.1 * wobble;
  });

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

export const TIMELINE_CAMPAIGNS: TimelineCampaign[] = [
  {
    id: "autumn",
    name: "Autumn Gift Wheel",
    game: "spin",
    status: "active",
    ending: true,
    start: at(9, 29),
    end: endOfDay(10, 30),
    dates: "29 Sep – 30 Oct, 23:59",
    rightLabel: "Ending soon · 28 h left",
    rightTone: "danger",
    prize: "Cinema ticket",
  },
  {
    id: "dzz",
    name: "DZZ Mega Grand Challenge",
    game: "spin",
    status: "active",
    start: at(9, 29),
    end: endOfDay(11, 15),
    dates: "29 Sep – 15 Nov",
    rightLabel: "Active · 17 d left",
    prize: "10% discount code",
  },
  {
    id: "weekend",
    name: "Weekend Scratch & Win",
    game: "scratch",
    status: "active",
    start: at(10, 12),
    end: endOfDay(11, 9),
    dates: "12 Oct – 9 Nov",
    rightLabel: "Active · 11 d left",
    prize: "Free coffee voucher",
  },
  {
    id: "winter",
    name: "Winter Gift Wheel",
    game: "spin",
    status: "scheduled",
    start: at(11, 1, 9),
    end: endOfDay(11, 30),
    dates: "1 Nov, 09:00 – 30 Nov",
    rightLabel: "Scheduled · starts in 2 d",
    prize: "Gift card",
  },
  {
    id: "bf",
    name: "Black Friday Quiz",
    game: "quiz",
    status: "scheduled",
    start: at(11, 25),
    end: endOfDay(11, 30),
    dates: "25 Nov – 30 Nov",
    rightLabel: "Scheduled · starts in 27 d",
    prize: null,
  },
  {
    id: "memory",
    name: "Memory Match Rewards",
    game: "memory",
    status: "paused",
    start: at(10, 5),
    end: endOfDay(11, 20),
    dates: "5 Oct – 20 Nov",
    rightLabel: "Paused",
    rightTone: "warning",
    prize: "Cinema ticket",
  },
];

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

const weekTick = (index: number) => {
  const time = addDays(at(10, 26), index * 7);
  return { time, label: shortDate(time).slice(4) };
};
export const TIMELINE_SCALES: Record<
  Scale,
  {
    tab: string;
    subtitle: string;
    start: number;
    days: number;
    ticks: { time: number; label: string }[];
  }
> = {
  weeks: {
    tab: "Weeks",
    subtitle: "Next 8 weeks",
    start: at(10, 26),
    days: 56,
    ticks: Array.from({ length: 8 }, (_, index) => weekTick(index)),
  },
  months: {
    tab: "Months",
    subtitle: "Oct 2026 – Jan 2027",
    start: at(10, 1),
    days: 122,
    ticks: [
      { time: at(10, 1), label: "Oct" },
      { time: at(11, 1), label: "Nov" },
      { time: at(12, 1), label: "Dec" },
      { time: at(1, 1, 0, 0, 2027), label: "Jan 2027" },
    ],
  },
};

// ── Team activity ────────────────────────────────────────────────────────────

export const ACTIVITY_LIMIT = 6;
export const ACTIVITY_FILTERS: { key: ActivityFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "campaign", label: "Campaigns" },
  { key: "reward", label: "Rewards" },
  { key: "team", label: "Team access" },
];

export const ACTIVITY: {
  category: Exclude<ActivityFilter, "all">;
  important: boolean;
  initials: string;
  accent: Accent;
  who: string;
  verb: string;
  object: string;
  suffix?: string;
  detail?: string;
  relative: string;
  absolute: string;
}[] = [
  {
    category: "campaign",
    important: true,
    initials: "SB",
    accent: "k4",
    who: "Sara",
    verb: "paused",
    object: "Summer Wheel",
    detail: "Status: Live → Paused",
    relative: "12 min ago",
    absolute: "Thu 29 Oct, 19:28",
  },
  {
    category: "campaign",
    important: false,
    initials: "LM",
    accent: "k1",
    who: "Lina",
    verb: "scheduled",
    object: "Winter Gift Wheel",
    relative: "1 h ago",
    absolute: "Thu 29 Oct, 18:40",
  },
  {
    category: "reward",
    important: true,
    initials: "AK",
    accent: "k2",
    who: "Amine",
    verb: "edited the prize of",
    object: "Weekend Scratch & Win",
    detail: "Prize: 10% discount code → Free coffee voucher",
    relative: "3 h ago",
    absolute: "Thu 29 Oct, 16:40",
  },
  {
    category: "reward",
    important: true,
    initials: "SY",
    accent: "k3",
    who: "System",
    verb: "flagged",
    object: "Free coffee voucher",
    suffix: "as critical stock",
    detail: "Stock: 4 of 100 left",
    relative: "5 h ago",
    absolute: "Thu 29 Oct, 14:32",
  },
  {
    category: "campaign",
    important: false,
    initials: "M",
    accent: "k3",
    who: "You",
    verb: "launched",
    object: "DZZ Mega Grand Challenge",
    relative: "Yesterday",
    absolute: "Wed 28 Oct, 09:15",
  },
  {
    category: "team",
    important: false,
    initials: "LM",
    accent: "k1",
    who: "Lina",
    verb: "invited",
    object: "Karim",
    suffix: "as Viewer",
    relative: "Yesterday",
    absolute: "Wed 28 Oct, 08:40",
  },
  {
    category: "campaign",
    important: true,
    initials: "SB",
    accent: "k4",
    who: "Sara",
    verb: "archived",
    object: "Spring Quiz",
    detail: "Status: Ended → Archived",
    relative: "2 days ago",
    absolute: "Tue 27 Oct, 14:05",
  },
  {
    category: "team",
    important: true,
    initials: "LM",
    accent: "k1",
    who: "Lina",
    verb: "changed the role of",
    object: "Amine",
    detail: "Role: Viewer → Editor",
    relative: "3 days ago",
    absolute: "Mon 26 Oct, 11:20",
  },
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
      label: "How to top up voucher stock (3 are critical)",
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
      icon: FerrisWheel,
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
