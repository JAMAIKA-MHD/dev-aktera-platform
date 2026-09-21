import type { CampaignSnapshot } from "./campaign";
import type { GameType } from "./gameTypes";
import type {
  ExperienceConfig,
  FormField,
  GameSettings,
  ScreenContent,
} from "./types";
import { createUuid } from "./uuid";

export const DEFAULT_GAME_TYPE: GameType = "lucky_wheel";
export const DEFAULT_POLICY_VERSION = "2026-09-01";

export interface DefaultExperienceInput {
  gameType: GameType;
  campaign?: CampaignSnapshot | null;
  presetId?: string;
  brandName?: string;
}

function emptyScreen(): ScreenContent {
  return {
    showHeader: true,
    hero: "none",
    title: {},
    subtitle: {},
    reinforcement: { kind: "none", text: {} },
    primaryCta: {},
    secondaryCta: null,
  };
}

function field(key: FormField["key"], enabled: boolean, required: boolean) {
  return { key, enabled, required, label: {}, placeholder: {} };
}

function defaultGameSettings(gameType: GameType): GameSettings {
  const settings: GameSettings = {
    type: gameType,
    teaser: { mode: "attract", caption: null },
  };
  switch (gameType) {
    case "lucky_wheel":
      settings.wheel = {
        segments: [1, 2].map(() => ({
          id: createUuid(),
          prizeId: null,
          label: {},
          color: null,
          icon: null,
        })),
        hubLabel: {},
      };
      break;
    case "scratch_card":
      settings.scratch = {
        coverImage: null,
        coverText: {},
        revealThresholdPercent: 50,
      };
      break;
    case "mystery_box":
      settings.boxes = { count: 3, icon: "gift", color: null };
      break;
    case "quiz":
      settings.quiz = { translations: {} };
      break;
    case "hit_it":
      settings.hitIt = { targetIcon: "target", targetImage: null };
      break;
  }
  return settings;
}

// Structurally valid configuration with neutral values and empty texts.
// Always passes experienceConfigSchema: it is the safe fallback of parseExperienceConfig.
export function createDefaultExperience(
  input: DefaultExperienceInput,
): ExperienceConfig {
  return {
    schemaVersion: 1,
    id: createUuid(),
    campaignId: input.campaign?.id ?? null,
    templateId: "eight-slot",
    updatedAt: new Date().toISOString(),
    locales: { default: "fr", enabled: ["fr", "ar", "en"] },
    theme: {
      presetId: input.presetId ?? "midnight-gold",
      mode: "dark",
      colors: {
        primary: "#F5BA41",
        secondary: "#FBBF24",
        accent: "#10B981",
        surface: "#0A1120",
        text: "#FFFFFF",
      },
      background: {
        kind: "mesh",
        image: null,
        overlayOpacity: 0.85,
        focus: { x: 50, y: 50 },
      },
      radius: "pill",
      font: "poppins",
    },
    brand: {
      name: input.brandName ?? "",
      logo: null,
      logoIcon: "crown",
      tagline: {},
    },
    screens: {
      welcome: emptyScreen(),
      register: emptyScreen(),
      play: emptyScreen(),
      win: emptyScreen(),
      lose: emptyScreen(),
    },
    sections: {
      jackpot: {
        enabled: false,
        eyebrow: {},
        title: {},
        badge: {},
        icon: "trophy",
      },
      prizeChips: {
        enabled: false,
        items: [
          {
            id: createUuid(),
            icon: "gift",
            value: {},
            caption: {},
            tone: "primary",
          },
        ],
      },
    },
    form: {
      fields: [
        field("fullName", true, true),
        field("phone", true, true),
        field("email", false, false),
        field("wilaya", true, false),
      ],
      consent: { text: {}, policyVersion: DEFAULT_POLICY_VERSION },
    },
    legal: {
      organizerName: input.brandName ?? "",
      links: [],
      legalLine: {},
      termsBody: {},
    },
    game: defaultGameSettings(input.gameType),
    prizeDisplay: {},
    features: { sound: true, animations: true, shareBonus: false },
  };
}
