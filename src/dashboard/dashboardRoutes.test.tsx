// The dashboard's routing: one URL per screen, deep links, the browser's Back button, and the
// Player Studio journey (menu → campaigns table → Studio → back to the dashboard). The Studio,
// the wizard, the simulator and the data hooks are replaced by light fakes: this test is about
// the wiring between URLs and screens, not about what those components do (tested on their own).
import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import {
  MemoryRouter,
  Routes,
  useLocation,
  useNavigate,
} from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "../contexts/LanguageContext";
import { ThemeProvider } from "../contexts/ThemeContext";
import type { Campaign } from "../types";
import { dashboardRoutes } from "./dashboardRoutes";

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

// What the campaigns hook answers: switched to "still loading" by one test.
const hook = { loading: false };

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({
    organization: { id: "org-1", name: "Test org", logo_url: null },
    profile: null,
    signOut: vi.fn(),
  }),
}));
vi.mock("../hooks/useCampaigns", () => ({
  useCampaigns: () => ({
    campaigns: hook.loading ? [] : CAMPAIGNS,
    loading: hook.loading,
    error: null,
    refetch: vi.fn(),
  }),
}));
vi.mock("../hooks/usePrizeTemplates", () => ({
  usePrizeTemplates: () => ({ prizes: [], loading: false, refetch: vi.fn() }),
}));
vi.mock("../hooks/useEntries", () => ({
  useEntries: () => ({ entries: [], refetch: vi.fn() }),
}));
vi.mock("../components/playerStudio/useExperienceSummaries", () => ({
  useExperienceSummaries: () => ({
    savedAt: new Map(),
    loading: false,
    failed: false,
    refetch: vi.fn(),
  }),
}));
vi.mock("../components/DashboardHome", () => ({
  DashboardHome: () => <p>dashboard-home</p>,
}));
vi.mock("../components/CampaignWorkspace", () => ({
  CampaignWorkspace: ({
    campaign,
    onBack,
  }: {
    campaign: Campaign;
    onBack: () => void;
  }) => (
    <div>
      <p>workspace:{campaign.id}</p>
      <button onClick={onBack}>Back to campaigns</button>
    </div>
  ),
}));
vi.mock("../components/CampaignWizard", () => ({
  CampaignWizard: ({
    editingCampaign,
    relaunchDraft,
  }: {
    editingCampaign?: Campaign | null;
    relaunchDraft?: Campaign | null;
  }) => (
    <p>
      wizard:{editingCampaign?.id ?? "-"}|{relaunchDraft?.id ?? "-"}
    </p>
  ),
}));
vi.mock("../features/player-experience", () => ({
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

// Shows the current URL and a Back button, like the browser's.
function Probe() {
  const location = useLocation();
  const navigate = useNavigate();
  return (
    <>
      <output aria-label="url">{location.pathname}</output>
      <button onClick={() => navigate(-1)}>history-back</button>
    </>
  );
}

function renderAt(path: string) {
  return render(
    <ThemeProvider>
      <LanguageProvider>
        <MemoryRouter initialEntries={[path]}>
          <Routes>{dashboardRoutes}</Routes>
          <Probe />
        </MemoryRouter>
      </LanguageProvider>
    </ThemeProvider>,
  );
}

const url = () => screen.getByLabelText("url").textContent;

// The pages and the Studio are loaded on demand (lazy): under a loaded test run, the first
// dynamic import can take a few seconds.
const findTable = () =>
  screen.findByRole("table", { name: "Your campaigns" }, { timeout: 5000 });
const findStudio = async () =>
  (await screen.findByRole("dialog", { name: "Studio" }, { timeout: 5000 }))
    .textContent;

beforeEach(() => {
  localStorage.clear();
  hook.loading = false;
});

describe("Dashboard routing", { timeout: 15000 }, () => {
  it("gives every sidebar entry its own URL, as a real link", async () => {
    renderAt("/campaigns");
    const nav = screen.getByRole("navigation", { name: "Dashboard" });
    expect(
      within(nav)
        .getByRole("link", { name: /Player Studio/ })
        .getAttribute("href"),
    ).toBe("/studio");
    expect(
      within(nav)
        .getByRole("link", { name: /Reward Library/ })
        .getAttribute("href"),
    ).toBe("/prizes");
    // The entry of the open screen is the current page.
    expect(
      within(nav)
        .getByRole("link", { name: /Campaign Radios/ })
        .getAttribute("aria-current"),
    ).toBe("page");
    expect(
      within(nav)
        .getByRole("link", { name: /Overview/ })
        .getAttribute("aria-current"),
    ).toBeNull();
  });

  it("opens a screen directly from its URL, as after a refresh", async () => {
    renderAt("/campaigns/c2");
    expect(await screen.findByText("workspace:c2")).toBeTruthy();
    expect(url()).toBe("/campaigns/c2");
  });

  it("opens the wizard to edit or relaunch the campaign named in the URL", async () => {
    const { unmount } = renderAt("/create/c1/edit");
    expect(await screen.findByText("wizard:c1|-")).toBeTruthy();
    unmount();
    renderAt("/create/c2/relaunch");
    expect(await screen.findByText("wizard:-|c2")).toBeTruthy();
  });

  it("sends an unknown campaign or an unknown path back to a screen that exists", async () => {
    const { unmount } = renderAt("/campaigns/nope");
    await waitFor(() => expect(url()).toBe("/campaigns"));
    unmount();
    renderAt("/nothing-here");
    await waitFor(() => expect(url()).toBe("/"));
    expect(await screen.findByText("dashboard-home")).toBeTruthy();
  });

  it("waits for the campaigns before judging a campaign URL", async () => {
    hook.loading = true;
    renderAt("/studio/c1");
    // Still loading: no redirect, no Studio yet.
    await new Promise((resolve) => setTimeout(resolve, 300));
    expect(url()).toBe("/studio/c1");
    expect(screen.queryByRole("dialog", { name: "Studio" })).toBeNull();
  });
});

describe("Player Studio in the dashboard", { timeout: 15000 }, () => {
  it("shows the campaigns table from the menu, then the Studio of the chosen campaign", async () => {
    renderAt("/campaigns");
    await userEvent
      .setup()
      .click(screen.getByRole("link", { name: /Player Studio/ }));

    const table = await findTable();
    expect(url()).toBe("/studio");
    expect(screen.queryByRole("dialog", { name: "Studio" })).toBeNull();
    // A fresh user-event instance: the one that clicked the menu keeps a pointer state tied
    // to the menu link and never dispatches the next click (tool behavior; the same path
    // is checked in a real browser, S4 doc §8).
    await userEvent.setup().click(within(table).getByText("Winter Wheel"));

    expect(await findStudio()).toContain("studio:c2");
    expect(url()).toBe("/studio/c2");
  });

  it("opens the Studio straight from its URL", async () => {
    renderAt("/studio/c1");
    expect(await findStudio()).toContain("studio:c1");
    // Full screen: the dashboard menu is there, but not the dashboard top bar.
    expect(screen.getByRole("navigation", { name: "Dashboard" })).toBeTruthy();
    expect(
      screen.queryByRole("button", { name: /Interactive Player Sandbox/ }),
    ).toBeNull();
  });

  it("opens the demo experience on /studio/standalone", async () => {
    renderAt("/studio/standalone");
    expect(await findStudio()).toContain("studio:null");
  });

  it("comes back to the table with the browser's Back button", async () => {
    const user = userEvent.setup();
    renderAt("/studio");
    await user.click(within(await findTable()).getByText("Summer Wheel"));
    expect(await findStudio()).toContain("studio:c1");

    await user.click(screen.getByRole("button", { name: "history-back" }));
    expect(await findTable()).toBeTruthy();
    expect(url()).toBe("/studio");
  });

  it("goes back to the dashboard home when the Studio closes", async () => {
    const user = userEvent.setup();
    renderAt("/studio");
    await user.click(within(await findTable()).getByText("Summer Wheel"));
    expect(await findStudio()).toContain("studio:c1");

    await user.click(screen.getByRole("button", { name: "Close Studio" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Studio" })).toBeNull(),
    );
    expect(await screen.findByText("dashboard-home")).toBeTruthy();
    expect(screen.queryByRole("table", { name: "Your campaigns" })).toBeNull();
    expect(url()).toBe("/");
  });

  it("still opens the Studio directly from Customize player screen", async () => {
    const user = userEvent.setup();
    renderAt("/campaigns");
    const [customize] = await screen.findAllByTitle(
      "Customize Player Screen UI in Editor",
    );
    await user.click(customize);
    expect(await findStudio()).toMatch(/studio:c[12]/);
    expect(url()).toMatch(/^\/studio\/c[12]$/);

    await user.click(screen.getByRole("button", { name: "Close Studio" }));
    await waitFor(() =>
      expect(screen.queryByRole("dialog", { name: "Studio" })).toBeNull(),
    );
  });

  it("keeps the sandbox on its own campaign", async () => {
    const user = userEvent.setup();
    renderAt("/studio");
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
