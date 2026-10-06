import { describe, expect, expectTypeOf, it } from "vitest";
import type { Campaign } from "@/src/types";
import { GAME_LABELS, OUTCOME_TIMING, type GameType } from "./gameTypes";

const ALL_GAME_TYPES: GameType[] = [
  "lucky_wheel",
  "quiz",
  "scratch_card",
  "mystery_box",
  "hit_it",
];

describe("GameType", () => {
  // Checked by the TypeScript compiler (npm run typecheck), not at runtime.
  it("is exactly the campaign game type", () => {
    expectTypeOf<GameType>().toEqualTypeOf<Campaign["gameType"]>();
  });
});

describe("OUTCOME_TIMING", () => {
  it("draws before the animation for the wheel and the scratch card", () => {
    expect(OUTCOME_TIMING.lucky_wheel).toBe("before-animation");
    expect(OUTCOME_TIMING.scratch_card).toBe("before-animation");
  });

  it("draws after the interaction for the quiz, the boxes and Hit It", () => {
    expect(OUTCOME_TIMING.quiz).toBe("after-interaction");
    expect(OUTCOME_TIMING.mystery_box).toBe("after-interaction");
    expect(OUTCOME_TIMING.hit_it).toBe("after-interaction");
  });

  it("covers every game type and nothing else", () => {
    expect(Object.keys(OUTCOME_TIMING).sort()).toEqual(
      [...ALL_GAME_TYPES].sort(),
    );
  });
});

describe("GAME_LABELS", () => {
  it("gives every game type a non-empty label", () => {
    expect(Object.keys(GAME_LABELS).sort()).toEqual([...ALL_GAME_TYPES].sort());
    for (const type of ALL_GAME_TYPES) {
      expect(GAME_LABELS[type].trim()).not.toBe("");
    }
  });
});
