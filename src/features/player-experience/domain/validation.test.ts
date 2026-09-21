import { describe, expect, it } from "vitest";
import { createDemoCampaign } from "../presets/demoCampaign";
import { THEME_PRESETS } from "../presets/themePresets";
import type { CampaignSnapshot } from "./campaign";
import {
  contrastRatio,
  ctaTextColor,
  mostReadable,
  relativeLuminance,
} from "./contrast";
import { createDefaultExperience } from "./defaults";
import { quizSourceHash } from "./display";
import type { GameType } from "./gameTypes";
import type { ExperienceConfig, QuizQuestionTranslation } from "./types";
import {
  estimateDataUrlBytes,
  estimateLines,
  hasBlockingIssues,
  validateExperience,
  type DesignIssue,
} from "./validation";

const GAME_TYPES: GameType[] = [
  "lucky_wheel",
  "quiz",
  "scratch_card",
  "mystery_box",
  "hit_it",
];

const campaign = (
  gameType: GameType,
  changes: Partial<CampaignSnapshot> = {},
): CampaignSnapshot => ({ ...createDemoCampaign(gameType), ...changes });

function configFor(
  gameType: GameType,
  change: (config: ExperienceConfig) => void = () => {},
  source: CampaignSnapshot = campaign(gameType),
): ExperienceConfig {
  const config = createDefaultExperience({ gameType, campaign: source });
  change(config);
  return config;
}

const ids = (issues: DesignIssue[]) => issues.map((issue) => issue.id);
const find = (issues: DesignIssue[], id: string) =>
  issues.find((issue) => issue.id === id);

describe("contrastRatio", () => {
  it("gives 21 for white on black, whatever the order", () => {
    expect(contrastRatio("#FFFFFF", "#000000")).toBe(21);
    expect(contrastRatio("#000000", "#FFFFFF")).toBe(21);
    expect(contrastRatio("#F5BA41", "#F5BA41")).toBe(1);
  });

  it("never rounds a failing ratio up to 4.5", () => {
    expect(contrastRatio("#767676", "#FFFFFF")).toBe(4.54); // WCAG AA limit grey
    expect(contrastRatio("#777777", "#FFFFFF")).toBeLessThan(4.5);
    expect(contrastRatio("#098766", "#FFFFFF")).toBe(4.49); // 4.4977: rounding would pass it
  });

  it("reads #rgb colors, and returns NaN for anything else", () => {
    expect(contrastRatio("#fff", "#000")).toBe(21);
    expect(relativeLuminance("#FFFFFF")).toBe(1);
    expect(contrastRatio("white", "#000000")).toBeNaN();
    expect(relativeLuminance("#12")).toBeNaN();
  });

  it("picks the most readable text color for the button", () => {
    expect(mostReadable("#F5BA41", ["#FFFFFF", "#0A1120"])).toBe("#0A1120");
    expect(mostReadable("#7C3AED", ["#FFFFFF", "#0F172A"])).toBe("#FFFFFF");
    const midnight = configFor("quiz").theme;
    expect(ctaTextColor(midnight)).toBe(midnight.colors.surface);
  });
});

describe("estimateLines", () => {
  it("wraps words greedily, and breaks words longer than a line", () => {
    expect(estimateLines("Tournez la roue et tentez votre chance", 22)).toBe(2);
    expect(estimateLines("Court", 22)).toBe(1);
    expect(
      estimateLines("a b c d e f g h i j k l m n o p q r s t u v w", 22),
    ).toBe(3);
    expect(estimateLines("x".repeat(50), 22)).toBe(3);
  });
});

describe("validateExperience: default configurations", () => {
  it("has no error for any style and any game, with its demo campaign", () => {
    for (const preset of THEME_PRESETS) {
      for (const gameType of GAME_TYPES) {
        const config = createDefaultExperience({
          gameType,
          campaign: campaign(gameType),
          presetId: preset.id,
        });
        const issues = validateExperience(config, campaign(gameType));
        expect(
          issues.filter((issue) => issue.level === "error"),
          `${preset.id} / ${gameType}`,
        ).toEqual([]);
      }
    }
  });

  it("only asks to translate the demo questions", () => {
    for (const gameType of GAME_TYPES) {
      const issues = validateExperience(
        configFor(gameType),
        campaign(gameType),
      );
      const expected =
        gameType === "quiz"
          ? createDemoCampaign("quiz").quiz.map(
              (question) => `quiz-translation-missing:${question.id}`,
            )
          : [];
      expect(ids(issues), gameType).toEqual(expected);
    }
  });

  it("also works without a campaign", () => {
    expect(validateExperience(configFor("lucky_wheel"))).toEqual([]);
  });
});

