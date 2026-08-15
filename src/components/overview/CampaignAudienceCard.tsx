import React, { useState } from "react";
import { ChevronDown, TrendingUp, ArrowUp, ArrowDown } from "lucide-react";
import { CAMPAIGN_AUDIENCE_DATA, ChannelAudience } from "./OverviewMockData";

export const CampaignAudienceCard: React.FC = () => {
  const [filterOpen, setFilterOpen] = useState(false);
  const [selectedFilter, setSelectedFilter] = useState("All");

  const filterOptions = ["All", "This Week", "This Month", "Past 90 Days"];

  return (
    <div className="bg-card-bg border border-card-border rounded-[32px] p-7 sm:p-8 transition-all duration-200 hover:shadow-lg flex flex-col justify-between h-full">
      {/* Header */}
      <div className="flex items-center justify-between mb-5">
        <h3 className="font-bold text-xl sm:text-2xl text-brand-text">
          Campaign Audience
        </h3>

        {/* Filter Dropdown */}
        <div className="relative">
          <button
            onClick={() => setFilterOpen(!filterOpen)}
            className="flex items-center gap-2 px-4 py-1.5 rounded-full border border-gray-200 dark:border-slate-700 bg-card-bg-subtle text-xs sm:text-sm font-semibold text-brand-textMuted hover:text-brand-text transition-colors cursor-pointer"
          >
            <span>{selectedFilter}</span>
            <ChevronDown className="w-4 h-4 opacity-70" />
          </button>

          {filterOpen && (
            <div className="absolute right-0 mt-1 w-36 bg-card-bg border border-card-border rounded-xl shadow-lg z-30 py-1 overflow-hidden">
              {filterOptions.map((opt) => (
                <button
                  key={opt}
                  onClick={() => {
                    setSelectedFilter(opt);
                    setFilterOpen(false);
                  }}
                  className="w-full text-left px-3.5 py-2 text-xs sm:text-sm text-brand-text hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
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
            {CAMPAIGN_AUDIENCE_DATA.totalAudience}
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
