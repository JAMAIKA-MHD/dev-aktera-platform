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
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4.5">
      {OVERVIEW_KPI_CARDS.map((card: KpiCardData) => (
        <div
          key={card.id}
          className={`rounded-[24px] p-4.5 sm:p-5 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30 flex flex-col justify-between border ${
            isDark
              ? "bg-[#151E30] border-slate-800 text-white"
              : "bg-white border-slate-200 text-slate-900 shadow-sm"
          }`}
        >
          {/* Card Top Row: Title & Percentage Badge */}
          <div className="flex items-start justify-between gap-2 mb-3.5">
            <h3 className="font-bold text-[17px] sm:text-[19px] text-brand-text leading-tight tracking-tight">
              {card.title}
            </h3>
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400 text-[11.4px] sm:text-[13.3px] font-bold shrink-0 border border-emerald-500/20">
              <TrendingUp className="w-3.5 h-3.5" />
              <span>{card.badge.text}</span>
            </div>
          </div>

          {/* Card Bottom Row: Clicks & Conversions Submetrics */}
          <div
            className={`grid grid-cols-2 gap-3 pt-2.5 border-t ${
              isDark ? "border-slate-800" : "border-slate-100"
            }`}
          >
            {/* Clicks */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1 text-brand-textMuted text-[11.4px] sm:text-[13.3px] font-medium mb-1">
                <Activity className="w-3.5 h-3.5 opacity-70" />
                <span>{t("overview.clicks", "Clicks")}</span>
              </div>
              <span className="text-[22.8px] sm:text-[28.5px] font-black text-brand-text tracking-tight">
                {getClicks(card)}
              </span>
            </div>

            {/* Conversions */}
            <div className="flex flex-col">
              <div className="flex items-center gap-1 text-brand-textMuted text-[11.4px] sm:text-[13.3px] font-medium mb-1">
                <TrendingUp className="w-3.5 h-3.5 opacity-70" />
                <span>{t("overview.conversions", "Conversions")}</span>
              </div>
              <span className="text-[22.8px] sm:text-[28.5px] font-black text-brand-text tracking-tight">
                {getConversions(card)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
