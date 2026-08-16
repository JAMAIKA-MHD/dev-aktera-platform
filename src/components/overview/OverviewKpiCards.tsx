import React from "react";
import { TrendingUp } from "lucide-react";
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
    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3.5">
      {OVERVIEW_KPI_CARDS.map((card: KpiCardData) => (
        <div
          key={card.id}
          className={`rounded-[18px] p-3.5 sm:p-4 border transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30 flex flex-col justify-between h-full ${
            isDark
              ? "bg-[#151E30] border-slate-800 text-white"
              : "bg-white border-slate-200 text-slate-900 shadow-sm"
          }`}
        >
          {/* Card Top: Title & Dynamic Badge */}
          <div className="flex items-center justify-between gap-2 mb-3">
            <span className="font-bold text-[13.6px] sm:text-[15.2px] text-brand-text truncate">
              {card.title}
            </span>
            <div
              className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-[9.1px] font-bold shrink-0 ${
                card.badge.isPositive
                  ? "bg-emerald-100/90 dark:bg-emerald-950/60 text-emerald-600 dark:text-emerald-400"
                  : "bg-red-100/90 dark:bg-red-950/60 text-red-600 dark:text-red-400"
              }`}
            >
              <TrendingUp className="w-3 h-3" />
              <span>{card.badge.text}</span>
            </div>
          </div>

          {/* Card Bottom: 2 Numerical Metric Columns */}
          <div className="grid grid-cols-2 gap-2 pt-2 border-t border-brand-border/10">
            {/* Column 1: Clicks / Big Metric */}
            <div>
              <p className="text-[9.1px] font-semibold text-brand-textMuted uppercase tracking-wider mb-0.5">
                {t("overview.clicks", "Clicks")}
              </p>
              <span className="text-[18.2px] sm:text-[22.8px] font-black text-brand-text tracking-tight block">
                {getClicks(card)}
              </span>
            </div>

            {/* Column 2: Conversions */}
            <div>
              <p className="text-[9.1px] font-semibold text-brand-textMuted uppercase tracking-wider mb-0.5">
                {t("overview.conversions", "Conversions")}
              </p>
              <span className="text-[18.2px] sm:text-[22.8px] font-black text-brand-text tracking-tight block">
                {getConversions(card)}
              </span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
};
