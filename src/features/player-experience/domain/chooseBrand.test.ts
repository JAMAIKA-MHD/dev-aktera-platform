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

// Choose Your Brand's three modes, as one sequence of duels.

const settings = (
  patch: Partial<ChooseBrandSettings>,
): ChooseBrandSettings => ({ ...buildDefaultChooseBrand(), ...patch });

const products = (count: number) =>
  buildDefaultChoiceContenders(count, (index) => `p${index + 1}`);

// Plays `sides` and lists the duels met, as "left id vs right id".
function play(plan: ReturnType<typeof buildChoicePlan>, sides: ChoiceSide[]) {
  const met: string[] = [];
  for (let i = 0; i <= sides.length; i++) {
    const { duel } = choiceProgress(plan, sides.slice(0, i));
    if (!duel) break;
    met.push(
      `${duel.id}:${duel.left.contenderId ?? "-"} vs ${duel.right.contenderId ?? "-"}`,
    );
  }
  return met;
}

describe("duels", () => {
  it("plays the brand's rounds in order, with no champion", () => {
    const base = buildDefaultChooseBrand();
    const plan = buildChoicePlan(base);
    expect(plan.total).toBe(base.rounds.length);
    expect(choiceProgress(plan, []).duel?.id).toBe(base.rounds[0].id);
    const end = choiceProgress(
      plan,
      base.rounds.map(() => "left"),
    );
    expect(end).toEqual({ duel: null, champion: null });
  });

  it("plays the default rounds when there are fewer than two", () => {
    const plan = buildChoicePlan(settings({ rounds: [] }));
    expect(plan.rounds.length).toBeGreaterThanOrEqual(2);
    // Stand-ins keep the same ids from one call to the next.
    expect(buildChoicePlan(settings({ rounds: [] })).rounds[0].id).toBe(
      plan.rounds[0].id,
    );
  });
});

describe("bracket", () => {
  it("pairs 8 products, then the ones picked, down to a champion", () => {
    const plan = buildChoicePlan(
      settings({ mode: "bracket", contenders: products(8) }),
    );
    expect(plan.total).toBe(7);
    const sides: ChoiceSide[] = [
      "left", // p1
      "right", // p4
      "left", // p5
      "right", // p8
      "right", // p4
      "left", // p5
      "right", // p5
    ];
    expect(play(plan, sides)).toEqual([
      "qf1:p1 vs p2",
      "qf2:p3 vs p4",
      "qf3:p5 vs p6",
      "qf4:p7 vs p8",
      "sf1:p1 vs p4",
      "sf2:p5 vs p8",
      "f1:p4 vs p5",
    ]);
    expect(choiceProgress(plan, sides).champion?.id).toBe("p5");
  });

  it("names the stages and counts the duels in each", () => {
    const plan = buildChoicePlan(
      settings({ mode: "bracket", contenders: products(4) }),
    );
    const first = choiceProgress(plan, []).duel!;
    expect([first.stage, first.stageIndex, first.stageCount]).toEqual([
      "semi",
      1,
      2,
    ]);
    expect(choiceProgress(plan, ["left", "left"]).duel?.stage).toBe("final");
  });

  it("plays the largest size the list fills, else the default products", () => {
    expect(
      buildChoicePlan(settings({ mode: "bracket", contenders: products(6) }))
        .order,
    ).toHaveLength(4);
    expect(
      buildChoicePlan(settings({ mode: "bracket", contenders: products(2) }))
        .order,
    ).toHaveLength(4);
  });
});

describe("ladder", () => {
  it("keeps the product picked on its side and brings in the next one", () => {
    const plan = buildChoicePlan(
      settings({ mode: "ladder", contenders: products(4) }),
    );
    expect(plan.total).toBe(3);
    const sides: ChoiceSide[] = ["right", "left", "right"];
    expect(play(plan, sides)).toEqual([
      "m1:p1 vs p2",
      "m2:p3 vs p2", // p2 was picked on the right: it stays there
      "m3:p3 vs p4", // p3 was picked on the left
    ]);
    expect(choiceProgress(plan, sides).champion?.id).toBe("p4");
    expect(choiceProgress(plan, ["left", "left"]).duel?.stage).toBe("final");
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
      settings({ mode: "bracket", contenders: list, shuffle: false }),
      42,
    );
    expect(plan.order).toEqual(list);
  });
});

describe("previewDuels", () => {
  it("lists the first duels of a player picking left, then right", () => {
    const plan = buildChoicePlan(
      settings({ mode: "ladder", contenders: products(4) }),
    );
    expect(previewDuels(plan, 3).map((duel) => duel.id)).toEqual([
      "m1",
      "m2",
      "m3",
    ]);
    expect(previewDuels(plan, 10)).toHaveLength(3);
  });
});

describe("the campaign's rules", () => {
  it("decide the mode and how many items play, whatever the design says", () => {
    const design = settings({ mode: "duels", contenders: products(8) });
    const plan = buildChoicePlan(design, 0, { mode: "ladder", count: 5 });
    expect(plan.mode).toBe("ladder");
    expect(plan.order.map((item) => item.id)).toEqual([
      "p1",
      "p2",
      "p3",
      "p4",
      "p5",
    ]);
    expect(plan.total).toBe(4);
  });

  it("complete a shorter list with default items of fixed ids", () => {
    const design = settings({ rounds: [] });
    const plan = buildChoicePlan(design, 0, { mode: "duels", count: 4 });
    expect(plan.rounds.map((round) => round.id)).toEqual([
      "round-1",
      "round-2",
      "round-3",
      "round-4",
    ]);
  });
});
