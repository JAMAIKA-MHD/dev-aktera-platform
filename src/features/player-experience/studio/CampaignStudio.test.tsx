import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { Campaign } from "@/src/types";
import { CampaignStudio } from "./CampaignStudio";

// The Studio as the dashboard mounts it (T7.1): the app's own campaigns in, the snapshot and
// the read-only rules built inside, the picker and the Wizard callbacks wired out.

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

describe("CampaignStudio", () => {
  beforeEach(() => localStorage.clear());

  it("shows the app's campaign, its real odds and stock, and the picker", async () => {
    const onCampaignChange = vi.fn();
    render(
      <CampaignStudio
        campaigns={[
          campaign({}),
          campaign({ id: "c-old", name: "Old one", status: "archived" }),
        ]}
        prizeTemplates={templates}
        campaignId="c-wheel"
        onCampaignChange={onCampaignChange}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    const picker = screen.getByLabelText("Campaign") as HTMLSelectElement;
    // Archived campaigns are not offered.
    expect([...picker.options].map((option) => option.textContent)).toEqual([
      "Standalone (demo campaign)",
      "Rentrée Zeta",
    ]);
    fireEvent.change(picker, { target: { value: "" } });
    expect(onCampaignChange).toHaveBeenCalledWith(null);

    fireEvent.click(screen.getByRole("button", { name: /Game/ }));
    const rules = screen.getByRole("region", { name: "Campaign rules" });
    expect(within(rules).getByText("65 %")).toBeTruthy();
    expect(within(rules).getByText("Bon 2000 DA")).toBeTruthy();
    // 30 allocated, 8 won: 22 left.
    expect(within(rules).getByText("22")).toBeTruthy();
  });

  it("opens the Wizard on the right part, then asks for the campaign again", async () => {
    const onEditCampaignSettings = vi.fn(async () => {});
    const onRefreshCampaign = vi.fn();
    render(
      <CampaignStudio
        campaigns={[campaign({})]}
        prizeTemplates={templates}
        campaignId="c-wheel"
        onCampaignChange={() => {}}
        onEditCampaignSettings={onEditCampaignSettings}
        onRefreshCampaign={onRefreshCampaign}
      />,
    );
    await act(async () => {
      await Promise.resolve();
    });
    fireEvent.click(screen.getByRole("button", { name: /Game/ }));
    await act(async () => {
      fireEvent.click(
        screen.getAllByRole("button", { name: "Edit in campaign settings" })[0],
      );
    });
    expect(onEditCampaignSettings).toHaveBeenCalledWith("c-wheel", "rules");
    expect(onRefreshCampaign).toHaveBeenCalled();
  });

  it("offers a way back to the dashboard", () => {
    const onClose = vi.fn();
    render(
      <CampaignStudio
        campaigns={[]}
        prizeTemplates={[]}
        campaignId={null}
        onCampaignChange={() => {}}
        onClose={onClose}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Back to dashboard" }));
    expect(onClose).toHaveBeenCalled();
    // No campaign: the demo one, and no picker without campaigns to pick.
    expect(screen.getByText("Standalone (demo campaign)")).toBeTruthy();
  });
});
