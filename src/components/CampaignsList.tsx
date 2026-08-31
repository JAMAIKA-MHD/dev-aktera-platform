import React, { useState } from "react";
import { Campaign } from "../types";
import {
  Plus,
  Search,
  Play,
  Pause,
  RotateCcw,
  BarChart3,
  Archive,
  Trash2,
  Pencil,
  Eye,
  TrendingUp,
  Filter,
} from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";

interface CampaignsListProps {
  campaigns: Campaign[];
  onSelectCampaign: (id: string) => void;
  onEditCampaign?: (camp: Campaign) => void;
  onRelaunch: (camp: Campaign) => void;
  onToggleStatus: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenAnalytics?: (id: string) => void;
  onOpenWizard: () => void;
}

export const CampaignsList: React.FC<CampaignsListProps> = ({
  campaigns,
  onSelectCampaign,
  onEditCampaign,
  onRelaunch,
  onToggleStatus,
  onArchive,
  onDelete,
  onOpenAnalytics,
  onOpenWizard,
}) => {
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === "dark";

  const [searchTerm, setSearchTerm] = useState("");
  const [selectedStatuses, setSelectedStatuses] = useState<string[]>([
    "active",
    "paused",
    "draft",
    "archived",
  ]);
  const [selectedTypes, setSelectedTypes] = useState<string[]>([
    "lucky_wheel",
    "quiz",
    "scratch",
    "slot",
  ]);

  // Toggle status filter checkbox
  const toggleStatus = (status: string) => {
    setSelectedStatuses((prev) =>
      prev.includes(status)
        ? prev.filter((s) => s !== status)
        : [...prev, status],
    );
  };

  // Toggle type filter checkbox
  const toggleType = (type: string) => {
    setSelectedTypes((prev) =>
      prev.includes(type) ? prev.filter((t) => t !== type) : [...prev, type],
    );
  };

  // Filter real database campaigns
  const filteredCampaigns = campaigns.filter((camp) => {
    const matchesSearch = camp.name
      .toLowerCase()
      .includes(searchTerm.toLowerCase());
    const matchesStatus = selectedStatuses.includes(camp.status);
    const matchesType =
      selectedTypes.includes(camp.gameType) ||
      (camp.gameType === "lucky_wheel" &&
        selectedTypes.includes("lucky_wheel")) ||
      (camp.gameType === "quiz" &&
        (selectedTypes.includes("quiz") || selectedTypes.includes("scratch")));
    return matchesSearch && matchesStatus && matchesType;
  });

  const formatEntriesCount = (count: number) => {
    if (count >= 1000) {
      return `${(count / 1000).toFixed(1).replace(/\.0$/, "")}K`;
    }
    return count.toString();
  };

  return (
    <div
      id="campaigns-list-root"
      className="space-y-5 text-brand-text max-w-[1800px] mx-auto pb-16"
    >
      {/* Header section */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3.5">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-brand-text">
            {t("campaigns.title", "Campaign Radios")}
          </h2>
          <p className="text-brand-textMuted text-xs font-medium mt-0.5">
            check all your campaign and games that you will be sharing
          </p>
        </div>

        <div className="flex items-center gap-2.5 w-full md:w-auto justify-between md:justify-end">
          <button
            onClick={onOpenWizard}
            className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl font-bold flex items-center gap-1.5 transition-all shadow-md shadow-blue-500/25 cursor-pointer text-xs hover:scale-102 shrink-0"
          >
            <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
            <span>{t("campaigns.createNew", "Launch Campaign Wizard")}</span>
          </button>

          {/* Search input with pill styling */}
          <div className="relative w-full sm:w-56">
            <Search className="absolute left-3 w-3.5 h-3.5 text-brand-textMuted top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search campaigns..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className={`w-full rounded-full pl-8 pr-3.5 py-1.5 text-xs transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-blue-500/20 shadow-sm border ${
                isDark
                  ? "bg-[#151E30] border-slate-800 text-white placeholder-slate-500"
                  : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
              }`}
            />
          </div>
        </div>
      </div>

      {/* MAIN UNIFIED ROW: Left Filter Box + Campaign Cards (All identically sized at w-[195px] and aligned) */}
      <div className="flex flex-wrap items-stretch gap-4 pt-1.5">
        {/* 1. LEFT FILTERS BOX (Matching w-[195px] width) */}
        <div
          className={`w-full sm:w-[195px] shrink-0 rounded-[18px] p-4 border shadow-sm flex flex-col justify-between select-none ${
            isDark
              ? "bg-[#151E30] border-slate-800 text-white"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="space-y-4">
            {/* Header */}
            <div className="flex items-center gap-1.5 text-xs font-black tracking-tight border-b border-card-border pb-2.5">
              <Filter className="w-3.5 h-3.5 text-brand-textMuted" />
              <span>Filters</span>
            </div>

            {/* STATUS FILTER SECTION */}
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase tracking-wider block text-slate-400 dark:text-slate-500">
                {t("campaigns.filterStatus", "STATUS")}
              </span>
              <div className="space-y-1.5">
                {[
                  { id: "active", label: t("campaigns.active", "Active") },
                  { id: "paused", label: t("campaigns.paused", "Paused") },
                  { id: "draft", label: t("campaigns.draft", "Draft") },
                  {
                    id: "archived",
                    label: t("campaigns.archived", "Archived"),
                  },
                ].map((item) => {
                  const checked = selectedStatuses.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 text-[11px] font-bold cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleStatus(item.id)}
                        className="w-3 h-3 rounded text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-blue-600"
                      />
                      <span
                        className={
                          checked
                            ? isDark
                              ? "text-white"
                              : "text-slate-900"
                            : "text-slate-400"
                        }
                      >
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Divider */}
            <div className="border-t border-card-border"></div>

            {/* CAMPAIGN TYPE SECTION */}
            <div className="space-y-2">
              <span className="text-[9px] font-black uppercase tracking-wider block text-slate-400 dark:text-slate-500">
                {t("campaigns.filterType", "CAMPAIGN TYPE")}
              </span>
              <div className="space-y-1.5">
                {[
                  {
                    id: "lucky_wheel",
                    label: t("campaigns.spinWheel", "Spin Wheel"),
                  },
                  {
                    id: "scratch",
                    label: t("campaigns.scratchCard", "Scratch Card"),
                  },
                  {
                    id: "slot",
                    label: t("campaigns.slotMachine", "Slot Machine"),
                  },
                ].map((item) => {
                  const checked = selectedTypes.includes(item.id);
                  return (
                    <label
                      key={item.id}
                      className="flex items-center gap-2 text-[11px] font-bold cursor-pointer hover:opacity-80 transition-opacity"
                    >
                      <input
                        type="checkbox"
                        checked={checked}
                        onChange={() => toggleType(item.id)}
                        className="w-3 h-3 rounded text-blue-600 focus:ring-0 focus:ring-offset-0 cursor-pointer accent-blue-600"
                      />
                      <span
                        className={
                          checked
                            ? isDark
                              ? "text-white"
                              : "text-slate-900"
                            : "text-slate-400"
                        }
                      >
                        {item.label}
                      </span>
                    </label>
                  );
                })}
              </div>
            </div>
          </div>
        </div>

        {/* 2. CAMPAIGN CARDS (Each matching w-[195px] width) */}
        {filteredCampaigns.map((camp) => {
          const isActive = camp.status === "active";
          const isArchived = camp.status === "archived";
          const isPaused = camp.status === "paused";
          const isDraft = camp.status === "draft";

          const targetEntries = 100;
          const goalPercent = Math.min(
            Math.round(
              camp.participantsCount > 0
                ? Math.min((camp.participantsCount / targetEntries) * 100, 100)
                : camp.winProbability || 24,
            ),
            100,
          );

          const englishSubtitle =
            camp.gameType === "lucky_wheel"
              ? "Retail Electronics Promo"
              : "Loyalty Tier 1";

          return (
            <motion.div
              key={camp.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              onClick={() => onSelectCampaign(camp.id)}
              className={`w-full sm:w-[195px] shrink-0 rounded-[18px] p-4 flex flex-col justify-between transition-all duration-200 relative group cursor-pointer ${
                isArchived
                  ? isDark
                    ? "bg-[#0e1422] border border-slate-800 text-slate-300 opacity-80"
                    : "bg-[#EDEDED] border border-slate-300 text-slate-800 opacity-90"
                  : isActive
                    ? isDark
                      ? "bg-[#151E30] border-2 border-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.25)] text-white hover:shadow-[0_0_24px_rgba(52,211,153,0.35)]"
                      : "bg-white border-2 border-emerald-400 shadow-[0_0_16px_rgba(52,211,153,0.2)] text-slate-900 hover:shadow-[0_0_24px_rgba(52,211,153,0.3)]"
                    : isDark
                      ? "bg-[#151E30] border border-slate-800 text-white shadow-sm hover:shadow-md"
                      : "bg-white border border-slate-200 text-slate-900 shadow-sm hover:shadow-md"
              }`}
            >
              {/* Lightning Corner Accents on Active Cards */}
              {isActive && (
                <>
                  <span className="absolute -top-1 -left-1 w-2.5 h-2.5 border-t-2 border-l-2 border-emerald-400 rounded-tl shadow-[0_0_6px_#34d399] pointer-events-none"></span>
                  <span className="absolute -top-1 -right-1 w-2.5 h-2.5 border-t-2 border-r-2 border-emerald-400 rounded-tr shadow-[0_0_6px_#34d399] pointer-events-none"></span>
                  <span className="absolute -bottom-1 -left-1 w-2.5 h-2.5 border-b-2 border-l-2 border-emerald-400 rounded-bl shadow-[0_0_6px_#34d399] pointer-events-none"></span>
                  <span className="absolute -bottom-1 -right-1 w-2.5 h-2.5 border-b-2 border-r-2 border-emerald-400 rounded-br shadow-[0_0_6px_#34d399] pointer-events-none"></span>
                </>
              )}

              {/* TOP ROW: Status Badge with Animated Light */}
              <div className="flex items-center justify-between">
                <div>
                  {isActive && (
                    <div
                      className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-black tracking-wider uppercase ${
                        isDark
                          ? "bg-emerald-950/60 border border-emerald-500/40 text-emerald-400"
                          : "bg-emerald-100 border border-emerald-300 text-emerald-800"
                      }`}
                    >
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500 shadow-[0_0_6px_#10b981]"></span>
                      </span>
                      <span>ACTIVE</span>
                    </div>
                  )}

                  {isPaused && (
                    <div className="flex items-center gap-1">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-amber-500 shadow-[0_0_6px_#f59e0b]"></span>
                      </span>
                      <span className="font-black text-[10px] text-amber-500 tracking-wider uppercase">
                        PAUSED
                      </span>
                    </div>
                  )}

                  {isArchived && (
                    <div className="flex items-center gap-1">
                      <span className="relative flex h-2 w-2">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-2 w-2 bg-red-600 shadow-[0_0_6px_#dc2626]"></span>
                      </span>
                      <span
                        className={`font-black text-xs tracking-tight ${
                          isDark ? "text-red-400" : "text-red-700"
                        }`}
                      >
                        Archived
                      </span>
                    </div>
                  )}

                  {isDraft && (
                    <div className="flex items-center gap-1">
                      <span className="relative flex h-1.5 w-1.5">
                        <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-blue-400 opacity-75"></span>
                        <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-blue-500 shadow-[0_0_6px_#3b82f6]"></span>
                      </span>
                      <span className="font-black text-[10px] text-blue-500 tracking-wider uppercase">
                        DRAFT
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* MAIN CONTENT: Campaign Name & Subtitle */}
              <div className="my-3 space-y-0.5">
                <h3
                  className={`text-base font-black tracking-tight leading-snug truncate ${
                    isArchived
                      ? isDark
                        ? "text-slate-300"
                        : "text-slate-800"
                      : isDark
                        ? "text-white"
                        : "text-slate-900"
                  }`}
                >
                  {camp.name}
                </h3>
                <p
                  className={`text-[10px] font-medium truncate ${
                    isDark ? "text-slate-400" : "text-slate-500"
                  }`}
                >
                  {englishSubtitle}
                </p>
              </div>

              {/* METRICS ROW: Total Entries + Conv. Rate */}
              <div className="grid grid-cols-2 gap-1.5 my-2.5">
                {/* Total Entries */}
                <div>
                  <h4
                    className={`text-lg font-black leading-none ${
                      isArchived
                        ? isDark
                          ? "text-slate-300"
                          : "text-slate-800"
                        : isDark
                          ? "text-white"
                          : "text-slate-900"
                    }`}
                  >
                    {formatEntriesCount(camp.participantsCount)}
                  </h4>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider block mt-0.5 ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    Total Entries
                  </span>
                </div>

                {/* Conv. Rate / Win Rate */}
                <div>
                  <div
                    className={`flex items-center gap-0.5 font-black text-xs leading-none ${camp.autoPacePrizes ? "text-blue-500 dark:text-blue-400" : "text-emerald-500"}`}
                  >
                    <TrendingUp className="w-2.5 h-2.5 stroke-[2.5]" />
                    <span>
                      {camp.autoPacePrizes
                        ? "Paced"
                        : `${camp.winProbability}%`}
                    </span>
                  </div>
                  <span
                    className={`text-[9px] font-bold uppercase tracking-wider block mt-0.5 ${
                      isDark ? "text-slate-400" : "text-slate-500"
                    }`}
                  >
                    {camp.autoPacePrizes ? "Pacing Mode" : "Conv. Rate"}
                  </span>
                </div>
              </div>

              {/* DAILY GOAL PROGRESS INSET */}
              <div
                className={`mt-1.5 p-2.5 rounded-xl border space-y-1.5 ${
                  isArchived
                    ? isDark
                      ? "bg-[#0b101c] border-slate-800"
                      : "bg-[#DFDFDF] border-slate-300"
                    : isDark
                      ? "bg-[#0e1422] border-slate-800"
                      : "bg-[#F8FAFC] border-slate-200"
                }`}
              >
                <div className="flex items-center justify-between text-[9.5px] font-bold">
                  <span
                    className={isDark ? "text-slate-400" : "text-slate-500"}
                  >
                    Daily Goal Progress
                  </span>
                  <span
                    className={`font-mono font-black ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    {goalPercent}%
                  </span>
                </div>

                {/* Progress Bar */}
                <div
                  className={`w-full h-1 rounded-full overflow-hidden ${
                    isDark ? "bg-slate-800" : "bg-slate-200"
                  }`}
                >
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      isActive
                        ? "bg-blue-600"
                        : "bg-slate-400 dark:bg-slate-600"
                    }`}
                    style={{ width: `${goalPercent}%` }}
                  ></div>
                </div>
              </div>

              {/* DIRECT ACTION BUTTONS TOOLBAR ROW */}
              <div
                className="flex items-center justify-between pt-2.5 mt-2.5 border-t border-card-border"
                onClick={(e) => e.stopPropagation()}
              >
                {/* 1. View Workspace */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onSelectCampaign(camp.id);
                  }}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                    isDark
                      ? "text-slate-400 hover:text-blue-400 hover:bg-slate-800"
                      : "text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                  }`}
                  title="View campaign workspace"
                >
                  <Eye className="w-3 h-3" />
                </button>

                {/* 2. Edit Campaign */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onEditCampaign?.(camp);
                  }}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                    isDark
                      ? "text-slate-400 hover:text-blue-400 hover:bg-slate-800"
                      : "text-slate-500 hover:text-blue-600 hover:bg-slate-100"
                  }`}
                  title="Edit campaign"
                >
                  <Pencil className="w-3 h-3" />
                </button>

                {/* 3. Analytics */}
                {onOpenAnalytics && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onOpenAnalytics(camp.id);
                    }}
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                      isDark
                        ? "text-slate-400 hover:text-emerald-400 hover:bg-slate-800"
                        : "text-slate-500 hover:text-emerald-600 hover:bg-slate-100"
                    }`}
                    title="Open analytics desk"
                  >
                    <BarChart3 className="w-3 h-3" />
                  </button>
                )}

                {/* 4. Active / Pause Toggle */}
                {camp.status !== "archived" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onToggleStatus(camp.id);
                    }}
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                      camp.status === "active"
                        ? isDark
                          ? "text-amber-400 hover:bg-amber-400/10"
                          : "text-amber-600 hover:bg-amber-50"
                        : isDark
                          ? "text-emerald-400 hover:bg-emerald-400/10"
                          : "text-emerald-600 hover:bg-emerald-50"
                    }`}
                    title={
                      camp.status === "active"
                        ? "Pause campaign"
                        : "Activate campaign"
                    }
                  >
                    {camp.status === "active" ? (
                      <Pause className="w-3 h-3" />
                    ) : (
                      <Play className="w-3 h-3" />
                    )}
                  </button>
                )}

                {/* 5. Archive Campaign */}
                {camp.status !== "archived" && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onArchive(camp.id);
                    }}
                    className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                      isDark
                        ? "text-slate-400 hover:text-amber-400 hover:bg-slate-800"
                        : "text-slate-500 hover:text-amber-600 hover:bg-slate-100"
                    }`}
                    title="Archive campaign"
                  >
                    <Archive className="w-3 h-3" />
                  </button>
                )}

                {/* 6. Relaunch / Clone */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onRelaunch(camp);
                  }}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                    isDark
                      ? "text-slate-400 hover:text-purple-400 hover:bg-slate-800"
                      : "text-slate-500 hover:text-purple-600 hover:bg-slate-100"
                  }`}
                  title="Relaunch campaign with new parameters"
                >
                  <RotateCcw className="w-3 h-3" />
                </button>

                {/* 7. Permanent Delete */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(camp.id);
                  }}
                  className={`w-6 h-6 rounded-md flex items-center justify-center transition-all cursor-pointer ${
                    isDark
                      ? "text-slate-400 hover:text-red-400 hover:bg-slate-800"
                      : "text-slate-500 hover:text-red-600 hover:bg-slate-100"
                  }`}
                  title="Delete campaign permanently"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </motion.div>
          );
        })}

        {/* Empty state */}
        {filteredCampaigns.length === 0 && (
          <div className="w-full max-w-md py-16 flex flex-col items-center justify-center text-center bg-card-bg rounded-3xl border border-dashed border-card-border p-8">
            <h4 className="text-base font-bold text-brand-text">
              No campaigns match selected filters
            </h4>
            <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
              Try selecting more statuses or campaign types from the filter
              panel.
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
