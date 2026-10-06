import { describe, expect, it } from "vitest";
import { DEFAULT_SCREEN_CONTENT } from "../presets/contentDefaults";
import { DEMO_CAMPAIGN_ID, createDemoCampaign } from "../presets/demoCampaign";
import type { CampaignSnapshot } from "./campaign";
import {
  MAX_WHEEL_SEGMENTS,
  buildDefaultWheelSegments,
  createDefaultExperience,
} from "./defaults";
import type { GameType } from "./gameTypes";
import { parseExperienceConfig } from "./schema";

const GAME_TYPES: GameType[] = [
  "lucky_wheel",
  "quiz",
  "scratch_card",
  "mystery_box",
  "hit_it",
];

const prizes = (count: number): CampaignSnapshot["prizes"] =>
  Array.from({ length: count }, (_, index) => ({
    id: `prize-${index + 1}`,
    name: `Prize ${index + 1}`,
    winMessage: null,
  }));

const campaign = (gameType: GameType, prizeCount = 2): CampaignSnapshot => ({
  id: "campaign-1",
  name: "Summer campaign",
  gameType,
  status: "active",
  prizes: prizes(prizeCount),
  quiz: [],
  rules: {},
});

// "P" = prize segment, "L" = losing segment.
const shape = (count: number) =>
  buildDefaultWheelSegments(prizes(count))
    .segments.map((segment) => (segment.prizeId ? "P" : "L"))
    .join("");

describe("createDefaultExperience", () => {
  it.each(GAME_TYPES)(
    "builds a %s configuration that passes the schema without any issue",
    (gameType) => {
      for (const input of [
        { gameType },
        { gameType, campaign: campaign(gameType) },
        { gameType, campaign: campaign(gameType, 0), presetId: "clean-light" },
      ]) {
        const result = parseExperienceConfig(createDefaultExperience(input));
        expect(result.issues).toEqual([]);
        expect(result.recovered).toBe(false);
      }
    },
  );

  it("fills every screen with the texts of the game", () => {
    for (const gameType of GAME_TYPES) {
      const config = createDefaultExperience({ gameType });
      expect(config.screens).toEqual(DEFAULT_SCREEN_CONTENT[gameType]);
      expect(config.game.type).toBe(gameType);
    }
  });

  it("is ready to show: sections, form texts, consent and legal texts filled", () => {
    const config = createDefaultExperience({ gameType: "quiz" });
    expect(config.sections.jackpot.enabled).toBe(true);
    expect(config.sections.prizeChips.enabled).toBe(true);
    expect(config.sections.prizeChips.items).toHaveLength(3);
    for (const field of config.form.fields) {
      expect(field.label.fr).toBeTruthy();
      expect(field.placeholder.ar).toBeTruthy();
    }
    expect(config.form.consent.text.fr).toContain("18-07");
    expect(config.legal.links.map((link) => link.kind)).toEqual([
      "terms",
      "privacy",
      "support",
    ]);
    expect(config.legal.legalLine.en).toBeTruthy();
    expect(config.features.shareBonus).toBe(false);
  });

  it("gives every list item its own id", () => {
    const config = createDefaultExperience({ gameType: "lucky_wheel" });
    const ids = [
      config.id,
      ...config.sections.prizeChips.items.map((item) => item.id),
      ...config.legal.links.map((link) => link.id),
      ...(config.game.wheel?.segments ?? []).map((segment) => segment.id),
    ];
    expect(new Set(ids).size).toBe(ids.length);
    for (const id of ids) expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });

  it("uses the requested style, and the default one for an unknown id", () => {
    expect(
      createDefaultExperience({ gameType: "quiz", presetId: "retail-blue" })
        .theme.presetId,
    ).toBe("retail-blue");
    expect(
      createDefaultExperience({ gameType: "quiz", presetId: "nope" }).theme
        .presetId,
    ).toBe("midnight-gold");
  });

  it("names the organizer in the brand, the legal block and the terms", () => {
    const config = createDefaultExperience({
      gameType: "quiz",
      brandName: "Zeta Market",
    });
    expect(config.brand.name).toBe("Zeta Market");
    expect(config.legal.organizerName).toBe("Zeta Market");
    expect(config.legal.termsBody.fr).toContain("Zeta Market");
  });

  it("links a real campaign and builds the wheel from its prizes", () => {
    const config = createDefaultExperience({
      gameType: "lucky_wheel",
      campaign: campaign("lucky_wheel", 3),
    });
    expect(config.campaignId).toBe("campaign-1");
    expect(config.game.wheel?.segments.map((s) => s.prizeId)).toEqual([
      "prize-1",
      "prize-2",
      "prize-3",
      null,
    ]);
  });

  it("uses the demo campaign when there is none, without linking it", () => {
    const config = createDefaultExperience({ gameType: "lucky_wheel" });
    const demo = createDemoCampaign("lucky_wheel");
    expect(config.campaignId).toBeNull();
    expect(
      config.game.wheel?.segments
        .filter((segment) => segment.prizeId)
        .map((segment) => segment.prizeId),
    ).toEqual(demo.prizes.map((prize) => prize.id));
  });

  it("lets a real campaign decide the game type", () => {
    const config = createDefaultExperience({
      gameType: "lucky_wheel",
      campaign: campaign("hit_it"),
    });
    expect(config.game.type).toBe("hit_it");
    expect(config.game.hitIt).toBeDefined();
    expect(config.screens.welcome).toEqual(
      DEFAULT_SCREEN_CONTENT.hit_it.welcome,
    );
  });

  it("leaves the teaser caption, prize displays and quiz translations to the campaign", () => {
    const config = createDefaultExperience({ gameType: "quiz" });
    expect(config.game.teaser).toEqual({ mode: "attract", caption: null });
    expect(config.prizeDisplay).toEqual({});
    expect(config.game.quiz).toEqual({ translations: {} });
  });

  it("shares no object with the presets", () => {
    const first = createDefaultExperience({ gameType: "quiz" });
    first.screens.welcome.title.fr = "Changed";
    first.form.consent.text.fr = "Changed";
    const second = createDefaultExperience({ gameType: "quiz" });
    expect(second.screens.welcome.title.fr).not.toBe("Changed");
    expect(second.form.consent.text.fr).not.toBe("Changed");
    expect(DEFAULT_SCREEN_CONTENT.quiz.welcome.title.fr).not.toBe("Changed");
  });
});

