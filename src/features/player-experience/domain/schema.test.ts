import { describe, expect, it } from "vitest";
import { createDefaultExperience } from "./defaults";
import type { GameType } from "./gameTypes";
import { experienceConfigSchema, parseExperienceConfig } from "./schema";
import type { ExperienceConfig } from "./types";

const GAME_TYPES: GameType[] = [
  "lucky_wheel",
  "quiz",
  "scratch_card",
  "mystery_box",
  "hit_it",
];

const validConfig = (): ExperienceConfig =>
  createDefaultExperience({ gameType: "lucky_wheel", brandName: "Zeta" });

// Deep copy that can be broken on purpose without touching the original.
const broken = (mutate: (raw: Record<string, any>) => void): unknown => {
  const raw = JSON.parse(JSON.stringify(validConfig()));
  mutate(raw);
  return raw;
};

const isValid = (value: unknown) =>
  experienceConfigSchema.safeParse(value).success;

describe("experienceConfigSchema", () => {
  it("accepts the default configuration of every game", () => {
    for (const gameType of GAME_TYPES) {
      expect(isValid(createDefaultExperience({ gameType }))).toBe(true);
    }
  });

  it.each([
    [
      "a color that is not #rrggbb",
      (r: any) => (r.theme.colors.primary = "red"),
    ],
    [
      "an overlay above 1",
      (r: any) => (r.theme.background.overlayOpacity = 1.5),
    ],
    [
      "5 prize chips",
      (r: any) =>
        (r.sections.prizeChips.items = Array(5).fill(
          r.sections.prizeChips.items[0],
        )),
    ],
    ["no prize chip", (r: any) => (r.sections.prizeChips.items = [])],
    [
      "1 wheel segment",
      (r: any) => (r.game.wheel.segments = r.game.wheel.segments.slice(0, 1)),
    ],
    [
      "13 wheel segments",
      (r: any) =>
        (r.game.wheel.segments = Array(13).fill(r.game.wheel.segments[0])),
    ],
    [
      "an empty policy version",
      (r: any) => (r.form.consent.policyVersion = ""),
    ],
    [
      "a javascript: link",
      (r: any) =>
        (r.legal.links = [
          { id: "l", kind: "url", label: {}, url: "javascript:alert(1)" },
        ]),
    ],
    [
      "an http: link",
      (r: any) =>
        (r.legal.links = [
          { id: "l", kind: "url", label: {}, url: "http://example.com" },
        ]),
    ],
    [
      "an http: remote image",
      (r: any) =>
        (r.brand.logo = { kind: "remote", url: "http://example.com/logo.png" }),
    ],
    [
      "a data URL that is not an image",
      (r: any) =>
        (r.brand.logo = { kind: "dataUrl", url: "data:text/html,<script>" }),
    ],
    [
      "a default locale that is not enabled",
      (r: any) => (r.locales = { default: "ar", enabled: ["fr"] }),
    ],
    [
      "a locale enabled twice",
      (r: any) => (r.locales = { default: "fr", enabled: ["fr", "fr"] }),
    ],
    [
      "no phone field",
      (r: any) =>
        (r.form.fields = r.form.fields.filter((f: any) => f.key !== "phone")),
    ],
    [
      "an optional phone field",
      (r: any) =>
        (r.form.fields.find((f: any) => f.key === "phone").required = false),
    ],
    [
      "a duplicated form field",
      (r: any) => r.form.fields.push(r.form.fields[0]),
    ],
    ["a wheel game without wheel settings", (r: any) => delete r.game.wheel],
    ["the share bonus switched on", (r: any) => (r.features.shareBonus = true)],
    ["an unknown schema version", (r: any) => (r.schemaVersion = 2)],
    [
      "an icon outside the registry",
      (r: any) => (r.game.wheel.segments[0].icon = "rocket"),
    ],
  ])("rejects %s", (_label, mutate) => {
    expect(isValid(broken(mutate))).toBe(false);
  });

  it.each([
    ["https:", "https://example.com/terms"],
    ["mailto:", "mailto:support@example.com"],
    ["tel:", "tel:+213555123456"],
  ])("accepts %s links", (_label, url) => {
    expect(
      isValid(
        broken(
          (r) => (r.legal.links = [{ id: "l", kind: "url", label: {}, url }]),
        ),
      ),
    ).toBe(true);
  });
});

