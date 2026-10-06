import { describe, expect, it } from "vitest";
import type { GameType } from "../domain/gameTypes";
import { LOCALES, hasText, type LocalizedText } from "../domain/locale";
import type { ScreenKey } from "../domain/types";
import {
  CONSENT_TEXT,
  DEFAULT_SCREEN_CONTENT,
  FORM_FIELD_TEXT,
  LEGAL_LINE,
  LOSING_SEGMENT_LABELS,
  QUIZ_TIMER_CAPTION,
  SCRATCH_COVER_TEXT,
  STATUS_TEXT,
  TEASER_CAPTIONS,
  WHEEL_HUB_LABEL,
  defaultJackpot,
  defaultLegalLinks,
  defaultPrizeChips,
  defaultTermsBody,
} from "./contentDefaults";
import { ICON_COMPONENTS, ICON_NAMES } from "./icons";
import {
  DEFAULT_PRESET_ID,
  THEME_PRESETS,
  themeFromPreset,
} from "./themePresets";
import { ALGERIA_WILAYAS, wilayaLabel } from "./wilayas";

const GAME_TYPES: GameType[] = [
  "lucky_wheel",
  "quiz",
  "scratch_card",
  "mystery_box",
  "hit_it",
];
const SCREENS: ScreenKey[] = ["welcome", "register", "play", "win", "lose"];

const inEveryLocale = (text: LocalizedText) =>
  LOCALES.every((locale) => hasText(text, locale));

// Everything the player may read by default, to scan it as a whole.
const ALL_COPY = JSON.stringify({
  DEFAULT_SCREEN_CONTENT,
  STATUS_TEXT,
  jackpot: defaultJackpot(),
  chips: defaultPrizeChips(),
  FORM_FIELD_TEXT,
  CONSENT_TEXT,
  LEGAL_LINE,
  links: defaultLegalLinks(),
  terms: defaultTermsBody("Zeta Market"),
  TEASER_CAPTIONS,
  QUIZ_TIMER_CAPTION,
  LOSING_SEGMENT_LABELS,
  WHEEL_HUB_LABEL,
  SCRATCH_COVER_TEXT,
});

