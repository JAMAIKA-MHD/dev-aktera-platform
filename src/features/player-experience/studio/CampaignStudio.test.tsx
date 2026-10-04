import { act, fireEvent, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Campaign } from "@/src/types";
import { CampaignStudio } from "./CampaignStudio";

// The Studio as the dashboard mounts it (T7.1): the app's own campaigns in, the snapshot built
// inside, and none of the campaign's rules shown or editable.

const campaign = (patch: Partial<Campaign>): Campaign => ({
  id: "c-wheel",
  name: "Rentrée Zeta",
  arabicName: "",
  slug: "rentree-zeta",
  gameType: "lucky_wheel",
  status: "active",
  winProbability: 65,
  maxEntries: "1",
  prizes: [
    { id: "p1", templateId: "t1", quantity: 30, quantity_won: 8, weight: 60 },
    { id: "p2", templateId: "t2", quantity: 10, quantity_won: 0, weight: 40 },
  ],
  questions: [],
  participantsCount: 0,
  rewardsClaimed: 0,
  startDate: "2026-09-01",
  endDate: "2026-10-01",
  ...patch,
});

const templates = [
  { id: "t1", name: "Bon 2000 DA" },
  { id: "t2", name: "Casque audio" },
];

// The game's settings are on the Play screen of the Sections panel.
function openPlayScreen() {
  fireEvent.click(screen.getByRole("button", { name: /Sections/ }));
  fireEvent.change(screen.getByLabelText("Screen to edit"), {
    target: { value: "play" },
  });
}

describe("CampaignStudio", () => {
  beforeEach(() => localStorage.clear());

  it("shows the app's campaign, no campaign picker and none of its rules", async () => {
    render(
      <CampaignStudio
        campaigns={[
          campaign({}),
          campaign({ id: "c-old", name: "Old one", status: "archived" }),
        ]}
        prizeTemplates={templates}
        campaignId="c-wheel"
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    expect(screen.getByText("Rentrée Zeta")).toBeTruthy();
    expect(screen.queryByLabelText("Campaign")).toBeNull();

    // The play screen offers the look of the game, never the odds or the stock.
    openPlayScreen();
    expect(screen.queryByRole("region", { name: "Campaign rules" })).toBeNull();
    expect(screen.queryByText("65 %")).toBeNull();
  });

  it("offers a way back to the dashboard", () => {
    const onClose = vi.fn();
    render(
      <CampaignStudio
        campaigns={[]}
        prizeTemplates={[]}
        campaignId={null}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Back to dashboard" }));
    expect(onClose).toHaveBeenCalled();
    // No campaign: the demo one, and no picker without campaigns to pick.
    expect(screen.getByText("Standalone (demo campaign)")).toBeTruthy();
  });
});
