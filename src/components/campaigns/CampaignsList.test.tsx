import { render, screen, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "../../contexts/LanguageContext";
import type { Campaign } from "../../types";
import { CampaignsList } from "../CampaignsList";
import { campaignTimeline } from "./campaignMeta";

const campaign = (patch: Partial<Campaign>): Campaign => ({
  id: "c1",
  name: "Summer Spin",
  arabicName: "",
  slug: "summer-spin",
  gameType: "lucky_wheel",
  status: "active",
  winProbability: 40,
  prizes: [{ templateId: "t1", quantity: 50, weight: 100 }],
  questions: [],
  participantsCount: 1200,
  rewardsClaimed: 3,
  startDate: "2026-10-01",
  endDate: "2026-10-31",
  ...patch,
});

const CAMPAIGNS = [
  campaign({}),
  campaign({
    id: "c2",
    name: "Winter Quiz",
    slug: "winter-quiz",
    gameType: "quiz",
    status: "draft",
  }),
  campaign({
    id: "c3",
    name: "Old Boxes",
    slug: "old-boxes",
    gameType: "mystery_box",
    status: "archived",
  }),
];

function setup(campaigns = CAMPAIGNS) {
  const handlers = {
    onSelectCampaign: vi.fn(),
    onEditCampaign: vi.fn(),
    onRelaunch: vi.fn(),
    onToggleStatus: vi.fn(),
    onArchive: vi.fn(),
    onDelete: vi.fn(),
    onOpenWizard: vi.fn(),
  };
  const user = userEvent.setup();
  render(
    <LanguageProvider>
      <CampaignsList campaigns={campaigns} {...handlers} />
    </LanguageProvider>,
  );
  return { ...handlers, user };
}

const cards = () => screen.queryAllByRole("article");

describe("campaignTimeline", () => {
  const at = (day: string) => new Date(`${day}T12:00:00`);
  it("says where today falls in the campaign period", () => {
    expect(
      campaignTimeline("2026-10-01", "2026-10-10", at("2026-09-28")),
    ).toEqual({
      percent: 0,
      label: "Starts in 3 days",
    });
    expect(
      campaignTimeline("2026-10-01", "2026-10-10", at("2026-10-05")),
    ).toEqual({
      percent: 50,
      label: "5 days left",
    });
    expect(
      campaignTimeline("2026-10-01", "2026-10-10", at("2026-10-10"))?.label,
    ).toBe("Last day");
    expect(
      campaignTimeline("2026-10-01", "2026-10-10", at("2026-11-01"))?.label,
    ).toBe("Ended");
    expect(campaignTimeline("2026-10-10", "2026-10-01")).toBeNull();
  });
});

describe("CampaignsList", () => {
  it("filters by status, game and search", async () => {
    const { user } = setup();
    expect(cards()).toHaveLength(3);

    await user.click(screen.getByRole("button", { name: /^Draft/ }));
    expect(cards().map((card) => card.getAttribute("aria-label"))).toEqual([
      "Winter Quiz",
    ]);

    await user.click(screen.getByRole("button", { name: /^All/ }));
    await user.type(screen.getByRole("searchbox"), "boxes");
    expect(screen.getByText("1 of 3 campaigns")).toBeTruthy();

    await user.type(screen.getByRole("searchbox"), "zzz");
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(cards()).toHaveLength(3);
  });

  it("searches by any word, whatever the case or accents, and clears in one click", async () => {
    const { user } = setup([
      ...CAMPAIGNS,
      campaign({ id: "c4", name: "Été Géant", slug: "ete", arabicName: "صيف" }),
    ]);
    const search = screen.getByRole("searchbox");
    const names = () => cards().map((card) => card.getAttribute("aria-label"));

    await user.type(search, "  GEANT ete ");
    expect(names()).toEqual(["Été Géant"]);
    await user.click(screen.getByRole("button", { name: "Clear search" }));
    expect(cards()).toHaveLength(4);

    await user.type(search, "صيف");
    expect(names()).toEqual(["Été Géant"]);
    await user.keyboard("{Escape}");
    // The game's name finds its campaigns too.
    await user.type(search, "quiz");
    expect(names()).toEqual(["Winter Quiz"]);
  });

  it("shows twelve campaigns a page and returns to the first page on a new search", async () => {
    const many = Array.from({ length: 30 }, (_, i) =>
      campaign({ id: `m${i}`, name: `Camp ${i + 1}`, slug: `camp-${i + 1}` }),
    );
    const { user } = setup(many);
    expect(cards()).toHaveLength(12);
    expect(screen.getByText("Campaigns 1–12 of 30")).toBeTruthy();

    await user.click(screen.getByRole("button", { name: "Page 3" }));
    expect(cards()).toHaveLength(6);
    expect(
      (screen.getByRole("button", { name: "Next" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);

    await user.type(screen.getByRole("searchbox"), "camp-1");
    // Camp 1 and Camp 10–19: one page, so no pagination bar.
    expect(cards()).toHaveLength(11);
    expect(screen.queryByRole("navigation", { name: "Pagination" })).toBeNull();
  });

  it("opens a campaign from its card, but not from its buttons", async () => {
    const { user, onSelectCampaign, onEditCampaign, onToggleStatus } = setup();
    const card = screen.getByRole("article", { name: "Summer Spin" });
    await user.click(within(card).getByRole("button", { name: /Edit/ }));
    await user.click(within(card).getByRole("button", { name: "Pause" }));
    expect(onEditCampaign).toHaveBeenCalledTimes(1);
    expect(onToggleStatus).toHaveBeenCalledWith("c1");
    expect(onSelectCampaign).not.toHaveBeenCalled();

    await user.click(within(card).getByText("Summer Spin"));
    expect(onSelectCampaign).toHaveBeenCalledWith("c1");
  });

  it("confirms before deleting, and only lets drafts and archives be deleted", async () => {
    const { user, onDelete } = setup();
    const live = screen.getByRole("article", { name: "Summer Spin" });
    await user.click(
      within(live).getByRole("button", { name: /More actions/ }),
    );
    expect(
      (
        within(live).getByRole("menuitem", {
          name: "Delete",
        }) as HTMLButtonElement
      ).disabled,
    ).toBe(true);
    await user.keyboard("{Escape}");

    const draft = screen.getByRole("article", { name: "Winter Quiz" });
    await user.click(
      within(draft).getByRole("button", { name: /More actions/ }),
    );
    await user.click(within(draft).getByRole("menuitem", { name: "Delete" }));
    expect(onDelete).not.toHaveBeenCalled();
    await user.click(
      screen.getByRole("button", { name: "Delete permanently" }),
    );
    expect(onDelete).toHaveBeenCalledWith("c2");
  });

  it("invites to create a first campaign when there is none", async () => {
    const { user, onOpenWizard } = setup([]);
    await user.click(
      screen.getByRole("button", { name: "Create your first campaign" }),
    );
    expect(onOpenWizard).toHaveBeenCalledTimes(1);
  });
});
