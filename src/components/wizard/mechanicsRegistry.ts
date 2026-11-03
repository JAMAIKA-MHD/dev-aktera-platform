import type { Campaign } from "../../types";

// Pluggable mechanics library for both wizard layers. To add a minigame or a prize reveal,
// add one entry here: the wizard reads this list and needs no other change.
// `gameType` is the player engine that plays it; an entry without one shows as "Soon".
// Every entry below runs on an engine that already exists in the player runtime.

export type EngagementCategory = "skill" | "knowledge" | "luck";
export type RewardMethod = "instant" | "draw";
export type GameType = Campaign["gameType"];

export interface Mechanic {
  id: string;
  layer: "engagement" | "reward";
  category: EngagementCategory | RewardMethod;
  label: string;
  gameType?: GameType;
}

export const MECHANICS_REGISTRY: readonly Mechanic[] = [
  // Layer 1: engagement. Luck has no engagement mechanic (it is picked in Layer 2).
  {
    id: "hit_it",
    layer: "engagement",
    category: "skill",
    label: "Hit It",
    gameType: "hit_it",
  },
  {
    id: "quiz",
    layer: "engagement",
    category: "knowledge",
    label: "Trivia Quiz",
    gameType: "quiz",
  },
  // Layer 2: how an instant win is revealed.
  {
    id: "wheel",
    layer: "reward",
    category: "instant",
    label: "Wheel of Fortune",
    gameType: "lucky_wheel",
  },
  {
    id: "scratch",
    layer: "reward",
    category: "instant",
    label: "Scratch Card",
    gameType: "scratch_card",
  },
  {
    id: "mystery_box",
    layer: "reward",
    category: "instant",
    label: "Mystery Box",
    gameType: "mystery_box",
  },
];

export const mechanicsFor = (
  layer: Mechanic["layer"],
  category: Mechanic["category"],
) =>
  MECHANICS_REGISTRY.filter(
    (m) => m.layer === layer && m.category === category,
  );

export const mechanicById = (id: string) =>
  MECHANICS_REGISTRY.find((m) => m.id === id);

// Everything the wizard adds to campaigns.game_logic_config (key `wizard`), next to the
// numeric rules the server already reads (win_threshold, pass_threshold_percentage...).
export interface WizardConfig {
  category: EngagementCategory;
  engagementId: string;
  durationSeconds: number;
  targetScore: number;
  passPercent: number;
  method: RewardMethod;
  mode: "probabilistic" | "guaranteed";
  revealId: string;
  consolation: boolean;
  consolationPrizes: { templateId: string; quantity: number }[];
  draw: {
    at: string;
    winners: number;
    ticketPrefix: string;
    rules: string;
    // SMS texts of a draw: one for the winners, one for everybody else.
    smsWinner: string;
    smsLoser: string;
    // Does Aktera manage the prize stock and the messages? null = not answered yet.
    manageStock: boolean | null;
  };
}

export const DEFAULT_WIZARD: WizardConfig = {
  category: "skill",
  engagementId: "hit_it",
  durationSeconds: 20,
  targetScore: 8,
  passPercent: 60,
  method: "instant",
  mode: "probabilistic",
  revealId: "wheel",
  consolation: false,
  consolationPrizes: [],
  draw: {
    at: "",
    winners: 3,
    ticketPrefix: "",
    rules: "",
    smsWinner: "",
    smsLoser: "",
    manageStock: null,
  },
};

// The player engine a configuration plays. Luck has no game of its own: the reveal is the game.
export function resolveGameType(w: WizardConfig): GameType {
  if (w.category !== "luck") {
    return mechanicById(w.engagementId)?.gameType ?? "hit_it";
  }
  if (w.method === "draw") return "lucky_wheel";
  return mechanicById(w.revealId)?.gameType ?? "lucky_wheel";
}

// Rebuild the wizard state from a saved campaign; older campaigns (no `wizard` key) are
// mapped from their game type.
export function wizardFromCampaign(c: Campaign | null): WizardConfig {
  if (!c) return DEFAULT_WIZARD;
  const saved = c.gameLogicConfig?.wizard as Partial<WizardConfig> | undefined;
  if (saved) {
    const draw = { ...DEFAULT_WIZARD.draw, ...saved.draw };
    // Draws saved before the question existed: prizes or messages mean "yes".
    if (draw.manageStock == null && saved.method === "draw") {
      const used =
        c.prizes.length > 0 || Boolean(draw.smsWinner || draw.smsLoser);
      draw.manageStock = used ? true : null;
    }
    return { ...DEFAULT_WIZARD, ...saved, draw };
  }
  const base: WizardConfig = {
    ...DEFAULT_WIZARD,
    targetScore: Number(c.gameLogicConfig?.win_threshold) || 8,
    passPercent: Number(c.gameLogicConfig?.pass_threshold_percentage) || 50,
    mode: c.winProbability >= 100 ? "guaranteed" : "probabilistic",
  };
  if (c.gameType === "hit_it") return base;
  if (c.gameType === "quiz") {
    return { ...base, category: "knowledge", engagementId: "quiz" };
  }
  const reveal = MECHANICS_REGISTRY.find((m) => m.gameType === c.gameType);
  return { ...base, category: "luck", revealId: reveal?.id ?? "wheel" };
}
