import { act, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CampaignSnapshot } from "../domain/campaign";
import { createDefaultExperience } from "../domain/defaults";
import type { FlowScreen } from "../domain/flow";
import { PREVIEW_COUPON_CODE } from "../domain/flow";
import type { GameType } from "../domain/gameTypes";
import type { ExperienceConfig } from "../domain/types";
import * as publicApi from "../index";
import { createDemoCampaign } from "../presets/demoCampaign";
import { createLocalServices } from "../services/createLocalServices";
import type { ExperienceServices, GatewayMode } from "../services/ports";
import { ServicesProvider } from "../services/ServicesProvider";
import {
  PlayerExperience,
  type PlayerExperienceProps,
} from "./PlayerExperience";

// The root component: gateway guard, DEMO badge, CTAs wired to the flow, and a journey that
// survives everything but a new game or a forced screen. The screens are the interim ones
// until T4.2–T4.4.

const PREVIEW: readonly GatewayMode[] = ["demo", "scripted"];

function liveServices(): ExperienceServices {
  return {
    ...createLocalServices(),
    participation: {
      mode: "live",
      checkAvailability: async () => ({ open: true }),
      draw: async () => ({
        ok: false,
        error: { code: "NETWORK", message: "offline" },
      }),
      confirmCoupon: async () => ({ ok: true }),
    },
  };
}

function setup(
  props: Partial<PlayerExperienceProps> & {
    gameType?: GameType;
    services?: ExperienceServices;
  } = {},
) {
  const gameType = props.gameType ?? "lucky_wheel";
  const campaign: CampaignSnapshot = createDemoCampaign(gameType);
  const config: ExperienceConfig = createDefaultExperience({
    gameType,
    campaign,
  });
  const services =
    props.services ??
    createLocalServices({ participation: "scripted", campaign });
  const track = vi.spyOn(services.analytics, "track");
  const element = (overrides: Partial<PlayerExperienceProps> = {}) => (
    <ServicesProvider services={services}>
      <PlayerExperience
        config={config}
        campaign={campaign}
        locale="fr"
        allowedGatewayModes={PREVIEW}
        {...props}
        {...overrides}
      />
    </ServicesProvider>
  );
  const view = render(element());
  return {
    ...view,
    config,
    campaign,
    track,
    rerenderWith: (overrides: Partial<PlayerExperienceProps>) =>
      view.rerender(element(overrides)),
  };
}

const press = (label: string) => fireEvent.click(screen.getByText(label));

beforeEach(() => {
  vi.spyOn(console, "warn").mockImplementation(() => {}); // demo gateway warning
});
const windowSize = (width: number, height: number) => {
  Object.defineProperty(window, "innerWidth", {
    value: width,
    configurable: true,
  });
  Object.defineProperty(window, "innerHeight", {
    value: height,
    configurable: true,
  });
};

afterEach(() => {
  windowSize(1024, 768); // jsdom's default
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("PlayerExperience", () => {
  it("is the runtime root of the public API", () => {
    expect(publicApi.PlayerExperience).toBe(PlayerExperience);
  });

  it("opens on the welcome screen, themed, with the DEMO badge of a local gateway", () => {
    const { container } = setup();
    const root = container.querySelector<HTMLElement>(".xp-runtime");
    expect(root?.style.getPropertyValue("--xp-primary")).toBe("#F5BA41");
    expect(root?.getAttribute("dir")).toBe("ltr");
    expect(
      screen.getByText("Tournez la roue et tentez votre chance"),
    ).toBeTruthy();
    expect(screen.getByText("Demo")).toBeTruthy();
    expect(container.querySelector('[data-xp-slot="sections"]')).toBeTruthy();
  });

  it("shows no DEMO badge with the live gateway", () => {
    setup({ services: liveServices(), allowedGatewayModes: ["live"] });
    expect(screen.getByText("Lancer le jeu")).toBeTruthy();
    expect(screen.queryByText("Demo")).toBeNull();
  });

  it("refuses a gateway the page does not allow, with an explicit screen", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    const { container } = setup({ allowedGatewayModes: ["live"] });
    expect(screen.getByText("Jeu indisponible")).toBeTruthy();
    expect(screen.queryByText("Lancer le jeu")).toBeNull(); // no game, no CTA
    expect(container.querySelector('[data-xp-slot="cta"]')).toBeNull();
    expect(screen.getByText("Demo")).toBeTruthy(); // still says it is not live
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining(
        '"scripted" participation gateway is not allowed',
      ),
    );
  });

  it("says so when a page allows no gateway at all", () => {
    const error = vi.spyOn(console, "error").mockImplementation(() => {});
    setup({ allowedGatewayModes: [] });
    expect(screen.getByText("Jeu indisponible")).toBeTruthy();
    expect(error).toHaveBeenCalledWith(
      expect.stringContaining("(allowed: none)"),
    );
  });

  it("emits the flow event of its CTA, and reports each screen shown", () => {
    const onFlowEvent = vi.fn();
    const { track } = setup({ onFlowEvent });
    expect(onFlowEvent).toHaveBeenLastCalledWith("welcome");
    press("Lancer le jeu");
    expect(screen.getByText("Vos coordonnées")).toBeTruthy();
    expect(onFlowEvent).toHaveBeenLastCalledWith("register");
    expect(track).toHaveBeenCalledWith(
      expect.objectContaining({
        name: "cta_clicked",
        screen: "welcome",
        data: { cta: "primary" },
      }),
    );
    // The form arrives in T4.2: until it is valid, the CTA stays disabled.
    expect(screen.getByText("Participer").closest("button")?.disabled).toBe(
      true,
    );
  });

  it("keeps the journey through a resize, a new text, a new theme and a new language", () => {
    const { config, rerenderWith } = setup();
    press("Lancer le jeu");
    act(() => {
      windowSize(844, 390); // a phone turned to landscape: two panes, tight
      window.dispatchEvent(new Event("resize"));
    });
    const edited = structuredClone(config);
    edited.screens.register.title = { fr: "Vos informations" };
    edited.theme.colors.primary = "#2563EB";
    rerenderWith({ config: edited, locale: "ar" });
    expect(screen.getByText("Vos informations")).toBeTruthy(); // still the form
  });

  it("starts again on a new game", () => {
    const { rerenderWith } = setup();
    press("Lancer le jeu");
    const quiz = createDemoCampaign("quiz");
    rerenderWith({
      campaign: quiz,
      config: createDefaultExperience({ gameType: "quiz", campaign: quiz }),
    });
    expect(screen.getByText("Commencer le quiz")).toBeTruthy();
  });
});

