import type { CampaignQuizQuestion, CampaignSnapshot } from "./campaign";
import {
  hasText,
  resolveText,
  type Locale,
  type LocalizedText,
} from "./locale";
import type { AssetRef, ExperienceConfig, IconName } from "./types";

// What the player sees for a prize or a quiz question: the brand's display settings first,
// then the campaign data. Pure functions, shared by the runtime and the Studio.

export interface ResolvedPrizeDisplay {
  label: string;
  winMessage: string | null;
  icon: IconName | null;
  image: AssetRef;
}

export function resolvePrizeDisplay(
  prizeId: string,
  config: ExperienceConfig,
  campaign: CampaignSnapshot,
  locale: Locale,
): ResolvedPrizeDisplay {
  const display = config.prizeDisplay[prizeId];
  const prize = campaign.prizes.find((candidate) => candidate.id === prizeId);
  const fallback = config.locales.default;
  return {
    label: resolveText(display?.label, locale, fallback) || prize?.name || "",
    winMessage:
      resolveText(display?.winMessage, locale, fallback) ||
      prize?.winMessage ||
      null,
    icon: display?.icon ?? null,
    image: display?.image ?? null,
  };
}

// Fingerprint of a question's source text and options (FNV-1a, 32 bits).
// Stored with each translation: when the Wizard changes the question, the hash no longer
// matches and the translation is flagged as outdated instead of showing a wrong text.
export function quizSourceHash(
  question: Pick<CampaignQuizQuestion, "text" | "options">,
): string {
  const source = JSON.stringify([question.text, question.options]);
  let hash = 0x811c9dc5;
  for (let index = 0; index < source.length; index++) {
    hash ^= source.charCodeAt(index);
    hash = Math.imul(hash, 0x01000193);
  }
  return (hash >>> 0).toString(16).padStart(8, "0");
}

export interface ResolvedQuizQuestion {
  text: string;
  options: string[]; // always the database order: the answer sent is an index into this list
  outdated: boolean; // a translation exists but was made for an older version of the question
}

export function resolveQuizQuestion(
  question: CampaignQuizQuestion,
  config: ExperienceConfig,
  locale: Locale,
): ResolvedQuizQuestion {
  const source = { text: question.text, options: [...question.options] };
  const translation = config.game.quiz?.translations[question.id];
  if (!translation) return { ...source, outdated: false };
  if (translation.sourceHash !== quizSourceHash(question)) {
    return { ...source, outdated: true };
  }
  // No fallback chain here: a missing translation shows the database text, never another language.
  const translated = (text: LocalizedText | undefined, base: string) =>
    hasText(text, locale) ? resolveText(text, locale) : base;
  return {
    text: translated(translation.text, question.text),
    options: question.options.map((option, index) =>
      translated(translation.options[index], option),
    ),
    outdated: false,
  };
}
