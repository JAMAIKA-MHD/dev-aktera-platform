import { DEFAULT_GAME_TYPE } from "../domain/defaults";
import { createDemoCampaign } from "../presets/demoCampaign";
import { createConsoleAnalyticsTracker } from "./local/consoleAnalyticsTracker";
import { createDataUrlAssetStorage } from "./local/dataUrlAssetStorage";
import { createDemoParticipationGateway } from "./local/demoParticipationGateway";
import {
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

// Composition root of the MVP: the local adapters, as used by the Studio and demos.
// The public player route will get createSupabaseServices() instead (plan §7.4), and refuses
// the "demo" and "scripted" gateways (allowedGatewayModes, T4.1).

export interface LocalServicesOptions {
  participation?: "demo" | "scripted"; // default: "demo"
  // Draw rules of the campaign being edited (buildDemoRules). Default: the demo campaign.
  rules?: DemoCampaignRules;
  scenario?: ScriptedScenario; // for "scripted"; default: "lose"
}

export function createLocalServices(
  options: LocalServicesOptions = {},
): ExperienceServices {
  const rules =
    options.rules ??
    buildStandaloneDemoRules(createDemoCampaign(DEFAULT_GAME_TYPE));
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
    assets: createDataUrlAssetStorage(),
    analytics: createConsoleAnalyticsTracker(),
    humanVerification: createNoopHumanVerification(),
  };
}
