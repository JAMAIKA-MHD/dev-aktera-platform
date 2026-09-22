import type { CampaignSnapshot } from "../../domain/campaign";
import { createDefaultExperience } from "../../domain/defaults";
import type { GameType } from "../../domain/gameTypes";
import type { Locale } from "../../domain/locale";
import type { ExperienceConfig } from "../../domain/types";
import { createDemoCampaign } from "../../presets/demoCampaign";

// Fixed configurations rendered by /xp-frame?fixture=<name>: control pages for the
// responsive sweep (T3.8) and for manual checks with the browser's device mode.
// Each task of phases 3 to 5 adds its own fixtures.

export type FixtureView = "layout-debug" | "theme-presets";

export interface Fixture {
  view: FixtureView;
  description: string;
  config: ExperienceConfig;
  campaign: CampaignSnapshot;
}

function fixture(
  view: FixtureView,
  description: string,
  gameType: GameType = "lucky_wheel",
  presetId = "midnight-gold",
): () => Fixture {
  return () => {
    const campaign = createDemoCampaign(gameType);
    return {
      view,
      description,
      config: createDefaultExperience({ gameType, campaign, presetId }),
      campaign,
    };
  };
}

const FIXTURES: Readonly<Record<string, () => Fixture>> = {
  "layout-debug": fixture(
    "layout-debug",
    "Current layout mode, viewport size and theme tokens",
  ),
  "theme-presets": fixture(
    "theme-presets",
    "The five style presets, each drawn from its own theme variables",
  ),
};

export const FIXTURE_NAMES = Object.keys(FIXTURES);

export function getFixture(name: string): Fixture | null {
  return Object.hasOwn(FIXTURES, name) ? FIXTURES[name]() : null;
}

export function readFixtureLocale(value: string | null): Locale {
  return value === "ar" || value === "en" ? value : "fr";
}
