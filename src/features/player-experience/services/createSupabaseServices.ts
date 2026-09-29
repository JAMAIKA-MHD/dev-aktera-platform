import type { SupabaseClient } from "@supabase/supabase-js";
import { createConsoleAnalyticsTracker } from "./local/consoleAnalyticsTracker";
import { createDataUrlAssetStorage } from "./local/dataUrlAssetStorage";
import { createDemoParticipationGateway } from "./local/demoParticipationGateway";
import type { DemoCampaignRules } from "./local/demoRules";
import { createNoopHumanVerification } from "./local/noopHumanVerification";
import type {
  Availability,
  ExperienceRepository,
  ExperienceServices,
} from "./ports";
import { publicStorageUrl } from "./storageUrl";
import { createSupabaseAnalyticsTracker } from "./supabase/supabaseAnalyticsTracker";
import { createSupabaseAssetStorage } from "./supabase/supabaseAssetStorage";
import { createSupabaseExperienceRepository } from "./supabase/supabaseExperienceRepository";
import { createSupabaseParticipationGateway } from "./supabase/supabaseParticipationGateway";

// Composition roots on Supabase (backend task B3.4), next to createLocalServices:
//   createStudioServices — the Studio and the sandbox of a real campaign: the design and its
//     images are saved to Supabase, but draws stay simulated in the browser (a preview never
//     consumes real stock);
//   createPublicServices — the public player page: the live gateway (select-prize) only.

export interface StudioServicesOptions {
  client: SupabaseClient;
  supabaseUrl: string;
  organizationId: string;
  campaignId: string;
  rules: DemoCampaignRules; // buildDemoRules(campaign, prizeTemplates)
  // Replaces the Supabase repository (B4.3 wraps it to import designs saved in the browser).
  repository?: ExperienceRepository;
}

export function createStudioServices(
  options: StudioServicesOptions,
): ExperienceServices {
  const { client, supabaseUrl, organizationId, campaignId, rules } = options;
  return {
    repository:
      options.repository ?? createSupabaseExperienceRepository({ client }),
    participation: createDemoParticipationGateway({ rules }),
    assets: createSupabaseAssetStorage({
      client,
      supabaseUrl,
      organizationId,
      campaignId,
    }),
    analytics: createConsoleAnalyticsTracker(),
    humanVerification: createNoopHumanVerification(),
  };
}

export interface PublicServicesOptions {
  client: SupabaseClient;
  supabaseUrl: string;
  availability: Availability; // from get_public_experience
}

// The public page reads its configuration with the campaign and never saves one.
const readOnlyRepository: ExperienceRepository = {
  async load() {
    return null;
  },
  async save() {
    return {
      ok: false,
      error: {
        code: "STORAGE_UNAVAILABLE",
        message: "The player page cannot save a design.",
      },
    };
  },
  async remove() {},
};

export function createPublicServices(
  options: PublicServicesOptions,
): ExperienceServices {
  const { client, supabaseUrl, availability } = options;
  return {
    repository: readOnlyRepository,
    participation: createSupabaseParticipationGateway({ client, availability }),
    // Players never upload: only resolving images matters (Storage, or older data URLs).
    assets: createDataUrlAssetStorage({
      resolveStorage: (bucket, path) =>
        publicStorageUrl(supabaseUrl, bucket, path),
    }),
    analytics: createSupabaseAnalyticsTracker({ client }),
    humanVerification: createNoopHumanVerification(),
  };
}
