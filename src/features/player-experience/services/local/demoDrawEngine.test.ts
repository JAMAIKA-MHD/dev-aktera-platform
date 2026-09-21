import { describe, expect, it } from "vitest";
import type { DrawOutcome, GamePayload } from "../../domain/participation";
import {
  createDemoCouponCode,
  createSeededRandom,
  drawDemoOutcome,
  passesSkillGate,
} from "./demoDrawEngine";
import type { DemoCampaignRules } from "./demoRules";

const NONE: GamePayload = { kind: "none" };
const COUPON = /^DEMO-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

const rules = (
  changes: Partial<DemoCampaignRules> = {},
): DemoCampaignRules => ({
  campaignId: "campaign-1",
  active: true,
  winProbability: 30,
  maxEntries: 1,
  prizes: [
    {
      id: "voucher",
      name: "Bon 2000 DA",
      winMessage: "Bravo",
      weight: 3,
      remaining: 10_000,
    },
    {
      id: "headphones",
      name: "Casque audio",
      winMessage: null,
      weight: 1,
      remaining: 10_000,
    },
  ],
  ...changes,
});

function drawMany(
  demoRules: DemoCampaignRules,
  count: number,
  payload: GamePayload = NONE,
  seed = 2026,
): DrawOutcome[] {
  const random = createSeededRandom(seed);
  return Array.from({ length: count }, () =>
    drawDemoOutcome(demoRules, payload, random),
  );
}

describe("drawDemoOutcome: chances", () => {
  it("follows the win probability and the weights over 1,000 draws (fixed seed)", () => {
    const outcomes = drawMany(rules(), 1_000);
    const wins = outcomes.filter((outcome) => outcome.isWinner);
    // 30 % of 1,000 = 300 wins expected; ±50 is more than 3 standard deviations (≈ 14.5).
    expect(wins.length).toBeGreaterThan(250);
    expect(wins.length).toBeLessThan(350);
    // Weights 3:1 → about 75 % vouchers among the wins.
    const vouchers = wins.filter((outcome) => outcome.prize?.id === "voucher");
    expect(vouchers.length / wins.length).toBeGreaterThan(0.65);
    expect(vouchers.length / wins.length).toBeLessThan(0.85);
  });

  it("is reproducible with the same seed", () => {
    expect(drawMany(rules(), 50, NONE, 7)).toEqual(
      drawMany(rules(), 50, NONE, 7),
    );
    expect(drawMany(rules(), 50, NONE, 7)).not.toEqual(
      drawMany(rules(), 50, NONE, 8),
    );
  });

  it("never lets anyone win with a probability of 0", () => {
    const outcomes = drawMany(rules({ winProbability: 0 }), 1_000);
    expect(outcomes.some((outcome) => outcome.isWinner)).toBe(false);
  });

  it("lets everyone win with a probability of 100 while stock lasts", () => {
    const outcomes = drawMany(rules({ winProbability: 100 }), 200);
    expect(outcomes.every((outcome) => outcome.isWinner)).toBe(true);
  });

  it("makes everyone lose when the stock is exhausted", () => {
    const soldOut = rules({
      winProbability: 100,
      prizes: rules().prizes.map((prize) => ({ ...prize, remaining: 0 })),
    });
    const outcomes = drawMany(soldOut, 1_000);
    expect(outcomes.some((outcome) => outcome.isWinner)).toBe(false);
  });

  it("never awards a prize out of stock or without weight", () => {
    const [voucher, headphones] = rules().prizes;
    const outcomes = drawMany(
      rules({
        winProbability: 100,
        prizes: [
          { ...voucher, remaining: 0 },
          { ...headphones, weight: 0 },
          {
            id: "gift",
            name: "Coffret",
            winMessage: null,
            weight: 1,
            remaining: 5,
          },
        ],
      }),
      300,
    );
    expect(new Set(outcomes.map((outcome) => outcome.prize?.id))).toEqual(
      new Set(["gift"]),
    );
  });

  it("describes a win as the server does, with a DEMO coupon", () => {
    const [win] = drawMany(rules({ winProbability: 100 }), 1);
    expect(win).toEqual({
      isWinner: true,
      prize: expect.objectContaining({ id: expect.any(String) }),
      couponCode: expect.stringMatching(COUPON),
    });
    const voucher = drawMany(rules({ winProbability: 100 }), 50).find(
      (outcome) => outcome.prize?.id === "voucher",
    );
    expect(voucher?.prize).toEqual({
      id: "voucher",
      name: "Bon 2000 DA",
      winMessage: "Bravo",
    });
    const [lose] = drawMany(rules({ winProbability: 0 }), 1);
    expect(lose).toEqual({ isWinner: false, prize: null, couponCode: null });
  });

  it("uses Math.random by default", () => {
    const outcome = drawDemoOutcome(rules({ winProbability: 100 }), NONE);
    expect(outcome.isWinner).toBe(true);
    expect(outcome.couponCode).toMatch(COUPON);
  });

  it("guards against a roll that lands exactly on the total weight", () => {
    // A faulty source returning 1 (outside [0, 1)) puts the roll on the total weight.
    const edge = [0, 1];
    const outcome = drawDemoOutcome(rules({ winProbability: 100 }), NONE, () =>
      edge.length > 0 ? (edge.shift() as number) : 0,
    );
    expect(outcome.prize?.id).toBe("headphones"); // the last candidate
  });
});

