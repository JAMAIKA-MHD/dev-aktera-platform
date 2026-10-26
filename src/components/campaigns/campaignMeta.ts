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

/** Colour pair of a status badge; the word and the dot are always there too. */
export type BadgeTone = "success" | "warning" | "brand" | "neutral" | "outline";

export const STATUS_META: Record<
  CampaignStatus,
  { key: string; label: string; tone: BadgeTone }
> = {
  active: { key: "campaigns.active", label: "Active", tone: "success" },
  paused: { key: "campaigns.paused", label: "Paused", tone: "warning" },
  draft: { key: "campaigns.draft", label: "Draft", tone: "outline" },
  archived: { key: "campaigns.archived", label: "Archived", tone: "neutral" },
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

/** A published campaign whose first day has not come yet: shown as Scheduled, not Active. */
export function isScheduled(
  campaign: Pick<Campaign, "status" | "startDate">,
  now: Date = new Date(),
) {
  if (campaign.status !== "active") return false;
  const start = dayStart(campaign.startDate);
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return !Number.isNaN(start) && start > today.getTime();
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
