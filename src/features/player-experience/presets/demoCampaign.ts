import { DEFAULT_RULES, type CampaignSnapshot } from "../domain/campaign";
import type { GameType } from "../domain/gameTypes";

// Fixed campaign used when the Studio opens without a real one (standalone preview, demo).
// Stable ids, so a configuration saved against the demo keeps its prize displays.
// Prize and question texts play the role of database values: one language, as a brand would type them.

export const DEMO_CAMPAIGN_ID = "demo-campaign";

const DEMO_PRIZES: CampaignSnapshot["prizes"] = [
  {
    id: "demo-prize-voucher",
    name: "Bon d'achat 2000 DA",
    winMessage: "Présentez ce code en caisse pour profiter de votre bon.",
  },
  { id: "demo-prize-headphones", name: "Casque sans fil", winMessage: null },
  {
    id: "demo-prize-discount",
    name: "Réduction de 20 %",
    winMessage: "Valable sur votre prochain achat en magasin.",
  },
  { id: "demo-prize-gift", name: "Coffret cadeau", winMessage: null },
];

const DEMO_QUESTIONS: CampaignSnapshot["quiz"] = [
  {
    id: "demo-question-capital",
    text: "Quelle est la capitale de l'Algérie ?",
    options: ["Oran", "Alger", "Constantine"],
  },
  {
    id: "demo-question-wilayas",
    text: "Combien de wilayas compte l'Algérie ?",
    options: ["48", "58", "69"],
  },
  {
    id: "demo-question-sahara",
    text: "Quel désert couvre la plus grande partie du pays ?",
    options: ["Le Sahara", "Le Kalahari", "Le Gobi"],
  },
];

export function createDemoCampaign(gameType: GameType): CampaignSnapshot {
  return structuredClone({
    id: DEMO_CAMPAIGN_ID,
    name: "Campagne de démonstration",
    gameType,
    status: "active",
    prizes: DEMO_PRIZES,
    quiz: DEMO_QUESTIONS,
    rules: DEFAULT_RULES,
  });
}
