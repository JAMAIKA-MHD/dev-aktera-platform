// Studio designs of the Player Studio seed, built by the Player Experience module itself
// (createDefaultExperience), so that the Studio opens them without any issue (rules SD6).
// The module is TypeScript: it is loaded through Vite, already installed (no new dependency).
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { createServer } from "vite";

import {
  PRIZE_NAME,
  PRIZE_QUANTITY,
  TEMPLATE_ID,
  gameLogicConfig,
  prizeId,
  questionId,
} from "./seedStudioData.mjs";
import { QUESTIONS } from "./seedStudioQuestions.mjs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../..");
const DOMAIN = "/src/features/player-experience/domain";

export async function loadDesignBuilders() {
  const vite = await createServer({
    root: ROOT,
    configFile: false,
    logLevel: "error",
    appType: "custom",
    server: { middlewareMode: true, hmr: false, watch: null },
    optimizeDeps: { noDiscovery: true, include: [] }, // no app-wide dependency scan
  });
  try {
    const defaults = await vite.ssrLoadModule(`${DOMAIN}/defaults.ts`);
    const campaign = await vite.ssrLoadModule(`${DOMAIN}/campaign.ts`);
    const display = await vite.ssrLoadModule(`${DOMAIN}/display.ts`);
    return {
      createDefaultExperience: defaults.createDefaultExperience,
      buildCampaignSnapshot: campaign.buildCampaignSnapshot,
      quizSourceHash: display.quizSourceHash,
    };
  } finally {
    await vite.close();
  }
}

// The design of one seed campaign, as the Studio would have saved it.
export function seedDesign(builders, c, id, savedAt) {
  const questions = c.game === "quiz" ? QUESTIONS : [];
  // The campaign as the dashboard loads it (useCampaigns), for the module's snapshot.
  const campaign = {
    id,
    name: c.name,
    gameType: c.game,
    status: c.status === "ended" ? "archived" : c.status,
    prizes: [
      {
        id: prizeId(c.n),
        templateId: TEMPLATE_ID,
        quantity: PRIZE_QUANTITY,
        weight: 1,
      },
    ],
    questions: questions.map((q, k) => ({
      id: questionId(c.n, k),
      questionText: q.text,
      options: q.options,
      correctIndex: q.correct,
    })),
    gameLogicConfig: gameLogicConfig(c.game),
  };
  const config = builders.createDefaultExperience({
    gameType: c.game,
    presetId: c.preset,
    campaign: builders.buildCampaignSnapshot(campaign, [
      { id: TEMPLATE_ID, name: PRIZE_NAME },
    ]),
  });
  const title = `Seed design — ${c.name.replace(/^Seed · /, "")}`;
  config.screens.welcome.title = {
    ...config.screens.welcome.title,
    fr: title,
    en: title,
  };
  config.updatedAt = savedAt;
  if (questions.length) {
    // Translations of the campaign questions, fingerprinted like the Studio does.
    config.game.quiz = {
      translations: Object.fromEntries(
        questions.map((q, k) => [
          questionId(c.n, k),
          {
            sourceHash: builders.quizSourceHash({
              text: q.text,
              options: q.options,
            }),
            text: q.translated.text,
            options: q.translated.options,
          },
        ]),
      ),
    };
  }
  return config;
}
