import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
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

// canvas-confetti draws on a real <canvas>; jsdom has none (FrameHost.test.tsx's pattern).
const confetti = vi.hoisted(() => {
  const fire = Object.assign(vi.fn(), { reset: vi.fn() });
  return { fire, create: vi.fn(() => fire) };
});
vi.mock("canvas-confetti", () => ({ default: { create: confetti.create } }));

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

  it("hands the reveal to the mechanic, which says when it is over (T5.2)", async () => {
    forced("revealing");
    // The wheel turns to the segment it was given before the win is shown: the outcome is
    // never on screen while the game is still animating towards it.
    expect(screen.queryByText("Félicitations, vous avez gagné !")).toBeNull();
    expect(
      await screen.findByText(
        "Félicitations, vous avez gagné !",
        {},
        { timeout: 10000 },
      ),
    ).toBeTruthy();
  }, 15000);

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

  it("waits while the draw is in flight on the game's own stage, without any button", async () => {
    const { container } = forced("resolving");
    // The game stays on stage through the wait (T5.2): the wheel turns rather than being
    // swapped out for a spinner, and nothing can be pressed while the draw is under way.
    await waitFor(
      () =>
        expect(
          container.querySelector('[data-xp-game="lucky_wheel"]'),
        ).toBeTruthy(),
      { timeout: 5000 },
    );
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

describe("PlayerExperience · templates of the library", () => {
  it("draws no stage with the classic template", () => {
    const { container } = setup();
    const root = container.querySelector(".xp-runtime");
    expect(root?.getAttribute("data-xp-template")).toBe("eight-slot");
    expect(container.querySelector(".xp-stage")).toBeNull();
  });

  it("dresses every screen from the template's theme.json: stage, fonts, panel", () => {
    const { container, config, rerenderWith } = setup();
    rerenderWith({ config: { ...config, templateId: "comic-burst" } });
    const root = container.querySelector<HTMLElement>(".xp-runtime");
    expect(root?.getAttribute("data-xp-template")).toBe("comic-burst");
    expect(root?.getAttribute("data-xp-themed")).toBe("comic-burst");
    expect(root?.style.getPropertyValue("--xp-font-display")).toContain(
      "Luckiest Guy",
    );
    expect(root?.style.getPropertyValue("--xp-btn-radius")).toBe("0.95rem");
    // Its panel is a shape (the cloud), in one column in the middle of the stage.
    expect(root?.style.getPropertyValue("--xp-panel-shape")).toMatch(/^url\(/);
    expect(root?.hasAttribute("data-xp-panel-shape")).toBe(true);
    expect(root?.getAttribute("data-xp-layout")).toBe("spotlight");
    // The template paints the page itself: the theme's background stands aside.
    expect(root?.style.backgroundImage).toBe("");
    const stage = container.querySelector<HTMLElement>(".xp-stage");
    expect(stage?.getAttribute("aria-hidden")).toBe("true");
    // Its stage is painted, not a picture: rays in CSS, a cut-corner frame in vector, its
    // own polygon on one column.
    expect(
      stage
        ?.querySelector<HTMLElement>(".xp-stage-image")
        ?.style.getPropertyValue("--xp-stage-paint"),
    ).toContain("repeating-conic-gradient(");
    const frame = stage?.querySelector<HTMLElement>(".xp-stage-frame");
    expect(frame?.style.getPropertyValue("--xp-frame-clip")).toMatch(
      /^polygon\(/,
    );
    expect(
      [...(frame?.querySelectorAll("[data-xp-frame]") ?? [])].map((svg) =>
        svg.getAttribute("data-xp-frame"),
      ),
    ).toEqual(["stack", "wide"]);
    expect(
      frame
        ?.querySelector("[data-xp-frame-part]")
        ?.getAttribute("vector-effect"),
    ).toBe("non-scaling-stroke");
    expect(stage?.querySelectorAll(".xp-decor").length).toBeGreaterThan(0);
    expect(document.getElementById("xp-template-comic-burst")).not.toBeNull();
    // The frame says which screen it draws.
    expect(
      container.querySelector(".xp-frame")?.getAttribute("data-xp-screen"),
    ).toBe("welcome");
    // Its welcome opens on the texts alone: no teaser, no slot 5.
    expect(
      container.querySelector('.xp-frame > [data-xp-slot="interaction"]'),
    ).toBeNull();
  });

  it("keeps the journey when the template changes (the stage is outside it)", () => {
    const { config, rerenderWith } = setup();
    press("Lancer le jeu");
    expect(screen.getByText("Vos coordonnées")).toBeTruthy();
    rerenderWith({ config: { ...config, templateId: "quiz-show" } });
    expect(screen.getByText("Vos coordonnées")).toBeTruthy(); // still the form
  });
});

describe("PlayerExperience · the shell with every theme", () => {
  const THEMED = [
    "comic-burst",
    "quiz-show",
    "arcade-night",
    "pixel-quest",
  ] as const;

  it.each(THEMED)(
    "%s: the same win screen — prize, code, copy, restart — on the shell",
    (templateId) => {
      const prize = createDemoCampaign("lucky_wheel").prizes[0];
      const { container, config, rerenderWith, track } = setup({
        initialScreen: "win",
      });
      rerenderWith({ config: { ...config, templateId } });
      expect(container.querySelector("[data-xp-result='win']")).not.toBeNull();
      expect(
        container.querySelector("[data-xp-reward]")?.textContent,
      ).toContain(prize.name);
      fireEvent.click(screen.getByText(PREVIEW_COUPON_CODE));
      expect(track).toHaveBeenCalledWith(
        expect.objectContaining({ name: "coupon_copied" }),
      );
      fireEvent.click(screen.getByText("Terminer"));
      expect(screen.getByText("Lancer le jeu")).toBeTruthy();
    },
  );

  it("sets the stage's mood and its own background from the screen", () => {
    const { container, config, rerenderWith } = setup({
      initialScreen: "lose",
    });
    rerenderWith({ config: { ...config, templateId: "quiz-show" } });
    const stage = () => container.querySelector<HTMLElement>(".xp-stage");
    const image = () =>
      stage()
        ?.querySelector<HTMLElement>(".xp-stage-image")
        ?.style.getPropertyValue("--xp-stage-image") ?? "";
    expect(stage()?.dataset.xpMood).toBe("lose");
    const onLose = image();
    expect(onLose).toContain("url(");
    // arcade-night has a background of its own for each result (gold rays, a red night).
    rerenderWith({
      config: { ...config, templateId: "arcade-night" },
      initialScreen: "lose",
    });
    const nightLose = image();
    rerenderWith({
      config: { ...config, templateId: "arcade-night" },
      initialScreen: "win",
    });
    expect(image()).not.toBe(nightLose);
  });

  it("draws the theme's wheel: its lights, and the prize art on the prize slices", () => {
    const { container, config, rerenderWith } = setup({
      initialScreen: "play",
    });
    rerenderWith({ config: { ...config, templateId: "comic-burst" } });
    const wheel = container.querySelector("[data-xp-game='lucky_wheel']");
    // One inked light on each line between two slices (bulbsPerSlice: 1).
    expect(wheel?.querySelectorAll(".xp-wheel-bulb").length).toBe(
      wheel?.querySelectorAll(".xp-wheel-segment").length,
    );
    expect(wheel?.querySelector(".xp-wheel-bulb")?.getAttribute("stroke")).toBe(
      "var(--xp-wheel-bulb-ink)",
    );
    // The theme's own pointer, and the prize art on the prize slices.
    expect(
      wheel?.querySelector("image.xp-wheel-pointer")?.getAttribute("href"),
    ).toBeTruthy();
    expect(
      wheel?.querySelectorAll("image:not(.xp-wheel-pointer)").length,
    ).toBeGreaterThan(0);
    expect(
      wheel?.querySelector(".xp-wheel-segment")?.getAttribute("fill"),
    ).toMatch(/^var\(--xp-wheel-/);
  });

  it("hands the theme's own recordings to the sounds, and takes them back on the classic one", async () => {
    const { runtimeAudio } = await import("./feedback/audio");
    const files = vi.spyOn(runtimeAudio, "setSoundFiles");
    const { config, rerenderWith } = setup();
    rerenderWith({ config: { ...config, templateId: "comic-burst" } });
    expect(files).toHaveBeenLastCalledWith(
      expect.objectContaining({
        win: expect.any(String),
        tick: expect.any(String),
      }),
    );
    rerenderWith({ config: { ...config, templateId: "eight-slot" } });
    expect(files).toHaveBeenLastCalledWith({});
    files.mockRestore();
  });

  it("keeps the classic wheel and result screens for the classic template", () => {
    const { container } = setup({ initialScreen: "win" });
    expect(container.querySelector(".xp-stage")).toBeNull();
    expect(screen.getByText("Félicitations, vous avez gagné !")).toBeTruthy();
  });
});
