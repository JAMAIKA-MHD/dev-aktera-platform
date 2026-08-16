import React, { useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { Campaign } from "../../types";
import { useTheme } from "../../contexts/ThemeContext";
import { useAnalytics } from "../../hooks/useAnalytics";
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
  const { analytics, loading } = useAnalytics();

  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedChannel, setSelectedChannel] = useState("All channels");

  // Dynamically select the most popular campaign from the database (or fallback)
  const popularCampaign = useMemo(() => {
    if (!campaigns || campaigns.length === 0) return null;
    const sorted = [...campaigns].sort(
      (a, b) => (b?.participantsCount ?? 0) - (a?.participantsCount ?? 0),
    );
    return sorted[0] || campaigns[0] || null;
  }, [campaigns]);

  const channelOptions = [
    "All channels",
    ...(campaigns.length > 0
      ? campaigns.map((c) => c.name)
      : ["Facebook Ads", "Instagram Reels", "Direct Link"]),
  ];

  return (
    <div
      className={`rounded-[24px] p-5 sm:p-6 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30 flex flex-col justify-between h-full border ${
        isDark
          ? "bg-[#151E30] border-slate-800 text-white"
          : "bg-white border-slate-200 text-slate-900 shadow-sm"
      }`}
    >
      {/* Top Header: Title, Subtitle, and Filter Dropdown */}
      <div className="flex items-start justify-between mb-3">
        <div>
          <h3 className="font-bold text-[19px] sm:text-[22.8px] text-brand-text">
            Campaign Insights
          </h3>
          <p className="text-[11.4px] sm:text-[13.3px] text-brand-textMuted mt-0.5">
            {popularCampaign
              ? `most used compaigns (${popularCampaign.name})`
              : "most used compaigns"}
          </p>
        </div>

        {/* Filter Dropdown */}
        <div className="relative shrink-0">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11.4px] sm:text-[13.3px] font-semibold transition-colors cursor-pointer ${
              isDark
                ? "border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900"
            }`}
          >
            <span className="truncate max-w-[100px]">{selectedChannel}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70 shrink-0" />
          </button>

          {filterOpen && (
            <div
              className={`absolute right-0 mt-1 w-44 rounded-xl shadow-xl z-30 py-1 overflow-hidden max-h-56 overflow-y-auto border ${
                isDark
                  ? "bg-[#151E30] border-slate-700 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              {channelOptions.map((channel) => (
                <button
                  key={channel}
                  onClick={() => {
                    setSelectedChannel(channel);
                    setFilterOpen(false);
                  }}
                  className={`w-full text-left px-3.5 py-1.5 text-[11.4px] sm:text-[13.3px] transition-colors truncate cursor-pointer ${
                    isDark
                      ? "text-slate-200 hover:bg-white/5"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {channel}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Middle Row: Date Range & See Detail Action Button */}
      <div className="flex items-center justify-between gap-2 mb-4">
        <span className="text-[11.4px] sm:text-[13.3px] font-medium text-brand-textMuted">
          {CAMPAIGN_INSIGHTS_DATA.dateRange}
        </span>
        <button
          onClick={onSeeDetails}
          className="border border-emerald-500/80 hover:border-emerald-500 text-emerald-600 dark:text-emerald-400 rounded-full px-4 py-1 text-[11.4px] sm:text-[13.3px] font-bold hover:bg-emerald-500/10 transition-all cursor-pointer shadow-sm shrink-0"
        >
          See detail
        </button>
      </div>

      {/* Bottom Row: 3 Centered Metric Columns with Theme-Aware 2x Icons */}
      <div className="grid grid-cols-3 gap-2 sm:gap-4 pt-1 items-end">
        {/* Column 1: Audience */}
        <div className="flex flex-col items-center justify-center text-center px-1 sm:px-2">
          <div className="h-18 sm:h-21 flex items-center justify-center mb-2">
            <img
              src={
                isDark
                  ? "/images/icons/audience-dark.svg"
                  : "/images/icons/audience-light.svg"
              }
              alt="Audience"
              className="h-15 sm:h-18 w-auto object-contain select-none"
            />
          </div>
          <span className="text-[11.4px] sm:text-[13.3px] font-semibold text-brand-textMuted mb-0.5 text-center">
            Audience
          </span>
          <span className="text-[22.8px] sm:text-[28.5px] font-black text-brand-text tracking-tight text-center">
            {loading
              ? "..."
              : (
                  analytics?.unique_participants ??
                  analytics?.unique_users_count ??
                  0
                ).toLocaleString()}
          </span>
        </div>

        {/* Column 2: Total Clicks */}
        <div className="flex flex-col items-center justify-center text-center border-l border-brand-border/30 px-1 sm:px-2">
          <div className="h-18 sm:h-21 flex items-center justify-center mb-2">
            <img
              src={
                isDark
                  ? "/images/icons/ticket-dark.svg"
                  : "/images/icons/ticket-light.svg"
              }
              alt="Total Clicks"
              className="h-15 sm:h-18 w-auto object-contain select-none"
            />
          </div>
          <span className="text-[11.4px] sm:text-[13.3px] font-semibold text-brand-textMuted mb-0.5 text-center">
            Total Clicks
          </span>
          <span className="text-[22.8px] sm:text-[28.5px] font-black text-brand-text tracking-tight text-center">
            {CAMPAIGN_INSIGHTS_DATA.totalClicks}
          </span>
        </div>

        {/* Column 3: Customer Conversion */}
        <div className="flex flex-col items-center justify-center text-center border-l border-brand-border/30 px-1 sm:px-2">
          <div className="h-18 sm:h-21 flex items-center justify-center mb-2">
            <img
              src={
                isDark
                  ? "/images/icons/conversion-dark.svg"
                  : "/images/icons/conversion-light.svg"
              }
              alt="Customer Conversion"
              className="h-15 sm:h-18 w-auto object-contain select-none"
            />
          </div>
          <span className="text-[11.4px] sm:text-[13.3px] font-semibold text-brand-textMuted mb-0.5 text-center">
            Customer Conversion
          </span>
          <span className="text-[22.8px] sm:text-[28.5px] font-black text-brand-text tracking-tight text-center">
            {loading ? "..." : (analytics?.total_wins ?? 0).toLocaleString()}
          </span>
        </div>
      </div>
    </div>
  );
};
