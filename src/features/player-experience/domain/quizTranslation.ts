import type { CampaignQuizQuestion } from "./campaign";
import { quizSourceHash } from "./display";
import { hasText, type Locale, type LocalizedText } from "./locale";
import type { QuizQuestionTranslation } from "./types";

// Translations of the campaign's quiz questions (plan §6.6, tasks.md T6.11). The database
// holds each question once, in one language; the brand adds the other languages here. A
// translation only ever carries texts: the answer sent is an index into the database options
// (B10), so translating can never change which answer is right.

export type TranslationState =
  "missing" | "partial" | "translated" | "outdated";

// The fingerprint stored with a translation: the text and options it was written from.
export function hashQuestionSource(
  text: string,
  options: readonly string[],
): string {
  return quizSourceHash({ text, options: [...options] });
}

const sourceHashOf = (question: CampaignQuizQuestion) =>
  hashQuestionSource(question.text, question.options);

// Made for another version of the question (edited in the Wizard): the runtime shows the
// database text until the brand reviews it.
export function isOutdated(
  question: CampaignQuizQuestion,
  translation: QuizQuestionTranslation | undefined,
): boolean {
  return (
    translation !== undefined &&
    (translation.sourceHash !== sourceHashOf(question) ||
      translation.options.length !== question.options.length)
  );
}

export function translationState(
  question: CampaignQuizQuestion,
  translation: QuizQuestionTranslation | undefined,
  locale: Locale,
): TranslationState {
  if (isOutdated(question, translation)) return "outdated";
  if (!translation) return "missing";
  const parts = [translation.text, ...translation.options];
  const filled = parts.filter((part) => hasText(part, locale)).length;
  if (filled === 0) return "missing";
  return filled === parts.length ? "translated" : "partial";
}

// "3/3 questions translated in Arabic".
export function countTranslated(
  questions: readonly CampaignQuizQuestion[],
  translations: Readonly<Record<string, QuizQuestionTranslation>>,
  locale: Locale,
): number {
  return questions.filter(
    (question) =>
      translationState(question, translations[question.id], locale) ===
      "translated",
  ).length;
}

const isEmpty = (text: LocalizedText) =>
  Object.values(text).every((value) => !value || value.trim() === "");

// A translation edited by the brand. It is stamped with the current source, except while it
// is outdated: then only "Mark as reviewed" may declare it up to date. The options always
// keep the count and order of the database. Emptied entirely, it is removed (null).
export function editTranslation(
  question: CampaignQuizQuestion,
  current: QuizQuestionTranslation | undefined,
  patch: {
    text?: LocalizedText;
    option?: { index: number; text: LocalizedText };
  },
): QuizQuestionTranslation | null {
  const outdated = isOutdated(question, current);
  const options = question.options.map(
    (_, index) => current?.options[index] ?? {},
  );
  if (patch.option) options[patch.option.index] = patch.option.text;
  const next: QuizQuestionTranslation = {
    sourceHash:
      outdated && current ? current.sourceHash : sourceHashOf(question),
    text: patch.text ?? current?.text ?? {},
    options: outdated && current ? padOptions(current, patch) : options,
  };
  return isEmpty(next.text) && next.options.every(isEmpty) ? null : next;
}

// An outdated translation keeps its own option list (it may not match the new count) until
// it is reviewed; an edit still lands on the option asked for.
function padOptions(
  current: QuizQuestionTranslation,
  patch: { option?: { index: number; text: LocalizedText } },
): LocalizedText[] {
  const options = [...current.options];
  if (patch.option) {
    while (options.length <= patch.option.index) options.push({});
    options[patch.option.index] = patch.option.text;
  }
  return options;
}

// "Mark as reviewed": the brand has checked the translation against the new source.
export function markReviewed(
  question: CampaignQuizQuestion,
  current: QuizQuestionTranslation,
): QuizQuestionTranslation {
  return {
    sourceHash: sourceHashOf(question),
    text: current.text,
    options: question.options.map((_, index) => current.options[index] ?? {}),
  };
}
