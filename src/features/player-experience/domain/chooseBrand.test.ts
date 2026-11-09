import { describe, expect, it } from "vitest";
import {
  buildChoicePlan,
  choiceProgress,
  previewDuels,
  shuffledBy,
  type ChoiceSide,
  type ChooseBrandSettings,
} from "./chooseBrand";
import {
  buildDefaultChoiceContenders,
  buildDefaultChooseBrand,
} from "./defaults";

// Pick Your Favorite, "winner stays": the duels and the champion.

const settings = (
  patch: Partial<ChooseBrandSettings>,
): ChooseBrandSettings => ({ ...buildDefaultChooseBrand(), ...patch });

const products = (count: number) =>
  buildDefaultChoiceContenders(count, (index) => `p${index + 1}`);

// Plays `sides` and lists the duels met, as "id:left vs right".
function play(plan: ReturnType<typeof buildChoicePlan>, sides: ChoiceSide[]) {
  const met: string[] = [];
  for (let i = 0; i <= sides.length; i++) {
    const { duel } = choiceProgress(plan, sides.slice(0, i));
    if (!duel) break;
    met.push(`${duel.id}:${duel.left.id} vs ${duel.right.id}`);
  }
  return met;
}

describe("winner stays", () => {
  it("keeps the product picked on its side and brings in the next one", () => {
    const plan = buildChoicePlan(settings({ contenders: products(4) }));
    expect(plan.total).toBe(3);
    const sides: ChoiceSide[] = ["right", "left", "right"];
    expect(play(plan, sides)).toEqual([
      "m1:p1 vs p2",
      "m2:p3 vs p2", // p2 was picked on the right: it stays there
      "m3:p3 vs p4", // p3 was picked on the left
    ]);
    expect(choiceProgress(plan, sides)).toEqual({
      duel: null,
      champion: expect.objectContaining({ id: "p4" }),
    });
  });

  it("names the last duel the final and counts the others", () => {
    const plan = buildChoicePlan(settings({ contenders: products(4) }));
    const first = choiceProgress(plan, []).duel!;
    expect([first.stage, first.stageIndex, first.stageCount]).toEqual([
      "challenge",
      1,
      3,
    ]);
    expect(choiceProgress(plan, ["left", "left"]).duel?.stage).toBe("final");
  });

  it("plays a single duel with two products: it is the final", () => {
    const plan = buildChoicePlan(settings({ contenders: products(2) }));
    expect(plan.total).toBe(1);
    const duel = choiceProgress(plan, []).duel!;
    expect([duel.stage, duel.stageIndex, duel.stageCount]).toEqual([
      "final",
      1,
      1,
    ]);
    expect(choiceProgress(plan, ["right"])).toEqual({
      duel: null,
      champion: expect.objectContaining({ id: "p2" }),
    });
  });

  it("plays the default products when the list is too short", () => {
    const plan = buildChoicePlan(settings({ contenders: products(1) }));
    expect(plan.order.length).toBeGreaterThanOrEqual(2);
    // Stand-ins keep the same ids from one call to the next.
    expect(
      buildChoicePlan(settings({ contenders: products(1) })).order[0].id,
    ).toBe(plan.order[0].id);
  });
});

describe("the campaign's count", () => {
  it("plays the first products of the list", () => {
    const plan = buildChoicePlan(settings({ contenders: products(8) }), 0, {
      count: 5,
      roundSeconds: 10,
    });
    expect(plan.order.map((item) => item.id)).toEqual([
      "p1",
      "p2",
      "p3",
      "p4",
      "p5",
    ]);
    expect(plan.total).toBe(4);
  });

  it("completes a shorter list with default products of fixed ids", () => {
    const plan = buildChoicePlan(settings({ contenders: products(3) }), 0, {
      count: 5,
      roundSeconds: 10,
    });
    expect(plan.order.map((item) => item.id)).toEqual([
      "p1",
      "p2",
      "p3",
      "product-4",
      "product-5",
    ]);
  });
});

describe("shuffle", () => {
  it("gives one order per seed, the same one each time, with every product", () => {
    const list = products(8);
    const order = shuffledBy(list, 42);
    expect(shuffledBy(list, 42)).toEqual(order);
    expect([...order].sort((a, b) => a.id.localeCompare(b.id))).toEqual(list);
  });

  it("only shuffles when the brand asks for it", () => {
    const list = products(8);
    const plan = buildChoicePlan(
      settings({ contenders: list, shuffle: false }),
      42,
    );
    expect(plan.order).toEqual(list);
  });
});

describe("previewDuels", () => {
  it("lists the first duels of a player picking left, then right", () => {
    const plan = buildChoicePlan(settings({ contenders: products(4) }));
    expect(previewDuels(plan, 3).map((duel) => duel.id)).toEqual([
      "m1",
      "m2",
      "m3",
    ]);
    expect(previewDuels(plan, 10)).toHaveLength(3);
  });
});
