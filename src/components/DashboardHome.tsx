import React from "react";
import { Campaign, PrizeTemplate, LeadEntry } from "../types";
import { OverviewKpiCards } from "./overview/OverviewKpiCards";
import { VisitorStatsChart } from "./overview/VisitorStatsChart";
import { CampaignAgendaGrid } from "./overview/CampaignAgendaGrid";
import { CampaignAudienceCard } from "./overview/CampaignAudienceCard";
import { CampaignInsightsCard } from "./overview/CampaignInsightsCard";

interface DashboardHomeProps {
  campaigns: Campaign[];
  prizes: PrizeTemplate[];
  leads: LeadEntry[];
  onNavigate: (tab: any) => void;
  onSelectCampaign: (id: string) => void;
  onOpenWizard: () => void;
}

export const DashboardHome: React.FC<DashboardHomeProps> = ({
  campaigns = [],
  leads = [],
  onNavigate,
}) => {
  const activeCampaigns = (campaigns ?? []).filter(
    (c) => c.status === "active",
  );

  return (
    <div
      id="b2b-dashboard-home"
      className="space-y-8 text-brand-text max-w-[1800px] mx-auto pb-10"
    >
      {/* 1. TOP 4 KPI CARDS */}
      <OverviewKpiCards
        activeCampaignsCount={activeCampaigns.length}
        leadsCount={(leads ?? []).length}
      />

      {/* 2. MAIN 2-COLUMN SECTION */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-stretch">
        {/* LEFT COLUMN (Visitor Stats & Campaign Agenda) */}
        <div className="lg:col-span-7 flex flex-col gap-8">
          <div className="flex-1 min-h-[350px]">
            <VisitorStatsChart
              campaigns={campaigns}
              onMoreDetails={() => onNavigate("analytics")}
            />
          </div>
          <div className="flex-1 min-h-[350px]">
            <CampaignAgendaGrid campaigns={campaigns} />
          </div>
        </div>

        {/* RIGHT COLUMN (Campaign Audience & Campaign Insights) */}
        <div className="lg:col-span-5 flex flex-col gap-8">
          <div className="flex-1 min-h-[350px]">
            <CampaignAudienceCard />
          </div>
          <div className="flex-1 min-h-[350px]">
            <CampaignInsightsCard
              campaigns={campaigns}
              onSeeDetails={() => onNavigate("analytics")}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