describe("buildDefaultWheelSegments", () => {
  it("always has 4 to 12 segments, at least one of them losing", () => {
    for (let count = 0; count <= 15; count++) {
      const { segments } = buildDefaultWheelSegments(prizes(count));
      expect(segments.length).toBeGreaterThanOrEqual(4);
      expect(segments.length).toBeLessThanOrEqual(MAX_WHEEL_SEGMENTS);
      expect(segments.some((segment) => segment.prizeId === null)).toBe(true);
    }
  });

  it("spreads the losing segments around the wheel", () => {
    expect(shape(0)).toBe("LLLL");
    expect(shape(1)).toBe("LPLL");
    expect(shape(2)).toBe("PLPL");
    expect(shape(3)).toBe("PPPL");
    expect(shape(5)).toBe("PPPPPL");
    expect(shape(11)).toBe("PPPPPPPPPPPL");
  });

  it("keeps the prize order and drops the prizes beyond 11", () => {
    const { segments } = buildDefaultWheelSegments(prizes(15));
    expect(segments.map((segment) => segment.prizeId)).toEqual([
      ...prizes(11).map((prize) => prize.id),
      null,
    ]);
  });

  it("varies the losing labels, and leaves prize labels to the prize display", () => {
    const { segments, hubLabel } = buildDefaultWheelSegments(prizes(0));
    expect(segments.map((segment) => segment.label.fr)).toEqual([
      "Dommage",
      "Presque !",
      "Pas cette fois",
      "Dommage",
    ]);
    const withPrize = buildDefaultWheelSegments(prizes(1)).segments[1];
    expect(withPrize.label).toEqual({});
    expect(hubLabel.fr).toBe("JOUER");
    for (const segment of segments) expect(segment.color).toBeNull();
  });
});

describe("createDemoCampaign", () => {
  it("offers 4 prizes and 3 questions, with default rules", () => {
    const demo = createDemoCampaign("quiz");
    expect(demo.id).toBe(DEMO_CAMPAIGN_ID);
    expect(demo.gameType).toBe("quiz");
    expect(demo.status).toBe("active");
    expect(demo.prizes).toHaveLength(4);
    expect(demo.quiz).toHaveLength(3);
    expect(demo.rules.quiz).toEqual({
      passThresholdPercent: 100,
      secondsPerQuestion: 0,
    });
  });

  it("returns a fresh copy every time", () => {
    const demo = createDemoCampaign("quiz");
    demo.prizes[0].name = "Changed";
    expect(createDemoCampaign("quiz").prizes[0].name).not.toBe("Changed");
  });
});
