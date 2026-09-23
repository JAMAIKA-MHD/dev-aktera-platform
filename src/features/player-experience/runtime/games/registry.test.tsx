import { render, screen } from "@testing-library/react";
import { Suspense } from "react";
import { describe, expect, it } from "vitest";
import type { CampaignSnapshot } from "../../domain/campaign";
import { createDefaultExperience } from "../../domain/defaults";
import { GAME_LABELS, type GameType } from "../../domain/gameTypes";
import { createDemoCampaign } from "../../presets/demoCampaign";
import { autoCaption } from "./autoCaption";
import { registry } from "./registry";
import type { GameEngineProps, GameTeaserProps } from "./types";

// registry.ts (T5.1): one entry per mechanic. Until T5.2–T5.6 give a mechanic its own
// module, every Engine and Teaser resolves to the shared fallback — proven here by actually
// rendering each one through Suspense, the same way a screen will.

const GAME_TYPES = Object.keys(GAME_LABELS) as GameType[];

// A longer timeout than the default 1000 ms keeps the lazy resolution below from flaking
// under a loaded machine (a full coverage run, dozens of files at once).
const lazyTimeout = { timeout: 5000 };

function engineProps(campaign: CampaignSnapshot): GameEngineProps {
  const config = createDefaultExperience({
    gameType: campaign.gameType,
    campaign,
  });
  return {
    settings: config.game,
    campaign,
    config,
    phase: "idle",
    outcome: null,
    onStart: () => {},
    onInteractionComplete: () => {},
    onRevealComplete: () => {},
    reducedMotion: false,
    locale: "fr",
  };
}

function teaserProps(campaign: CampaignSnapshot): GameTeaserProps {
  const config = createDefaultExperience({
    gameType: campaign.gameType,
    campaign,
  });
  return {
    settings: config.game,
    campaign,
    config,
    locale: "fr",
    reducedMotion: false,
    active: true,
    onStart: () => {},
    startLabel: "Lancer le jeu",
  };
}

describe("registry", () => {
  it("has one entry for every game type", () => {
    expect(Object.keys(registry).sort()).toEqual(GAME_TYPES.sort());
  });

  it("labels each entry from the shared Studio labels, not a copy", () => {
    for (const gameType of GAME_TYPES) {
      expect(registry[gameType].labels).toBe(GAME_LABELS[gameType]);
    }
  });

  it("gives every entry the shared autoCaption, which already switches on the game type", () => {
    for (const gameType of GAME_TYPES) {
      expect(registry[gameType].autoCaption).toBe(autoCaption);
    }
  });

  it("gives every entry a default slice of its own settings, and none other", () => {
    const settingsKey: Record<GameType, string> = {
      lucky_wheel: "wheel",
      scratch_card: "scratch",
      mystery_box: "boxes",
      quiz: "quiz",
      hit_it: "hitIt",
    };
    for (const gameType of GAME_TYPES) {
      const keys = Object.keys(registry[gameType].defaultSettings);
      expect(keys).toEqual([settingsKey[gameType]]);
    }
  });

  it.each(GAME_TYPES)("resolves an Engine for %s", async (gameType) => {
    const campaign = createDemoCampaign(gameType);
    const Engine = registry[gameType].Engine;
    const { container } = render(
      <Suspense fallback={null}>
        <Engine {...engineProps(campaign)} />
      </Suspense>,
    );
    // Each mechanic marks its stage with its own game type — whether that is its real
    // engine (from T5.2 on) or the shared fallback still standing in for it.
    await screen.findByText(
      (_, element) => element?.getAttribute("data-xp-game") === gameType,
      {},
      lazyTimeout,
    );
    expect(
      container.querySelector(`[data-xp-game="${gameType}"]`),
    ).toBeTruthy();
  });

  it.each(GAME_TYPES)("resolves a Teaser for %s", async (gameType) => {
    const campaign = createDemoCampaign(gameType);
    const Teaser = registry[gameType].Teaser;
    render(
      <Suspense fallback={null}>
        <Teaser {...teaserProps(campaign)} />
      </Suspense>,
    );
    expect(
      await screen.findByRole(
        "button",
        { name: /^Lancer le jeu · / },
        lazyTimeout,
      ),
    ).toBeTruthy();
  });
});
