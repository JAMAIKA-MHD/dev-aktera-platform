import { act, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { THEMED_TEMPLATE_IDS } from "../../domain/themeManifest";
import type { TemplateId } from "../../domain/templates";
import { createDemoCampaign } from "../../presets/demoCampaign";
import { getThemeManifest } from "../../presets/themeManifests";
import { createLocalServices } from "../../services/createLocalServices";
import { ServicesProvider } from "../../services/ServicesProvider";
import { runtimeAudio } from "../feedback/audio";
import { PlayerExperience } from "../PlayerExperience";
import { useExperienceFlow } from "../useExperienceFlow";

// The scene a template plays before a win. The journey is real up to the last step: the flow
// is pushed from a game's end to the win, as a game's own animation would.

const confetti = vi.hoisted(() => {
  const fire = Object.assign(vi.fn(), { reset: vi.fn() });
  return { fire, create: vi.fn(() => fire) };
});
vi.mock("canvas-confetti", () => ({ default: { create: confetti.create } }));

// Stops short of the games' timers: a flow whose screen the test sets itself.
const flowScreen = vi.hoisted(() => ({ current: "revealing", set: () => {} }));
vi.mock("../useExperienceFlow", async (original) => {
  const { useState } = await import("react");
  const actual = await original<typeof import("../useExperienceFlow")>();
  return {
    ...actual,
    useExperienceFlow: (options: Parameters<typeof useExperienceFlow>[0]) => {
      const flow = actual.useExperienceFlow(options);
      const [screen, setScreen] = useState(flowScreen.current);
      flowScreen.set = setScreen as () => void;
      return {
        ...flow,
        state: {
          ...flow.state,
          screen,
          outcome: {
            isWinner: true,
            prize: null,
            couponCode: "DEMO-0000-0000",
          },
        },
      };
    },
  };
});

function setup(
  templateId: TemplateId,
  options: {
    forced?: boolean;
    customize?: (config: ReturnType<typeof createDefaultExperience>) => void;
  } = {},
) {
  flowScreen.current = options.forced ? "win" : "revealing";
  const campaign = createDemoCampaign("lucky_wheel");
  const config = createDefaultExperience({ gameType: "lucky_wheel", campaign });
  config.templateId = templateId;
  options.customize?.(config);
  const services = createLocalServices({ participation: "scripted", campaign });
  const view = render(
    <ServicesProvider services={services}>
      <PlayerExperience
        config={config}
        campaign={campaign}
        locale="fr"
        allowedGatewayModes={["scripted"]}
        initialScreen={options.forced ? "win" : "revealing"}
      />
    </ServicesProvider>,
  );
  return view;
}

const arrive = () => act(() => (flowScreen.set as (s: string) => void)("win"));
const elapse = (seconds: number) =>
  act(() => {
    vi.advanceTimersByTime(seconds * 1000);
  });
const overlay = (container: HTMLElement) =>
  container.querySelector<HTMLElement>(".xp-intro");
const page = (container: HTMLElement) =>
  container.querySelector<HTMLElement>(".xp-transition")!;

beforeEach(() => {
  vi.useFakeTimers();
  vi.spyOn(console, "warn").mockImplementation(() => {});
  confetti.fire.mockClear();
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  vi.unstubAllGlobals();
  localStorage.clear();
});

describe("WinIntro", () => {
  it.each(THEMED_TEMPLATE_IDS)(
    "%s: holds the page, then hands it over at the theme's own moment",
    (templateId) => {
      const play = vi.spyOn(runtimeAudio, "play");
      const { container } = setup(templateId);
      const { seconds, handoff } =
        getThemeManifest(templateId)!.motion.winIntro!;
      arrive();

      // The page is there, behind the scene, and waits.
      expect(overlay(container)).toBeTruthy();
      expect(screen.getByText("DEMO-0000-0000")).toBeTruthy();
      expect(page(container).hasAttribute("data-xp-held")).toBe(true);
      expect(page(container).hasAttribute("inert")).toBe(true);
      expect(play).not.toHaveBeenCalledWith("win");
      expect(confetti.fire).not.toHaveBeenCalled();

      elapse(handoff - 0.1);
      expect(page(container).hasAttribute("data-xp-held")).toBe(true);
      elapse(0.1);
      expect(page(container).hasAttribute("data-xp-held")).toBe(false);
      expect(page(container).hasAttribute("inert")).toBe(false);
      expect(play).toHaveBeenCalledWith("win");
      // The scene's last moments play over a page that has already started.
      expect(overlay(container)).toBeTruthy();
      expect(screen.queryByText("PASSER L'INTRO")).toBeNull();

      elapse(seconds - handoff + 0.01); // past the rounding of the subtraction
      expect(confetti.fire).toHaveBeenCalled();
      expect(overlay(container)).toBeNull();
    },
  );

  it.each(THEMED_TEMPLATE_IDS)("%s: shows every picture it names", (id) => {
    const { container } = setup(id);
    arrive();
    const pictures = overlay(container)!.querySelectorAll("img");
    expect(pictures.length).toBeGreaterThan(0);
    for (const picture of pictures) {
      expect(picture.getAttribute("src"), picture.className).toBeTruthy();
    }
  });

  it("is skipped for good: the page shows at once and no timer brings the scene back", () => {
    const play = vi.spyOn(runtimeAudio, "play");
    const { container } = setup("comic-burst");
    arrive();
    act(() => screen.getByText("PASSER L'INTRO").click());
    expect(overlay(container)).toBeNull();
    expect(page(container).hasAttribute("data-xp-held")).toBe(false);
    expect(play).toHaveBeenCalledWith("win");
    elapse(11);
    expect(overlay(container)).toBeNull();
    expect(play.mock.calls.filter(([name]) => name === "win")).toHaveLength(1);
  });

  it("leaves a win forced by the Studio's preview alone", () => {
    const { container } = setup("pixel-quest", { forced: true });
    expect(overlay(container)).toBeNull();
    expect(page(container).hasAttribute("data-xp-held")).toBe(false);
  });

  it("is off when the brand turns it off, or all animation", () => {
    const off = setup("arcade-night", {
      customize: (config) => {
        config.features.winIntro = false;
      },
    });
    arrive();
    expect(overlay(off.container)).toBeNull();
    off.unmount();
    const still = setup("arcade-night", {
      customize: (config) => {
        config.features.animations = false;
      },
    });
    arrive();
    expect(overlay(still.container)).toBeNull();
  });

  it("is off with reduced motion: the page shows at once", () => {
    vi.stubGlobal("matchMedia", (query: string) => ({
      matches: query.includes("reduce"),
      addEventListener: () => {},
      removeEventListener: () => {},
    }));
    const { container } = setup("quiz-show");
    arrive();
    expect(overlay(container)).toBeNull();
    expect(page(container).hasAttribute("data-xp-held")).toBe(false);
  });

  it("the classic template has no scene", () => {
    const { container } = setup("eight-slot");
    arrive();
    expect(overlay(container)).toBeNull();
  });
});
