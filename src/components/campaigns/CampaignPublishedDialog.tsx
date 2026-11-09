// Shown once a campaign has just gone live: what it took to get here is done, and the link and
// the QR code are what the brand needs next.
import { Rocket } from "lucide-react";

import type { Campaign } from "../../types";
import { isScheduled } from "./campaignMeta";
import {
  CampaignDialog,
  CampaignLinkBar,
  CampaignQrCode,
} from "./CampaignLinkShare";
import { CxButton } from "./campaignUi";

export function CampaignPublishedDialog({
  campaign,
  onClose,
}: {
  campaign: Pick<Campaign, "name" | "slug" | "startDate">;
  onClose: () => void;
}) {
  const scheduled = isScheduled({ ...campaign, status: "active" });
  return (
    <CampaignDialog
      title={scheduled ? "Your campaign is scheduled" : "Your campaign is live"}
      subtitle={`${campaign.name}${scheduled ? ": players can play from its start date." : ""}`}
      icon={
        <span className="grid size-9 shrink-0 place-items-center rounded-full bg-cx-success-soft text-cx-success">
          <Rocket className="size-4" aria-hidden />
        </span>
      }
      footer={
        <CxButton variant="primary" autoFocus onClick={onClose}>
          Done
        </CxButton>
      }
      onClose={onClose}
    >
      <div className="grid grid-cols-1 gap-5">
        <CampaignLinkBar slug={campaign.slug} />
        <CampaignQrCode name={campaign.name} slug={campaign.slug} />
      </div>
    </CampaignDialog>
  );
}
