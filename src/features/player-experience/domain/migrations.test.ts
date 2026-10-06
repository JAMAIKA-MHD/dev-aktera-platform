import type { PlayerScreenConfig } from "@/src/types";
import { describe, expect, it } from "vitest";
import { DEFAULT_SCREEN_CONTENT } from "../presets/contentDefaults";
import type { CampaignSnapshot } from "./campaign";
import { createDefaultExperience } from "./defaults";
import {
  CURRENT_SCHEMA_VERSION,
  importLegacyPlayerScreenConfig,
  migrateExperienceConfig,
} from "./migrations";
import { experienceConfigSchema, parseExperienceConfig } from "./schema";
import type { ExperienceConfig } from "./types";

// Shape saved by the legacy editor (PlayerEditorShell), with every mapped field customized.
const completeLegacy = (): PlayerScreenConfig => ({
  uiProject: { pages: [{ id: "p1", elements: [] }] },
  theme: {
    logoUrl: "https://cdn.example.com/logo.png",
    showBrandWatermark: true,
    primaryColor: "#e11d48",
    secondaryColor: "#abc",
    accentColor: "#10B981",
    background: { type: "brandImage", value: "https://cdn.example.com/bg.jpg" },
    fontFamily: "Poppins",
    borderRadius: "sharp",
    mode: "dark",
  },
  gameAssets: {
    wheel: {
      slices: [
        { color: "#7C3AED", label: "Bon 500 DA", icon: "gift" },
        { color: "violet", label: "Dommage", icon: "🌙" },
        { color: "#059669", label: "Casque" },
      ],
    },
    sound: { muted: false },
  },
  content: {
    preGame: {
      title: "Tentez votre chance !",
      subHeader: "Un lot vous attend peut-être",
      rulesText: "Une participation par numéro",
      formFields: [
        {
          id: "f1",
          name: "name",
          label: "Votre nom",
          type: "text",
          required: true,
        },
        {
          id: "f2",
          name: "phone",
          label: "Mobile",
          type: "tel",
          required: false,
        },
        { id: "f3", name: "age", label: "Âge", type: "number", required: true },
      ],
    },
    winState: {
      title: "Gagné !",
      ctaLabel: "Copier le code",
      ctaAction: "claim",
    },
    loseState: {
      title: "Perdu",
      ctaLabel: "Rejouer maintenant",
      ctaAction: "retry",
    },
    gameParams: { timerSeconds: 15, dailyAttempts: 1 },
  },
});

const campaign: CampaignSnapshot = {
  id: "campaign-1",
  name: "Summer campaign",
  gameType: "lucky_wheel",
  status: "active",
  prizes: [{ id: "prize-1", name: "Bon 500 DA", winMessage: null }],
  quiz: [],
  rules: {},
};

const isValid = (config: ExperienceConfig | null) =>
  experienceConfigSchema.safeParse(config).success;

// Legacy object with only the given theme and content (optional parts left out).
const legacyWith = (theme: object | null, content: object | null = null) =>
  ({
    ...(theme ? { theme } : {}),
    ...(content ? { content } : {}),
  }) as unknown;

describe("migrateExperienceConfig", () => {
  it("returns a current configuration unchanged", () => {
    const config = createDefaultExperience({ gameType: "quiz" });
    expect(migrateExperienceConfig(config)).toBe(config);
    expect(CURRENT_SCHEMA_VERSION).toBe(1);
  });

  it("upgrades a configuration saved before versioning (v0)", () => {
    const { schemaVersion: _version, ...v0 } = createDefaultExperience({
      gameType: "quiz",
    });
    const migrated = migrateExperienceConfig(v0);
    expect(migrated).toEqual({ ...v0, schemaVersion: 1 });
    expect(v0).not.toHaveProperty("schemaVersion"); // the input is not modified
  });

  it("leaves what it cannot place to the schema", () => {
    for (const raw of [null, undefined, "config", 42, [1, 2]]) {
      expect(migrateExperienceConfig(raw)).toBe(raw);
    }
    for (const schemaVersion of [2, "1", 1.5, -1]) {
      const raw = { schemaVersion, theme: {} };
      expect(migrateExperienceConfig(raw)).toBe(raw);
    }
  });
});

describe("parseExperienceConfig with migrations", () => {
  it("loads a v0 configuration without calling it a recovery", () => {
    const { schemaVersion: _version, ...v0 } = createDefaultExperience({
      gameType: "hit_it",
    });
    const result = parseExperienceConfig(v0);
    expect(result.issues).toEqual([]);
    expect(result.recovered).toBe(false);
    expect(result.config.schemaVersion).toBe(1);
  });

  it("turns an empty JSON object into a complete configuration", () => {
    const result = parseExperienceConfig({});
    expect(result.recovered).toBe(true);
    expect(isValid(result.config)).toBe(true);
  });

  it("keeps the brand's work when the version is unknown", () => {
    const config = createDefaultExperience({ gameType: "quiz" });
    config.screens.welcome.title = { fr: "Notre grand quiz" };
    const result = parseExperienceConfig({ ...config, schemaVersion: 7 });
    expect(result.recovered).toBe(true);
    expect(
      result.issues.some((issue) => issue.startsWith("schemaVersion")),
    ).toBe(true);
    expect(result.config.schemaVersion).toBe(1);
    expect(result.config.screens.welcome.title).toEqual({
      fr: "Notre grand quiz",
    });
  });
});

