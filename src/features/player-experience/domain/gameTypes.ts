// Same union as Campaign["gameType"] in src/types.ts (checked by gameTypes.test.ts).
export type GameType =
  "lucky_wheel" | "quiz" | "scratch_card" | "mystery_box" | "hit_it";

// When the server draws the outcome, relative to what the player does:
// - before-animation: drawn right after registration; the game only animates towards the known result.
// - after-interaction: the player plays first; the draw uses what they did (answers, chosen box, hits).
export type OutcomeTiming = "before-animation" | "after-interaction";

// Mirrors the flow of the legacy player page (its handleRegister), removed in B6.2.
export const OUTCOME_TIMING: Readonly<Record<GameType, OutcomeTiming>> = {
  lucky_wheel: "before-animation",
  scratch_card: "before-animation",
  quiz: "after-interaction",
  mystery_box: "after-interaction",
  hit_it: "after-interaction",
};

// Studio labels (English), aligned with the dashboard campaign list.
export const GAME_LABELS: Readonly<Record<GameType, string>> = {
  lucky_wheel: "Spin Wheel",
  quiz: "Quiz Challenge",
  scratch_card: "Scratch Card",
  mystery_box: "Mystery Box",
  hit_it: "Hit It",
};
