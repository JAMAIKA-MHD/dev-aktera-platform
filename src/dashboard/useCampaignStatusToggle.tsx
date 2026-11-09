// Publish, pause and resume, as the campaign cards and the campaign page offer them. A draft
// that has just been published hands over to a window with its link and its QR code.
import { useState } from "react";

import { CampaignPublishedDialog } from "../components/campaigns/CampaignPublishedDialog";
import type { Campaign } from "../types";
import { useDashboard } from "./DashboardContext";

type Published = Pick<Campaign, "name" | "slug" | "startDate">;

export function useCampaignStatusToggle() {
  const { campaigns, toggleCampaignStatus } = useDashboard();
  const [published, setPublished] = useState<Published | null>(null);

  const toggleStatus = async (id: string) => {
    const campaign = campaigns.find((item) => item.id === id);
    const isPublishing = campaign?.status === "draft";
    const done = await toggleCampaignStatus(id);
    if (done && isPublishing && campaign) setPublished(campaign);
  };

  const publishedDialog = published ? (
    <CampaignPublishedDialog
      campaign={published}
      onClose={() => setPublished(null)}
    />
  ) : null;

  return { toggleStatus, publishedDialog };
}
