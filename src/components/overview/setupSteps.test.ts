import { describe, expect, it } from "vitest";

import {
  deriveSetupSteps,
  gaugeSegmentPath,
  numberWord,
  type SetupFacts,
} from "./setupSteps";

const NOTHING: SetupFacts = {
  hasReward: false,
  hasCampaign: false,
  hasDesign: false,
  sandboxTested: false,
  hasLaunched: false,
};
const statuses = (facts: SetupFacts) =>
  deriveSetupSteps(facts).map((step) => step.status);

describe("deriveSetupSteps", () => {
  it("starts on the reward, with everything after it locked", () => {
    expect(statuses(NOTHING)).toEqual([
      "current",
      "locked",
      "locked",
      "locked",
      "locked",
    ]);
  });

  it("moves on as the account does each thing", () => {
    const reward = { ...NOTHING, hasReward: true };
    expect(statuses(reward)[1]).toBe("current");
    const campaign = { ...reward, hasCampaign: true };
    expect(statuses(campaign)[2]).toBe("current");
    const design = { ...campaign, hasDesign: true };
    expect(statuses(design)[3]).toBe("current");
    const sandbox = { ...design, sandboxTested: true };
    expect(statuses(sandbox)).toEqual([
      "done",
      "done",
      "done",
      "done",
      "current",
    ]);
  });

  it("keeps what was done out of order, with the other open steps locked", () => {
    expect(statuses({ ...NOTHING, sandboxTested: true })).toEqual([
      "current",
      "locked",
      "locked",
      "done",
      "locked",
    ]);
  });

  it("keeps the skipped steps open after a campaign is launched", () => {
    expect(
      statuses({ ...NOTHING, hasReward: true, hasLaunched: true }),
    ).toEqual(["done", "done", "current", "locked", "done"]);
  });

  it("is done once the launch and every other step are", () => {
    expect(
      new Set(
        statuses({
          hasReward: true,
          hasCampaign: true,
          hasDesign: true,
          sandboxTested: true,
          hasLaunched: true,
        }),
      ),
    ).toEqual(new Set(["done"]));
  });

  it("keeps the final copy and time of each step", () => {
    expect(
      deriveSetupSteps(NOTHING).map((step) => [
        step.title,
        step.action,
        step.minutes,
        step.node.action,
      ]),
    ).toEqual([
      ["Add a reward", "Add a reward", 2, "Add reward"],
      ["Create a campaign", "Create campaign", 3, "Create"],
      ["Design the player screen", "Open editor", 5, "Open editor"],
      ["Preview as a player", "Preview", 1, "Preview"],
      ["Go live", "Go live", 1, "Go live"],
    ]);
  });
});

describe("numberWord", () => {
  it("spells the count, and falls back to the figure", () => {
    expect(numberWord(5)).toBe("Five");
    expect(numberWord(12)).toBe("12");
  });
});

describe("gaugeSegmentPath", () => {
  const COUNT = 5;

  it("starts 3 degrees past the left end and sweeps clockwise", () => {
    const path = gaugeSegmentPath(0, COUNT);
    expect(path.startsWith("M 24.13 122.98")).toBe(true);
    expect(path).toContain("A 96 96 0 0 1");
  });

  it("is symmetrical: the last segment mirrors the first", () => {
    const start = gaugeSegmentPath(0, COUNT).split(" ").slice(1, 3).map(Number);
    const end = gaugeSegmentPath(COUNT - 1, COUNT)
      .split(" ")
      .slice(-2)
      .map(Number);
    expect(end[0]).toBeCloseTo(240 - start[0], 1);
    expect(end[1]).toBeCloseTo(start[1], 1);
  });
});
