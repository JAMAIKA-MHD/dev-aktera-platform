import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import type { ProgramLeaderboardRow } from "../../types";
import { CampaignLeaderboard } from "./CampaignLeaderboard";

const row = (
  id: string,
  overrides: Partial<ProgramLeaderboardRow>,
): ProgramLeaderboardRow => ({
  campaign_id: id,
  campaign_name: `Campaign ${id}`,
  status: "active",
  game_type: "lucky_wheel",
  start_date: null,
  end_date: null,
  entries: 0,
  rewards: 0,
  impressions: 0,
  completed_impressions: 0,
  completion_rate: null,
  new_participants: 0,
  returning_participants: 0,
  ...overrides,
});

const ROWS = [
  row("a", { game_type: "scratch_card", entries: 61, rewards: 31 }),
  row("b", {
    game_type: "quiz",
    entries: 25,
    rewards: 18,
    completion_rate: 72,
  }),
  row("c", { status: "paused" }),
];

describe("CampaignLeaderboard", () => {
  it("scales each bar on the top campaign and shows status and mechanic", () => {
    render(<CampaignLeaderboard rows={ROWS} onSelectCampaign={() => {}} />);
    const bars = screen.getAllByRole("meter");
    expect(bars.map((bar) => bar.getAttribute("aria-valuenow"))).toEqual([
      "100",
      "41",
      "0",
    ]);
    const paused = screen.getAllByRole("button")[2];
    expect(within(paused).getByText("Paused")).toBeTruthy();
    expect(within(paused).getByText("Spin Wheel")).toBeTruthy();
    expect(screen.getByText("72.0%")).toBeTruthy();
    expect(screen.getAllByText("—")).toHaveLength(2);
  });

  it("opens the campaign of the clicked row", async () => {
    const onSelect = vi.fn();
    render(<CampaignLeaderboard rows={ROWS} onSelectCampaign={onSelect} />);
    await userEvent.click(screen.getByRole("button", { name: /Campaign b/ }));
    expect(onSelect).toHaveBeenCalledWith("b");
  });

  it("says so when there is no campaign", () => {
    render(<CampaignLeaderboard rows={[]} onSelectCampaign={() => {}} />);
    expect(screen.getByText("No campaigns yet.")).toBeTruthy();
  });
});
