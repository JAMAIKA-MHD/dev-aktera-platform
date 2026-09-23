import { useMemo } from "react";
import type { Campaign, PrizeTemplate } from "@/src/types";
import { buildCampaignSnapshot } from "../domain/campaign";
import { buildDemoRules } from "../services/createLocalServices";
import {
  PlayerExperienceStudio,
  type PlayerExperienceStudioProps,
} from "./PlayerExperienceStudio";

// The Studio as the dashboard mounts it (tasks.md T7.1): it takes the app's own campaigns
// (useCampaigns) and prize templates, and builds from them what the Studio reads — the
// campaign snapshot the runtime may see, and, apart, the draw rules shown read-only in the
// Game panel. The app never has to know either shape.

export interface CampaignStudioProps extends Pick<
  PlayerExperienceStudioProps,
  "onEditCampaignSettings" | "onRefreshCampaign" | "onClose" | "className"
> {
  campaigns: readonly Campaign[];
  prizeTemplates: readonly Pick<PrizeTemplate, "id" | "name">[];
  campaignId: string | null; // null or unknown = standalone, on the demo campaign
  onCampaignChange: (campaignId: string | null) => void;
}

export function CampaignStudio({
  campaigns,
  prizeTemplates,
  campaignId,
  onCampaignChange,
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
  const options = useMemo(
    () =>
      campaigns
        .filter((item) => item.status !== "archived")
        .map((item) => ({ id: item.id, name: item.name })),
    [campaigns],
  );
  return (
    <PlayerExperienceStudio
      campaign={snapshot}
      rules={rules}
      campaigns={options}
      onCampaignChange={onCampaignChange}
      {...props}
    />
  );
}
