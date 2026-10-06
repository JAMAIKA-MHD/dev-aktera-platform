import { DEFAULT_PRESET_ID, themeFromPreset } from "../presets/themePresets";
import type { CampaignSnapshot } from "./campaign";
import { MAX_WHEEL_SEGMENTS, createDefaultExperience } from "./defaults";
import type { GameType } from "./gameTypes";
import { ICON_NAMES, type IconName } from "./icons";
import type { LocalizedText } from "./locale";
import type {
  AssetRef,
  ExperienceConfig,
  FormField,
  FormFieldKey,
  ScreenContent,
  ThemeTokens,
  WheelSegment,
} from "./types";
import { createUuid } from "./uuid";

export const CURRENT_SCHEMA_VERSION = 1;

type RawObject = Record<string, unknown>;

function isRecord(value: unknown): value is RawObject {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

// ── Version upgrades ────────────────────────────────────────────────────────

// Step N turns a version N configuration into version N + 1. Add one step per new version.
const MIGRATIONS: Readonly<Record<number, (raw: RawObject) => RawObject>> = {
  // v0: written before schemaVersion existed. Same shape as v1: only the version is added.
  0: (raw) => ({ ...raw, schemaVersion: 1 }),
};

// Brings a stored configuration up to the current version, without validating it:
// parseExperienceConfig does that right after. What cannot be placed (not an object,
// unreadable or future version) is returned unchanged, and the schema repairs it.
export function migrateExperienceConfig(raw: unknown): unknown {
  if (!isRecord(raw)) return raw;
  const declared = raw.schemaVersion ?? 0;
  if (typeof declared !== "number" || !Number.isInteger(declared)) return raw;
  let current = raw;
  for (let version = declared; version < CURRENT_SCHEMA_VERSION; version++) {
    const step = MIGRATIONS[version];
    if (!step) return current;
    current = step(current);
  }
  return current;
}

// ── Import of the legacy PlayerScreenConfig (plan §16.2) ───────────────────

const HEX6 = /^#[0-9a-f]{6}$/i;
const HEX3 = /^#[0-9a-f]{3}$/i;
const ARABIC_SCRIPT = /[\u0600-\u06FF]/;

function readString(value: unknown): string | null {
  return typeof value === "string" && value.trim() !== "" ? value.trim() : null;
}

// "#abc" is expanded to "#AABBCC"; names, rgb() and gradients are not colors the theme can hold.
function readColor(value: unknown): string | null {
  const text = readString(value);
  if (text && HEX6.test(text)) return text.toUpperCase();
  if (text && HEX3.test(text)) {
    const [r, g, b] = text.slice(1);
    return `#${r}${r}${g}${g}${b}${b}`.toUpperCase();
  }
  return null;
}

// Only the image sources the schema accepts: https URLs and uploaded images.
function readAsset(value: unknown): AssetRef {
  const url = readString(value);
  if (url?.startsWith("https://")) return { kind: "remote", url };
  if (url?.startsWith("data:image/")) return { kind: "dataUrl", url };
  return null;
}

// Legacy texts have no language. Arabic script goes to "ar", anything else to "fr"
// (the language of the legacy editor by default); the other languages fall back to it.
function readText(value: unknown): LocalizedText | null {
  const text = readString(value);
  if (!text) return null;
  return ARABIC_SCRIPT.test(text) ? { ar: text } : { fr: text };
}

function pick<T extends string>(
  value: unknown,
  allowed: readonly T[],
): T | null {
  return allowed.find((candidate) => candidate === value) ?? null;
}

// Maps, not plain objects: a legacy value such as "constructor" must not reach Object.prototype.
const BACKGROUND_KINDS = new Map<unknown, ThemeTokens["background"]["kind"]>([
  ["solid", "solid"],
  ["gradient", "gradient"],
  ["mesh", "mesh"],
  ["dots", "dots"],
  ["image", "image"],
  ["brandImage", "image"],
]);

function importTheme(legacy: RawObject): ThemeTokens {
  // Legacy themes have no surface or text color: start from a preset of the right mode.
  const presetId = legacy.mode === "light" ? "clean-light" : DEFAULT_PRESET_ID;
  const theme = themeFromPreset(presetId);
  const colors = {
    primary: readColor(legacy.primaryColor),
    secondary: readColor(legacy.secondaryColor),
    accent: readColor(legacy.accentColor),
  };
  for (const [key, color] of Object.entries(colors)) {
    if (color) theme.colors[key as keyof typeof colors] = color;
  }
  if (isRecord(legacy.background)) {
    const kind = BACKGROUND_KINDS.get(legacy.background.type);
    // A URL becomes the background image; any other value (CSS gradient, color) is dropped.
    const image = readAsset(legacy.background.value);
    if (image) theme.background.image = image;
    // An image background without a usable image keeps the preset background.
    if (kind && (kind !== "image" || image)) theme.background.kind = kind;
  }
  theme.radius =
    pick(legacy.borderRadius, ["sharp", "rounded", "pill"] as const) ??
    theme.radius;
  // Any difference with the preset makes it a custom theme.
  if (JSON.stringify(theme) !== JSON.stringify(themeFromPreset(presetId))) {
    theme.presetId = null;
  }
  return theme;
}

const FIELD_BY_TYPE = new Map<unknown, FormFieldKey>([
  ["text", "fullName"],
  ["tel", "phone"],
  ["email", "email"],
  ["select", "wilaya"],
]);

function importFormFields(
  legacyFields: unknown,
  defaults: FormField[],
): FormField[] {
  // The legacy editor always saved an empty list: it means "not customized".
  if (!Array.isArray(legacyFields) || legacyFields.length === 0)
    return defaults;
  const byKey = new Map<FormFieldKey, RawObject>();
  for (const field of legacyFields) {
    if (!isRecord(field)) continue;
    const key = FIELD_BY_TYPE.get(field.type);
    if (key && !byKey.has(key)) byKey.set(key, field);
  }
  return defaults.map((field) => {
    const legacy = byKey.get(field.key);
    // The phone number stays on and required: it is the anti-duplicate key.
    if (field.key === "phone") {
      return { ...field, label: readText(legacy?.label) ?? field.label };
    }
    if (!legacy) return { ...field, enabled: false, required: false };
    return {
      ...field,
      enabled: true,
      required: legacy.required === true,
      label: readText(legacy.label) ?? field.label,
    };
  });
}

// Actions of the legacy result screens that no longer exist: their labels would lie.
// "claim" ("Copy code"): the code is copied from the voucher itself.
// "retry" ("Play again now"): one entry per phone number.
const OBSOLETE_CTA_ACTIONS = ["claim", "retry"];

function importResultScreen(legacy: unknown, screen: ScreenContent): void {
  if (!isRecord(legacy)) return;
  screen.title = readText(legacy.title) ?? screen.title;
  if (!OBSOLETE_CTA_ACTIONS.includes(String(legacy.ctaAction))) {
    screen.primaryCta = readText(legacy.ctaLabel) ?? screen.primaryCta;
  }
}

function importWheelSegments(legacy: unknown): WheelSegment[] | null {
  if (!isRecord(legacy) || !isRecord(legacy.wheel)) return null;
  const slices = Array.isArray(legacy.wheel.slices)
    ? legacy.wheel.slices.filter(isRecord).slice(0, MAX_WHEEL_SEGMENTS)
    : [];
  if (slices.length < 2) return null;
  return slices.map((slice) => ({
    id: createUuid(),
    prizeId: null, // legacy slices are not tied to prizes: linked in the Studio
    label: readText(slice.label) ?? {},
    color: readColor(slice.color),
    icon: pick<IconName>(slice.icon, ICON_NAMES),
  }));
}

// Best-effort import of the configuration saved by the legacy editors, on top of a
// default configuration. Only valid values are taken, so the result always passes the
// schema. uiProject is ignored. Returns null when there is neither theme nor content.
export function importLegacyPlayerScreenConfig(
  legacy: unknown,
  gameType: GameType,
  campaign?: CampaignSnapshot | null,
): ExperienceConfig | null {
  if (!isRecord(legacy)) return null;
  const { theme, content } = legacy;
  if (!isRecord(theme) && !isRecord(content)) return null;

  const config = createDefaultExperience({ gameType, campaign });
  if (isRecord(theme)) {
    config.theme = importTheme(theme);
    config.brand.logo = readAsset(theme.logoUrl) ?? config.brand.logo;
  }
  if (isRecord(content)) {
    if (isRecord(content.preGame)) {
      const welcome = config.screens.welcome;
      welcome.title = readText(content.preGame.title) ?? welcome.title;
      welcome.subtitle =
        readText(content.preGame.subHeader) ?? welcome.subtitle;
      config.form.fields = importFormFields(
        content.preGame.formFields,
        config.form.fields,
      );
    }
    importResultScreen(content.winState, config.screens.win);
    importResultScreen(content.loseState, config.screens.lose);
  }
  const segments = importWheelSegments(legacy.gameAssets);
  if (config.game.wheel && segments) config.game.wheel.segments = segments;
  return config;
}