describe("passesSkillGate: quiz", () => {
  const quiz = (passThresholdPercent: number) =>
    rules({
      quiz: {
        passThresholdPercent,
        questions: [
          { id: "q1", correctIndex: 1 },
          { id: "q2", correctIndex: 0 },
          { id: "q3", correctIndex: 2 },
        ],
      },
    });
  const answers = (values: Record<string, number>): GamePayload => ({
    kind: "quiz",
    answers: values,
  });

  it("requires every correct answer by default (threshold 100)", () => {
    expect(passesSkillGate(quiz(100), answers({ q1: 1, q2: 0, q3: 2 }))).toBe(
      true,
    );
    expect(passesSkillGate(quiz(100), answers({ q1: 1, q2: 0, q3: 1 }))).toBe(
      false,
    );
  });

  it("scores against the threshold, missing answers counting as wrong", () => {
    expect(passesSkillGate(quiz(60), answers({ q1: 1, q2: 0 }))).toBe(true); // 66.7 %
    expect(passesSkillGate(quiz(70), answers({ q1: 1, q2: 0 }))).toBe(false);
    expect(passesSkillGate(quiz(0), answers({}))).toBe(true);
  });

  it("ignores answers to unknown questions and inherited keys", () => {
    const tricky = answers(
      Object.assign(Object.create({ q1: 1 }) as Record<string, number>, {
        q9: 1,
      }),
    );
    expect(passesSkillGate(quiz(30), tricky)).toBe(false);
  });

  it("scores 0 without questions, like the RPC", () => {
    const empty = rules({ quiz: { passThresholdPercent: 100, questions: [] } });
    expect(passesSkillGate(empty, NONE)).toBe(false);
    const free = rules({ quiz: { passThresholdPercent: 0, questions: [] } });
    expect(passesSkillGate(free, NONE)).toBe(true);
  });

  it("makes a failed quiz lose, whatever the probability", () => {
    const outcomes = drawMany(
      { ...quiz(100), winProbability: 100 },
      100,
      answers({ q1: 0, q2: 0, q3: 2 }),
    );
    expect(outcomes.some((outcome) => outcome.isWinner)).toBe(false);
  });
});

describe("passesSkillGate: Hit It", () => {
  const hitIt = rules({ winProbability: 100, hitIt: { winThreshold: 8 } });

  it("requires the number of hits of the campaign", () => {
    expect(passesSkillGate(hitIt, { kind: "hitIt", hits: 8 })).toBe(true);
    expect(passesSkillGate(hitIt, { kind: "hitIt", hits: 7 })).toBe(false);
    expect(passesSkillGate(hitIt, NONE)).toBe(false); // no hits sent: 0
    expect(drawDemoOutcome(hitIt, { kind: "hitIt", hits: 7 }).isWinner).toBe(
      false,
    );
  });

  it("lets the draw alone decide for the other games", () => {
    expect(passesSkillGate(rules(), { kind: "boxes", selectedIndex: 2 })).toBe(
      true,
    );
  });
});

describe("createDemoCouponCode", () => {
  it("always starts with DEMO- and avoids ambiguous characters", () => {
    const random = createSeededRandom(1);
    for (let index = 0; index < 200; index++) {
      expect(createDemoCouponCode(random)).toMatch(COUPON);
    }
    expect(createDemoCouponCode()).toMatch(COUPON);
  });
});

describe("createSeededRandom", () => {
  it("returns numbers in [0, 1)", () => {
    const random = createSeededRandom(42);
    for (let index = 0; index < 1_000; index++) {
      const value = random();
      expect(value).toBeGreaterThanOrEqual(0);
      expect(value).toBeLessThan(1);
    }
  });
});
