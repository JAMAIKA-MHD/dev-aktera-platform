import React, { useMemo } from "react";
import {
  AlertTriangle,
  CheckCircle2,
  Users,
  Cpu,
  Download,
  FileText,
  Upload,
  Settings,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useAnalytics } from "../hooks/useAnalytics";
import { useBilling, BillingRecord } from "../hooks/useBilling";
import { useTheme } from "../contexts/ThemeContext";
import { useLanguage } from "../contexts/LanguageContext";

const PLAN_LABELS: Record<BillingRecord["plan"], string> = {
  free: "Free Plan",
  starter: "Starter Growth",
  pro: "Pro Activation",
  enterprise: "Enterprise Bulk",
};

const PLAN_PRICES: Record<
  BillingRecord["plan"],
  { price: string; period: string; quota: number; features: string[] }
> = {
  free: {
    price: "Free",
    period: "For small businesses",
    quota: 1000,
    features: [
      "1 Active Promo Portal",
      "Up to 1,000 Consumer Leads",
      "Basic Lucky Wheel Mechanic",
      "Algerian phone validation checks",
      "Standard Email Support",
    ],
  },
  starter: {
    price: "2,500 DA",
    period: "per month",
    quota: 3000,
    features: [
      "3 Concurrent Portals",
      "Up to 3,000 Consumer Leads",
      "Expanded reward library operations",
      "CSV export coverage",
      "Faster campaign relaunch cycles",
    ],
  },
  pro: {
    price: "4,500 DA",
    period: "per month",
    quota: 10000,
    features: [
      "5 Concurrent Portals",
      "Up to 10,000 Consumer Leads",
      "Full Darija/English Quiz Challenge",
      "Detailed Hourly Peak Analytics",
      "Priority Technical Support",
    ],
  },
  enterprise: {
    price: "Custom",
    period: "for major telecoms & FMCG",
    quota: 100000,
    features: [
      "Unlimited Live Portals",
      "Over 100,000 lead streams",
      "Custom SMS API integrations",
      "Dedicated server authority",
      "SLA 99.9% uptime guarantees",
    ],
  },
};

