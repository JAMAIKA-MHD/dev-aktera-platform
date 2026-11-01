// Everything the Overview computes from the account's campaigns and rewards. Pure functions, free
// of React, with the current time passed in: tested on their own.
import type { Campaign, OverviewSnapshot, PrizeTemplate } from "../../types";
import { campaignEndTime } from "../campaigns/campaignMeta";
import {
  DAY,
  clockTime,
  dayMonth,
  shortDate,
  type TimelineCampaign,
} from "./overviewData";

const ENDING_SOON_MS = 3 * DAY;
export const LOW_STOCK_UNITS = 10;
export const LOW_STOCK_SHARE = 0.15;

const startOf = (campaign: Campaign) => Date.parse(campaign.startDate);
const endOf = (campaign: Campaign) => campaignEndTime(campaign.endDate);

const isLive = (campaign: Campaign, now: number) =>
  campaign.status === "active" &&
  startOf(campaign) <= now &&
  endOf(campaign) >= now;

const isScheduled = (campaign: Campaign, now: number) =>
  campaign.status === "active" && startOf(campaign) > now;

export function campaignSummary(campaigns: Campaign[], now: number) {
  const live = campaigns.filter((campaign) => isLive(campaign, now));
  const scheduled = campaigns
    .filter((campaign) => isScheduled(campaign, now))
    .sort((a, b) => startOf(a) - startOf(b));
  const endingNext =
    live
      .filter((campaign) => endOf(campaign) - now <= ENDING_SOON_MS)
      .sort((a, b) => endOf(a) - endOf(b))[0] ?? null;
  return {
    live,
    scheduled,
    endingNext,
    paused: campaigns.filter((campaign) => campaign.status === "paused").length,
    archived: campaigns.filter((campaign) => campaign.status === "archived")
      .length,
  };
}

/** "2d 13h", "5h 20m", "12m": the time left, in its two largest units. */
export function countdown(milliseconds: number): string {
  const minutes = Math.max(0, Math.floor(milliseconds / 60000));
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes % 60}m`;
  return `${minutes}m`;
}

export interface RewardStock {
  id: string;
  name: string;
  left: number;
  total: number;
  share: number;
  tone: "danger" | "warning";
}

/** Rewards under 10 units or 15% of their stock, the emptiest first. */
export function lowRewards(prizes: PrizeTemplate[]): RewardStock[] {
  return prizes
    .filter((prize) => prize.totalStock > 0)
    .map((prize) => {
      const left = Math.max(
        0,
        prize.totalStock - (prize.quantityWonCount ?? 0),
      );
      const share = left / prize.totalStock;
      return {
        id: prize.id,
        name: prize.name,
        left,
        total: prize.totalStock,
        share,
        tone: (share < LOW_STOCK_SHARE / 2 ? "danger" : "warning") as
          "danger" | "warning",
      };
    })
    .filter(
      (reward) =>
        reward.left < LOW_STOCK_UNITS || reward.share < LOW_STOCK_SHARE,
    )
    .sort((a, b) => a.share - b.share);
}

export const compactNumber = (value: number) =>
  new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);

const rate = (part: number, whole: number) =>
  whole > 0 ? (part / whole) * 100 : 0;

export interface Change {
  label: string;
  up: boolean;
}

export interface PerformanceFigures {
  participants: string;
  participantsChange: Change | null;
  claimed: string;
  available: string;
  claimedShare: number;
  redemption: string;
  redemptionChange: Change | null;
  /** Between 0 and 1, oldest day first. */
  trend: number[];
}

export function performanceFigures(
  snapshot: OverviewSnapshot,
): PerformanceFigures {
  const {
    participants,
    previousParticipants,
    claimed,
    redeemed,
    previousClaimed,
    previousRedeemed,
    available,
    daily,
  } = snapshot;

  const redemption = rate(redeemed, claimed);
  const previousRedemption = rate(previousRedeemed, previousClaimed);
  const highest = Math.max(...daily, 1);
  const participantsDelta = rate(
    participants - previousParticipants,
    previousParticipants,
  );
  const redemptionDelta = redemption - previousRedemption;

  return {
    participants: compactNumber(participants),
    // No previous period, no comparison: a percentage of nothing means nothing.
    participantsChange:
      previousParticipants > 0
        ? {
            label: `${Math.abs(Math.round(participantsDelta))}%`,
            up: participantsDelta >= 0,
          }
        : null,
    claimed: compactNumber(claimed),
    available: compactNumber(available),
    claimedShare: Math.min(100, Math.round(rate(claimed, available))),
    redemption: `${redemption.toFixed(1)}%`,
    redemptionChange:
      previousClaimed > 0 && claimed > 0
        ? {
            label: `${Math.abs(redemptionDelta).toFixed(1)} pts`,
            up: redemptionDelta >= 0,
          }
        : null,
    trend: daily.map((count) => count / highest),
  };
}

function campaignDates(start: number, end: number): string {
  return `${dayMonth(start)} – ${dayMonth(end)}`;
}

function firstPrizeName(
  campaign: Campaign,
  prizes: PrizeTemplate[],
): string | null {
  const templateId = campaign.prizes[0]?.templateId;
  return prizes.find((prize) => prize.id === templateId)?.name ?? null;
}

export function timelineCampaigns(
  campaigns: Campaign[],
  prizes: PrizeTemplate[],
  now: number,
): TimelineCampaign[] {
  const rows: TimelineCampaign[] = [];
  for (const campaign of campaigns) {
    const start = startOf(campaign);
    const end = endOf(campaign);
    const base = {
      id: campaign.id,
      name: campaign.name,
      game: campaign.gameType,
      start,
      end,
      // The day the campaign names: its closing moment already falls on the next local day.
      dates: campaignDates(start, Date.parse(campaign.endDate)),
      prize: firstPrizeName(campaign, prizes),
    };
    if (isLive(campaign, now)) {
      const ending = end - now <= ENDING_SOON_MS;
      rows.push({
        ...base,
        status: "active",
        ending,
        rightLabel: ending
          ? `Ending soon · ${countdown(end - now)} left`
          : `Active · ${Math.ceil((end - now) / DAY)} d left`,
        rightTone: ending ? "danger" : undefined,
      });
    } else if (isScheduled(campaign, now)) {
      rows.push({
        ...base,
        status: "scheduled",
        rightLabel: `Scheduled · starts in ${countdown(start - now)}`,
      });
    } else if (campaign.status === "paused") {
      rows.push({
        ...base,
        status: "paused",
        rightLabel: "Paused",
        rightTone: "warning",
      });
    }
  }
  return rows.sort((a, b) => a.start - b.start);
}

export function initialsOf(name: string): string {
  const words = name.trim().split(/\s+/).filter(Boolean);
  return ((words[0]?.[0] ?? "") + (words[1]?.[0] ?? "")).toUpperCase() || "?";
}

/** "12 min ago", "3 h ago", "Yesterday", "4 days ago". */
export function relativeTime(time: number, now: number): string {
  const minutes = Math.max(0, Math.floor((now - time) / 60000));
  if (minutes < 1) return "Just now";
  if (minutes < 60) return `${minutes} min ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} h ago`;
  const days = Math.floor(hours / 24);
  return days === 1 ? "Yesterday" : `${days} days ago`;
}

/** "Thu 29 Oct, 19:28" */
export const absoluteTime = (time: number) =>
  `${shortDate(time)}, ${clockTime(time)}`;
