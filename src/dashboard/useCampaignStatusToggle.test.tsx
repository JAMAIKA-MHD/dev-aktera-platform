import { act, render, screen } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Campaign } from "../types";
import { useCampaignStatusToggle } from "./useCampaignStatusToggle";

const toggleCampaignStatus = vi.fn();
let campaigns: Partial<Campaign>[] = [];

vi.mock("./DashboardContext", () => ({
  useDashboard: () => ({ campaigns, toggleCampaignStatus }),
}));

let toggle: (id: string) => Promise<void> = async () => {};
function Harness() {
  const { toggleStatus, publishedDialog } = useCampaignStatusToggle();
  toggle = toggleStatus;
  return <>{publishedDialog}</>;
}

const campaign = (id: string, status: Campaign["status"]) => ({
  id,
  status,
  name: `Campaign ${id}`,
  slug: `campaign-${id}`,
  startDate: "2020-01-01T00:00",
});

beforeEach(() => {
  toggleCampaignStatus.mockReset().mockResolvedValue(true);
  campaigns = [campaign("d1", "draft"), campaign("a1", "active")];
});

describe("useCampaignStatusToggle", () => {
  it("shows the link and the QR code once a draft is published", async () => {
    render(<Harness />);
    await act(() => toggle("d1"));
    expect(toggleCampaignStatus).toHaveBeenCalledWith("d1");
    expect(
      screen.getByRole("dialog", { name: "Your campaign is live" }),
    ).toBeTruthy();
  });

  it("shows nothing for a pause, or for a publication that was refused", async () => {
    render(<Harness />);
    await act(() => toggle("a1"));
    expect(screen.queryByRole("dialog")).toBeNull();

    toggleCampaignStatus.mockResolvedValue(false);
    await act(() => toggle("d1"));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});
