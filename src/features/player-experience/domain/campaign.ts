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
