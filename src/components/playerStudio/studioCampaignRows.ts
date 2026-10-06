// Campaign (+ when its Studio design was last saved) → one row of the Player Studio table.
// Pure: the date is a parameter, so the "ended" rule is testable.
import type { Campaign } from "../../types";

// What the table shows: an active campaign whose end date is past is "ended" for the brand.
export type StudioDisplayStatus =
  "active" | "ended" | "paused" | "draft" | "archived";

export interface StudioCampaignRow {
  id: string;
  name: string;
  arabicName: string;
  slug: string;
  gameType: Campaign["gameType"];
  status: Campaign["status"];
  displayStatus: StudioDisplayStatus;
  startDate: string;
  endDate: string;
  players: number;
  designSavedAt: string | null; // null: the Studio design was never saved (default design)
}

// Default order of the table: what is running first, then what can still run.
const STATUS_RANK: Record<StudioDisplayStatus, number> = {
  active: 0,
  paused: 1,
  draft: 2,
  ended: 3,
  archived: 4,
};

export function displayStatusOf(
  campaign: Pick<Campaign, "status" | "endDate">,
  now: Date,
): StudioDisplayStatus {
  const endsAt = Date.parse(campaign.endDate);
  if (
    campaign.status === "active" &&
    Number.isFinite(endsAt) &&
    endsAt < now.getTime()
  ) {
    return "ended";
  }
  return campaign.status;
}

export function toStudioCampaignRow(
  campaign: Campaign,
  designSavedAt: ReadonlyMap<string, string>,
  now: Date,
): StudioCampaignRow {
  return {
    id: campaign.id,
    name: campaign.name,
    arabicName: campaign.arabicName ?? "",
    slug: campaign.slug,
    gameType: campaign.gameType,
    status: campaign.status,
    displayStatus: displayStatusOf(campaign, now),
    startDate: campaign.startDate,
    endDate: campaign.endDate,
    players: campaign.participantsCount ?? 0,
    designSavedAt: designSavedAt.get(campaign.id) ?? null,
  };
}

// Rows in the table's default order: by status (running first), then the most recent start.
export function toStudioCampaignRows(
  campaigns: readonly Campaign[],
  designSavedAt: ReadonlyMap<string, string>,
  now: Date,
): StudioCampaignRow[] {
  return campaigns
    .map((campaign) => toStudioCampaignRow(campaign, designSavedAt, now))
    .sort(
      (a, b) =>
        STATUS_RANK[a.displayStatus] - STATUS_RANK[b.displayStatus] ||
        (Date.parse(b.startDate) || 0) - (Date.parse(a.startDate) || 0),
    );
}

// Status filter of the page. "ended" groups what can no longer be played (past end date,
// archived).
export type StatusFilter = "all" | "active" | "paused" | "draft" | "ended";

export function matchesStatusFilter(
  row: StudioCampaignRow,
  filter: StatusFilter,
) {
  if (filter === "all") return true;
  if (filter === "ended") {
    return row.displayStatus === "ended" || row.displayStatus === "archived";
  }
  return row.displayStatus === filter;
}

// Text search of the table: name, Arabic name or slug, case-insensitive.
export function matchesStudioSearch(row: StudioCampaignRow, query: string) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [row.name, row.arabicName, row.slug].some((value) =>
    value.toLowerCase().includes(needle),
  );
}
