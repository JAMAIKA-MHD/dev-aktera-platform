import type { ChoiceRules } from "./campaign";
import {
  CHOICE_BRACKET_SIZES,
  MAX_CHOICE_CONTENDERS,
  MAX_CHOICE_ROUNDS,
  MIN_CHOICE_ROUNDS,
  MIN_LADDER_CONTENDERS,
  buildDefaultChoiceContenders,
  buildDefaultChoiceRounds,
  defaultChoiceContenderAt,
  defaultChoicePrompt,
  defaultChoiceRoundAt,
} from "./defaults";
import type { LocalizedText } from "./locale";
import type {
  ChoiceContender,
  ChoiceMode,
  ChoiceOption,
  ChoiceRound,
  GameSettings,
} from "./types";

// Choose Your Brand, its three modes as one sequence of duels. Pure: given the settings and
// the sides picked so far, it says which duel comes next, or which product is the champion.
// - duels: the brand's fixed pairs, one after the other;
// - bracket: 4 or 8 products, paired in order; the picked ones meet in the next stage;
// - ladder: the picked product stays where it is, the next product comes in on the other side.
// No pick is right or wrong: nothing here decides a win (that is the server's draw alone).

export type ChooseBrandSettings = NonNullable<GameSettings["chooseBrand"]>;
export type ChoiceSide = "left" | "right";
export type ChoiceStage = "duel" | "quarter" | "semi" | "final" | "challenge";

export interface ChoiceSlot {
  option: ChoiceOption;
  contenderId: string | null; // the tournament product; null for a fixed duel
}

export interface ChoiceDuel {
  id: string; // saved as the pick's round_id
  stage: ChoiceStage;
  stageIndex: number; // 1-based, within its stage ("Quarter-final 2/4")
  stageCount: number;
  prompt: LocalizedText;
  left: ChoiceSlot;
  right: ChoiceSlot;
}

export interface ChoicePlan {
  mode: ChoiceMode;
  rounds: ChoiceRound[]; // duels
  order: ChoiceContender[]; // tournaments: the products, in the order they meet
  prompt: LocalizedText;
  total: number; // picks in a full game
}

// Stand-ins rebuilt on every call keep the same ids, so a game in progress is not reset.
const fixedId = (prefix: string) => (index: number) => `${prefix}-${index + 1}`;

// The products a bracket plays: the largest size the list fills (8, else 4).
function bracketField(list: ChoiceContender[]): ChoiceContender[] | null {
  const size = [...CHOICE_BRACKET_SIZES]
    .sort((a, b) => b - a)
    .find((candidate) => list.length >= candidate);
  return size ? list.slice(0, size) : null;
}

