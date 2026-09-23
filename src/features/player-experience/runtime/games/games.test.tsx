import { act, renderHook } from "@testing-library/react";
import { useRef } from "react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { CampaignSnapshot } from "../../domain/campaign";
import { createDefaultExperience } from "../../domain/defaults";
import type { GameType } from "../../domain/gameTypes";
import { createDemoCampaign } from "../../presets/demoCampaign";
import { autoCaption, fillCaption, teaserCaption } from "./autoCaption";
import { useTeaserActivity } from "./useTeaserActivity";

// The pregame pieces shared by every mechanic (T4.2, ahead of T5.1): the teaser activity and
// the automatic caption. Each mechanic's own teaser is tested next to it (T5.2 onwards).

afterEach(() => {
  vi.unstubAllGlobals();
  Object.defineProperty(document, "visibilityState", {
    value: "visible",
    configurable: true,
  });
});

describe("useTeaserActivity", () => {
  it("is active while its element is on screen and the tab is visible", () => {
    let notify: (
      entries: Array<{ isIntersecting: boolean }>,
    ) => void = () => {};
    const disconnect = vi.fn();
    vi.stubGlobal(
      "IntersectionObserver",
      class {
        constructor(callback: typeof notify) {
          notify = callback;
        }
        observe() {}
        disconnect = disconnect;
      },
    );
    const { result, unmount } = renderHook(() => {
      const ref = useRef(document.createElement("div"));
      return useTeaserActivity(ref);
    });
    expect(result.current).toBe(true);
    act(() => notify([{ isIntersecting: false }]));
    expect(result.current).toBe(false); // scrolled away
    act(() => notify([]));
    expect(result.current).toBe(false); // no news: unchanged
    act(() => notify([{ isIntersecting: true }]));
    expect(result.current).toBe(true);
    act(() => {
      Object.defineProperty(document, "visibilityState", {
        value: "hidden",
        configurable: true,
      });
      document.dispatchEvent(new Event("visibilitychange"));
    });
    expect(result.current).toBe(false); // another tab
    unmount();
    expect(disconnect).toHaveBeenCalledOnce();
  });

  it("counts the element as on screen without IntersectionObserver", () => {
    vi.stubGlobal("IntersectionObserver", undefined);
    const { result } = renderHook(() =>
      useTeaserActivity({ current: document.createElement("div") }),
    );
    expect(result.current).toBe(true);
  });
});

describe("autoCaption", () => {
  const campaign = (gameType: GameType): CampaignSnapshot =>
    createDemoCampaign(gameType);

  it("describes each game from its public rules, in the player's language", () => {
    const wheel = campaign("lucky_wheel");
    expect(autoCaption(wheel, "fr")).toBe(
      `${wheel.prizes.length} lots à gagner`,
    );
    expect(autoCaption(wheel, "en")).toBe(
      `${wheel.prizes.length} prizes to win`,
    );
    const quiz = campaign("quiz");
    expect(autoCaption(quiz, "fr")).toBe(`${quiz.quiz.length} questions`);
    expect(autoCaption(campaign("scratch_card"), "ar")).toBe(
      "امسح لتكتشف مفاجأتك",
    );
    expect(autoCaption(campaign("mystery_box"), "en")).toBe("Pick your box");
    // A single hit is said in the singular, in each language (T5.7).
    expect(autoCaption(campaign("hit_it"), "en")).toBe("1 hit in 10s");
    expect(autoCaption(campaign("hit_it"), "fr")).toBe("1 touche en 10 s");
  });

  it("adds the timer of a timed quiz, and reads the rules of the campaign", () => {
    const quiz = campaign("quiz");
    quiz.rules = {
      quiz: { passThresholdPercent: 100, secondsPerQuestion: 15 },
      hitIt: { winThreshold: 8, durationSeconds: 12 },
    };
    expect(autoCaption(quiz, "fr")).toBe(
      `${quiz.quiz.length} questions · 15 s chacune`,
    );
    expect(autoCaption({ ...quiz, gameType: "hit_it" }, "fr")).toBe(
      "8 touches en 12 s",
    );
    // Without rules, the server's defaults.
    expect(autoCaption({ ...quiz, rules: {} }, "fr")).toBe(
      `${quiz.quiz.length} questions`,
    );
    expect(autoCaption({ ...quiz, gameType: "hit_it", rules: {} }, "fr")).toBe(
      "1 touche en 10 s",
    );
  });

  it("fills every placeholder it has a value for, and shows the others", () => {
    expect(autoCaption(campaign("lucky_wheel"), "fr").includes("{")).toBe(
      false,
    );
    expect(fillCaption("{count} lots, {unknown}", { count: 4 })).toBe(
      "4 lots, {unknown}",
    );
  });
});

describe("teaserCaption", () => {
  it("prefers the brand's own caption, and falls back to the automatic one", () => {
    const wheel = createDemoCampaign("lucky_wheel");
    const config = createDefaultExperience({
      gameType: "lucky_wheel",
      campaign: wheel,
    });
    expect(teaserCaption(config, wheel, "fr")).toBe(autoCaption(wheel, "fr"));
    config.game.teaser.caption = { fr: "Tentez votre chance" };
    expect(teaserCaption(config, wheel, "ar")).toBe("Tentez votre chance"); // fallback
    config.game.teaser.caption = { fr: "   " };
    expect(teaserCaption(config, wheel, "fr")).toBe(autoCaption(wheel, "fr"));
  });
});
