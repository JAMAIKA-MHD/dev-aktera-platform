import { describe, expect, it } from "vitest";

import type { Campaign } from "../../types";
import {
  displayStatusOf,
  matchesStatusFilter,
  matchesStudioSearch,
  toStudioCampaignRow,
  toStudioCampaignRows,
} from "./studioCampaignRows";

const NOW = new Date("2026-09-30T12:00:00Z");

function campaign(overrides: Partial<Campaign> = {}): Campaign {
  return {
    id: "c1",
    name: "Summer Wheel",
    arabicName: "عجلة الصيف",
    slug: "summer-wheel",
    gameType: "lucky_wheel",
    status: "active",
    winProbability: 50,
    prizes: [],
    questions: [],
    participantsCount: 42,
    rewardsClaimed: 3,
    startDate: "2026-09-01T00:00:00Z",
    endDate: "2026-10-31T00:00:00Z",
    ...overrides,
  };
}

describe("toStudioCampaignRow", () => {
  it("builds the row the table shows", () => {
    const row = toStudioCampaignRow(
      campaign(),
      new Map([["c1", "2026-09-30T10:00:00Z"]]),
      NOW,
    );
    expect(row).toEqual({
      id: "c1",
      name: "Summer Wheel",
      arabicName: "عجلة الصيف",
      slug: "summer-wheel",
      gameType: "lucky_wheel",
      status: "active",
      displayStatus: "active",
      startDate: "2026-09-01T00:00:00Z",
      endDate: "2026-10-31T00:00:00Z",
      players: 42,
      designSavedAt: "2026-09-30T10:00:00Z",
    });
  });

  it("marks a campaign without a saved design as default (null)", () => {
    expect(
      toStudioCampaignRow(campaign(), new Map(), NOW).designSavedAt,
    ).toBeNull();
  });
});

describe("displayStatusOf", () => {
  it("shows an active campaign whose end date is past as ended", () => {
    expect(
      displayStatusOf(
        { status: "active", endDate: "2026-09-29T00:00:00Z" },
        NOW,
      ),
    ).toBe("ended");
  });

  it("keeps the other statuses as they are", () => {
    expect(
      displayStatusOf(
        { status: "active", endDate: "2026-10-01T00:00:00Z" },
        NOW,
      ),
    ).toBe("active");
    expect(
      displayStatusOf(
        { status: "paused", endDate: "2026-09-01T00:00:00Z" },
        NOW,
      ),
    ).toBe("paused");
    expect(displayStatusOf({ status: "draft", endDate: "" }, NOW)).toBe(
      "draft",
    );
    expect(
      displayStatusOf(
        { status: "archived", endDate: "2026-01-01T00:00:00Z" },
        NOW,
      ),
    ).toBe("archived");
  });
});

describe("toStudioCampaignRows", () => {
  it("orders running campaigns first, then the most recent start", () => {
    const rows = toStudioCampaignRows(
      [
        campaign({ id: "archived", status: "archived" }),
        campaign({ id: "draft", status: "draft" }),
        campaign({ id: "old-active", startDate: "2026-08-01T00:00:00Z" }),
        campaign({ id: "ended", endDate: "2026-09-01T00:00:00Z" }),
        campaign({ id: "new-active", startDate: "2026-09-20T00:00:00Z" }),
        campaign({ id: "paused", status: "paused" }),
      ],
      new Map(),
      NOW,
    );
    expect(rows.map((row) => row.id)).toEqual([
      "new-active",
      "old-active",
      "paused",
      "draft",
      "ended",
      "archived",
    ]);
  });
});

describe("filters", () => {
  const row = toStudioCampaignRow(campaign(), new Map(), NOW);

  it("searches the name, the Arabic name and the slug, case-insensitively", () => {
    expect(matchesStudioSearch(row, "SUMMER")).toBe(true);
    expect(matchesStudioSearch(row, "الصيف")).toBe(true);
    expect(matchesStudioSearch(row, "summer-wh")).toBe(true);
    expect(matchesStudioSearch(row, "quiz")).toBe(false);
    expect(matchesStudioSearch(row, "  ")).toBe(true);
  });

  it("groups ended and archived campaigns under the Ended filter", () => {
    const ended = toStudioCampaignRow(
      campaign({ endDate: "2026-09-01T00:00:00Z" }),
      new Map(),
      NOW,
    );
    const archived = toStudioCampaignRow(
      campaign({ status: "archived" }),
      new Map(),
      NOW,
    );
    expect(matchesStatusFilter(ended, "ended")).toBe(true);
    expect(matchesStatusFilter(archived, "ended")).toBe(true);
    expect(matchesStatusFilter(row, "ended")).toBe(false);
    expect(matchesStatusFilter(row, "active")).toBe(true);
    expect(matchesStatusFilter(row, "all")).toBe(true);
  });
});
