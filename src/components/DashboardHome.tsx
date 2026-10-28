import React from "react";
import { Campaign, PrizeTemplate, LeadEntry } from "../types";
import { OverviewPage } from "./overview/OverviewPage";

interface DashboardHomeProps {
  campaigns: Campaign[];
  prizes: PrizeTemplate[];
  leads: LeadEntry[];
  onNavigate: (tab: any) => void;
  onSelectCampaign: (id: string) => void;
  onOpenWizard: () => void;
}

// The Overview page (overview/OverviewPage.tsx). Its numbers are mock data for now; the
// campaigns, prizes and leads it receives are kept for when each block is wired to them.
export const DashboardHome: React.FC<DashboardHomeProps> = ({
  onNavigate,
  onOpenWizard,
}) => (
  <OverviewPage
    onNewCampaign={onOpenWizard}
    onOpenAnalytics={() => onNavigate?.("analytics")}
    onOpenCampaigns={() => onNavigate?.("campaigns")}
    onOpenRewards={() => onNavigate?.("prizes")}
    onOpenBilling={() => onNavigate?.("billing")}
    onOpenAccount={() => onNavigate?.("account")}
  />
);
