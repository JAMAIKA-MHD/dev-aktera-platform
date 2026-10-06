import { describe, expect, it } from "vitest";
import type { CampaignQuizQuestion } from "./campaign";
import { quizSourceHash, resolveQuizQuestion } from "./display";
import { createDefaultExperience } from "./defaults";
import {
  countTranslated,
  editTranslation,
  hashQuestionSource,
  isOutdated,
  markReviewed,
  translationState,
} from "./quizTranslation";

const question: CampaignQuizQuestion = {
  id: "q1",
  text: "Quelle est la capitale de l'Algérie ?",
  options: ["Oran", "Alger", "Constantine"],
};

describe("quiz translations", () => {
  it("stamps a translation with the source it was written from", () => {
    expect(hashQuestionSource(question.text, question.options)).toBe(
      quizSourceHash(question),
    );
    const translation = editTranslation(question, undefined, {
      text: { ar: "ما هي عاصمة الجزائر؟" },
    })!;
    expect(translation.sourceHash).toBe(quizSourceHash(question));
    // One entry per database option, in the database order, never more nor less.
    expect(translation.options).toEqual([{}, {}, {}]);
  });

  it("tells missing, partial and complete translations apart, per language", () => {
    let translation = editTranslation(question, undefined, {
      text: { ar: "ما هي عاصمة الجزائر؟" },
    })!;
    expect(translationState(question, translation, "ar")).toBe("partial");
    expect(translationState(question, translation, "en")).toBe("missing");
    ["وهران", "الجزائر", "قسنطينة"].forEach((ar, index) => {
      translation = editTranslation(question, translation, {
        option: { index, text: { ar } },
      })!;
    });
    expect(translationState(question, translation, "ar")).toBe("translated");
    expect(countTranslated([question], { q1: translation }, "ar")).toBe(1);
    expect(countTranslated([question], { q1: translation }, "en")).toBe(0);
  });

  it("never changes the answer: the options keep the database order", () => {
    const translation = editTranslation(question, undefined, {
      option: { index: 1, text: { ar: "الجزائر" } },
    })!;
    const config = createDefaultExperience({ gameType: "quiz" });
    config.game.quiz = { translations: { q1: translation } };
    const shown = resolveQuizQuestion(question, config, "ar");
    // Index 1 is still "Alger" in every language: the answer sent stays 1.
    expect(shown.options[1]).toBe("الجزائر");
    expect(shown.options[0]).toBe("Oran");
  });

  it("marks a translation outdated when the Wizard changes the question", () => {
    const translation = editTranslation(question, undefined, {
      text: { ar: "ما هي عاصمة الجزائر؟" },
    })!;
    const edited = { ...question, text: "Quelle est la capitale ?" };
    expect(isOutdated(edited, translation)).toBe(true);
    expect(translationState(edited, translation, "ar")).toBe("outdated");
    const fewer = { ...question, options: ["Oran", "Alger"] };
    expect(isOutdated(fewer, translation)).toBe(true);

    // Editing does not silently clear the flag; reviewing does.
    const retouched = editTranslation(edited, translation, {
      text: { ar: "ما هي العاصمة؟" },
    })!;
    expect(isOutdated(edited, retouched)).toBe(true);
    const reviewed = markReviewed(fewer, retouched);
    expect(isOutdated(fewer, reviewed)).toBe(false);
    expect(reviewed.options).toHaveLength(2);
  });

  it("removes a translation emptied in every language", () => {
    const translation = editTranslation(question, undefined, {
      text: { ar: "سؤال" },
    })!;
    expect(editTranslation(question, translation, { text: {} })).toBeNull();
  });
});