describe("screens forced by the preview", () => {
  const forced = (initialScreen: FlowScreen) => setup({ initialScreen });

  it("shows a win with the first prize and a DEMO code, then goes back to the start", () => {
    const prize = createDemoCampaign("lucky_wheel").prizes[0];
    forced("win");
    expect(screen.getByText("Félicitations, vous avez gagné !")).toBeTruthy();
    expect(screen.getByText(prize.name)).toBeTruthy();
    expect(screen.getByText(PREVIEW_COUPON_CODE)).toBeTruthy();
    press("Terminer");
    expect(screen.getByText("Lancer le jeu")).toBeTruthy();
  });

  it("completes the reveal at once, as long as no game animates it", () => {
    forced("revealing");
    expect(screen.getByText("Félicitations, vous avez gagné !")).toBeTruthy();
  });

  it("shows the status screens, each with a way out", () => {
    const { unmount } = forced("duplicate");
    expect(screen.getByText("Déjà joué !")).toBeTruthy();
    expect(
      screen.getByText(
        "Vous avez déjà participé à cette campagne avec ce numéro.",
      ),
    ).toBeTruthy();
    press("Retour");
    expect(screen.getByText("Lancer le jeu")).toBeTruthy();
    unmount();
    forced("closed");
    expect(screen.getByText("Campagne terminée")).toBeTruthy();
    expect(screen.getByText("Retour")).toBeTruthy();
  });

  it("offers to retry after an error, or to go back", () => {
    forced("error");
    expect(screen.getByText("Oups !")).toBeTruthy();
    expect(screen.getByText("Réessayer")).toBeTruthy();
    press("Retour");
    expect(screen.getByText("Lancer le jeu")).toBeTruthy();
  });

  it("waits while the draw is in flight, without any button", () => {
    const { container } = forced("resolving");
    expect(screen.getByText("Préparation de votre partie…")).toBeTruthy();
    expect(container.querySelector('[data-xp-slot="cta"]')).toBeNull();
  });

  it("never sends a draw from a forced game screen: back to the form, with the reason", async () => {
    vi.useFakeTimers();
    forced("play");
    press("Tourner la roue");
    await act(async () => {
      await vi.advanceTimersByTimeAsync(0);
    });
    expect(screen.getByText("Vos coordonnées")).toBeTruthy();
    expect(screen.getByRole("alert").textContent).toBe(
      "Certaines informations sont invalides. Vérifiez vos coordonnées et réessayez.",
    );
  });

  it("lets the game send its own result when it is played first", () => {
    const { container } = setup({ gameType: "quiz", initialScreen: "play" });
    expect(screen.getByText("À vous de jouer")).toBeTruthy();
    expect(container.querySelector('[data-xp-slot="cta"]')).toBeNull();
  });

  it("never forces a screen with the live gateway", () => {
    setup({
      services: liveServices(),
      allowedGatewayModes: ["live"],
      initialScreen: "win",
    });
    expect(screen.getByText("Lancer le jeu")).toBeTruthy();
  });

  it("starts again on another forced screen", () => {
    const { rerenderWith } = forced("lose");
    expect(screen.getByText("Pas de chance cette fois !")).toBeTruthy();
    rerenderWith({ initialScreen: "register" });
    expect(screen.getByText("Vos coordonnées")).toBeTruthy();
  });
});
