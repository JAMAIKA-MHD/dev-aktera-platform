import { describe, expect, it } from "vitest";
import type { CampaignQuizQuestion, CampaignSnapshot } from "./campaign";
import { createDefaultExperience } from "./defaults";
import {
  quizSourceHash,
  resolvePrizeDisplay,
  resolveQuizQuestion,
} from "./display";
import type { ExperienceConfig } from "./types";

const campaign: CampaignSnapshot = {
  id: "campaign-1",
  name: "Summer campaign",
  gameType: "quiz",
  status: "active",
  prizes: [
    { id: "prize-1", name: "Bon d'achat", winMessage: "Présentez ce code." },
    { id: "prize-2", name: "Casque", winMessage: null },
  ],
  quiz: [],
  rules: {},
};

const question: CampaignQuizQuestion = {
  id: "q-1",
  text: "Quelle est la capitale de l'Algérie ?",
  options: ["Oran", "Alger", "Constantine"],
};

function configWith(
  change: (config: ExperienceConfig) => void,
): ExperienceConfig {
  const config = createDefaultExperience({ gameType: "quiz", campaign });
  change(config);
  return config;
}

describe("resolvePrizeDisplay", () => {
  it("falls back to the campaign name and message", () => {
    const config = configWith(() => {});
    expect(resolvePrizeDisplay("prize-1", config, campaign, "ar")).toEqual({
      label: "Bon d'achat",
      winMessage: "Présentez ce code.",
      icon: null,
      image: null,
    });
    expect(
      resolvePrizeDisplay("prize-2", config, campaign, "fr").winMessage,
    ).toBeNull();
  });

  it("uses the brand's display in the player language", () => {
    const config = configWith((c) => {
      c.prizeDisplay["prize-1"] = {
        label: { fr: "Bon de 2000 DA", ar: "قسيمة 2000 دج" },
        winMessage: { fr: "Bravo !" },
        icon: "ticket",
        image: { kind: "remote", url: "https://example.com/voucher.png" },
      };
    });
    expect(resolvePrizeDisplay("prize-1", config, campaign, "ar")).toEqual({
      label: "قسيمة 2000 دج",
      winMessage: "Bravo !", // missing in Arabic: default language of the configuration
      icon: "ticket",
      image: { kind: "remote", url: "https://example.com/voucher.png" },
    });
  });

  it("returns an empty label for a prize unknown everywhere", () => {
    const config = configWith(() => {});
    expect(resolvePrizeDisplay("ghost", config, campaign, "fr")).toEqual({
      label: "",
      winMessage: null,
      icon: null,
      image: null,
    });
  });
});

describe("quizSourceHash", () => {
  it("is stable and changes with the text or the options", () => {
    const hash = quizSourceHash(question);
    expect(hash).toMatch(/^[0-9a-f]{8}$/);
    expect(quizSourceHash({ ...question })).toBe(hash);
    expect(quizSourceHash({ ...question, text: "Autre question ?" })).not.toBe(
      hash,
    );
    expect(
      quizSourceHash({ ...question, options: ["Oran", "Alger", "Annaba"] }),
    ).not.toBe(hash);
    expect(
      quizSourceHash({
        ...question,
        options: ["Alger", "Oran", "Constantine"],
      }),
    ).not.toBe(hash);
  });
});

describe("resolveQuizQuestion", () => {
  const translated = (sourceHash: string) =>
    configWith((c) => {
      c.game.quiz = {
        translations: {
          "q-1": {
            sourceHash,
            text: { ar: "ما هي عاصمة الجزائر؟", en: "What is the capital?" },
            options: [{ ar: "وهران" }, { ar: "الجزائر" }, {}],
          },
        },
      };
    });

  it("shows the database text when there is no translation", () => {
    expect(
      resolveQuizQuestion(
        question,
        configWith(() => {}),
        "ar",
      ),
    ).toEqual({
      text: question.text,
      options: question.options,
      outdated: false,
    });
  });

  it("uses an up-to-date translation, option by option, in the same order", () => {
    const config = translated(quizSourceHash(question));
    expect(resolveQuizQuestion(question, config, "ar")).toEqual({
      text: "ما هي عاصمة الجزائر؟",
      options: ["وهران", "الجزائر", "Constantine"],
      outdated: false,
    });
  });

  it("shows the database text, never another language, when the locale is not translated", () => {
    const config = translated(quizSourceHash(question));
    expect(resolveQuizQuestion(question, config, "fr")).toEqual({
      text: question.text,
      options: question.options,
      outdated: false,
    });
    expect(resolveQuizQuestion(question, config, "en").options).toEqual(
      question.options,
    );
  });

  it("ignores and flags a translation made for an older question", () => {
    const config = translated("0badcafe");
    expect(resolveQuizQuestion(question, config, "ar")).toEqual({
      text: question.text,
      options: question.options,
      outdated: true,
    });
  });

  it("returns a copy of the options", () => {
    const result = resolveQuizQuestion(
      question,
      configWith(() => {}),
      "fr",
    );
    result.options[0] = "Changed";
    expect(question.options[0]).toBe("Oran");
  });
});
