import type { Campaign, PrizeTemplate } from "@/src/types";
import type { GameType } from "./gameTypes";

// What the runtime knows about a campaign. Never contains weights, stock, win probability,
// coupon codes or correct answers: those only reach the demo gateway, or stay on the server.

export type CampaignStatus = "active" | "paused" | "draft" | "archived";

export interface CampaignPrize {
  id: string;
  name: string;
  winMessage: string | null;
}

export interface CampaignQuizQuestion {
  id: string;
  text: string;
  options: string[]; // database order: answers are sent as indexes into this list
}

// Public game rules, safe to show to players ("8 hits in 10 s").
// Source: campaigns.game_logic_config, the same values the resolve_game_outcome RPC reads.
export interface QuizRules {
  passThresholdPercent: number;
  secondsPerQuestion: number; // 0 = no timer
}

export interface HitItRules {
  winThreshold: number;
  durationSeconds: number;
}

export interface CampaignRules {
  quiz?: QuizRules;
  hitIt?: HitItRules;
}

export interface CampaignSnapshot {
  id: string;
  name: string;
  gameType: GameType;
  status: CampaignStatus;
  prizes: CampaignPrize[];
  quiz: CampaignQuizQuestion[]; // sorted by position
  rules: CampaignRules;
}

// Same defaults as the resolve_game_outcome RPC when game_logic_config has no value.
// secondsPerQuestion and durationSeconds are not read by the RPC yet (plan §12.2).
export const DEFAULT_RULES: Readonly<Required<CampaignRules>> = {
  quiz: { passThresholdPercent: 100, secondsPerQuestion: 0 },
  hitIt: { winThreshold: 1, durationSeconds: 10 },
};

// Like the RPC, accepts numbers and numeric strings; anything else falls back to the default.
function readNumber(config: unknown, key: string, fallback: number): number {
  if (typeof config !== "object" || config === null) return fallback;
  const value: unknown = (config as Record<string, unknown>)[key];
  const parsed =
    typeof value === "number"
      ? value
      : typeof value === "string" && value.trim() !== ""
        ? Number(value)
        : Number.NaN;
  return Number.isFinite(parsed) ? parsed : fallback;
}

// The public game rules of a game_logic_config, whatever it comes from: the dashboard's
// Campaign (buildCampaignSnapshot) or the public read of /play/:slug (publicCampaign.ts).
export function rulesFromGameLogic(
  gameType: GameType,
  config: unknown,
): CampaignRules {
  if (gameType === "quiz") {
    const defaults = DEFAULT_RULES.quiz;
    return {
      quiz: {
        passThresholdPercent: readNumber(
          config,
          "pass_threshold_percentage",
          defaults.passThresholdPercent,
        ),
        secondsPerQuestion: readNumber(
          config,
          "quiz_seconds_per_question",
          defaults.secondsPerQuestion,
        ),
      },
    };
  }
  if (gameType === "hit_it") {
    const defaults = DEFAULT_RULES.hitIt;
    return {
      hitIt: {
        winThreshold: readNumber(
          config,
          "win_threshold",
          defaults.winThreshold,
        ),
        durationSeconds: readNumber(
          config,
          "hit_it_duration_seconds",
          defaults.durationSeconds,
        ),
      },
    };
  }
  return {};
}

// Reads the dashboard Campaign model (useCampaigns) without writing anything.
// Campaign prizes carry no name: the database copies it from the prize template, so it is
// looked up in the templates (usePrizeTemplates). win_message is not loaded by useCampaigns.
// Weights, quantities, win probability and correct answers are deliberately left out.
export function buildCampaignSnapshot(
  campaign: Campaign,
  prizeTemplates: readonly Pick<PrizeTemplate, "id" | "name">[] = [],
): CampaignSnapshot {
  const templateNames = new Map(
    prizeTemplates.map((template) => [template.id, template.name]),
  );
  const prizes: CampaignPrize[] = [];
  for (const prize of campaign.prizes) {
    // A prize not saved yet has no id: the server could never return it as a win.
    if (!prize.id) continue;
    prizes.push({
      id: prize.id,
      name: templateNames.get(prize.templateId) ?? "",
      winMessage: null,
    });
  }
  return {
    id: campaign.id,
    name: campaign.name,
    gameType: campaign.gameType,
    status: campaign.status,
    prizes,
    // useCampaigns already keeps active questions only, sorted by position.
    quiz: campaign.questions.map((question) => ({
      id: question.id,
      text: question.questionText,
      options: [...question.options],
    })),
    rules: rulesFromGameLogic(campaign.gameType, campaign.gameLogicConfig),
  };
}
