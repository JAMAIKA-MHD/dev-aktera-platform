import { Package, Ticket, type LucideIcon } from "lucide-react";
import { REWARD_TYPE_NAME } from "../../lib/rewardTypes";
import type { PrizeTemplate } from "../../types";

// How a reward card tells a digital code from a physical reward at a glance: one accent color,
// one icon and one label per type. Class names are written in full so Tailwind can see them.
export interface RewardCardTheme {
  icon: LucideIcon;
  /** Short name of the type, shown in the card header. */
  label: string;
  /** What the big number on the stub counts. */
  unit: string;
  hoverBorder: string;
  header: string;
  stubHeader: string;
  pill: string;
  accentText: string;
}

export const REWARD_CARD_THEME: Record<
  PrizeTemplate["category"],
  RewardCardTheme
> = {
  voucher: {
    icon: Ticket,
    label: REWARD_TYPE_NAME.voucher,
    unit: "Codes",
    hoverBorder: "hover:border-emerald-500/50",
    header: "bg-emerald-600 border-emerald-700/40",
    stubHeader: "bg-emerald-700/40 border-emerald-700/40",
    pill: "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30",
    accentText: "text-emerald-500",
  },
  physical: {
    icon: Package,
    label: REWARD_TYPE_NAME.physical,
    unit: "Units",
    hoverBorder: "hover:border-indigo-500/50",
    header: "bg-indigo-600 border-indigo-700/40",
    stubHeader: "bg-indigo-700/40 border-indigo-700/40",
    pill: "bg-indigo-500/15 text-indigo-600 dark:text-indigo-300 border-indigo-500/30",
    accentText: "text-indigo-500",
  },
};

export type RewardTypeFilterValue = "all" | PrizeTemplate["category"];

export const matchesRewardType = (
  prize: Pick<PrizeTemplate, "category">,
  filter: RewardTypeFilterValue,
): boolean => filter === "all" || prize.category === filter;