const formatDate = (value: string | null | undefined) => {
  if (!value) return "11 Aug 2027";
  return new Intl.DateTimeFormat("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  }).format(new Date(value));
};

export const BillingUsage: React.FC = () => {
  const { organization } = useAuth();
  const { analytics } = useAnalytics();
  const { records, loading, error } = useBilling(organization?.id);
  const { theme } = useTheme();
  const { t } = useLanguage();
  const isDark = theme === "dark";

  const currentPlanKey = organization?.plan ?? "free";
  const currentPlan = PLAN_PRICES[currentPlanKey];
  const totalEntries = analytics?.total_entries ?? 0;
  const usagePercent = Math.min(
    100,
    currentPlan.quota > 0 ? (totalEntries / currentPlan.quota) * 100 : 0,
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-10 w-10 animate-spin rounded-full border-4 border-blue-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-red-700 font-bold text-base">
        {error}
      </div>
    );
  }

  return (
    <div
      id="billing-usage-root"
      className="space-y-8 text-brand-text max-w-[1800px] mx-auto pb-16 pt-2"
    >
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-5">
        <div>
          <h1 className="text-3xl sm:text-4xl font-black tracking-tight text-brand-text">
            {t("billing.title", "Billing & Quota Room")}
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <button
            type="button"
            className={`px-5 py-3 rounded-2xl font-bold text-base transition-all flex items-center gap-2.5 cursor-pointer border ${
              isDark
                ? "bg-[#151E30] border-slate-800 text-slate-200 hover:bg-slate-800"
                : "bg-white border-slate-200 text-slate-800 hover:bg-slate-100"
            }`}
          >
            <Settings className="w-5 h-5 stroke-[2.2]" />
            <span>{t("billing.managePlan", "Manage Plan")}</span>
          </button>
          <button
            type="button"
            className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold text-base transition-all flex items-center gap-2.5 shadow-lg shadow-blue-500/25 cursor-pointer hover:scale-102"
          >
            <Upload className="w-5 h-5 stroke-[2.2]" />
            <span>{t("billing.upgradeTier", "Upgrade Tier")}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-stretch">
        {/* LEFT COLUMN: Current Active Tier Box with Big Text & Neon Upgrade Button */}
        <div
          className={`rounded-[32px] p-8 sm:p-9 flex flex-col justify-between shadow-sm border ${
            isDark
              ? "bg-[#151E30] border-slate-800 text-white"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div>
            {/* Tier Header */}
            <div className="flex justify-between items-center mb-8">
              <h2 className="font-black text-2xl tracking-tight">
                {t("billing.currentTier", "Current Active Tier")}
              </h2>
              <span className="bg-blue-600 px-3.5 py-1.5 rounded-full text-xs font-black text-white uppercase tracking-wider shadow-sm">
                {currentPlanKey}
              </span>
            </div>

            {/* Price & Billing Cycle */}
            <div className="text-center mb-8 pb-8 border-b border-card-border">
              <div className="flex items-baseline justify-center gap-1.5">
                <span className="text-5xl sm:text-6xl font-black tracking-tight">
                  {currentPlan.price}
                </span>
                {currentPlan.price !== "Custom" &&
                  currentPlan.price !== "Free" && (
                    <span className="text-brand-textMuted font-bold text-xl">
                      /mo
                    </span>
                  )}
              </div>
              <p className="text-brand-textMuted text-sm font-semibold mt-3">
                Next billing date: {formatDate(records[0]?.period_end)}
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-4">
              <h3 className="font-mono text-base font-black text-brand-textMuted uppercase tracking-wider mb-5">
                {t("billing.includedFeatures", "Included Features:")}
              </h3>
              <ul className="space-y-4">
                {currentPlan.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-3.5">
                    <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0 stroke-[2.5]" />
                    <span className="text-base font-semibold leading-snug">
                      {feat}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Glowing Neon Upgrade Plan Button (adapted to width of the box) */}
          <div className="pt-8 mt-6">
            <button type="button" className="shadow__btn" onClick={() => {}}>
              <span>{t("billing.upgradePlan", "Upgrade Plan")}</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Quota Metrics & Invoice History (25% bigger) */}
        <div className="lg:col-span-2 flex flex-col gap-8">
          {/* Top Quota Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {/* Metric 1: Monthly Captured Leads */}
            <div
              className={`rounded-[32px] p-7 sm:p-8 shadow-sm flex flex-col justify-between min-h-[190px] border ${
                isDark
                  ? "bg-[#151E30] border-slate-800 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-black text-lg tracking-tight">
                  Monthly Captured Leads
                </h3>
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    isDark
                      ? "bg-slate-800 text-blue-400"
                      : "bg-blue-50 text-blue-600 border border-blue-100"
                  }`}
                >
                  <Users className="w-6 h-6 stroke-[2.2]" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-4xl sm:text-5xl font-black">
                    {totalEntries.toLocaleString()}
                  </span>
                  <span className="text-brand-textMuted text-lg font-bold">
                    / {currentPlan.quota.toLocaleString()}
                  </span>
                </div>
                <div
                  className={`w-full rounded-full h-3 overflow-hidden mb-3 ${
                    isDark ? "bg-slate-800" : "bg-slate-100"
                  }`}
                >
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-sm text-brand-textMuted font-mono font-bold">
                  <span>{Math.round(usagePercent)}% Used</span>
                  <span>
                    {Math.max(
                      0,
                      currentPlan.quota - totalEntries,
                    ).toLocaleString()}{" "}
                    remaining
                  </span>
                </div>
              </div>
            </div>

            {/* Metric 2: API Requests Daily */}
            <div
              className={`rounded-[32px] p-7 sm:p-8 shadow-sm flex flex-col justify-between min-h-[190px] border ${
                isDark
                  ? "bg-[#151E30] border-slate-800 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-black text-lg tracking-tight">
                  API Requests (Daily)
                </h3>
                <div
                  className={`w-10 h-10 rounded-2xl flex items-center justify-center ${
                    isDark
                      ? "bg-slate-800 text-emerald-400"
                      : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  }`}
                >
                  <Cpu className="w-6 h-6 stroke-[2.2]" />
                </div>
              </div>
              <div className="mt-4">
                <div className="flex items-baseline gap-2 mb-3">
                  <span className="text-4xl sm:text-5xl font-black">4,102</span>
                  <span className="text-brand-textMuted text-lg font-bold">
                    / 10,000
                  </span>
                </div>
                <div
                  className={`w-full rounded-full h-3 overflow-hidden mb-3 ${
                    isDark ? "bg-slate-800" : "bg-slate-100"
                  }`}
                >
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `41%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-sm text-brand-textMuted font-mono font-bold">
                  <span>41% Used</span>
                  <span>Resets in 8h 12m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Table Container */}
          <div
            className={`rounded-[32px] p-8 sm:p-9 shadow-sm flex-1 flex flex-col border ${
              isDark
                ? "bg-[#151E30] border-slate-800 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex justify-between items-center mb-6">
              <h2 className="font-black text-2xl tracking-tight">
                Invoice History
              </h2>
              <button
                type="button"
                className="flex items-center gap-2 text-blue-600 dark:text-blue-400 hover:underline font-mono text-sm font-bold transition-colors cursor-pointer"
              >
                <Download className="w-5 h-5 stroke-[2.2]" />
                <span>Download All</span>
              </button>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[550px]">
                <thead>
                  <tr className="border-b border-card-border text-xs text-brand-textMuted uppercase font-mono font-black tracking-wider">
                    <th className="pb-4 px-3">Date</th>
                    <th className="pb-4 px-3">Invoice #</th>
                    <th className="pb-4 px-3">Amount</th>
                    <th className="pb-4 px-3">Status</th>
                    <th className="pb-4 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border text-base font-semibold">
                  {records.slice(0, 3).map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-card-bg-subtle transition-colors"
                    >
                      <td className="py-4 px-3 text-brand-textMuted whitespace-nowrap">
                        {formatDate(record.period_start)}
                      </td>
                      <td className="py-4 px-3 font-mono font-bold whitespace-nowrap">
                        INV-
                        {new Date(record.period_start).getFullYear()}-
                        {String(
                          new Date(record.period_start).getMonth() + 1,
                        ).padStart(2, "0")}
                        -{record.id.slice(0, 3).toUpperCase()}
                      </td>
                      <td className="py-4 px-3 font-black whitespace-nowrap">
                        {record.amount} DZD
                      </td>
                      <td className="py-4 px-3 whitespace-nowrap">
                        <span
                          className={`px-3 py-1 rounded-full text-xs font-black uppercase tracking-wider ${
                            record.status === "paid"
                              ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="py-4 px-3 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className={`p-2 rounded-xl transition-colors inline-flex cursor-pointer border ${
                            isDark
                              ? "bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
                          }`}
                        >
                          <FileText className="w-5 h-5" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-10 text-center text-brand-textMuted text-base font-semibold"
                      >
                        No invoices found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
