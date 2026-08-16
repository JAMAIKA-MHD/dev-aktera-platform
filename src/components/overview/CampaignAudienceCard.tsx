import React, { useState } from "react";
import { ChevronDown, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import { CAMPAIGN_AUDIENCE_DATA, ChannelAudience } from "./OverviewMockData";
import { useTheme } from "../../contexts/ThemeContext";
import { useAnalytics } from "../../hooks/useAnalytics";

export const CampaignAudienceCard: React.FC = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { analytics, loading } = useAnalytics();
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All");

  const filterOptions = ["All", "This Week", "This Month", "Past 90 Days"];

  return (
    <div
      className={`rounded-[24px] p-5 sm:p-6 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30 flex flex-col justify-between h-full border ${
        isDark
          ? "bg-[#151E30] border-slate-800 text-white"
          : "bg-white border-slate-200 text-slate-900 shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3.5">
        <h3 className="font-bold text-[19px] sm:text-[22.8px] text-brand-text">
          Campaign Audience
        </h3>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-1.5 px-3 py-1 rounded-full border text-[11.4px] sm:text-[13.3px] font-semibold transition-colors cursor-pointer ${
              isDark
                ? "border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900"
            }`}
          >
            <span>{selectedFilter}</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-70" />
          </button>

          {filterOpen && (
            <div
              className={`absolute right-0 mt-1 w-32 rounded-xl shadow-xl z-30 py-1 overflow-hidden border ${
                isDark
                  ? "bg-[#151E30] border-slate-700 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              {filterOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setSelectedFilter(opt);
                    setFilterOpen(false);
                  }}
                  className={`w-full text-left px-3 py-1.5 text-[11.4px] sm:text-[13.3px] transition-colors cursor-pointer ${
                    isDark
                      ? "text-slate-200 hover:bg-white/5"
                      : "text-slate-700 hover:bg-slate-50"
                  }`}
                >
                  {opt}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Total Audience Block */}
      <div className="mb-3.5">
        <p className="text-[11.4px] sm:text-[13.3px] font-semibold text-brand-textMuted mb-1">
          Total Audience:
        </p>
        <div className="flex items-center gap-3">
          <span className="text-[34px] sm:text-[45px] font-black text-brand-text tracking-tight leading-none">
            {loading
              ? "..."
              : (
                  analytics?.unique_participants ??
                  analytics?.unique_users_count ??
                  0
                ).toLocaleString()}
          </span>
          <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11.4px] sm:text-[13.3px] font-bold">
            <TrendingUp className="w-3.5 h-3.5" />
            <span>{CAMPAIGN_AUDIENCE_DATA.growthBadge}</span>
          </div>
        </div>
      </div>

      {/* 3-Segment Progress Bar */}
      <div className="space-y-2 mb-5">
        <div className="h-2.5 w-full flex rounded-full overflow-hidden gap-1">
          <div
            className="h-full bg-emerald-500 rounded-full"
            style={{
              width: `${CAMPAIGN_AUDIENCE_DATA.segments[0].percentage}%`,
            }}
          />
          <div
            className="h-full bg-sky-400 rounded-full"
            style={{
              width: `${CAMPAIGN_AUDIENCE_DATA.segments[1].percentage}%`,
            }}
          />
          <div
            className="h-full bg-blue-700 rounded-full"
            style={{
              width: `${CAMPAIGN_AUDIENCE_DATA.segments[2].percentage}%`,
            }}
          />
        </div>

        {/* Legend */}
        <div className="flex items-center gap-4 text-[11.4px] sm:text-[13.3px] font-bold text-brand-text pt-0.5">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 shrink-0"></span>
            <span>comp 1</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-sky-400 shrink-0"></span>
            <span>comp2</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-blue-700 shrink-0"></span>
            <span>comp3</span>
          </div>
        </div>
      </div>

      {/* Link Breakdown List */}
      <div className="space-y-2.5 pt-1">
        {CAMPAIGN_AUDIENCE_DATA.channels.map((channel: ChannelAudience) => (
          <div
            key={channel.channelName}
            className="flex items-center justify-between text-[11.4px] sm:text-[13.3px] py-1 border-b border-brand-border/10 last:border-0"
          >
            <span className="font-semibold text-brand-textMuted lowercase capitalize-first">
              {channel.channelName}
            </span>
            <div className="flex items-center gap-4 font-bold">
              <span className="text-brand-text text-[13.3px] sm:text-[15.2px]">
                {channel.count}
              </span>
              <span
                className={`flex items-center text-[11.4px] sm:text-[13.3px] w-16 justify-end ${
                  channel.isPositive ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {channel.isPositive ? (
                  <ArrowUp className="w-3 h-3 mr-0.5" />
                ) : (
                  <ArrowDown className="w-3 h-3 mr-0.5" />
                )}
                {channel.change.replace("+", "").replace("-", "")}
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