describe("validateExperience: contrast", () => {
  it("refuses text that does not stand out from the background", () => {
    const issues = validateExperience(
      configFor("quiz", (c) => (c.theme.colors.text = "#1E293B")),
    );
    expect(find(issues, "contrast-text")).toMatchObject({
      level: "error",
      path: "theme.colors.text",
    });
  });

  it("refuses a primary color on which no button text is readable", () => {
    // The prototype's Obsidian Violet: white text, #0F172A background, 4.23:1 at best.
    const issues = validateExperience(
      configFor("quiz", (c) => {
        c.theme.colors.primary = "#8B5CF6";
        c.theme.colors.surface = "#0F172A";
      }),
    );
    expect(find(issues, "contrast-cta")).toMatchObject({
      level: "error",
      path: "theme.colors.primary",
    });
    expect(find(issues, "contrast-cta")?.message).toContain("4.23:1");
  });

  it("treats an invalid color as unreadable", () => {
    const issues = validateExperience(
      configFor("quiz", (c) => (c.theme.colors.surface = "navy")),
    );
    expect(ids(issues)).toContain("contrast-text");
  });
});

describe("validateExperience: consent and legal links", () => {
  it("blocks an empty consent text", () => {
    const issues = validateExperience(
      configFor("quiz", (c) => (c.form.consent.text = { fr: "  " })),
    );
    expect(find(issues, "consent-empty")).toMatchObject({
      level: "error",
      path: "form.consent.text",
    });
    expect(hasBlockingIssues(issues)).toBe(true);
  });

  it("only warns about a consent text missing in one language", () => {
    const issues = validateExperience(
      configFor("quiz", (c) => delete c.form.consent.text.ar),
    );
    expect(ids(issues)).toContain("missing-translation:form.consent.text");
    expect(hasBlockingIssues(issues)).toBe(false);
  });

  it("refuses links without label, with an unsafe address or without address", () => {
    const issues = validateExperience(
      configFor("quiz", (c) => {
        c.legal.links = [
          { id: "a", kind: "terms", label: {} },
          {
            id: "b",
            kind: "privacy",
            label: { fr: "Vie privée" },
            url: "http://x.dz",
          },
          { id: "c", kind: "url", label: { fr: "Site" } },
          {
            id: "d",
            kind: "support",
            label: { fr: "Aide" },
            url: "mailto:aide@x.dz",
          },
        ];
        c.locales.enabled = ["fr"];
      }),
    );
    expect(ids(issues)).toEqual([
      "link-label:0",
      "link-url:1",
      "link-url-missing:2",
    ]);
    expect(find(issues, "link-url:1")?.path).toBe("legal.links.1.url");
  });
});

describe("validateExperience: texts", () => {
  it("warns about a title too long, in each language concerned", () => {
    const issues = validateExperience(
      configFor("quiz", (c) => {
        c.screens.welcome.title.fr =
          "Participez à notre grand jeu de la rentrée et tentez de gagner un lot";
        c.screens.welcome.title.en =
          "Play our great autumn game and maybe win a prize";
        delete c.screens.welcome.title.ar; // missing: never "too long"
      }),
    );
    const issue = find(issues, "title-length:welcome");
    expect(issue).toMatchObject({
      level: "warning",
      path: "screens.welcome.title",
    });
    expect(issue?.message).toContain("fr, en"); // 69 characters; 48 but 3 lines
    expect(hasBlockingIssues(issues)).toBe(false);
  });

  it("warns about a text missing in an enabled language only", () => {
    const change = (c: ExperienceConfig) =>
      (c.screens.win.subtitle = { fr: "Bravo !" });
    const issue = find(
      validateExperience(configFor("quiz", change)),
      "missing-translation:screens.win.subtitle",
    );
    expect(issue?.message).toContain("ar, en");
    const frenchOnly = configFor("quiz", (c) => {
      change(c);
      c.locales.enabled = ["fr"];
    });
    expect(validateExperience(frenchOnly)).toEqual([]);
  });

  it("ignores the texts of hidden sections and fields", () => {
    const issues = validateExperience(
      configFor("quiz", (c) => {
        c.sections.jackpot.enabled = false;
        c.sections.prizeChips.enabled = false;
        c.sections.prizeChips.items[0].value = { fr: "Seulement en français" };
        c.sections.jackpot.title = { fr: "Seulement en français" };
        c.form.fields[2].label = { fr: "Email" }; // email is off by default
      }),
    );
    expect(issues).toEqual([]);
  });

  it("warns about a teaser caption or a text that promises a win", () => {
    const issues = validateExperience(
      configFor("quiz", (c) => {
        c.game.teaser.caption = {
          fr: "100 % gagnant",
          ar: "100 ٪",
          en: "100%",
        };
        c.screens.welcome.subtitle.fr =
          "Un cadeau garanti pour chaque joueur !";
        c.screens.lose.title.ar = "ربح مضمون";
      }),
    );
    expect(find(issues, "teaser-promise")).toMatchObject({
      level: "warning",
      path: "game.teaser.caption",
    });
    expect(ids(issues)).toContain("promise:screens.welcome.subtitle");
    expect(ids(issues)).toContain("promise:screens.lose.title");
  });
});

