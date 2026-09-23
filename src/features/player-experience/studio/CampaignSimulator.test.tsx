import { render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it } from "vitest";
import type { Campaign } from "@/src/types";
import { VIEWPORT_PREFS_KEY } from "./preview/viewportPrefs";
import { CampaignSimulator } from "./CampaignSimulator";

// The dashboard's player sandbox (T7.2): the runtime in its own document, at a phone's size,
// whatever the drawer's width or the device the Studio last showed.

const campaign: Campaign = {
  id: "c-wheel",
  name: "Rentrée Zeta",
  arabicName: "",
  slug: "rentree-zeta",
  gameType: "lucky_wheel",
  status: "active",
  winProbability: 65,
  maxEntries: "1",
  prizes: [{ id: "p1", templateId: "t1", quantity: 30, weight: 60 }],
  questions: [],
  participantsCount: 0,
  rewardsClaimed: 0,
  startDate: "2026-09-01",
  endDate: "2026-10-01",
};

async function frame() {
  return (await screen.findByTitle(
    "Player screen preview",
  )) as HTMLIFrameElement;
}

describe("CampaignSimulator", () => {
  beforeEach(() => localStorage.clear());

  it("plays the campaign in a 390 × 844 frame of its own", async () => {
    // The Studio last showed a tablet: the sandbox stays on the phone.
    localStorage.setItem(
      VIEWPORT_PREFS_KEY,
      JSON.stringify({ deviceId: "ipad-mini", width: 768, height: 1024 }),
    );
    render(
      <CampaignSimulator
        campaigns={[campaign]}
        prizeTemplates={[{ id: "t1", name: "Bon 2000 DA" }]}
        campaignId="c-wheel"
      />,
    );
    const iframe = await frame();
    expect(iframe.getAttribute("src")).toMatch(/^\/xp-frame\?source=bridge/);
    expect(iframe.width).toBe("390");
    expect(iframe.height).toBe("844");
    expect(screen.getByRole("button", { name: "Play again" })).toBeTruthy();
  });

  it("falls back on the default experience without a campaign", async () => {
    render(
      <CampaignSimulator
        campaigns={[]}
        prizeTemplates={[]}
        campaignId={null}
      />,
    );
    expect((await frame()).width).toBe("390");
  });
});