// A small seeded generator (mulberry32): one order per player, the same one all game long.
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffledBy<T>(items: readonly T[], seed: number): T[] {
  const next = seeded(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(next() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

// The first `count` items of a list, completed with stand-ins when it is shorter.
function firstOf<T>(
  list: readonly T[],
  count: number,
  standIn: (index: number) => T,
): T[] {
  return Array.from({ length: count }, (_, index) =>
    index < list.length ? list[index] : standIn(index),
  );
}

// What a game plays. The campaign's rules (Wizard) decide the mode and how many items play:
// the first ones of the design's list, completed with the default ones if it is shorter.
// Without them (a design without a campaign, or a campaign saved before the rules existed)
// the design's own mode plays its whole list; a list too short for its mode plays the
// default products, like an empty list of duels plays the default rounds.
export function buildChoicePlan(
  settings: ChooseBrandSettings | undefined,
  seed = 0,
  rules?: ChoiceRules,
): ChoicePlan {
  const mode: ChoiceMode = rules?.mode ?? settings?.mode ?? "duels";
  const prompt = settings?.prompt ?? defaultChoicePrompt();
  if (rules) {
    if (mode === "duels") {
      const rounds = firstOf(settings?.rounds ?? [], rules.count, (index) =>
        defaultChoiceRoundAt(index, `round-${index + 1}`),
      );
      return { mode, rounds, order: [], prompt, total: rounds.length };
    }
    const products = firstOf(settings?.contenders ?? [], rules.count, (index) =>
      defaultChoiceContenderAt(index, `product-${index + 1}`),
    );
    const order = settings?.shuffle ? shuffledBy(products, seed) : products;
    return { mode, rounds: [], order, prompt, total: order.length - 1 };
  }
  if (mode === "duels") {
    const rounds =
      settings && settings.rounds.length >= MIN_CHOICE_ROUNDS
        ? settings.rounds.slice(0, MAX_CHOICE_ROUNDS)
        : buildDefaultChoiceRounds(fixedId("round"));
    return { mode, rounds, order: [], prompt, total: rounds.length };
  }
  const list = settings?.contenders ?? [];
  const field =
    mode === "bracket"
      ? bracketField(list)
      : list.length >= MIN_LADDER_CONTENDERS
        ? list.slice(0, MAX_CHOICE_CONTENDERS)
        : null;
  const products = field ?? buildDefaultChoiceContenders(4, fixedId("product"));
  const order = settings?.shuffle ? shuffledBy(products, seed) : products;
  return { mode, rounds: [], order, prompt, total: order.length - 1 };
}

const slotOf = (contender: ChoiceContender): ChoiceSlot => ({
  option: contender,
  contenderId: contender.id,
});

const BRACKET_STAGES: Record<number, { stage: ChoiceStage; code: string }> = {
  8: { stage: "quarter", code: "qf" },
  4: { stage: "semi", code: "sf" },
  2: { stage: "final", code: "f" },
};

export interface ChoiceProgress {
  duel: ChoiceDuel | null; // null once every duel is played
  champion: ChoiceContender | null; // tournaments, once the last duel is played
}

// The duel after `sides` (one per duel already played, in order), or the end of the game.
export function choiceProgress(
  plan: ChoicePlan,
  sides: readonly ChoiceSide[],
): ChoiceProgress {
  if (plan.mode === "duels") {
    const round = plan.rounds[sides.length];
    if (!round) return { duel: null, champion: null };
    return {
      duel: {
        id: round.id,
        stage: "duel",
        stageIndex: sides.length + 1,
        stageCount: plan.rounds.length,
        prompt: round.prompt,
        left: { option: round.left, contenderId: null },
        right: { option: round.right, contenderId: null },
      },
      champion: null,
    };
  }

  if (plan.mode === "bracket") {
    let entrants = plan.order;
    let played = 0;
    while (entrants.length > 1) {
      const count = Math.floor(entrants.length / 2);
      const { stage, code } = BRACKET_STAGES[entrants.length] ?? {
        stage: "challenge",
        code: `s${entrants.length}-`,
      };
      const winners: ChoiceContender[] = [];
      for (let k = 0; k < count; k++) {
        const left = entrants[k * 2];
        const right = entrants[k * 2 + 1];
        const side = sides[played];
        if (side === undefined) {
          return {
            duel: {
              id: `${code}${k + 1}`,
              stage,
              stageIndex: k + 1,
              stageCount: count,
              prompt: plan.prompt,
              left: slotOf(left),
              right: slotOf(right),
            },
            champion: null,
          };
        }
        winners.push(side === "left" ? left : right);
        played++;
      }
      entrants = winners;
    }
    return { duel: null, champion: entrants[0] ?? null };
  }

  // Ladder: the product picked keeps its side, the next one takes the other.
  const [first, ...challengers] = plan.order;
  let holder = first;
  let holderSide: ChoiceSide = "left";
  for (let i = 0; i < challengers.length; i++) {
    const left = holderSide === "left" ? holder : challengers[i];
    const right = holderSide === "left" ? challengers[i] : holder;
    const side = sides[i];
    if (side === undefined) {
      return {
        duel: {
          id: `m${i + 1}`,
          stage: i === challengers.length - 1 ? "final" : "challenge",
          stageIndex: i + 1,
          stageCount: challengers.length,
          prompt: plan.prompt,
          left: slotOf(left),
          right: slotOf(right),
        },
        champion: null,
      };
    }
    holder = side === "left" ? left : right;
    holderSide = side;
  }
  return { duel: null, champion: holder ?? null };
}

// The first duels of a game whose player picks left, right, left…: what the teaser shows.
export function previewDuels(plan: ChoicePlan, count: number): ChoiceDuel[] {
  const sides: ChoiceSide[] = [];
  const duels: ChoiceDuel[] = [];
  while (duels.length < count) {
    const { duel } = choiceProgress(plan, sides);
    if (!duel) break;
    duels.push(duel);
    sides.push(duels.length % 2 === 1 ? "left" : "right");
  }
  return duels;
}
