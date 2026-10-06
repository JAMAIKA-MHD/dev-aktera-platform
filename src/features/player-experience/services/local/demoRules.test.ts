import type { Campaign } from "@/src/types";
import { describe, expect, it } from "vitest";
import { createDemoCampaign } from "../../presets/demoCampaign";
import {
  STANDALONE_WIN_PROBABILITY,
  buildDemoRules,
  buildStandaloneDemoRules,
} from "./demoRules";

const campaign = (changes: Partial<Campaign> = {}): Campaign => ({
  id: "campaign-1",
  name: "Summer campaign",
  arabicName: "",
  slug: "summer",
  gameType: "lucky_wheel",
  status: "active",
  winProbability: 30,
  maxEntries: "1",
  prizes: [
    {
      id: "prize-1",
      templateId: "tpl-voucher",
      quantity: 50,
      quantity_won: 12,
      weight: 3,
    },
    { id: "prize-2", templateId: "tpl-gift", quantity: 5, weight: 1 },
    { templateId: "tpl-new", quantity: 9, weight: 1 }, // not saved yet
  ],
  questions: [
    {
      id: "q-1",
      questionText: "Capital?",
      options: ["Oran", "Alger"],
      correctIndex: 1,
    },
    {
      id: "q-2",
      questionText: "Wilayas?",
      options: ["48", "58"],
      correctIndex: 1,
    },
  ],
  participantsCount: 0,
  rewardsClaimed: 0,
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  ...changes,
});

const templates = [
  { id: "tpl-voucher", name: "Bon 2000 DA" },
  { id: "tpl-gift", name: "Coffret cadeau" },
];

describe("buildDemoRules", () => {
  it("reads the draw rules of the campaign", () => {
    expect(buildDemoRules(campaign(), templates)).toEqual({
      campaignId: "campaign-1",
      active: true,
      winProbability: 30,
      maxEntries: 1,
      prizes: [
        {
          id: "prize-1",
          name: "Bon 2000 DA",
          winMessage: null,
          weight: 3,
          remaining: 38,
        },
        {
          id: "prize-2",
          name: "Coffret cadeau",
          winMessage: null,
          weight: 1,
          remaining: 5,
        },
      ],
    });
  });

  it("maps the entry limit as the campaign service stores it", () => {
    expect(buildDemoRules(campaign({ maxEntries: "2" })).maxEntries).toBe(2);
    expect(
      buildDemoRules(campaign({ maxEntries: "unlimited" })).maxEntries,
    ).toBe(0);
    expect(buildDemoRules(campaign({ maxEntries: undefined })).maxEntries).toBe(
      1,
    );
  });

  it("keeps the probability between 0 and 100 and the stock at 0 or more", () => {
    expect(
      buildDemoRules(campaign({ winProbability: 140 })).winProbability,
    ).toBe(100);
    expect(
      buildDemoRules(campaign({ winProbability: -5 })).winProbability,
    ).toBe(0);
    expect(
      buildDemoRules(campaign({ winProbability: Number.NaN })).winProbability,
    ).toBe(0);
    const oversold = campaign({
      prizes: [
        { id: "p", templateId: "t", quantity: 2, quantity_won: 5, weight: 1 },
      ],
    });
    expect(buildDemoRules(oversold).prizes[0].remaining).toBe(0);
  });

  it("marks a campaign that is not active", () => {
    expect(buildDemoRules(campaign({ status: "paused" })).active).toBe(false);
  });

  it("keeps the correct answers and the threshold of a quiz", () => {
    const rules = buildDemoRules(
      campaign({
        gameType: "quiz",
        gameLogicConfig: { pass_threshold_percentage: 50 },
      }),
    );
    expect(rules.quiz).toEqual({
      passThresholdPercent: 50,
      questions: [
        { id: "q-1", correctIndex: 1 },
        { id: "q-2", correctIndex: 1 },
      ],
    });
    expect(rules.hitIt).toBeUndefined();
  });

  it("keeps the threshold of Hit It, with the server default", () => {
    expect(
      buildDemoRules(
        campaign({ gameType: "hit_it", gameLogicConfig: { win_threshold: 8 } }),
      ).hitIt,
    ).toEqual({ winThreshold: 8 });
    expect(buildDemoRules(campaign({ gameType: "hit_it" })).hitIt).toEqual({
      winThreshold: 1,
    });
    expect(buildDemoRules(campaign()).quiz).toBeUndefined();
  });
});

describe("buildStandaloneDemoRules", () => {
  it("gives every demo prize the same chance, with stock, one entry per phone", () => {
    const rules = buildStandaloneDemoRules(createDemoCampaign("lucky_wheel"));
    expect(rules).toMatchObject({
      campaignId: "demo-campaign",
      active: true,
      winProbability: STANDALONE_WIN_PROBABILITY,
      maxEntries: 1,
    });
    expect(STANDALONE_WIN_PROBABILITY).toBe(50);
    expect(rules.prizes).toHaveLength(4);
    for (const prize of rules.prizes) {
      expect(prize).toMatchObject({ weight: 1, remaining: 100 });
    }
    expect(rules.quiz).toBeUndefined();
    expect(rules.hitIt).toBeUndefined();
  });

  it("knows the correct answer of each demo question", () => {
    const campaign = createDemoCampaign("quiz");
    const rules = buildStandaloneDemoRules(campaign);
    const answers = rules.quiz?.questions.map(({ id, correctIndex }) => {
      const question = campaign.quiz.find((candidate) => candidate.id === id);
      return question?.options[correctIndex];
    });
    expect(answers).toEqual(["Alger", "58", "Le Sahara"]);
    expect(rules.quiz?.passThresholdPercent).toBe(100);
  });

  it("falls back to the first option for a question it does not know", () => {
    const campaign = createDemoCampaign("quiz");
    campaign.quiz.push({ id: "custom", text: "?", options: ["a", "b"] });
    const rules = buildStandaloneDemoRules(campaign);
    expect(rules.quiz?.questions.at(-1)).toEqual({
      id: "custom",
      correctIndex: 0,
    });
  });

  it("keeps the Hit It threshold of the demo campaign, and its status", () => {
    const hitIt = createDemoCampaign("hit_it");
    expect(buildStandaloneDemoRules(hitIt).hitIt).toEqual({ winThreshold: 1 });
    expect(buildStandaloneDemoRules(hitIt).quiz).toBeUndefined();
    expect(
      buildStandaloneDemoRules({ ...hitIt, status: "paused" }).active,
    ).toBe(false);
    expect(
      buildStandaloneDemoRules({ ...createDemoCampaign("quiz"), rules: {} })
        .quiz,
    ).toBeUndefined();
    expect(
      buildStandaloneDemoRules({ ...hitIt, rules: {} }).hitIt,
    ).toBeUndefined();
  });
});