describe("parseExperienceConfig", () => {
  it("returns a valid configuration unchanged", () => {
    const config = validConfig();
    const result = parseExperienceConfig(config);
    expect(result).toEqual({ config, issues: [], recovered: false });
  });

  it("drops unknown keys without calling it a recovery", () => {
    const result = parseExperienceConfig(broken((r) => (r.legacyField = 1)));
    expect(result.recovered).toBe(false);
    expect(result.config).not.toHaveProperty("legacyField");
  });

  it("repairs a missing field and keeps its valid neighbours", () => {
    const raw = broken((r) => {
      delete r.theme.radius;
      r.theme.colors.primary = "#123456";
    });
    const result = parseExperienceConfig(raw);
    expect(result.recovered).toBe(true);
    expect(
      result.issues.some((issue) => issue.startsWith("theme.radius:")),
    ).toBe(true);
    expect(result.config.theme.radius).toBe("pill");
    expect(result.config.theme.colors.primary).toBe("#123456");
  });

  it("replaces an invalid color by the default one, field by field", () => {
    const raw = broken((r) => {
      r.theme.colors.primary = "gold";
      r.theme.colors.accent = "#00FF00";
      r.brand.name = "Zeta Market";
    });
    const result = parseExperienceConfig(raw);
    expect(result.recovered).toBe(true);
    expect(result.issues).toEqual([
      "theme.colors.primary: Expected a #rrggbb color",
    ]);
    expect(result.config.theme.colors.primary).toBe("#F5BA41");
    expect(result.config.theme.colors.accent).toBe("#00FF00");
    expect(result.config.brand.name).toBe("Zeta Market");
  });

  it("falls back as a whole when an object rule fails", () => {
    const result = parseExperienceConfig(
      broken((r) => (r.locales = { default: "ar", enabled: ["fr"] })),
    );
    expect(result.recovered).toBe(true);
    expect(result.config.locales).toEqual({
      default: "fr",
      enabled: ["fr", "ar", "en"],
    });
  });

  it("keeps the valid entries of a record and drops the others", () => {
    const raw = broken((r) => {
      r.prizeDisplay = {
        good: {
          label: { fr: "Panier" },
          winMessage: {},
          icon: null,
          image: null,
        },
        bad: { label: "not a localized text" },
      };
    });
    const result = parseExperienceConfig(raw);
    expect(Object.keys(result.config.prizeDisplay)).toEqual(["good"]);
  });

  it.each([
    ["a string", "hello"],
    ["a number", 42],
    ["null", null],
    ["an array", [1, 2, 3]],
    ["an unrelated object", { foo: "bar" }],
    ["undefined", undefined],
  ])("turns %s into a valid default configuration", (_label, raw) => {
    const result = parseExperienceConfig(raw);
    expect(result.recovered).toBe(true);
    expect(result.issues.length).toBeGreaterThan(0);
    expect(isValid(result.config)).toBe(true);
  });

  it("builds the fallback for the requested game type", () => {
    const result = parseExperienceConfig("garbage", "quiz");
    expect(result.config.game.type).toBe("quiz");
    expect(result.config.game.quiz).toEqual({ translations: {} });
  });

  it("keeps the game type found in the input when none is requested", () => {
    const raw = broken((r) => {
      r.game = { type: "hit_it", teaser: { mode: "static", caption: null } };
    });
    expect(parseExperienceConfig(raw).config.game.type).toBe("hit_it");
  });

  it("repairs inside an optional game block", () => {
    const raw = broken((r) => {
      r.game.wheel.hubLabel = "not a localized text";
      r.game.wheel.segments[0].label = { fr: "5000 DA" };
    });
    const result = parseExperienceConfig(raw);
    expect(result.recovered).toBe(true);
    expect(result.config.game.wheel?.hubLabel).toEqual({});
    expect(result.config.game.wheel?.segments[0].label).toEqual({
      fr: "5000 DA",
    });
  });

  it("ignores an unknown game type found in the input", () => {
    const raw = broken((r) => (r.game.type = "bingo"));
    expect(parseExperienceConfig(raw).config.game.type).toBe("lucky_wheel");
  });

  it("never throws, even when reading the input fails", () => {
    const hostile = {};
    Object.defineProperty(hostile, "theme", {
      enumerable: true,
      get() {
        throw new Error("boom");
      },
    });
    const result = parseExperienceConfig(hostile);
    expect(result.recovered).toBe(true);
    expect(isValid(result.config)).toBe(true);
  });
});
