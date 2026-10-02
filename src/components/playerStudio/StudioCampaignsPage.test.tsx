import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "../../contexts/LanguageContext";
import type { Campaign } from "../../types";
import {
  StudioCampaignsPage,
  type StudioCampaignsPageProps,
} from "./StudioCampaignsPage";

// The saved-design dates come from Supabase: simulated here (no network).
const savedAt = new Map<string, string>();
vi.mock("./useExperienceSummaries", () => ({
  useExperienceSummaries: () => ({
    savedAt,
    loading: false,
    failed: false,
    refetch: vi.fn(),
  }),
}));

const DAY = 24 * 3600 * 1000;
const iso = (offsetDays: number) =>
  new Date(Date.now() + offsetDays * DAY).toISOString();

function campaign(id: string, overrides: Partial<Campaign> = {}): Campaign {
  return {
    id,
    name: `Campaign ${id}`,
    arabicName: "",
    slug: `slug-${id}`,
    gameType: "lucky_wheel",
    status: "active",
    winProbability: 50,
    prizes: [],
    questions: [],
    participantsCount: 10,
    rewardsClaimed: 0,
    startDate: iso(-5),
    endDate: iso(5),
    ...overrides,
  };
}

const CAMPAIGNS: Campaign[] = [
  campaign("wheel", { name: "Summer Wheel", participantsCount: 1204 }),
  campaign("quiz", {
    name: "Ramadan Quiz",
    arabicName: "مسابقة رمضان",
    gameType: "quiz",
    status: "paused",
  }),
  campaign("draft", {
    name: "Draft Boxes",
    gameType: "mystery_box",
    status: "draft",
  }),
  campaign("over", {
    name: "Old Scratch",
    gameType: "scratch_card",
    endDate: iso(-1),
  }),
];

function renderPage(props: Partial<StudioCampaignsPageProps> = {}) {
  const handlers = {
    onOpenCampaign: vi.fn(),
    onCreateCampaign: vi.fn(),
    onRetry: vi.fn(),
  };
  render(
    <LanguageProvider>
      <StudioCampaignsPage
        campaigns={CAMPAIGNS}
        loading={false}
        error={null}
        organizationId="org-1"
        {...handlers}
        {...props}
      />
    </LanguageProvider>,
  );
  return handlers;
}

const table = () => screen.getByRole("table", { name: "Your campaigns" });
const rowNames = () =>
  within(table())
    .getAllByRole("row")
    .filter((row) => row.closest("tbody"))
    .map((row) => within(row).getAllByRole("cell")[0].textContent ?? "");

beforeEach(() => {
  savedAt.clear();
  localStorage.clear();
});

describe("StudioCampaignsPage", () => {
  it("lists every campaign, running ones first", () => {
    renderPage();
    const names = rowNames();
    expect(names).toHaveLength(4);
    expect(names[0]).toContain("Summer Wheel");
    expect(names[3]).toContain("Old Scratch");
    expect(screen.getByText("4 campaigns")).toBeTruthy();
  });

  it("shows the status, the game, the players and the design of a row", () => {
    savedAt.set("wheel", new Date(Date.now() - 2 * 3600 * 1000).toISOString());
    renderPage();
    const wheel = within(table()).getByText("Summer Wheel").closest("tr")!;
    expect(within(wheel).getByText("Active")).toBeTruthy();
    expect(within(wheel).getByText("Spin Wheel")).toBeTruthy();
    expect(within(wheel).getByText("1,204")).toBeTruthy();
    expect(within(wheel).getByText("Saved")).toBeTruthy();
    expect(within(wheel).getByText("2 hours ago")).toBeTruthy();
    expect(within(wheel).getByText("/play/slug-wheel")).toBeTruthy();

    const over = within(table()).getByText("Old Scratch").closest("tr")!;
    expect(within(over).getByText("Ended")).toBeTruthy();
    expect(within(over).getByText("Default")).toBeTruthy();
  });

  it("searches by name, Arabic name and slug", async () => {
    const user = userEvent.setup();
    renderPage();
    const search = screen.getByRole("searchbox", { name: "Search campaigns…" });

    await user.type(search, "رمضان");
    expect(rowNames()).toHaveLength(1);
    expect(rowNames()[0]).toContain("Ramadan Quiz");
    expect(screen.getByText("1 of 4 campaigns")).toBeTruthy();

    await user.clear(search);
    await user.type(search, "slug-draft");
    expect(rowNames()[0]).toContain("Draft Boxes");
  });

  it("filters by status and by game, and clears the filters", async () => {
    const user = userEvent.setup();
    renderPage();
    const statuses = screen.getByRole("group", { name: "Filter by status" });

    await user.click(within(statuses).getByRole("button", { name: "Ended" }));
    expect(rowNames()).toHaveLength(1);
    expect(rowNames()[0]).toContain("Old Scratch");

    await user.click(within(statuses).getByRole("button", { name: "All" }));
    await user.selectOptions(
      screen.getByRole("combobox", { name: "Filter by game" }),
      "quiz",
    );
    expect(rowNames()).toHaveLength(1);
    expect(rowNames()[0]).toContain("Ramadan Quiz");

    await user.click(within(statuses).getByRole("button", { name: "Draft" }));
    expect(screen.getByText("No campaign matches your filters")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(rowNames()).toHaveLength(4);
  });

  it("opens a campaign from its row, from the keyboard and from its Open button", async () => {
    const user = userEvent.setup();
    const { onOpenCampaign } = renderPage();

    await user.click(within(table()).getByText("Ramadan Quiz"));
    expect(onOpenCampaign).toHaveBeenLastCalledWith("quiz");

    within(table()).getByText("Draft Boxes").closest("tr")!.focus();
    await user.keyboard("{Enter}");
    expect(onOpenCampaign).toHaveBeenLastCalledWith("draft");

    onOpenCampaign.mockClear();
    await user.click(screen.getByRole("button", { name: "Open Summer Wheel" }));
    expect(onOpenCampaign).toHaveBeenCalledTimes(1);
    expect(onOpenCampaign).toHaveBeenCalledWith("wheel");
  });

  it("shows skeleton rows while the campaigns load", () => {
    renderPage({ loading: true, campaigns: [] });
    expect(screen.getAllByTestId("data-table-skeleton").length).toBeGreaterThan(
      0,
    );
    expect(screen.queryByText("No campaigns yet")).toBeNull();
  });

  it("shows the error with Retry", async () => {
    const user = userEvent.setup();
    const { onRetry } = renderPage({ error: "network down", campaigns: [] });
    expect(screen.getByText("Could not load your campaigns.")).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });

  it("invites to create a campaign when there is none", async () => {
    const user = userEvent.setup();
    const { onCreateCampaign } = renderPage({ campaigns: [] });
    expect(screen.getByText("No campaigns yet")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Create a campaign" }));
    expect(onCreateCampaign).toHaveBeenCalled();
  });

  it("writes an Arabic name with dir=auto", () => {
    renderPage();
    expect(screen.getByText("مسابقة رمضان").getAttribute("dir")).toBe("auto");
  });
});
