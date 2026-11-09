import type { ChoiceRules } from "./campaign";
import {
  MAX_CHOICE_CONTENDERS,
  MIN_CHOICE_CONTENDERS,
  buildDefaultChoiceContenders,
  defaultChoiceContenderAt,
  defaultChoicePrompt,
} from "./defaults";
import type { LocalizedText } from "./locale";
import type { ChoiceContender, GameSettings } from "./types";

// Pick Your Favorite, "winner stays": the first two products meet; the one the player picks
// stays where it is and the next product comes in on the other side, until every product has
// played. The last one standing is the player's champion. Pure: given the settings and the
// sides picked so far, it says which duel comes next, or which product is the champion.
// No pick is right or wrong: nothing here decides a win (that is the server's draw alone).

export type ChooseBrandSettings = NonNullable<GameSettings["chooseBrand"]>;
export type ChoiceSide = "left" | "right";
export type ChoiceStage = "challenge" | "final";

export interface ChoiceDuel {
  id: string; // saved as the pick's round_id: "m1", "m2"…
  stage: ChoiceStage; // the last duel is the final
  stageIndex: number; // 1-based ("Duel · 2/4")
  stageCount: number;
  prompt: LocalizedText;
  left: ChoiceContender;
  right: ChoiceContender;
}

export interface ChoicePlan {
  order: ChoiceContender[]; // the products, in the order they come in
  prompt: LocalizedText;
  total: number; // picks in a full game: one fewer than the products
}

// Stand-ins rebuilt on every call keep the same ids, so a game in progress is not reset.
const standInId = (index: number) => `product-${index + 1}`;

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

// What a game plays. The campaign's rules (Wizard) decide how many products play: the first
// ones of the design's list, completed with the default ones if it is shorter. Without them
// (the standalone Studio) the whole list plays; a list too short plays the default products.
export function buildChoicePlan(
  settings: ChooseBrandSettings | undefined,
  seed = 0,
  rules?: ChoiceRules,
): ChoicePlan {
  const prompt = settings?.prompt ?? defaultChoicePrompt();
  const list = settings?.contenders ?? [];
  const products = rules
    ? Array.from({ length: rules.count }, (_, index) =>
        index < list.length
          ? list[index]
          : defaultChoiceContenderAt(index, standInId(index)),
      )
    : list.length >= MIN_CHOICE_CONTENDERS
      ? list.slice(0, MAX_CHOICE_CONTENDERS)
      : buildDefaultChoiceContenders(MIN_CHOICE_CONTENDERS + 1, standInId);
  const order = settings?.shuffle ? shuffledBy(products, seed) : products;
  return { order, prompt, total: order.length - 1 };
}

export interface ChoiceProgress {
  duel: ChoiceDuel | null; // null once every duel is played
  champion: ChoiceContender | null; // once the last duel is played
}

// The duel after `sides` (one per duel already played, in order), or the end of the game.
export function choiceProgress(
  plan: ChoicePlan,
  sides: readonly ChoiceSide[],
): ChoiceProgress {
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
          left,
          right,
        },
        champion: null,
      };
    }
    // The product picked keeps its side, the next one takes the other.
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
