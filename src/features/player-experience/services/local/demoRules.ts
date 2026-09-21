import type { Campaign, PrizeTemplate } from "@/src/types";
import { buildCampaignSnapshot } from "../../domain/campaign";

// What decides a win in a campaign: probability, stock, weights, correct answers, thresholds.
// Only the demo gateway reads it, to simulate the server in the Studio (plan §7.3). It never
// reaches the runtime (ESLint forbids runtime → services/local) nor ExperienceConfig.

export interface DemoPrize {
  id: string;
  name: string;
  winMessage: string | null;
  weight: number;
  remaining: number; // stock left in the real campaign, before demo wins
}

export interface DemoCampaignRules {
  campaignId: string;
  active: boolean; // the server only draws for "active" campaigns
  winProbability: number; // 0–100
  maxEntries: number; // entries allowed per phone number; 0 = unlimited
  prizes: DemoPrize[];
  quiz?: {
    passThresholdPercent: number;
    questions: Array<{ id: string; correctIndex: number }>;
  };
  hitIt?: { winThreshold: number };
}

const finite = (value: unknown): number =>
  typeof value === "number" && Number.isFinite(value) ? value : 0;

// Campaign.maxEntries → campaigns.max_entries, as campaignService writes it.
function maxEntriesOf(campaign: Campaign): number {
  if (campaign.maxEntries === "unlimited") return 0;
  if (campaign.maxEntries === "2") return 2;
  return 1; // "1", or no value: the server default
}

// Reads the dashboard Campaign model (useCampaigns), like buildCampaignSnapshot (T1.8),
// from which it takes the prize names and the public rules, so both always agree.
export function buildDemoRules(
  campaign: Campaign,
  prizeTemplates: readonly Pick<PrizeTemplate, "id" | "name">[] = [],
): DemoCampaignRules {
  const snapshot = buildCampaignSnapshot(campaign, prizeTemplates);
  const drawData = new Map(campaign.prizes.map((prize) => [prize.id, prize]));
  const rules: DemoCampaignRules = {
    campaignId: campaign.id,
    active: campaign.status === "active",
    winProbability: Math.min(100, Math.max(0, finite(campaign.winProbability))),
    maxEntries: maxEntriesOf(campaign),
    // The snapshot's prizes (saved ones only: the server could never award the others),
    // with their draw data. Each comes from campaign.prizes, so the lookup always succeeds.
    prizes: snapshot.prizes.map((prize) => {
      const source = drawData.get(prize.id) as Campaign["prizes"][number];
      return {
        id: prize.id,
        name: prize.name,
        winMessage: prize.winMessage,
        weight: finite(source.weight),
        remaining: Math.max(
          0,
          finite(source.quantity) - finite(source.quantity_won),
        ),
      };
    }),
  };
  if (snapshot.rules.quiz) {
    rules.quiz = {
      passThresholdPercent: snapshot.rules.quiz.passThresholdPercent,
      questions: campaign.questions.map((question) => ({
        id: question.id,
        correctIndex: question.correctIndex,
      })),
    };
  }
  if (snapshot.rules.hitIt) {
    rules.hitIt = { winThreshold: snapshot.rules.hitIt.winThreshold };
  }
  return rules;
}
