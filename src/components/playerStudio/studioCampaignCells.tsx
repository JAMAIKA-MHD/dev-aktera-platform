// Labels, formats and cell contents of the Player Studio campaigns table.
import {
  Disc,
  Gift,
  HelpCircle,
  Layers,
  Zap,
  type LucideIcon,
} from "lucide-react";

import { Badge } from "../ui/badge";
import type { Campaign } from "../../types";
import type {
  StudioCampaignRow,
  StudioDisplayStatus,
} from "./studioCampaignRows";

export type Translate = (key: string, fallback?: string) => string;

// Same labels, icons and colors as the dashboard campaign list (CampaignsList.tsx).
const GAMES: Record<
  Campaign["gameType"],
  { key: string; label: string; icon: LucideIcon; tone: string }
> = {
  lucky_wheel: {
    key: "campaigns.spinWheel",
    label: "Spin Wheel",
    icon: Disc,
    tone: "text-emerald-600 dark:text-emerald-300",
  },
  quiz: {
    key: "campaigns.quiz",
    label: "Quiz Challenge",
    icon: HelpCircle,
    tone: "text-purple-600 dark:text-purple-300",
  },
  scratch_card: {
    key: "campaigns.scratchCard",
    label: "Scratch Card",
    icon: Layers,
    tone: "text-amber-600 dark:text-amber-300",
  },
  mystery_box: {
    key: "campaigns.mysteryBox",
    label: "Mystery Box",
    icon: Gift,
    tone: "text-blue-600 dark:text-blue-300",
  },
  hit_it: {
    key: "campaigns.hitIt",
    label: "Hit It",
    icon: Zap,
    tone: "text-rose-600 dark:text-rose-300",
  },
};

const ENDED_TONE =
  "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-600/40 dark:bg-slate-900/70 dark:text-slate-400";
const STATUSES: Record<StudioDisplayStatus, { label: string; tone: string }> = {
  active: {
    label: "Active",
    tone: "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/70 dark:text-emerald-300",
  },
  paused: {
    label: "Paused",
    tone: "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/70 dark:text-amber-300",
  },
  draft: {
    label: "Draft",
    tone: "border-slate-200 bg-slate-50 text-slate-600 dark:border-slate-500/40 dark:bg-slate-800/70 dark:text-slate-300",
  },
  ended: { label: "Ended", tone: ENDED_TONE },
  archived: { label: "Archived", tone: ENDED_TONE },
};

export function gameLabel(gameType: Campaign["gameType"], t: Translate) {
  return t(GAMES[gameType].key, GAMES[gameType].label);
}

const DAY_MONTH = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
});
const DAY_MONTH_YEAR = new Intl.DateTimeFormat("en-GB", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

// "1 Sep – 30 Sep 2026", or "1 Dec 2025 – 30 Jan 2026" across two years.
export function formatPeriod(startDate: string, endDate: string) {
  const start = new Date(startDate);
  const end = new Date(endDate);
  if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime())) return "—";
  const startLabel =
    start.getFullYear() === end.getFullYear()
      ? DAY_MONTH.format(start)
      : DAY_MONTH_YEAR.format(start);
  return `${startLabel} – ${DAY_MONTH_YEAR.format(end)}`;
}

const RELATIVE = new Intl.RelativeTimeFormat("en", { numeric: "auto" });
const UNITS: [Intl.RelativeTimeFormatUnit, number][] = [
  ["year", 365 * 24 * 3600],
  ["month", 30 * 24 * 3600],
  ["week", 7 * 24 * 3600],
  ["day", 24 * 3600],
  ["hour", 3600],
  ["minute", 60],
];

// "just now", "2 hours ago", "yesterday", "3 weeks ago"…
export function formatSavedAgo(savedAt: string, now: Date) {
  const seconds = Math.max(0, (now.getTime() - Date.parse(savedAt)) / 1000);
  for (const [unit, size] of UNITS) {
    if (seconds >= size) {
      return RELATIVE.format(-Math.floor(seconds / size), unit);
    }
  }
  return "just now";
}

export function CampaignNameCell({ row }: { row: StudioCampaignRow }) {
  return (
    <div className="flex max-w-[11rem] flex-col gap-0.5 whitespace-normal @2xl:max-w-[16rem] @4xl:max-w-[20rem] @6xl:max-w-[22rem]">
      <span className="truncate font-semibold text-foreground" title={row.name}>
        {row.name}
      </span>
      {row.arabicName && (
        <span
          dir="auto"
          className="max-w-full self-start truncate text-xs text-muted-foreground"
        >
          {row.arabicName}
        </span>
      )}
      <span className="truncate font-mono text-[11px] text-muted-foreground">
        /play/{row.slug}
      </span>
    </div>
  );
}

export function GameCell({ row, t }: { row: StudioCampaignRow; t: Translate }) {
  const game = GAMES[row.gameType];
  const Icon = game.icon;
  return (
    <span className="inline-flex items-center gap-2 text-foreground">
      <Icon className={`size-4 ${game.tone}`} aria-hidden />
      {gameLabel(row.gameType, t)}
    </span>
  );
}

export function StatusCell({
  row,
  t,
}: {
  row: StudioCampaignRow;
  t: Translate;
}) {
  const status = STATUSES[row.displayStatus];
  return (
    <Badge variant="outline" className={`rounded-full ${status.tone}`}>
      <span className="size-1.5 rounded-full bg-current" aria-hidden />
      {t(`playerStudio.status.${row.displayStatus}`, status.label)}
    </Badge>
  );
}

export function DesignCell({
  row,
  now,
  t,
}: {
  row: StudioCampaignRow;
  now: Date;
  t: Translate;
}) {
  if (!row.designSavedAt) {
    return (
      <Badge variant="outline" className="rounded-full text-muted-foreground">
        {t("playerStudio.design.default", "Default")}
      </Badge>
    );
  }
  return (
    <div className="flex flex-col">
      <span className="font-medium text-foreground">
        {t("playerStudio.design.saved", "Saved")}
      </span>
      <span className="text-xs text-muted-foreground" title={row.designSavedAt}>
        {formatSavedAgo(row.designSavedAt, now)}
      </span>
    </div>
  );
}
