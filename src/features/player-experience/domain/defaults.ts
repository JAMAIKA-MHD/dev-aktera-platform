import {
  CONSENT_TEXT,
  FORM_FIELD_TEXT,
  LEGAL_LINE,
  LOSING_SEGMENT_LABELS,
  SCRATCH_COVER_TEXT,
  WHEEL_HUB_LABEL,
  defaultJackpot,
  defaultLegalLinks,
  defaultPrizeChips,
  defaultScreens,
  defaultTermsBody,
} from "../presets/contentDefaults";
import { createDemoCampaign } from "../presets/demoCampaign";
import { themeFromPreset } from "../presets/themePresets";
import type { CampaignSnapshot } from "./campaign";
import type { GameType } from "./gameTypes";
import { DEFAULT_TEMPLATE_ID } from "./templates";
import type {
  ExperienceConfig,
  FormField,
  GameSettings,
  WheelSegment,
} from "./types";
import { createUuid } from "./uuid";

// The domain reads the pure-data presets (texts, styles, demo campaign), never presets/icons.ts,
// which imports React.

export const DEFAULT_GAME_TYPE: GameType = "lucky_wheel";
export const DEFAULT_POLICY_VERSION = "2026-09-01";

export const MIN_WHEEL_SEGMENTS = 4;
export const MAX_WHEEL_SEGMENTS = 12;

export interface DefaultExperienceInput {
  gameType: GameType; // used when there is no campaign
  campaign?: CampaignSnapshot | null; // null or absent = the fixed demo campaign
  presetId?: string;
  brandName?: string;
}

function field(key: FormField["key"], enabled: boolean, required: boolean) {
  return { key, enabled, required, ...FORM_FIELD_TEXT[key] };
}

function losingSegment(index: number): WheelSegment {
  return {
    id: createUuid(),
    prizeId: null,
    label: LOSING_SEGMENT_LABELS[index % LOSING_SEGMENT_LABELS.length],
    color: null,
    icon: null,
  };
}

// One segment per prize and at least one losing segment, 4 to 12 in total.
// With fewer than 3 prizes, extra losing segments (with varied labels) fill the wheel.
// Beyond 11 prizes, the extra prizes get no segment. Colors stay null: the runtime
// alternates the theme colors, so a theme change recolors the wheel.
export function buildDefaultWheelSegments(
  prizes: CampaignSnapshot["prizes"],
): NonNullable<GameSettings["wheel"]> {
  const shown = prizes.slice(0, MAX_WHEEL_SEGMENTS - 1);
  const losingCount = Math.max(1, MIN_WHEEL_SEGMENTS - shown.length);
  const total = shown.length + losingCount;
  // Losing segments are spread evenly around the wheel, the last one closing the circle.
  const losingSlots = new Set(
    Array.from(
      { length: losingCount },
      (_, index) => Math.round(((index + 1) * total) / losingCount) - 1,
    ),
  );
  const segments: WheelSegment[] = [];
  let prizeIndex = 0;
  let losingIndex = 0;
  for (let slot = 0; slot < total; slot++) {
    if (losingSlots.has(slot)) {
      segments.push(losingSegment(losingIndex++));
    } else {
      segments.push({
        id: createUuid(),
        prizeId: shown[prizeIndex++].id,
        label: {}, // empty = the prize display label
        color: null,
        icon: null,
      });
    }
  }
  return { segments, hubLabel: WHEEL_HUB_LABEL };
}

function defaultGameSettings(campaign: CampaignSnapshot): GameSettings {
  const settings: GameSettings = {
    type: campaign.gameType,
    teaser: { mode: "attract", caption: null }, // null = caption generated from the campaign
  };
  switch (campaign.gameType) {
    case "lucky_wheel":
      settings.wheel = buildDefaultWheelSegments(campaign.prizes);
      break;
    case "scratch_card":
      settings.scratch = {
        coverImage: null,
        coverText: SCRATCH_COVER_TEXT,
        revealThresholdPercent: 50,
      };
      break;
    case "mystery_box":
      settings.boxes = { count: 3, icon: "gift", color: null };
      break;
    case "quiz":
      settings.quiz = { translations: {} }; // empty = the campaign questions as typed
      break;
    case "hit_it":
      settings.hitIt = { targetIcon: "target", targetImage: null };
      break;
  }
  return settings;
}