describe("importLegacyPlayerScreenConfig", () => {
  it("imports a complete legacy configuration into a valid one", () => {
    const config = importLegacyPlayerScreenConfig(
      completeLegacy(),
      "lucky_wheel",
      campaign,
    );
    expect(config).not.toBeNull();
    expect(isValid(config)).toBe(true);
    expect(config?.campaignId).toBe("campaign-1");
  });

  it("maps the theme: colors, background, logo, radius, mode", () => {
    const config = importLegacyPlayerScreenConfig(completeLegacy(), "quiz");
    expect(config?.theme.colors).toMatchObject({
      primary: "#E11D48",
      secondary: "#AABBCC", // "#abc" expanded
      accent: "#10B981",
    });
    expect(config?.theme.background.kind).toBe("image"); // brandImage → image
    expect(config?.theme.background.image).toEqual({
      kind: "remote",
      url: "https://cdn.example.com/bg.jpg",
    });
    expect(config?.brand.logo).toEqual({
      kind: "remote",
      url: "https://cdn.example.com/logo.png",
    });
    expect(config?.theme.radius).toBe("sharp");
    expect(config?.theme.mode).toBe("dark");
    expect(config?.theme.presetId).toBeNull(); // customized: no longer a preset
  });

  it("maps the texts of the welcome, win and lose screens", () => {
    const config = importLegacyPlayerScreenConfig(completeLegacy(), "quiz");
    expect(config?.screens.welcome.title).toEqual({
      fr: "Tentez votre chance !",
    });
    expect(config?.screens.welcome.subtitle).toEqual({
      fr: "Un lot vous attend peut-être",
    });
    expect(config?.screens.win.title).toEqual({ fr: "Gagné !" });
    expect(config?.screens.lose.title).toEqual({ fr: "Perdu" });
  });

  it("drops the labels of actions that no longer exist (claim, retry)", () => {
    const config = importLegacyPlayerScreenConfig(completeLegacy(), "quiz");
    expect(config?.screens.win.primaryCta).toEqual(
      DEFAULT_SCREEN_CONTENT.quiz.win.primaryCta,
    );
    expect(config?.screens.lose.primaryCta).toEqual(
      DEFAULT_SCREEN_CONTENT.quiz.lose.primaryCta,
    );
    const other = importLegacyPlayerScreenConfig(
      legacyWith(null, {
        loseState: {
          title: "Perdu",
          ctaLabel: "Voir nos offres",
          ctaAction: "link",
        },
      }),
      "quiz",
    );
    expect(other?.screens.lose.primaryCta).toEqual({ fr: "Voir nos offres" });
  });

  it("maps the form fields by type, and keeps the phone on and required", () => {
    const config = importLegacyPlayerScreenConfig(completeLegacy(), "quiz");
    const fields = Object.fromEntries(
      (config?.form.fields ?? []).map((field) => [field.key, field]),
    );
    expect(fields.fullName).toMatchObject({
      enabled: true,
      required: true,
      label: { fr: "Votre nom" },
    });
    expect(fields.phone).toMatchObject({
      enabled: true,
      required: true, // "required: false" in the legacy config is not followed
      label: { fr: "Mobile" },
    });
    expect(fields.email).toMatchObject({ enabled: false, required: false });
    expect(fields.wilaya).toMatchObject({ enabled: false, required: false });
  });

  it("keeps the default form when the legacy list is empty", () => {
    const config = importLegacyPlayerScreenConfig(
      legacyWith(null, { preGame: { title: "Salut", formFields: [] } }),
      "quiz",
    );
    expect(config?.form.fields).toEqual(
      createDefaultExperience({ gameType: "quiz" }).form.fields,
    );
  });

  it("imports the wheel slices, to be linked to prizes in the Studio", () => {
    const config = importLegacyPlayerScreenConfig(
      completeLegacy(),
      "lucky_wheel",
      campaign,
    );
    expect(
      config?.game.wheel?.segments.map(({ prizeId, label, color, icon }) => ({
        prizeId,
        label,
        color,
        icon,
      })),
    ).toEqual([
      {
        prizeId: null,
        label: { fr: "Bon 500 DA" },
        color: "#7C3AED",
        icon: "gift",
      },
      { prizeId: null, label: { fr: "Dommage" }, color: null, icon: null },
      { prizeId: null, label: { fr: "Casque" }, color: "#059669", icon: null },
    ]);
  });

  it("keeps the default wheel with fewer than 2 slices, and caps it at 12", () => {
    const one = completeLegacy();
    one.gameAssets!.wheel!.slices = [{ color: "#7C3AED", label: "Seul" }];
    const config = importLegacyPlayerScreenConfig(one, "lucky_wheel", campaign);
    expect(config?.game.wheel?.segments.map((s) => s.prizeId)).toContain(
      "prize-1",
    );
    const many = completeLegacy();
    many.gameAssets!.wheel!.slices = Array(20).fill({
      color: "#7C3AED",
      label: "X",
    });
    expect(
      importLegacyPlayerScreenConfig(many, "lucky_wheel")?.game.wheel?.segments,
    ).toHaveLength(12);
  });

  it("ignores the wheel slices for other games", () => {
    const config = importLegacyPlayerScreenConfig(
      completeLegacy(),
      "scratch_card",
    );
    expect(config?.game.wheel).toBeUndefined();
    expect(isValid(config)).toBe(true);
  });

  it("puts Arabic texts in Arabic", () => {
    const config = importLegacyPlayerScreenConfig(
      legacyWith(null, { preGame: { title: "جرّب حظك الآن" } }),
      "quiz",
    );
    expect(config?.screens.welcome.title).toEqual({ ar: "جرّب حظك الآن" });
  });

  it("starts a light legacy theme from the light preset", () => {
    const config = importLegacyPlayerScreenConfig(
      legacyWith({ mode: "light" }),
      "quiz",
    );
    expect(config?.theme.mode).toBe("light");
    expect(config?.theme.presetId).toBe("clean-light"); // nothing else changed
    expect(config?.theme.colors.surface).toBe("#FFFFFF");
  });

  it("ignores invalid values and stays valid", () => {
    const config = importLegacyPlayerScreenConfig(
      legacyWith(
        {
          logoUrl: "http://insecure.example.com/logo.png",
          primaryColor: "red",
          secondaryColor: "rgb(0, 0, 0)",
          background: { type: "constructor", value: "javascript:alert(1)" },
          borderRadius: "huge",
          mode: "sepia",
        },
        {
          preGame: { title: 42, subHeader: "   ", formFields: "none" },
          winState: "Gagné",
          loseState: { title: null },
        },
      ),
      "quiz",
    );
    const defaults = createDefaultExperience({ gameType: "quiz" });
    expect(isValid(config)).toBe(true);
    expect(config?.theme).toEqual(defaults.theme);
    expect(config?.brand.logo).toBeNull();
    expect(config?.screens).toEqual(defaults.screens);
    expect(config?.form.fields).toEqual(defaults.form.fields);
  });

  it("keeps the preset background when an image background has no usable image", () => {
    const config = importLegacyPlayerScreenConfig(
      legacyWith({
        background: { type: "image", value: "linear-gradient(red, blue)" },
      }),
      "quiz",
    );
    expect(config?.theme.background.kind).toBe("mesh");
    expect(config?.theme.background.image).toBeNull();
  });

  it("accepts an uploaded logo, and a gradient background without image", () => {
    const config = importLegacyPlayerScreenConfig(
      legacyWith({
        logoUrl: "data:image/png;base64,AAAA",
        background: { type: "gradient", value: "linear-gradient(red, blue)" },
      }),
      "quiz",
    );
    expect(config?.brand.logo).toEqual({
      kind: "dataUrl",
      url: "data:image/png;base64,AAAA",
    });
    expect(config?.theme.background.kind).toBe("gradient");
    expect(config?.theme.presetId).toBeNull();
  });

  it("tolerates incomplete legacy lists", () => {
    const config = importLegacyPlayerScreenConfig(
      {
        content: {
          preGame: { formFields: ["oops", { type: "email", required: true }] },
        },
        gameAssets: { wheel: { slices: [{ color: "#7C3AED" }, {}] } },
      },
      "lucky_wheel",
    );
    const defaults = createDefaultExperience({ gameType: "lucky_wheel" });
    const fields = Object.fromEntries(
      (config?.form.fields ?? []).map((field) => [field.key, field]),
    );
    expect(fields.email).toMatchObject({
      enabled: true,
      required: true,
      label: defaults.form.fields[2].label, // no legacy label: default one
    });
    expect(fields.phone).toEqual(defaults.form.fields[1]);
    expect(fields.fullName.enabled).toBe(false);
    expect(config?.game.wheel?.segments.map((s) => s.label)).toEqual([{}, {}]);
    const noSlices = importLegacyPlayerScreenConfig(
      { content: {}, gameAssets: { wheel: {} } },
      "lucky_wheel",
    );
    expect(noSlices?.game.wheel?.segments.length).toBeGreaterThanOrEqual(4);
  });

  it("returns null without theme and content, whatever uiProject holds", () => {
    expect(
      importLegacyPlayerScreenConfig({ uiProject: { pages: [] } }, "quiz"),
    ).toBeNull();
    expect(importLegacyPlayerScreenConfig({}, "quiz")).toBeNull();
    for (const legacy of [null, undefined, "legacy", 3, []]) {
      expect(importLegacyPlayerScreenConfig(legacy, "quiz")).toBeNull();
    }
  });
});
