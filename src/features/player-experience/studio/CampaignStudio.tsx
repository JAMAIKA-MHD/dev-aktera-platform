import { useMemo } from "react";
import type { Campaign, PrizeTemplate } from "@/src/types";
import { buildCampaignSnapshot } from "../domain/campaign";
import { buildDemoRules } from "../services/createLocalServices";
import type { StudioBackend } from "../services/createSupabaseServices";
import {
  PlayerExperienceStudio,
  type PlayerExperienceStudioProps,
} from "./PlayerExperienceStudio";
import { useCampaignServices } from "./useCampaignServices";

// The Studio as the dashboard mounts it (tasks.md T7.1): it takes the app's own campaigns
// (useCampaigns) and prize templates, and builds from them what the Studio reads — the
// campaign snapshot the runtime may see, and, apart, the draw rules only the Studio's own demo
// gateway plays with (never shown in the panels). The app never has to know either shape.
//
// With a backend (backend task B4.1), a real campaign's design and images are saved to
// Supabase; the standalone Studio (demo campaign) stays in the browser.

export interface CampaignStudioProps extends Pick<
  PlayerExperienceStudioProps,
  "onClose" | "className"
> {
  campaigns: readonly Campaign[];
  prizeTemplates: readonly Pick<PrizeTemplate, "id" | "name">[];
  campaignId: string | null; // null or unknown = standalone, on the demo campaign
  backend?: StudioBackend; // without it: the local services of the MVP
}

export function CampaignStudio({
  campaigns,
  prizeTemplates,
  campaignId,
  backend,
  ...props
}: CampaignStudioProps) {
  const campaign = campaigns.find((item) => item.id === campaignId) ?? null;
  const snapshot = useMemo(
    () => (campaign ? buildCampaignSnapshot(campaign, prizeTemplates) : null),
    [campaign, prizeTemplates],
  );
  const rules = useMemo(
    () => (campaign ? buildDemoRules(campaign, prizeTemplates) : null),
    [campaign, prizeTemplates],
  );
  const services = useCampaignServices(backend, campaign, rules);
  return (
    <PlayerExperienceStudio
      campaign={snapshot}
      services={services}
      {...props}
    />
  );
}
