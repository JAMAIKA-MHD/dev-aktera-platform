import type { Campaign } from "@/src/types";
import { describe, expect, it } from "vitest";
import { DEFAULT_RULES, buildCampaignSnapshot } from "./campaign";

const campaign = (overrides: Partial<Campaign> = {}): Campaign => ({
  id: "campaign-1",
  organizationId: "org-1",
  name: "Summer campaign",
  arabicName: "",
  slug: "summer",
  gameType: "quiz",
  status: "active",
  winProbability: 30,
  prizes: [
    { id: "prize-1", templateId: "tpl-voucher", quantity: 50, weight: 3 },
    { id: "prize-2", templateId: "tpl-headphones", quantity: 5, weight: 1 },
  ],
  questions: [
    {
      id: "q-1",
      questionText: "Capital of Algeria?",
      options: ["Oran", "Algiers"],
      correctIndex: 1,
    },
    {
      id: "q-2",
      questionText: "Number of wilayas?",
      options: ["48", "58"],
      correctIndex: 1,
    },
  ],
  participantsCount: 0,
  rewardsClaimed: 0,
  startDate: "2026-09-01",
  endDate: "2026-09-30",
  ...overrides,
});

const templates = [
  { id: "tpl-voucher", name: "Voucher 2000 DA" },
  { id: "tpl-headphones", name: "Wireless headphones" },
];

function allKeys(value: unknown, keys = new Set<string>()): Set<string> {
  if (Array.isArray(value)) {
    for (const item of value) allKeys(item, keys);
  } else if (typeof value === "object" && value !== null) {
    for (const [key, child] of Object.entries(value)) {
      keys.add(key);
      allKeys(child, keys);
    }
  }
  return keys;
}

describe("buildCampaignSnapshot", () => {
  it("never exposes weights, stock, win probability or correct answers", () => {
    for (const gameType of [
      "lucky_wheel",
      "quiz",
      "scratch_card",
      "mystery_box",
      "hit_it",
    ] as const) {
      const keys = allKeys(
        buildCampaignSnapshot(campaign({ gameType }), templates),
      );
      for (const secret of [
        "weight",
        "quantity",
        "quantity_won",
        "winProbability",
        "correctIndex",
        "templateId",
      ]) {
        expect(keys.has(secret), secret).toBe(false);
      }
    }
  });

  it("copies the identity and the status of the campaign", () => {
    const snapshot = buildCampaignSnapshot(
      campaign({ status: "paused" }),
      templates,
    );
    expect(snapshot).toMatchObject({
      id: "campaign-1",
      name: "Summer campaign",
      gameType: "quiz",
      status: "paused",
    });
  });

  it("names the prizes after their template, as the database does", () => {
    expect(buildCampaignSnapshot(campaign(), templates).prizes).toEqual([
      { id: "prize-1", name: "Voucher 2000 DA", winMessage: null },
      { id: "prize-2", name: "Wireless headphones", winMessage: null },
    ]);
  });

  it("leaves the name empty when the template is unknown", () => {
    expect(buildCampaignSnapshot(campaign()).prizes[0].name).toBe("");
  });

  it("skips prizes that are not saved yet", () => {
    const snapshot = buildCampaignSnapshot(
      campaign({
        prizes: [{ templateId: "tpl-voucher", quantity: 1, weight: 1 }],
      }),
      templates,
    );
    expect(snapshot.prizes).toEqual([]);
  });

  it("keeps the question order and copies the options", () => {
    const source = campaign();
    const snapshot = buildCampaignSnapshot(source, templates);
    expect(snapshot.quiz).toEqual([
      { id: "q-1", text: "Capital of Algeria?", options: ["Oran", "Algiers"] },
      { id: "q-2", text: "Number of wilayas?", options: ["48", "58"] },
    ]);
    snapshot.quiz[0].options[0] = "Changed";
    expect(source.questions[0].options[0]).toBe("Oran");
  });

  describe("rules", () => {
    it("uses the RPC defaults when game_logic_config is empty", () => {
      expect(buildCampaignSnapshot(campaign()).rules).toEqual({
        quiz: DEFAULT_RULES.quiz,
      });
      expect(
        buildCampaignSnapshot(campaign({ gameType: "hit_it" })).rules,
      ).toEqual({ hitIt: DEFAULT_RULES.hitIt });
      expect(DEFAULT_RULES).toEqual({
        quiz: { passThresholdPercent: 100, secondsPerQuestion: 0 },
        hitIt: { winThreshold: 1, durationSeconds: 10 },
      });
    });

    it("reads the quiz rules from game_logic_config", () => {
      const snapshot = buildCampaignSnapshot(
        campaign({
          gameLogicConfig: {
            pass_threshold_percentage: 60,
            quiz_seconds_per_question: 15,
          },
        }),
      );
      expect(snapshot.rules.quiz).toEqual({
        passThresholdPercent: 60,
        secondsPerQuestion: 15,
      });
    });

    it("reads the Hit It rules, numeric strings included, like the RPC", () => {
      const snapshot = buildCampaignSnapshot(
        campaign({
          gameType: "hit_it",
          gameLogicConfig: { win_threshold: "8", hit_it_duration_seconds: 12 },
        }),
      );
      expect(snapshot.rules.hitIt).toEqual({
        winThreshold: 8,
        durationSeconds: 12,
      });
    });

    it("falls back to the default for unreadable values", () => {
      const snapshot = buildCampaignSnapshot(
        campaign({
          gameType: "hit_it",
          gameLogicConfig: { win_threshold: "", hit_it_duration_seconds: "x" },
        }),
      );
      expect(snapshot.rules.hitIt).toEqual(DEFAULT_RULES.hitIt);
      expect(
        buildCampaignSnapshot(campaign({ gameLogicConfig: "broken" })).rules
          .quiz,
      ).toEqual(DEFAULT_RULES.quiz);
    });

    it("has no rules for games decided by the draw alone", () => {
      for (const gameType of [
        "lucky_wheel",
        "scratch_card",
        "mystery_box",
      ] as const) {
        expect(buildCampaignSnapshot(campaign({ gameType })).rules).toEqual({});
      }
    });
  });
});