describe("validateExperience: wheel", () => {
  it("refuses a wheel with 3 segments", () => {
    const issues = validateExperience(
      configFor("lucky_wheel", (c) => {
        c.game.wheel!.segments = c.game.wheel!.segments.slice(0, 3);
      }),
    );
    expect(find(issues, "wheel-segment-count")).toMatchObject({
      level: "error",
      path: "game.wheel.segments",
    });
  });

  it("refuses segments that do not match the campaign prizes", () => {
    const source = campaign("lucky_wheel");
    const issues = validateExperience(
      configFor(
        "lucky_wheel",
        (c) => {
          c.game.wheel!.segments[0].prizeId = "deleted-prize";
        },
        source,
      ),
      source,
    );
    expect(find(issues, "wheel-segment-orphan:0")).toMatchObject({
      level: "error",
      path: "game.wheel.segments.0.prizeId",
    });
    // The prize that segment showed is now missing from the wheel.
    expect(
      find(issues, `wheel-prize-missing:${source.prizes[0].id}`),
    ).toMatchObject({ level: "error" });
  });

  it("warns about a segment label longer than 14 characters", () => {
    const issues = validateExperience(
      configFor("lucky_wheel", (c) => {
        c.game.wheel!.segments[4].label = {
          fr: "Pas de chance cette fois",
          ar: "للأسف",
          en: "Unlucky",
        };
      }),
    );
    expect(find(issues, "segment-label:4")).toMatchObject({
      level: "warning",
      path: "game.wheel.segments.4.label",
    });
  });

  it("accepts a losing segment without label, and names a prize without name by its id", () => {
    const source = campaign("lucky_wheel");
    source.prizes.push({ id: "new-prize", name: "", winMessage: null });
    const config = configFor("lucky_wheel", (c) => {
      c.game.wheel!.segments[4].label = {};
    });
    const issues = validateExperience(config, source);
    expect(ids(issues)).toEqual(["wheel-prize-missing:new-prize"]);
    expect(issues[0].message).toContain('"new-prize"');
  });

  it("measures the prize label shown on a segment without its own label", () => {
    const source = campaign("lucky_wheel");
    source.prizes[0].name = "Smartphone dernier modèle";
    const config = configFor("lucky_wheel", () => {}, source);
    expect(ids(validateExperience(config, source))).toContain(
      "segment-label:0",
    );
    // Without the campaign, only the brand's display label is known.
    config.prizeDisplay[source.prizes[1].id] = {
      label: { fr: "Casque audio sans fil" },
      winMessage: {},
      icon: null,
      image: null,
    };
    expect(ids(validateExperience(config))).toEqual([
      "missing-translation:prizeDisplay.demo-prize-headphones.label",
      "segment-label:1", // the default wheel is P P P P L: prize 2 is on segment 2
    ]);
  });

  it("does not check the wheel of another game", () => {
    const issues = validateExperience(
      configFor("quiz", (c) => {
        c.game.wheel = { segments: [], hubLabel: {} };
      }),
    );
    expect(ids(issues)).not.toContain("wheel-segment-count");
  });
});

