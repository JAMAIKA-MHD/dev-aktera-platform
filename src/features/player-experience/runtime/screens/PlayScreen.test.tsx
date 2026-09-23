import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { createInitialFlowState, type FlowScreen } from "../../domain/flow";
import type { GameType } from "../../domain/gameTypes";
import type { Locale } from "../../domain/locale";
import { createDemoCampaign } from "../../presets/demoCampaign";
import { createLocalServices } from "../../services/createLocalServices";
import { ServicesProvider } from "../../services/ServicesProvider";
import { PlayerExperience } from "../PlayerExperience";
import type { ExperienceFlow } from "../useExperienceFlow";
import { PlayScreen, WaitingForEngine } from "./PlayScreen";

// The game on stage (tasks.md T5.2): the mechanic's own engine, kept on stage through the
// player's turn, the draw and the reveal — the three moments T4.1 and T4.3 used to hand to
// three different screens. The wait of T4.3 lives on here, as what is shown while the
// mechanic's module is still being fetched.

const engineTimeout = { timeout: 5000 }; // the engine is lazy (registry.ts, T5.1)

function setup(
  options: {
    gameType?: GameType;
    locale?: Locale;
    initialScreen?: FlowScreen;
  } = {},
) {
  const gameType = options.gameType ?? "lucky_wheel";
  const campaign = createDemoCampaign(gameType);
  const config = createDefaultExperience({ gameType, campaign });
  const services = createLocalServices({ participation: "scripted", campaign });
  const track = vi.spyOn(services.analytics, "track");
  const view = render(
    <ServicesProvider services={services}>
      <PlayerExperience
        config={config}
        campaign={campaign}
        locale={options.locale ?? "fr"}
        allowedGatewayModes={["scripted"]}
        initialScreen={options.initialScreen ?? "play"}
      />
    </ServicesProvider>,
  );
  return { ...view, campaign, track };
}

// A screen of the journey drawn straight, to check what PlayScreen leaves to others.
function renderScreen(screenName: FlowScreen) {
  const campaign = createDemoCampaign("lucky_wheel");
  const config = createDefaultExperience({ gameType: "lucky_wheel", campaign });
  const flow = {
    state: {
      ...createInitialFlowState("lucky_wheel", { startedAt: 0 }),
      screen: screenName,
    },
    track: vi.fn(),
  } as unknown as ExperienceFlow;
  return render(
    <PlayScreen
      flow={flow}
      config={config}
      campaign={campaign}
      locale="fr"
      chrome={{ logoUrl: null, statusBadge: "Demo", live: true }}
    />,
  );
}

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {}); // demo gateway warning
});
afterEach(() => {
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("PlayScreen", () => {
  it("puts the mechanic's own engine on stage, with the button to launch it", async () => {
    const { container } = setup();
    const wheel = await screen.findByLabelText("JOUER", {}, engineTimeout);
    expect(wheel).toBeTruthy();
    expect(
      container.querySelector('[data-xp-game="lucky_wheel"]'),
    ).toBeTruthy();
    expect(screen.getByText("Tourner la roue")).toBeTruthy();
  });

  // What the Suspense boundary shows while the engine's module is being fetched. Drawn on
  // its own: React keeps a resolved lazy component, so a rendered journey only shows this
  // once per test run, whichever test got there first.
  it("has a wait for the mechanic's module, turning and announced, in the three languages", () => {
    const config = createDefaultExperience({ gameType: "lucky_wheel" });
    for (const [locale, text] of [
      ["fr", "Préparation de votre partie…"],
      ["ar", "جارٍ تحضير لعبتك…"],
      ["en", "Getting your game ready…"],
    ] as const) {
      const { container, unmount } = render(
        <WaitingForEngine config={config} locale={locale} />,
      );
      expect(screen.getByRole("status").textContent).toBe(text);
      expect(container.querySelector(".xp-spin")).toBeTruthy();
      unmount();
    }
  });

  it("starts the draw from the game itself, like from the button", async () => {
    const { track } = setup();
    fireEvent.click(await screen.findByLabelText("JOUER", {}, engineTimeout));
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "cta_clicked",
        screen: "play",
        data: { cta: "game" },
      }),
    );
    expect(screen.queryByText("Tourner la roue")).toBeNull(); // the draw is under way
  });

  it("keeps the game on stage while the draw is in flight, with nothing to press", async () => {
    const { container } = setup();
    fireEvent.click(await screen.findByLabelText("JOUER", {}, engineTimeout));
    const stage = container.querySelector('[data-xp-game="lucky_wheel"]');
    expect(stage?.getAttribute("data-xp-phase")).toBe("awaiting-outcome");
    expect(container.querySelector('[data-xp-slot="cta"]')).toBeNull();
  });

  it("offers no button to a game the player plays first", async () => {
    // "after-interaction": the game itself ends the turn, so the frame offers nothing.
    const { container } = setup({ gameType: "quiz" });
    await waitFor(
      () =>
        expect(container.querySelector('[data-xp-game="quiz"]')).toBeTruthy(),
      engineTimeout,
    );
    expect(container.querySelector('[data-xp-slot="cta"]')).toBeNull();
  });

  it("is not a dead end, and stays open to the Studio's field", async () => {
    const { container } = setup();
    await screen.findByLabelText("JOUER", {}, engineTimeout);
    expect(screen.getByText("Règlement")).toBeTruthy();
    expect(
      container.querySelector('[data-xp-edit="screens.play.title"]'),
    ).toBeTruthy();
  });

  it("leaves every screen outside the game to its own component", () => {
    for (const screenName of [
      "welcome",
      "register",
      "duplicate",
      "closed",
      "error",
      "win",
      "lose",
    ] as const) {
      const { container, unmount } = renderScreen(screenName);
      expect(container.innerHTML, screenName).toBe("");
      unmount();
    }
  });
});
