// The Player Studio journey in the dashboard: menu → campaigns table → Studio → back to the
// table. The Studio, the simulator and the data hooks are replaced by light fakes: this test
// is about App.tsx's wiring, not about what those components do (tested on their own).
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import App from "./App";
import { LanguageProvider } from "./contexts/LanguageContext";
import { ThemeProvider } from "./contexts/ThemeContext";
import type { Campaign } from "./types";

const DAY = 24 * 3600 * 1000;
const iso = (days: number) => new Date(Date.now() + days * DAY).toISOString();
function campaign(id: string, name: string, startDays: number): Campaign {
  return {
    id,
    name,
    arabicName: "",
    slug: `slug-${id}`,
    gameType: "lucky_wheel",
    status: "active",
    winProbability: 50,
    prizes: [],
    questions: [],
    participantsCount: 5,
    rewardsClaimed: 0,
    startDate: iso(startDays),
    endDate: iso(10),
  };
}
const CAMPAIGNS = [
  campaign("c1", "Summer Wheel", -2),
  campaign("c2", "Winter Wheel", -5),
];

vi.mock("./contexts/AuthContext", () => ({
  useAuth: () => ({
    organization: { id: "org-1", name: "Test org", logo_url: null },
    profile: null,
    signOut: vi.fn(),
  }),
}));
vi.mock("./hooks/useCampaigns", () => ({
  useCampaigns: () => ({
    campaigns: CAMPAIGNS,
    loading: false,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock("./hooks/usePrizeTemplates", () => ({
  usePrizeTemplates: () => ({ prizes: [], loading: false, refetch: vi.fn() }),
}));
vi.mock("./hooks/useEntries", () => ({
  useEntries: () => ({ entries: [], refetch: vi.fn() }),
}));
vi.mock("./components/playerStudio/useExperienceSummaries", () => ({
  useExperienceSummaries: () => ({
    savedAt: new Map(),
    loading: false,
    failed: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("./components/DashboardHome", () => ({
  DashboardHome: () => <p>dashboard-home</p>,
}));
vi.mock("./features/player-experience", () => ({
  CampaignStudio: ({
    campaignId,
    onClose,
  }: {
    campaignId: string | null;
    onClose: () => void;
  }) => (
    <div role="dialog" aria-label="Studio">
      <p>studio:{String(campaignId)}</p>
      <button onClick={onClose}>Close Studio</button>
    </div>
  ),
  CampaignSimulator: ({ campaignId }: { campaignId: string | null }) => (
    <p>simulator:{String(campaignId)}</p>
  ),
}));

function renderApp(initialTab: "playerScreen" | "campaigns" = "playerScreen") {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <App initialTab={initialTab} />
      </LanguageProvider>
    </ThemeProvider>,
  );
}

// The page and the Studio are both loaded on demand (lazy): under a loaded test run, the first
// dynamic import can take a few seconds.
const findTable = () =>
  screen.findByRole("table", { name: "Your campaigns" }, { timeout: 5000 });
const findStudio = async () =>
  (await screen.findByRole("dialog", { name: "Studio" }, { timeout: 5000 }))
    .textContent;

beforeEach(() => localStorage.clear());

describe("Player Studio in the dashboard", { timeout: 15000 }, () => {
  it("shows the campaigns table from the menu, then the Studio of the chosen campaign", async () => {
    renderApp("campaigns");
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: /Player Studio/ }));

    const table = await findTable();
    expect(screen.queryByRole("dialog", { name: "Studio" })).toBeNull();
    // A fresh user-event instance: the one that clicked the menu keeps a pointer state tied
    // to the menu button and never dispatches the next click (tool behavior; the same path
    // is checked in a real browser, S4 doc §8).
    await userEvent.setup().click(within(table).getByText("Winter Wheel"));

    expect(await findStudio()).toContain("studio:c2");
  });

  it("goes back to the dashboard home when the Studio closes", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(within(await findTable()).getByText("Summer Wheel"));
    expect(await findStudio()).toContain("studio:c1");

    await user.click(screen.getByRole("button", { name: "Close Studio" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Studio" })).toBeNull(),
    );
    expect(await screen.findByText("dashboard-home")).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Your campaigns" })).toBeNull();
  });

  it("still opens the Studio directly from Customize player screen", async () => {
    const user = userEvent.setup();
    renderApp("campaigns");
    const [customize] = await screen.findAllByTitle(
      "Customize Player Screen UI in Editor",
    );
    await user.click(customize);
    expect(await findStudio()).toMatch(/studio:c[12]/);

    await user.click(screen.getByRole("button", { name: "Close Studio" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Studio" })).toBeNull(),
    );
  });

  it("keeps the sandbox on its own campaign", async () => {
    const user = userEvent.setup();
    renderApp();
    await user.click(within(await findTable()).getByText("Winter Wheel"));
    expect(await findStudio()).toContain("studio:c2");
    await user.click(screen.getByRole("button", { name: "Close Studio" }));
    expect(await screen.findByText("dashboard-home")).toBeTruthy();

    await user.click(
      screen.getByRole("button", { name: /Interactive Player Sandbox/ }),
    );
    expect(await screen.findByText("simulator:c1")).toBeTruthy();
  });
});