describe("validateExperience: quiz", () => {
  const questions = createDemoCampaign("quiz").quiz;
  const [first] = questions;
  const translated = (): QuizQuestionTranslation => ({
    sourceHash: quizSourceHash(first),
    text: { ar: "ما هي عاصمة الجزائر؟", en: "What is the capital of Algeria?" },
    options: first.options.map((option) => ({ ar: option, en: option })),
  });

  it("refuses a quiz without any active question", () => {
    const source = campaign("quiz", { quiz: [] });
    const issues = validateExperience(
      configFor("quiz", () => {}, source),
      source,
    );
    expect(find(issues, "quiz-no-question")).toMatchObject({
      level: "error",
      path: "game.quiz",
    });
  });

  it("accepts a complete translation, and does not ask for the default language", () => {
    const source = campaign("quiz", { quiz: [first] });
    const config = configFor(
      "quiz",
      (c) => (c.game.quiz!.translations[first.id] = translated()),
      source,
    );
    expect(validateExperience(config, source)).toEqual([]);
  });

  it("warns about a question missing a language, or one of its options", () => {
    const source = campaign("quiz", { quiz: [first] });
    const config = configFor(
      "quiz",
      (c) => {
        const translation = translated();
        translation.options[2] = { ar: "قسنطينة" }; // English missing
        c.game.quiz!.translations[first.id] = translation;
      },
      source,
    );
    const issue = find(
      validateExperience(config, source),
      `quiz-translation-missing:${first.id}`,
    );
    expect(issue).toMatchObject({
      level: "warning",
      path: `game.quiz.translations.${first.id}`,
    });
    expect(issue?.message).toContain("into en:");
  });

  it("warns about an outdated translation", () => {
    const source = campaign("quiz", { quiz: [first] });
    for (const outdated of [
      { ...translated(), sourceHash: "0badcafe" },
      { ...translated(), options: translated().options.slice(0, 2) },
    ]) {
      const config = configFor(
        "quiz",
        (c) => (c.game.quiz!.translations[first.id] = outdated),
        source,
      );
      const issues = validateExperience(config, source);
      expect(ids(issues)).toEqual([`quiz-translation-outdated:${first.id}`]);
      expect(issues[0].level).toBe("warning");
    }
  });
});

describe("validateExperience: campaign links and images", () => {
  it("refuses settings made for another game", () => {
    const issues = validateExperience(configFor("quiz"), campaign("hit_it"));
    expect(find(issues, "game-type-mismatch")).toMatchObject({
      level: "error",
      path: "game.type",
    });
  });

  it("warns about display settings of a prize that no longer exists", () => {
    const source = campaign("mystery_box");
    const display = {
      label: {},
      winMessage: {},
      icon: "gift" as const,
      image: null,
    };
    const config = configFor("mystery_box", (c) => {
      c.prizeDisplay["old-prize"] = display;
      c.prizeDisplay[source.prizes[0].id] = display; // still in the campaign
    });
    const issues = validateExperience(config, source);
    expect(ids(issues)).toEqual(["prize-display-orphan:old-prize"]);
    expect(issues[0]).toMatchObject({
      level: "warning",
      path: "prizeDisplay.old-prize",
    });
  });

  it("warns about an uploaded image over 400 KB, and only then", () => {
    const image = (kilobytes: number) => ({
      kind: "dataUrl" as const,
      url: `data:image/webp;base64,${"A".repeat((kilobytes * 1024 * 4) / 3)}`,
    });
    const heavy = validateExperience(
      configFor("scratch_card", (c) => {
        c.theme.background.image = image(500);
        c.brand.logo = image(20);
        c.game.scratch!.coverImage = image(450);
      }),
    );
    expect(ids(heavy)).toEqual([
      "image-size:theme.background.image",
      "image-size:game.scratch.coverImage",
    ]);
    expect(heavy[0].message).toContain("500 KB");
    const remote = validateExperience(
      configFor("quiz", (c) => {
        c.brand.logo = {
          kind: "remote",
          url: "https://cdn.example.com/logo.png",
        };
      }),
    );
    expect(remote).toEqual([]);
  });
});

describe("estimateDataUrlBytes", () => {
  it("decodes the base64 length, padding included", () => {
    expect(estimateDataUrlBytes("data:image/png;base64,QUJD")).toBe(3);
    expect(estimateDataUrlBytes("data:image/png;base64,QUI=")).toBe(2);
    expect(estimateDataUrlBytes("data:image/png;base64,QQ==")).toBe(1);
    expect(estimateDataUrlBytes("data:image/svg+xml,<svg/>")).toBe(6);
  });
});

describe("validateExperience: list", () => {
  it("puts errors first, with unique ids", () => {
    const issues = validateExperience(
      configFor("lucky_wheel", (c) => {
        c.screens.welcome.subtitle = { fr: "Français seulement" };
        c.form.consent.text = {};
        c.game.wheel!.segments = c.game.wheel!.segments.slice(0, 2);
      }),
      campaign("lucky_wheel"),
    );
    const levels = issues.map((issue) => issue.level);
    expect(levels).toEqual([...levels].sort()); // "error" < "warning"
    expect(levels[0]).toBe("error");
    expect(levels.at(-1)).toBe("warning");
    expect(new Set(ids(issues)).size).toBe(issues.length);
  });
});
