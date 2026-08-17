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
      className={`rounded-[18px] p-4 sm:p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30 flex flex-col justify-between h-full border ${
        isDark
          ? "bg-[#151E30] border-slate-800 text-white"
          : "bg-white border-slate-200 text-slate-900 shadow-sm"
      }`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-bold text-[15.2px] sm:text-[18.2px] text-brand-text">
          Campaign Audience
        </h3>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className={`flex items-center gap-1 px-2.5 py-0.5 rounded-full border text-[9.1px] sm:text-[10.6px] font-semibold transition-colors cursor-pointer ${
              isDark
                ? "border-slate-700 bg-slate-800 text-slate-300 hover:text-white"
                : "border-slate-200 bg-slate-50 text-slate-700 hover:text-slate-900"
            }`}
          >
            <span>{selectedFilter}</span>
            <ChevronDown className="w-3 h-3 opacity-70" />
          </button>

          {filterOpen && (
            <div
              className={`absolute right-0 mt-1 w-28 rounded-lg shadow-xl z-30 py-0.5 overflow-hidden border ${
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
                  className={`w-full text-left px-2.5 py-1 text-[9.1px] sm:text-[10.6px] transition-colors cursor-pointer ${
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
      <div className="mb-3">
        <p className="text-[9.1px] sm:text-[10.6px] font-semibold text-brand-textMuted mb-0.5">
          Total Audience:
        </p>
        <div className="flex items-center gap-2.5">
          <span className="text-[27px] sm:text-[36px] font-black text-brand-text tracking-tight leading-none">
            {loading
              ? "..."
              : (
                  analytics?.unique_participants ??
                  analytics?.unique_users_count ??
                  0
                ).toLocaleString()}
          </span>
          <div
            className={`flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9.1px] sm:text-[10.6px] font-bold ${
              isDark
                ? "bg-emerald-950/80 text-emerald-400 border border-emerald-800/40"
                : "bg-emerald-50 text-emerald-700 border border-emerald-200"
            }`}
          >
            <TrendingUp className="w-3 h-3" />
            <span>{CAMPAIGN_AUDIENCE_DATA.growthBadge}</span>
          </div>
        </div>
      </div>

      {/* 3-Segment Progress Bar */}
      <div className="space-y-1.5 mb-4">
        <div className="h-2 w-full flex rounded-full overflow-hidden gap-1">
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
        <div className="flex items-center gap-3 text-[9.1px] sm:text-[10.6px] font-bold text-brand-text pt-0.5">
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
            <span>comp 1</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-sky-400 shrink-0"></span>
            <span>comp2</span>
          </div>
          <div className="flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-blue-700 shrink-0"></span>
            <span>comp3</span>
          </div>
        </div>
      </div>

      {/* Link Breakdown List */}
      <div className="space-y-2 pt-0.5">
        {CAMPAIGN_AUDIENCE_DATA.channels.map((channel: ChannelAudience) => (
          <div
            key={channel.channelName}
            className="flex items-center justify-between text-[9.1px] sm:text-[10.6px] py-0.5 border-b border-brand-border/10 last:border-0"
          >
            <span className="font-semibold text-brand-textMuted lowercase capitalize-first">
              {channel.channelName}
            </span>
            <div className="flex items-center gap-3 font-bold">
              <span className="text-brand-text text-[10.6px] sm:text-[12.2px]">
                {channel.count}
              </span>
              <span
                className={`flex items-center text-[9.1px] sm:text-[10.6px] w-14 justify-end ${
                  channel.isPositive ? "text-emerald-500" : "text-red-500"
                }`}
              >
                {channel.isPositive ? (
                  <ArrowUp className="w-2.5 h-2.5 mr-0.5" />
                ) : (
                  <ArrowDown className="w-2.5 h-2.5 mr-0.5" />
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
