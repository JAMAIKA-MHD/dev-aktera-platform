import { DEFAULT_RULES, type CampaignSnapshot } from "../../domain/campaign";
import { resolveText, type Locale } from "../../domain/locale";
import type { ExperienceConfig } from "../../domain/types";
import {
  QUIZ_TIMER_CAPTION,
  TEASER_CAPTIONS,
} from "../../presets/contentDefaults";

// Caption of the pregame teaser (plan §8.7). The automatic one is computed from the public
// rules of the campaign, in the player's language: it describes the game and never promises
// a win. T5.1 moves it into the game registry (autoCaption of each entry).

// Replaces {name} by its value; a placeholder without a value stays visible, never "undefined".
export const fillCaption = (template: string, values: Record<string, number>) =>
  template.replace(/\{(\w+)\}/g, (placeholder, key: string) =>
    key in values ? String(values[key]) : placeholder,
  );

export function autoCaption(
  campaign: Pick<CampaignSnapshot, "gameType" | "prizes" | "quiz" | "rules">,
  locale: Locale,
  fallback?: Locale,
): string {
  const text = (value: Parameters<typeof resolveText>[0]) =>
    resolveText(value, locale, fallback);
  const template = text(TEASER_CAPTIONS[campaign.gameType]);
  switch (campaign.gameType) {
    case "lucky_wheel":
      return fillCaption(template, { count: campaign.prizes.length });
    case "quiz": {
      const { secondsPerQuestion } = campaign.rules.quiz ?? DEFAULT_RULES.quiz;
      const count = fillCaption(template, { count: campaign.quiz.length });
      return secondsPerQuestion > 0
        ? count +
            fillCaption(text(QUIZ_TIMER_CAPTION), {
              seconds: secondsPerQuestion,
            })
        : count;
    }
    case "hit_it": {
      const { winThreshold, durationSeconds } =
        campaign.rules.hitIt ?? DEFAULT_RULES.hitIt;
      return fillCaption(template, {
        threshold: winThreshold,
        duration: durationSeconds,
      });
    }
    default:
      return template;
  }
}

// The caption shown: the brand's own (game.teaser.caption) when it has a text, otherwise
// the automatic one.
export function teaserCaption(
  config: ExperienceConfig,
  campaign: Pick<CampaignSnapshot, "gameType" | "prizes" | "quiz" | "rules">,
  locale: Locale,
): string {
  const fallback = config.locales.default;
  const custom = resolveText(
    config.game.teaser.caption ?? undefined,
    locale,
    fallback,
  );
  return custom || autoCaption(campaign, locale, fallback);
}
