import type { CampaignSnapshot } from "../domain/campaign";
import { DEFAULT_GAME_TYPE } from "../domain/defaults";
import { createDemoCampaign } from "../presets/demoCampaign";
import { createConsoleAnalyticsTracker } from "./local/consoleAnalyticsTracker";
import { createDataUrlAssetStorage } from "./local/dataUrlAssetStorage";
import { createDemoEntryStore } from "./local/demoEntryStore";
import { createDemoParticipationGateway } from "./local/demoParticipationGateway";
import {
  buildDemoRules,
  buildStandaloneDemoRules,
  type DemoCampaignRules,
} from "./local/demoRules";
import { createLocalExperienceRepository } from "./local/localExperienceRepository";
import { createNoopHumanVerification } from "./local/noopHumanVerification";
import {
  createScriptedParticipationGateway,
  type ScriptedScenario,
} from "./local/scriptedParticipationGateway";
import type { ExperienceServices } from "./ports";

export type { ScriptedScenario };
// What decides a win, for the Studio's read-only rules card (never for the runtime).
export { buildDemoRules, buildStandaloneDemoRules };
export type { DemoCampaignRules };

// The Studio's "Reset demo data": forgets the demo participations of one campaign (or all),
// so a phone number can play again in the preview. Real entries are never touched.
export function resetDemoEntries(campaignId?: string): void {
  createDemoEntryStore().reset(campaignId);
}

// Composition root of the MVP: the local adapters, as used by the Studio and demos.
// The public player route will get createSupabaseServices() instead (plan §7.4), and refuses
// the "demo" and "scripted" gateways (allowedGatewayModes, T4.1).

export interface LocalServicesOptions {
  participation?: "demo" | "scripted"; // default: "demo"
  // Draw rules of the campaign being edited (buildDemoRules). Without them, standalone demo
  // rules are built from `campaign`: the campaign previewed, by default the demo campaign.
  rules?: DemoCampaignRules;
  campaign?: CampaignSnapshot;
  scenario?: ScriptedScenario; // for "scripted"; default: "lose"
  // Public URL of images uploaded to Supabase Storage (publicStorageUrl), so that the preview
  // shows them; without it, storage images resolve to nothing.
  resolveStorage?: (bucket: string, path: string) => string | null;
}

export function createLocalServices(
  options: LocalServicesOptions = {},
): ExperienceServices {
  const rules =
    options.rules ??
    buildStandaloneDemoRules(
      options.campaign ?? createDemoCampaign(DEFAULT_GAME_TYPE),
    );
  const participation =
    options.participation === "scripted"
      ? createScriptedParticipationGateway({
          scenario: options.scenario ?? "lose",
          prizes: rules.prizes,
        })
      : createDemoParticipationGateway({ rules });
  return {
    repository: createLocalExperienceRepository(),
    participation,
    assets: createDataUrlAssetStorage({
      resolveStorage: options.resolveStorage,
    }),
    analytics: createConsoleAnalyticsTracker(),
    humanVerification: createNoopHumanVerification(),
  };
}
