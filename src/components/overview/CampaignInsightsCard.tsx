import React, { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Campaign } from "../../types";
import { useTheme } from "../../contexts/ThemeContext";
import { CAMPAIGN_INSIGHTS_DATA } from "./OverviewMockData";

interface CampaignInsightsCardProps {
  campaigns?: Campaign[];
  onSeeDetails?: () => void;
}

export const CampaignInsightsCard: React.FC<CampaignInsightsCardProps> = ({
  campaigns = [],
  onSeeDetails,
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState("All channels");

  // Dynamically select the most popular campaign from the database (or fallback)
  const popularCampaign = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return null;
    const sorted = [...campaigns].sort(
      (a, b) => b.participantsCount - a.participantsCount,
    );
    return sorted[0] || campaigns[0];
  }, [campaigns]);

  const channelOptions = [
    "All channels",
    ...(campaigns.length > 0
      ? campaigns.map((c) => c.name)
      : ["Facebook Ads", "Instagram Reels", "Direct Link"]),
  ];

  return (
    <div className="backdrop-blur-xl bg-card-bg/90 dark:bg-[#111726]/80 border border-card-border/80 dark:border-white/10 rounded-[32px] p-7 sm:p-8 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30 flex flex-col justify-between h-full">
      {/* Top Header: Title, Subtitle, and Filter Dropdown */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-xl sm:text-2xl text-brand-text">
            Campaign Insights
          </h3>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-0.5">
            {popularCampaign
              ? `most used compaigns (${popularCampaign.name})`
              : "most used compaigns"}
          </p>
        </div>

        {/* Filter Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 dark:border-white/10 bg-card-bg-subtle/80 text-xs sm:text-sm font-semibold text-brand-textMuted hover:text-brand-text transition-colors cursor-pointer"
          >
            <span className="truncate max-w-[120px]">{selectedChannel}</span>
            <ChevronDown className="w-4 h-4 opacity-70 shrink-0" />
          </button>

          {filterOpen && (
            <div className="absolute right-0 mt-1 w-48 backdrop-blur-2xl bg-card-bg/95 dark:bg-[#151e30]/95 border border-card-border dark:border-white/15 rounded-2xl shadow-2xl z-30 py-1 overflow-hidden max-h-60 overflow-y-auto">
              {channelOptions.map((channel) => (
                <button
                  key={channel}
                  onClick={() => {
                    setSelectedChannel(channel);
                    setFilterOpen(false);
                  }}
                  className="w-full text-left px-4 py-2 text-xs sm:text-sm text-brand-text hover:bg-black/5 dark:hover:bg-white/5 transition-colors truncate cursor-pointer"
                >
                  {channel}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Middle Row: Date Range & See Detail Action Button */}
      <div className="flex items-center justify-between gap-3 mb-6">
        <span className="text-xs sm:text-sm font-medium text-brand-textMuted">
          {CAMPAIGN_INSIGHTS_DATA.dateRange}
        </span>
        <button
          onClick={onSeeDetails}
          className="border border-emerald-500/80 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 rounded-full px-5 py-1.5 text-xs sm:text-sm font-bold hover:bg-emerald-500/10 transition-all cursor-pointer shadow-sm shrink-0"
        >
          See detail
        </button>
      </div>

      {/* Bottom Row: 3 Centered Metric Columns with Theme-Aware 2x Icons */}
      <div className="grid grid-cols-3 gap-3 sm:gap-6 pt-2 items-end">
        {/* Column 1: Audience */}
        <div className="flex flex-col items-center justify-center text-center px-1 sm:px-3">
          <div className="h-24 sm:h-28 flex items-center justify-center mb-3">
            <img
              src={
                isDark
                  ? "/images/icons/audience-dark.svg"
                  : "/images/icons/audience-light.svg"
              }
              alt="Audience"
              className="h-20 sm:h-24 w-auto object-contain select-none"
            />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-brand-textMuted mb-1 text-center">
            Audience
          </span>
          <span className="text-2xl sm:text-3xl font-black text-brand-text tracking-tight text-center">
            {popularCampaign && popularCampaign.participantsCount > 0
              ? popularCampaign.participantsCount.toLocaleString()
              : CAMPAIGN_INSIGHTS_DATA.audience}
          </span>
        </div>

        {/* Column 2: Total Clicks */}
        <div className="flex flex-col items-center justify-center text-center border-l border-brand-border/30 px-1 sm:px-3">
          <div className="h-24 sm:h-28 flex items-center justify-center mb-3">
            <img
              src={
                isDark
                  ? "/images/icons/ticket-dark.svg"
                  : "/images/icons/ticket-light.svg"
              }
              alt="Total Clicks"
              className="h-20 sm:h-24 w-auto object-contain select-none"
            />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-brand-textMuted mb-1 text-center">
            Total Clicks
          </span>
          <span className="text-2xl sm:text-3xl font-black text-brand-text tracking-tight text-center">
            {CAMPAIGN_INSIGHTS_DATA.totalClicks}
          </span>
        </div>

        {/* Column 3: Customer Conversion */}
        <div className="flex flex-col items-center justify-center text-center border-l border-brand-border/30 px-1 sm:px-3">
          <div className="h-24 sm:h-28 flex items-center justify-center mb-3">
            <img
              src={
                isDark
                  ? "/images/icons/conversion-dark.svg"
                  : "/images/icons/conversion-light.svg"
              }
              alt="Customer Conversion"
              className="h-20 sm:h-24 w-auto object-contain select-none"
            />
          </div>
          <span className="text-xs sm:text-sm font-semibold text-brand-textMuted mb-1 text-center">
            Customer Conversion
          </span>
          <span className="text-2xl sm:text-3xl font-black text-brand-text tracking-tight text-center">
            {popularCampaign && popularCampaign.rewardsClaimed > 0
              ? `+${popularCampaign.rewardsClaimed.toLocaleString()}`
              : CAMPAIGN_INSIGHTS_DATA.conversions}
          </span>
        </div>
      </div>
    </div>
  );
};
