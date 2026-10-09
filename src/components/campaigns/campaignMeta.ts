// Shared vocabulary of the campaigns section (list, wizard, workspace): one label, icon and
// colour per game type and per status, so the three screens always agree.
import {
  Disc,
  Gift,
  HelpCircle,
  Layers,
  Zap,
  type LucideIcon,
} from "lucide-react";

import type { Campaign } from "../../types";

export type GameType = Campaign["gameType"];
export type CampaignStatus = Campaign["status"];

export interface GameMeta {
  id: GameType;
  /** i18n key of the short label, with `label` as its fallback. */
  key: string;
  label: string;
  /** What the player does, in one line. */
  description: string;
  /** What the brand has to set up for this game. */
  setup: string;
  icon: LucideIcon;
  /** Icon tile: tinted background and matching text colour. */
  tile: string;
}

export const GAME_TYPES: GameMeta[] = [
  {
    id: "lucky_wheel",
    key: "campaigns.spinWheel",
    label: "Spin Wheel",
    description: "Players spin a wheel and land on a prize.",
    setup: "Prizes and their share of the wheel",
    icon: Disc,
    tile: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-300",
  },
  {
    id: "scratch_card",
    key: "campaigns.scratchCard",
    label: "Scratch Card",
    description: "Players scratch a card to reveal what they won.",
    setup: "Prizes and win chance",
    icon: Layers,
    tile: "bg-amber-500/10 text-amber-600 dark:text-amber-300",
  },
  {
    id: "mystery_box",
    key: "campaigns.mysteryBox",
    label: "Mystery Box",
    description: "Players pick one of three boxes to open.",
    setup: "Prizes and win chance",
    icon: Gift,
    tile: "bg-blue-500/10 text-blue-600 dark:text-blue-300",
  },
  {
    id: "hit_it",
    key: "campaigns.hitIt",
    label: "Hit It",
    description: "Players tap a target as fast as they can in 10 seconds.",
    setup: "Number of hits needed to win",
    icon: Zap,
    tile: "bg-rose-500/10 text-rose-600 dark:text-rose-300",
  },
  {
    id: "quiz",
    key: "campaigns.quiz",
    label: "Quiz Challenge",
    description: "Players answer your questions to unlock the prize draw.",
    setup: "Your questions and the passing score",
    icon: HelpCircle,
    tile: "bg-purple-500/10 text-purple-600 dark:text-purple-300",
  },
];

export const gameMeta = (gameType: GameType): GameMeta =>
  GAME_TYPES.find((game) => game.id === gameType) ?? GAME_TYPES[0];

export const STATUS_META: Record<
  CampaignStatus,
  { key: string; label: string; badge: string }
> = {
  active: {
    key: "campaigns.active",
    label: "Active",
    badge:
      "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/40 dark:bg-emerald-950/70 dark:text-emerald-300",
  },
  paused: {
    key: "campaigns.paused",
    label: "Paused",
    badge:
      "border-amber-200 bg-amber-50 text-amber-700 dark:border-amber-500/40 dark:bg-amber-950/70 dark:text-amber-300",
  },
  draft: {
    key: "campaigns.draft",
    label: "Draft",
    badge:
      "border-blue-200 bg-blue-50 text-blue-700 dark:border-blue-500/40 dark:bg-blue-950/70 dark:text-blue-300",
  },
  archived: {
    key: "campaigns.archived",
    label: "Archived",
    badge:
      "border-slate-200 bg-slate-100 text-slate-500 dark:border-slate-600/40 dark:bg-slate-900/70 dark:text-slate-400",
  },
};

export const STATUS_ORDER: CampaignStatus[] = [
  "active",
  "paused",
  "draft",
  "archived",
];

const DAY_MS = 86_400_000;
const dayStart = (isoDay: string) =>
  Date.parse(`${isoDay.slice(0, 10)}T00:00:00`);

/** Whole days from start to end, both included; null when a date is missing or reversed. */
export function campaignDurationDays(startDate: string, endDate: string) {
  const start = dayStart(startDate);
  const end = dayStart(endDate);
  if (Number.isNaN(start) || Number.isNaN(end) || end < start) return null;
  return Math.round((end - start) / DAY_MS) + 1;
}

export interface CampaignTimeline {
  /** Share of the campaign period already elapsed, 0 to 100. */
  percent: number;
  label: string;
}

/** Where today falls in the campaign period: "Starts in 3 days", "12 days left", "Ended". */
export function campaignTimeline(
  startDate: string,
  endDate: string,
  now: Date = new Date(),
): CampaignTimeline | null {
  const days = campaignDurationDays(startDate, endDate);
  if (days === null) return null;
  const start = dayStart(startDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const elapsed = Math.round((today.getTime() - start) / DAY_MS);
  const plural = (count: number) => (count === 1 ? "day" : "days");

  if (elapsed < 0) {
    return { percent: 0, label: `Starts in ${-elapsed} ${plural(-elapsed)}` };
  }
  const left = days - 1 - elapsed;
  if (left < 0) return { percent: 100, label: "Ended" };
  if (left === 0) return { percent: 100, label: "Last day" };
  return {
    percent: Math.round(((elapsed + 1) / days) * 100),
    label: `${left} ${plural(left)} left`,
  };
}

export const formatCount = (count: number) =>
  count >= 1000
    ? `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`
    : String(count);
