import type { Campaign } from "../../types";

// Pluggable mechanics library for both wizard layers. To add a minigame or a prize reveal,
// add one entry here: the wizard reads this list and needs no other change.
// `gameType` is the player engine that plays it; an entry without one shows as "Soon".
// Every entry below runs on an engine that already exists in the player runtime.

export type EngagementCategory = "skill" | "knowledge" | "luck";
export type RewardMethod = "instant" | "draw";
export type GameType = Campaign["gameType"];

// What a skill game asks the brand for: a time limit and a goal. They are stored for every
// skill game in the same two numbers (win_threshold, hit_it_duration_seconds) that the server
// reads; what the goal counts depends on the game.
export interface SkillSetup {
  scoreLabel: string; // "Target score to win"
  scoreHint: string;
  scoreMin: number;
  scoreMax: number;
  defaultScore: number;
  durationMin: number;
  durationMax: number;
  defaultDuration: number;
  describe: (score: number) => string; // "target 8 points": the wizard's summary
}

export interface Mechanic {
  id: string;
  layer: "engagement" | "reward";
  category: EngagementCategory | RewardMethod;
  label: string;
  gameType?: GameType;
  skill?: SkillSetup;
  // No answer is right or wrong (the player states a preference), so there is no score to
  // qualify on: the campaign starts as a draw, and an instant win can only be guaranteed.
  preference?: true;
}

export const MECHANICS_REGISTRY: readonly Mechanic[] = [
  // Layer 1: engagement. Luck has no engagement mechanic (it is picked in Layer 2).
  {
    id: "hit_it",
    layer: "engagement",
    category: "skill",
    label: "Hit It",
    gameType: "hit_it",
    skill: {
      scoreLabel: "Target score to win",
      scoreHint: "Taps on the target needed before the time runs out.",
      scoreMin: 1,
      scoreMax: 500,
      defaultScore: 8,
      durationMin: 10,
      durationMax: 60,
      defaultDuration: 20,
      describe: (score) => `target ${score} points`,
    },
  },
  {
    id: "memory_match",
    layer: "engagement",
    category: "skill",
    label: "Memory Match",
    gameType: "memory_match",
    skill: {
      scoreLabel: "Pairs on the board",
      scoreHint:
        "The player must find every pair before the time runs out (3 to 8 pairs).",
      scoreMin: 3,
      scoreMax: 8,
      defaultScore: 6,
      durationMin: 20,
      durationMax: 90,
      defaultDuration: 45,
      describe: (score) => `${score} pairs`,
    },
  },
  {
    id: "quiz",
    layer: "engagement",
    category: "knowledge",
    label: "Trivia Quiz",
    gameType: "quiz",
  },
  // The player picks a side in each round (rounds and pictures set in the Studio).
  {
    id: "choose_brand",
    layer: "engagement",
    category: "knowledge",
    label: "Choose Your Brand",
    gameType: "choose_brand",
    preference: true,
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

// The engagement mechanic a configuration plays (none for luck).
const engagementOf = (w: Pick<WizardConfig, "category" | "engagementId">) =>
  w.category === "luck" ? undefined : mechanicById(w.engagementId);

/** A knowledge campaign played as a quiz: its questions and passing score apply. */
export const isQuizEngagement = (
  w: Pick<WizardConfig, "category" | "engagementId">,
) => w.category === "knowledge" && engagementOf(w)?.gameType === "quiz";

/** A preference game (no right answer): an instant win is always guaranteed. */
export const forcesGuaranteed = (
  w: Pick<WizardConfig, "category" | "engagementId">,
) => Boolean(engagementOf(w)?.preference);

/** What picking an engagement mechanic sets besides its id. */
export function engagementDefaults(mechanic: Mechanic): Partial<WizardConfig> {
  return {
    // Each skill game starts from its own goal and time limit.
    ...(mechanic.skill && {
      targetScore: mechanic.skill.defaultScore,
      durationSeconds: mechanic.skill.defaultDuration,
    }),
    // A preference game starts as a draw; switched to an instant win, it is guaranteed.
    ...(mechanic.preference && {
      method: "draw" as const,
      mode: "guaranteed" as const,
    }),
  };
}

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
    const restored = { ...DEFAULT_WIZARD, ...saved, draw };
    // Choose Your Brand was first a luck reveal: it is now a knowledge game of its own.
    if (restored.category === "luck" && restored.revealId === "choose_brand") {
      return {
        ...restored,
        category: "knowledge",
        engagementId: "choose_brand",
        revealId: DEFAULT_WIZARD.revealId,
        mode: "guaranteed",
      };
    }
    return restored;
  }
  const base: WizardConfig = {
    ...DEFAULT_WIZARD,
    targetScore: Number(c.gameLogicConfig?.win_threshold) || 8,
    passPercent: Number(c.gameLogicConfig?.pass_threshold_percentage) || 50,
    mode: c.winProbability >= 100 ? "guaranteed" : "probabilistic",
  };
  const engagement = MECHANICS_REGISTRY.find(
    (m) => m.layer === "engagement" && m.gameType === c.gameType,
  );
  if (engagement) {
    return {
      ...base,
      category: engagement.category as EngagementCategory,
      engagementId: engagement.id,
      durationSeconds:
        Number(c.gameLogicConfig?.hit_it_duration_seconds) ||
        engagement.skill?.defaultDuration ||
        base.durationSeconds,
      targetScore:
        Number(c.gameLogicConfig?.win_threshold) ||
        engagement.skill?.defaultScore ||
        base.targetScore,
      // A preference game cannot be won on odds: an instant win of it is guaranteed.
      ...(engagement.preference && { mode: "guaranteed" as const }),
    };
  }
  const reveal = MECHANICS_REGISTRY.find((m) => m.gameType === c.gameType);
  return { ...base, category: "luck", revealId: reveal?.id ?? "wheel" };
}
