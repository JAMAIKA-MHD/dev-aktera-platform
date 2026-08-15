import React from "react";
import { TrendingUp, Activity } from "lucide-react";
import { OVERVIEW_KPI_CARDS, KpiCardData } from "./OverviewMockData";
import { useLanguage } from "../../contexts/LanguageContext";
import { useTheme } from "../../contexts/ThemeContext";
import { useAnalytics } from "../../hooks/useAnalytics";

interface OverviewKpiCardsProps {
  activeCampaignsCount?: number;
  leadsCount?: number;
  claimsCount?: number;
  conversionRate?: string;
}

export const OverviewKpiCards: React.FC<OverviewKpiCardsProps> = () => {
  const { t } = useLanguage();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const { analytics, loading } = useAnalytics();

  const getClicks = (card: KpiCardData) => {
    if (card.id === "leads-captured") {
      if (loading) return "...";
      return (analytics?.total_entries ?? 0).toLocaleString();
    }
    if (card.id === "avg-win-rate") {
      if (loading) return "...";
      const rate = analytics?.win_rate ?? 0;
      return `${rate}%`;
    }
    return card.clicks;
  };

  const getConversions = (card: KpiCardData) => {
    if (card.id === "leads-captured") {
      if (loading) return "...";
      return (analytics?.total_wins ?? 0).toLocaleString();
    }
    return card.conversions;
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
      {OVERVIEW_KPI_CARDS.map((card: KpiCardData) => (
        <div
          key={card.id}
          className={`rounded-[32px] p-6 sm:p-7 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30 flex flex-col justify-between border ${
            isDark
              ? "bg-[#151E30] border-slate-800 text-white"
              : "bg-white border-slate-200 text-slate-900 shadow-sm"
          }`}
        >
          {/* Card Top Row: Title & Percentage Badge */}
          <div className="flex items-start justify-between gap-2 mb-5">
            <h3 className="font-bold text-lg sm:text-xl text-brand-text leading-tight tracking-tight">
              {card.title}
            </h3>
            <div className="flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-xs sm:text-sm font-bold shrink-0 border border-emerald-500/20">
              <TrendingUp className="w-4 h-4" />
              <span>{card.badge.text}</span>
            </div>
          </div>

          {/* Card Bottom Row: Clicks & Conversions Submetrics */}
          <div
            className={`grid grid-cols-2 gap-4 pt-3 border-t ${
              isDark ? "border-slate-800" : "border-slate-100"
            }`}
          >
            {/* Clicks */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-brand-textMuted text-xs sm:text-sm font-medium mb-1.5">
                <Activity className="w-4 h-4 opacity-70" />
                <span>{t("overview.clicks", "Clicks")}</span>
              </div>
              <span className="text-2xl sm:text-3xl font-black text-brand-text tracking-tight">
                {getClicks(card)}
              </span>
            </div>

            {/* Conversions */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1.5 text-brand-textMuted text-xs sm:text-sm font-medium mb-1.5">
                <TrendingUp className="w-4 h-4 opacity-70" />
                <span>{t("overview.conversions", "Conversions")}</span>
              </div>
              <span className="text-2xl sm:text-3xl font-black text-brand-text tracking-tight">
                {getConversions(card)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
