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
      className={`rounded-[32px] p-7 sm:p-8 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30 flex flex-col justify-between h-full border ${
        isDark
          ? "bg-[#151E30] border-slate-800 text-white"
          : "bg-white border-slate-200 text-slate-900 shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-xl sm:text-2xl text-brand-text">
          Campaign Audience
        </h3>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-2 px-4 py-1.5 rounded-full border text-xs sm:text-sm font-semibold transition-colors cursor-pointer ${
              isDark
                ? "border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900"
            }`}
          >
            <span>{selectedFilter}</span>
            <ChevronDown className="w-4 h-4 opacity-70" />
          </button>

          {filterOpen && (
            <div
              className={`absolute right-0 mt-1 w-36 rounded-2xl shadow-xl z-30 py-1 overflow-hidden border ${
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
                  className={`w-full text-left px-3.5 py-2 text-xs sm:text-sm transition-colors cursor-pointer ${
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
      <div className="mb-5">
        <p className="text-xs sm:text-sm font-semibold text-brand-textMuted mb-1.5">
          Total Audience:
        </p>
        <div className="flex items-center gap-4">
          <span className="text-4xl sm:text-5xl font-black text-brand-text tracking-tight">
            {loading
              ? "..."
              : (
                  analytics?.unique_participants ??
                  analytics?.unique_users_count ??
                  0
                ).toLocaleString()}
          </span>
          <div className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-bold">
            <TrendingUp className="w-4 h-4" />
            <span>{CAMPAIGN_AUDIENCE_DATA.growthBadge}</span>
          </div>
        </div>
      </div>

      {/* 3-Segment Progress Bar */}
      <div className="space-y-3 mb-7">
        <div className="h-3.5 w-full flex rounded-full overflow-hidden gap-1.5">
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
        <div className="flex items-center gap-5 text-xs sm:text-sm font-bold text-brand-text pt-1">
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-emerald-500 shrink-0"></span>
            <span>comp 1</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-sky-400 shrink-0"></span>
            <span>comp2</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3 h-3 rounded-full bg-blue-700 shrink-0"></span>
            <span>comp3</span>
          </div>
        </div>
      </div>

      {/* Link Breakdown List */}
      <div className="space-y-4 pt-2">
        {CAMPAIGN_AUDIENCE_DATA.channels.map((channel: ChannelAudience) => (
          <div
            key={channel.channelName}
            className="flex items-center justify-between text-xs sm:text-sm py-1.5 border-b border-brand-border/10 last:border-0"
          >
            <span className="font-semibold text-brand-textMuted lowercase capitalize-first">
              {channel.channelName}
            </span>
            <div className="flex items-center gap-5 font-bold">
              <span className="text-brand-text text-sm sm:text-base">
                {channel.count}
              </span>
              <span
                className={`flex items-center text-xs sm:text-sm w-20 justify-end ${
                  channel.isPositive ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {channel.isPositive ? (
                  <ArrowUp className="w-3.5 h-3.5 mr-0.5" />
                ) : (
                  <ArrowDown className="w-3.5 h-3.5 mr-0.5" />
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
