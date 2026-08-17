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
  onNavigate,
}) => {
  return (
    <div
      id="dashboard-home-root"
      className="space-y-5 text-brand-text max-w-[1300px] mx-auto pb-12 transition-colors duration-300"
    >
      {/* 1. TOP ROW: KPI Metrics Cards */}
      <OverviewKpiCards />

      {/* 2. MIDDLE ROW: Main Visitor Traffic Chart + Side Campaign Insights (4 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Visitor Traffic Area Chart (8 Cols) */}
        <div className="lg:col-span-8 flex flex-col min-h-[212px]">
          <VisitorStatsChart
            campaigns={campaigns}
            onMoreDetails={() => onNavigate?.("analytics")}
          />
        </div>

        {/* Right: Campaign Insights & Conversion Stats (4 Cols) */}
        <div className="lg:col-span-4 flex flex-col min-h-[212px]">
          <CampaignInsightsCard
            campaigns={campaigns}
            onSeeDetails={() => onNavigate?.("analytics")}
          />
        </div>
      </div>

      {/* 3. BOTTOM ROW: Campaign Audience Breakdown + Campaign Agenda Heatmap (7 Cols) */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5 items-stretch">
        {/* Left: Audience Channels & Demographics (5 Cols) */}
        <div className="lg:col-span-5 flex flex-col min-h-[212px]">
          <CampaignAudienceCard />
        </div>

        {/* Right: Campaign Agenda Heatmap (7 Cols - Expanded) */}
        <div className="lg:col-span-7 flex flex-col min-h-[212px]">
          <CampaignAgendaGrid campaigns={campaigns} />
        </div>
      </div>
    </div>
  );
};
