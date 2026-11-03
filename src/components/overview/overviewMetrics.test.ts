import { describe, expect, it } from "vitest";

import type { Campaign, OverviewSnapshot, PrizeTemplate } from "../../types";
import {
  campaignSummary,
  countdown,
  lowRewards,
  performanceFigures,
  relativeTime,
  timelineCampaigns,
} from "./overviewMetrics";

const HOUR = 3600 * 1000;
const DAY = 24 * HOUR;
const NOW = Date.parse("2026-10-31T12:00:00Z");
const at = (offset: number) => new Date(NOW + offset).toISOString();

function campaign(patch: Partial<Campaign>): Campaign {
  return {
    id: "c",
    name: "Campaign",
    arabicName: "",
    slug: "c",
    gameType: "quiz",
    status: "active",
    winProbability: 50,
    prizes: [],
    questions: [],
    participantsCount: 0,
    rewardsClaimed: 0,
    startDate: at(-DAY),
    endDate: at(10 * DAY),
    ...patch,
  };
}

function reward(patch: Partial<PrizeTemplate>): PrizeTemplate {
  return {
    id: "r",
    name: "Reward",
    category: "voucher",
    description: "",
    totalStock: 100,
    availableStock: 100,
    allocatedStock: 0,
    itemValue: "",
    ...patch,
  } as PrizeTemplate;
}

const snapshot = (patch: Partial<OverviewSnapshot>): OverviewSnapshot => ({
  days: 7,
  totalParticipants: 10,
  participants: 10,
  previousParticipants: 0,
  claimed: 4,
  redeemed: 1,
  previousClaimed: 0,
  previousRedeemed: 0,
  available: 8,
  daily: [0, 0, 0, 0, 0, 5, 5],
  ...patch,
});

describe("campaignSummary", () => {
  it("separates what is live from what is scheduled, paused and archived", () => {
    const summary = campaignSummary(
      [
        campaign({ id: "live" }),
        campaign({ id: "late", startDate: at(5 * DAY) }),
        campaign({ id: "soon", startDate: at(DAY) }),
        campaign({ id: "paused", status: "paused" }),
        campaign({ id: "old", status: "archived" }),
        campaign({ id: "draft", status: "draft" }),
      ],
      NOW,
    );
    expect(summary.live.map((c) => c.id)).toEqual(["live"]);
    expect(summary.scheduled.map((c) => c.id)).toEqual(["soon", "late"]);
    expect(summary.paused).toBe(1);
    expect(summary.archived).toBe(1);
  });

  it("does not count an active campaign whose end date has passed as live", () => {
    const summary = campaignSummary([campaign({ endDate: at(-DAY) })], NOW);
    expect(summary.live).toHaveLength(0);
  });

  it("keeps a campaign live for the whole of its last day, as the server does", () => {
    const lastDay = campaign({ endDate: "2026-10-31" });
    expect(campaignSummary([lastDay], NOW).live).toHaveLength(1);
    const oneDay = campaign({ startDate: "2026-10-31", endDate: "2026-10-31" });
    expect(campaignSummary([oneDay], NOW).live).toHaveLength(1);
  });

  it("names the campaign ending first, within three days", () => {
    const summary = campaignSummary(
      [
        campaign({ id: "far" }),
        campaign({ id: "two", endDate: at(2 * DAY) }),
        campaign({ id: "one", endDate: at(DAY) }),
      ],
      NOW,
    );
    expect(summary.endingNext?.id).toBe("one");
  });
});

describe("countdown", () => {
  it("keeps the two largest units", () => {
    expect(countdown(2 * DAY + 13 * HOUR)).toBe("2d 13h");
    expect(countdown(5 * HOUR + 20 * 60000)).toBe("5h 20m");
    expect(countdown(12 * 60000)).toBe("12m");
  });
});

describe("lowRewards", () => {
  it("counts what was won, not what is allocated to campaigns", () => {
    const fullyAllocated = reward({ availableStock: 0, allocatedStock: 100 });
    expect(lowRewards([fullyAllocated])).toHaveLength(0);
  });

  it("lists rewards under 10 units or 15% of stock, the emptiest first", () => {
    const low = lowRewards([
      reward({ id: "fine", totalStock: 100, quantityWonCount: 10 }),
      reward({ id: "share", totalStock: 1000, quantityWonCount: 900 }),
      reward({ id: "units", totalStock: 20, quantityWonCount: 19 }),
    ]);
    expect(low.map((item) => item.id)).toEqual(["units", "share"]);
    expect(low[0].left).toBe(1);
  });

  it("leaves out a reward with no stock set", () => {
    expect(lowRewards([reward({ totalStock: 0 })])).toHaveLength(0);
  });
});

describe("performanceFigures", () => {
  it("shows no comparison when there is no earlier period", () => {
    const figures = performanceFigures(snapshot({}));
    expect(figures.participantsChange).toBeNull();
    expect(figures.redemptionChange).toBeNull();
    expect(figures.claimedShare).toBe(50);
    expect(figures.redemption).toBe("25.0%");
  });

  it("compares with the previous period, in both directions", () => {
    const up = performanceFigures(
      snapshot({ participants: 15, previousParticipants: 10 }),
    );
    expect(up.participantsChange).toEqual({ label: "50%", up: true });
    const down = performanceFigures(
      snapshot({ participants: 5, previousParticipants: 10 }),
    );
    expect(down.participantsChange).toEqual({ label: "50%", up: false });
  });

  it("never divides by zero on an empty period", () => {
    const figures = performanceFigures(
      snapshot({
        participants: 0,
        claimed: 0,
        redeemed: 0,
        available: 0,
        daily: [0, 0],
      }),
    );
    expect(figures.redemption).toBe("0.0%");
    expect(figures.claimedShare).toBe(0);
    expect(figures.trend).toEqual([0, 0]);
  });
});

describe("timelineCampaigns", () => {
  it("leaves out drafts, archives and campaigns already over", () => {
    const rows = timelineCampaigns(
      [
        campaign({ id: "draft", status: "draft" }),
        campaign({ id: "old", status: "archived" }),
        campaign({ id: "over", endDate: at(-DAY) }),
        campaign({ id: "live" }),
      ],
      [],
      NOW,
    );
    expect(rows.map((row) => row.id)).toEqual(["live"]);
  });

  it("names the first prize of the campaign", () => {
    const rows = timelineCampaigns(
      [campaign({ prizes: [{ templateId: "r", quantity: 1, weight: 1 }] })],
      [reward({ id: "r", name: "Cinema ticket" })],
      NOW,
    );
    expect(rows[0].prize).toBe("Cinema ticket");
  });
});

describe("relativeTime", () => {
  it("reads naturally", () => {
    expect(relativeTime(NOW - 30000, NOW)).toBe("Just now");
    expect(relativeTime(NOW - 12 * 60000, NOW)).toBe("12 min ago");
    expect(relativeTime(NOW - 3 * HOUR, NOW)).toBe("3 h ago");
    expect(relativeTime(NOW - 30 * HOUR, NOW)).toBe("Yesterday");
    expect(relativeTime(NOW - 4 * DAY, NOW)).toBe("4 days ago");
  });
});
