import type { DrawOutcome, GamePayload } from "../../domain/participation";
import type { DemoCampaignRules } from "./demoRules";

// Demo draw: the same logic as the server (resolve_game_outcome, then
// draw_and_claim_campaign_prize in "manual win probability" mode), with an injectable random
// source so that tests are deterministic. Pure: it never records anything (demoEntryStore does).

export type RandomSource = () => number; // uniform in [0, 1), like Math.random

const loss = (): DrawOutcome => ({
  isWinner: false,
  prize: null,
  couponCode: null,
});

// Skill games are judged before any draw; failing one means losing (resolve_game_outcome).
export function passesSkillGate(
  rules: DemoCampaignRules,
  payload: GamePayload,
): boolean {
  if (rules.quiz) {
    const answers = payload.kind === "quiz" ? payload.answers : {};
    const { questions, passThresholdPercent } = rules.quiz;
    const correct = questions.filter(
      (question) =>
        Object.hasOwn(answers, question.id) &&
        answers[question.id] === question.correctIndex,
    ).length;
    // No question: a score of 0, as in the RPC.
    const score = questions.length > 0 ? (correct / questions.length) * 100 : 0;
    return score >= passThresholdPercent;
  }
  if (rules.hitIt) {
    const hits = payload.kind === "hitIt" ? payload.hits : 0;
    return hits >= rules.hitIt.winThreshold;
  }
  return true; // wheel, scratch card, mystery box: the draw alone decides
}

// No 0/O or 1/I: a demo code is read aloud and typed without confusion.
const CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

// "DEMO-" prefix, mandatory: a demo code can never be mistaken for a real voucher.
export function createDemoCouponCode(
  random: RandomSource = Math.random,
): string {
  const block = () =>
    Array.from(
      { length: 4 },
      () => CODE_ALPHABET[Math.floor(random() * CODE_ALPHABET.length)],
    ).join("");
  return `DEMO-${block()}-${block()}`;
}

export function drawDemoOutcome(
  rules: DemoCampaignRules,
  payload: GamePayload,
  random: RandomSource = Math.random,
): DrawOutcome {
  if (!passesSkillGate(rules, payload)) return loss();
  // Win probability first, then a weighted pick among the prizes still in stock.
  if (!(random() * 100 < rules.winProbability)) return loss();
  const candidates = rules.prizes.filter(
    (prize) => prize.remaining > 0 && prize.weight > 0,
  );
  if (candidates.length === 0) return loss(); // out of stock: nobody wins
  const total = candidates.reduce((sum, prize) => sum + prize.weight, 0);
  let roll = random() * total;
  const prize =
    candidates.find((candidate) => (roll -= candidate.weight) < 0) ??
    candidates[candidates.length - 1]; // rounding guard: roll landed exactly on the total
  return {
    isWinner: true,
    prize: { id: prize.id, name: prize.name, winMessage: prize.winMessage },
    couponCode: createDemoCouponCode(random),
  };
}

// Small seeded generator (mulberry32), to replay the same demo draws in tests.
export function createSeededRandom(seed: number): RandomSource {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