describe("THEME_PRESETS", () => {
  it("offers the five generic styles, Midnight Gold first", () => {
    expect(THEME_PRESETS.map((preset) => preset.id)).toEqual([
      "midnight-gold",
      "obsidian-violet",
      "clean-light",
      "telecom-red",
      "retail-blue",
    ]);
    expect(DEFAULT_PRESET_ID).toBe("midnight-gold");
  });

  it("uses #rrggbb colors only", () => {
    for (const preset of THEME_PRESETS) {
      for (const color of Object.values(preset.tokens.colors)) {
        expect(color).toMatch(/^#[0-9A-F]{6}$/i);
      }
    }
  });

  it("builds a theme from a preset, and falls back to the default one", () => {
    expect(themeFromPreset("clean-light")).toMatchObject({
      presetId: "clean-light",
      mode: "light",
    });
    expect(themeFromPreset("unknown").presetId).toBe("midnight-gold");
    expect(themeFromPreset(undefined).presetId).toBe("midnight-gold");
  });

  it("returns a copy that cannot alter the preset", () => {
    const theme = themeFromPreset("midnight-gold");
    theme.colors.primary = "#000000";
    expect(themeFromPreset("midnight-gold").colors.primary).toBe("#F5BA41");
  });
});

describe("default copy", () => {
  it("gives every screen of every game a title, a subtitle and a button in fr, ar and en", () => {
    for (const gameType of GAME_TYPES) {
      for (const key of SCREENS) {
        const screen = DEFAULT_SCREEN_CONTENT[gameType][key];
        expect(inEveryLocale(screen.title), `${gameType}.${key}.title`).toBe(
          true,
        );
        expect(
          inEveryLocale(screen.subtitle),
          `${gameType}.${key}.subtitle`,
        ).toBe(true);
        expect(inEveryLocale(screen.primaryCta), `${gameType}.${key}.cta`).toBe(
          true,
        );
      }
    }
  });

  it("gives each game its own welcome title", () => {
    const titles = GAME_TYPES.map(
      (gameType) => DEFAULT_SCREEN_CONTENT[gameType].welcome.title.fr,
    );
    expect(new Set(titles).size).toBe(GAME_TYPES.length);
  });

  it("translates sections, form, legal texts and teaser captions", () => {
    const texts: LocalizedText[] = [
      ...Object.values(STATUS_TEXT),
      defaultJackpot().eyebrow,
      defaultJackpot().title,
      ...defaultPrizeChips().flatMap((chip) => [chip.value, chip.caption]),
      ...Object.values(FORM_FIELD_TEXT).flatMap((field) => [
        field.label,
        field.placeholder,
      ]),
      CONSENT_TEXT,
      LEGAL_LINE,
      ...defaultLegalLinks().map((link) => link.label),
      defaultTermsBody("Zeta Market"),
      defaultTermsBody(""),
      ...Object.values(TEASER_CAPTIONS),
      QUIZ_TIMER_CAPTION,
      ...LOSING_SEGMENT_LABELS,
      WHEEL_HUB_LABEL,
      SCRATCH_COVER_TEXT,
    ];
    for (const text of texts)
      expect(inEveryLocale(text), JSON.stringify(text)).toBe(true);
  });

  it("names the organizer in the legal sheet, or a neutral wording without one", () => {
    expect(defaultTermsBody("Zeta Market").fr).toContain("Zeta Market");
    expect(defaultTermsBody("").fr).toContain(
      "l'organisateur de cette campagne",
    );
  });

  it("asks consent for the rules and the data processing (Law 18-07)", () => {
    expect(CONSENT_TEXT.fr).toContain("18-07");
    expect(CONSENT_TEXT.fr).toContain("données personnelles");
  });

  it("never promises a win or an extra try, and contains no TODO", () => {
    const forbidden = [
      /garanti/i,
      /guaranteed/i,
      /مضمون/,
      /100 ?%/,
      /\+1/,
      /essai supplémentaire/i,
      /rejouez/i,
      /TODO/,
    ];
    for (const pattern of forbidden) expect(ALL_COPY).not.toMatch(pattern);
  });

  it("names no real brand", () => {
    const presetText = JSON.stringify(THEME_PRESETS).toLowerCase();
    const brands = [
      "djezzy",
      "mobilis",
      "ooredoo",
      "yassir",
      "cevital",
      "rouiba",
      "ifri",
      "condor",
      "uno",
      "bna",
      "chery",
      "geely",
    ];
    for (const brand of brands) {
      expect(presetText).not.toMatch(new RegExp(`\\b${brand}\\b`));
      expect(ALL_COPY.toLowerCase()).not.toMatch(new RegExp(`\\b${brand}\\b`));
    }
  });
});

describe("ALGERIA_WILAYAS", () => {
  it("lists the 58 wilayas, coded 01 to 58, with French and Arabic names", () => {
    expect(ALGERIA_WILAYAS).toHaveLength(58);
    ALGERIA_WILAYAS.forEach((wilaya, index) => {
      expect(wilaya.code).toBe(String(index + 1).padStart(2, "0"));
      expect(wilaya.nameFr.trim()).not.toBe("");
      expect(wilaya.nameAr.trim()).not.toBe("");
    });
  });

  it("labels a wilaya in the player language", () => {
    const algiers = ALGERIA_WILAYAS[15];
    expect(wilayaLabel(algiers, "fr")).toBe("16 - Alger");
    expect(wilayaLabel(algiers, "en")).toBe("16 - Alger");
    expect(wilayaLabel(algiers, "ar")).toBe("16 - الجزائر العاصمة");
  });
});

describe("ICON_COMPONENTS", () => {
  it("has a lucide component for every icon name", () => {
    expect(ICON_NAMES).toHaveLength(16);
    for (const name of ICON_NAMES) expect(ICON_COMPONENTS[name]).toBeTruthy();
  });
});
