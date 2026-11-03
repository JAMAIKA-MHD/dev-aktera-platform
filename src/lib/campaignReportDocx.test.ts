import JSZip from "jszip";
import { describe, expect, it, vi } from "vitest";

import type { CampaignAnalyticsReport } from "../types";
import {
  allCampaignsReportFilename,
  buildAllCampaignsReportDocx,
  buildCampaignReportDocx,
} from "./campaignReportDocx";

// The charts are rasterised on a canvas, which the test environment has not: a 1-pixel PNG.
vi.mock("./svgToPng", () => ({
  svgToPng: vi.fn(async () =>
    Uint8Array.from(
      atob(
        "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg==",
      ),
      (c) => c.charCodeAt(0),
    ),
  ),
}));

function report(
  id: string,
  name: string,
  entries: number,
  wins: number,
): CampaignAnalyticsReport {
  return {
    generated_at: "2026-11-04 10:30",
    organization: { id: "org-1", name: "Zeta Telecom" },
    participants_total: entries,
    participants_limit: 500,
    participants: [
      {
        id: `${id}-e1`,
        participant_name: `Player of ${name}`,
        phone_number: "0551234567",
        is_winner: true,
        prize_name: "Mug",
        quiz_passed: null,
        redeemed_coupon_value: "CODE-1",
        coupon_confirmed: true,
        dwell_time_seconds: 40,
        location: "Alger",
        submitted_at: "2026-11-02 12:00",
      },
    ],
    analytics: {
      campaign: {
        id,
        name,
        status: "active",
        start_date: "2026-11-01T00:00:00Z",
        end_date: "2026-11-30T23:59:59Z",
      },
      timezone: "Africa/Algiers",
      total_entries: entries,
      total_wins: wins,
      win_rate: entries ? (wins / entries) * 100 : null,
      avg_dwell_time_seconds: 40,
      total_impressions: entries * 2,
      completed_impressions: entries,
      completion_rate: 50,
      prize_burn_rate: {
        total_quantity: 100,
        total_won: wins,
        remaining: 100 - wins,
        percentage: wins,
      },
      prizes: [
        {
          id: `${id}-p`,
          name: "Mug",
          quantity: 100,
          quantity_won: wins,
          remaining: 100 - wins,
          burn_rate_percentage: wins,
        },
      ],
      os_distribution: { android: entries, ios: 0, desktop: 0, other: 0 },
      participants_over_time: [{ date: "2026-11-02", entries, winners: wins }],
      prize_distribution: [
        {
          date: "2026-11-02",
          prize_id: `${id}-p`,
          prize_name: "Mug",
          wins,
        },
      ],
      location_distribution: [{ location: "Alger", count: entries }],
      location_unknown_count: 0,
      hourly_distribution: Array.from({ length: 24 }, (_, hour) => ({
        hour,
        entries: hour === 12 ? entries : 0,
        winners: 0,
      })),
      weekday_distribution: Array.from({ length: 7 }, (_, i) => ({
        weekday: i + 1,
        entries: i === 0 ? entries : 0,
        winners: 0,
      })),
    },
  };
}

/** The text of the document's body, and how many images it shows (a picture used twice
 * is stored once, so the pictures are counted in the body, not in the media folder). */
async function read(blob: Blob) {
  const zip = await JSZip.loadAsync(await blob.arrayBuffer());
  const xml = (await zip.file("word/document.xml")?.async("string")) ?? "";
  const words = [...xml.matchAll(/<w:t[^>]*>([^<]*)<\/w:t>/g)]
    .map((m) => m[1])
    .join(" ");
  const images = (xml.match(/<pic:pic\b/g) ?? []).length;
  return { words, images };
}

describe("buildAllCampaignsReportDocx", () => {
  const reports = [
    report("c1", "Summer Wheel", 120, 30),
    report("c2", "Eid Quiz", 80, 20),
  ];

  it("totals the campaigns and compares them", async () => {
    const { words } = await read(await buildAllCampaignsReportDocx(reports));
    expect(words).toContain("ALL CAMPAIGNS ANALYTICS REPORT");
    expect(words).toContain("Zeta Telecom");
    // 200 entries in all, 50 winners: a 25% win rate.
    expect(words).toContain("200");
    expect(words).toContain("50 winners of 200 entries");
    expect(words).toContain("Campaigns compared");
    expect(words).toContain("Summer Wheel");
    expect(words).toContain("Eid Quiz");
  });

  it("then gives every campaign its full section and its participants", async () => {
    const { words, images } = await read(
      await buildAllCampaignsReportDocx(reports),
    );
    expect(words).toContain("CAMPAIGN 1 OF 2");
    expect(words).toContain("CAMPAIGN 2 OF 2");
    for (const section of [
      "OS distribution",
      "Prize distribution",
      "Time segmentation",
      "Segmentation by wilaya",
    ]) {
      expect(words.split(section).length - 1).toBe(2);
    }
    expect(words).toContain("Participants — Summer Wheel");
    expect(words).toContain("Player of Eid Quiz");
    // The comparison and the combined timeline, then each campaign's charts.
    expect(images).toBeGreaterThanOrEqual(2 + 2 * 6);
  });

  it("still builds with no campaign at all", async () => {
    const { words } = await read(await buildAllCampaignsReportDocx([]));
    expect(words).toContain("No campaign to report on.");
  });

  it("names the file after the day it was generated", () => {
    expect(allCampaignsReportFilename(reports)).toBe(
      "octoreach_report_all_campaigns_2026-11-04",
    );
  });
});

describe("buildCampaignReportDocx", () => {
  it("is unchanged: one campaign's report", async () => {
    const { words } = await read(
      await buildCampaignReportDocx(report("c1", "Summer Wheel", 120, 30)),
    );
    expect(words).toContain("CAMPAIGN ANALYTICS REPORT");
    expect(words).toContain("Summer Wheel");
    expect(words).toContain("Generated");
    expect(words).not.toContain("Campaigns compared");
  });
});