// Complete configuration, ready to show: preset style, texts in fr/ar/en, sections,
// form, legal texts and game presentation built from the campaign (or the demo one).
// Always passes experienceConfigSchema: it is also the fallback of parseExperienceConfig.
export function createDefaultExperience(
  input: DefaultExperienceInput,
): ExperienceConfig {
  // A real campaign decides the game (chosen in the Wizard); without one, the demo
  // campaign is built for the requested type.
  const campaign = input.campaign ?? createDemoCampaign(input.gameType);
  const organizerName = input.brandName ?? "";
  const config: ExperienceConfig = {
    schemaVersion: 1,
    id: createUuid(),
    campaignId: input.campaign?.id ?? null,
    templateId: DEFAULT_TEMPLATE_ID,
    updatedAt: new Date().toISOString(),
    locales: { default: "fr", enabled: ["fr", "ar", "en"] },
    theme: themeFromPreset(input.presetId),
    brand: {
      name: organizerName,
      logo: null,
      logoIcon: "crown",
      tagline: {},
    },
    screens: defaultScreens(campaign.gameType),
    sections: {
      jackpot: defaultJackpot(),
      prizeChips: {
        enabled: true,
        items: defaultPrizeChips().map((chip) => ({
          id: createUuid(),
          ...chip,
        })),
      },
    },
    form: {
      fields: [
        field("fullName", true, true),
        field("phone", true, true),
        field("email", false, false),
        field("wilaya", true, false),
      ],
      consent: { text: CONSENT_TEXT, policyVersion: DEFAULT_POLICY_VERSION },
    },
    legal: {
      organizerName,
      links: defaultLegalLinks().map((link) => ({ id: createUuid(), ...link })),
      showLegalLine: true,
      legalLine: LEGAL_LINE,
      termsBody: defaultTermsBody(organizerName),
    },
    game: defaultGameSettings(campaign),
    prizeDisplay: {}, // empty = the campaign prize names and messages
    features: { sound: true, animations: true, shareBonus: false },
  };
  // Deep copy: the configuration shares no object with the presets, so editing it
  // in the Studio can never alter the defaults.
  return structuredClone(config);
}

// The screens of a design made for another game (the game changed in the Wizard after it was
// made): the texts of the game's own screens that still hold that game's defaults follow the
// new game, a brand's own wording is kept. Without it a Hit It campaign keeps "Tournez la
// roue !" over its target.
const GAME_SCREENS = ["welcome", "play"] as const;

export function screensForGame(
  screens: ExperienceConfig["screens"],
  from: GameType,
  to: GameType,
): ExperienceConfig["screens"] {
  if (from === to) return screens;
  const before = defaultScreens(from);
  const after = defaultScreens(to);
  const next = { ...screens };
  for (const key of GAME_SCREENS) {
    const screen = screens[key];
    const old = before[key];
    const fresh = after[key];
    const keep = <T>(value: T, oldValue: T, freshValue: T): T =>
      sameValue(value, oldValue) ? structuredClone(freshValue) : value;
    next[key] = {
      ...screen,
      title: keep(screen.title, old.title, fresh.title),
      subtitle: keep(screen.subtitle, old.subtitle, fresh.subtitle),
      primaryCta: keep(screen.primaryCta, old.primaryCta, fresh.primaryCta),
      reinforcement: keep(
        screen.reinforcement,
        old.reinforcement,
        fresh.reinforcement,
      ),
    };
  }
  return next;
}

// Equal whatever the order of their keys (a stored text may list its locales in another).
function sameValue(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (typeof a !== "object" || typeof b !== "object" || !a || !b) return false;
  const keysA = Object.keys(a).filter(
    (key) => (a as Record<string, unknown>)[key] !== undefined,
  );
  const keysB = Object.keys(b).filter(
    (key) => (b as Record<string, unknown>)[key] !== undefined,
  );
  return (
    keysA.length === keysB.length &&
    keysA.every((key) =>
      sameValue(
        (a as Record<string, unknown>)[key],
        (b as Record<string, unknown>)[key],
      ),
    )
  );
}
