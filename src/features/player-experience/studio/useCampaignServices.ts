import { useMemo, useRef } from "react";
import type { Campaign } from "@/src/types";
import type { DemoCampaignRules } from "../services/local/demoRules";
import {
  createStudioServices,
  type StudioBackend,
} from "../services/createSupabaseServices";
import type { ExperienceServices } from "../services/ports";

// The services of the Studio and the sandbox for one campaign (backend task B4.1): Supabase
// for a real campaign when the dashboard gives a backend, the local services otherwise
// (undefined: the component falls back to createLocalServices).
//
// They are created once per campaign: new services would reload the design and drop what the
// brand is typing. A refetch of the same campaign (a prize renamed in the Wizard) keeps them;
// the draw rules they were created with only feed the Studio's own demo gateway, which the
// preview does not use (the preview frame builds its own).
export function useCampaignServices(
  backend: StudioBackend | undefined,
  campaign: Campaign | null,
  rules: DemoCampaignRules | null,
): ExperienceServices | undefined {
  const latestRules = useRef(rules);
  latestRules.current = rules;
  const campaignId = campaign?.id ?? null;
  const organizationId = campaign?.organizationId ?? null;

  return useMemo(() => {
    if (!backend || !campaignId || !organizationId || !latestRules.current) {
      return undefined;
    }
    return createStudioServices({
      client: backend.client,
      supabaseUrl: backend.supabaseUrl,
      organizationId,
      campaignId,
      rules: latestRules.current,
    });
  }, [backend, campaignId, organizationId]);
}
