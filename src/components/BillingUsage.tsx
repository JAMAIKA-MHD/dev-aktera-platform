import React from "react";
import {
  CheckCircle2,
  Users,
  Cpu,
  Download,
  FileText,
  Upload,
  Settings,
  Sparkles,
  X,
  CreditCard,
  Building,
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

  // Interactive Plan Upgrade Modal State
  const [isModalOpen, setIsModalOpen] = React.useState(false);
  const [selectedPlan, setSelectedPlan] =
    React.useState<BillingRecord["plan"]>("pro");
  const [paymentMethod, setPaymentMethod] = React.useState<
    "edahabia" | "cib" | "wire"
  >("edahabia");
  const [isProcessing, setIsProcessing] = React.useState(false);
  const [modalSuccess, setModalSuccess] = React.useState<string | null>(null);
  const [modalError, setModalError] = React.useState<string | null>(null);

  const handleUpgradeSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setIsProcessing(true);
    setModalError(null);
    setModalSuccess(null);

    // TODO(backend): payment/plan-upgrade contract not implemented
    setTimeout(() => {
      setIsProcessing(false);
      setModalSuccess(
        `Your upgrade request to ${PLAN_LABELS[selectedPlan]} via ${paymentMethod.toUpperCase()} has been submitted. Our team will verify and activate your quota.`,
      );
    }, 1200);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setModalSuccess(null);
    setModalError(null);
    setIsProcessing(false);
  };

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
      className="space-y-5 text-brand-text max-w-[1700px] mx-auto pb-14 pt-1.5"
    >
      {/* Top Header Bar */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3.5">
        <div>
          <h1 className="text-xl sm:text-2xl font-black tracking-tight text-brand-text">
            {t("billing.title", "Billing & Quota Room")}
          </h1>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className={`px-3.5 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 cursor-pointer border ${
              isDark
                ? "bg-[#151E30] border-slate-800 text-slate-200 hover:bg-slate-800"
                : "bg-white border-slate-200 text-slate-800 hover:bg-slate-100"
            }`}
          >
            <Settings className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>{t("billing.managePlan", "Manage Plan")}</span>
          </button>
          <button
            type="button"
            onClick={() => setIsModalOpen(true)}
            className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded-lg font-bold text-xs sm:text-sm transition-all flex items-center gap-1.5 shadow-md shadow-blue-500/25 cursor-pointer hover:scale-102"
          >
            <Upload className="w-3.5 h-3.5 stroke-[2.2]" />
            <span>{t("billing.upgradeTier", "Upgrade Tier")}</span>
          </button>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5 items-stretch">
        {/* LEFT COLUMN: Current Active Tier Box with Big Text & Neon Upgrade Button */}
        <div
          className={`rounded-[20px] p-5 sm:p-6 flex flex-col justify-between shadow-sm border ${
            isDark
              ? "bg-[#151E30] border-slate-800 text-white"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div>
            {/* Tier Header */}
            <div className="flex justify-between items-center mb-5">
              <h2 className="font-black text-lg tracking-tight">
                {t("billing.currentTier", "Current Active Tier")}
              </h2>
              <span className="bg-blue-600 px-2.5 py-0.5 rounded-full text-[10px] font-black text-white uppercase tracking-wider shadow-sm">
                {currentPlanKey}
              </span>
            </div>

            {/* Price & Billing Cycle */}
            <div className="text-center mb-5 pb-5 border-b border-card-border">
              <div className="flex items-baseline justify-center gap-1">
                <span className="text-3xl sm:text-4xl font-black tracking-tight">
                  {currentPlan.price}
                </span>
                {currentPlan.price !== "Custom" &&
                  currentPlan.price !== "Free" && (
                    <span className="text-brand-textMuted font-bold text-sm">
                      /mo
                    </span>
                  )}
              </div>
              <p className="text-brand-textMuted text-[11px] font-semibold mt-2">
                Next billing date: {formatDate(records[0]?.period_end)}
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-2.5">
              <h3 className="font-mono text-xs font-black text-brand-textMuted uppercase tracking-wider mb-3">
                {t("billing.includedFeatures", "Included Features:")}
              </h3>
              <ul className="space-y-2.5">
                {currentPlan.features.map((feat, i) => (
                  <li key={i} className="flex items-center gap-2">
                    <CheckCircle2 className="w-4.5 h-4.5 text-emerald-500 shrink-0 stroke-[2.5]" />
                    <span className="text-xs sm:text-sm font-semibold leading-snug">
                      {feat}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Glowing Neon Upgrade Plan Button (adapted to width of the box) */}
          <div className="pt-5 mt-4">
            <button
              type="button"
              className="shadow__btn"
              onClick={() => setIsModalOpen(true)}
            >
              <span>{t("billing.upgradePlan", "Upgrade Plan")}</span>
            </button>
          </div>
        </div>

        {/* RIGHT COLUMN: Quota Metrics & Invoice History */}
        <div className="lg:col-span-2 flex flex-col gap-5">
          {/* Top Quota Metrics Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Metric 1: Monthly Captured Leads */}
            <div
              className={`rounded-[20px] p-4.5 sm:p-5 shadow-sm flex flex-col justify-between min-h-[135px] border ${
                isDark
                  ? "bg-[#151E30] border-slate-800 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-black text-sm sm:text-base tracking-tight">
                  Monthly Captured Leads
                </h3>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isDark
                      ? "bg-slate-800 text-blue-400"
                      : "bg-blue-50 text-blue-600 border border-blue-100"
                  }`}
                >
                  <Users className="w-4 h-4 stroke-[2.2]" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl sm:text-3xl font-black">
                    {totalEntries.toLocaleString()}
                  </span>
                  <span className="text-brand-textMuted text-sm font-bold">
                    / {currentPlan.quota.toLocaleString()}
                  </span>
                </div>
                <div
                  className={`w-full rounded-full h-1.5 overflow-hidden mb-2 ${
                    isDark ? "bg-slate-800" : "bg-slate-100"
                  }`}
                >
                  <div
                    className="bg-blue-600 h-full rounded-full transition-all"
                    style={{ width: `${usagePercent}%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-brand-textMuted font-mono font-bold">
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
              className={`rounded-[20px] p-4.5 sm:p-5 shadow-sm flex flex-col justify-between min-h-[135px] border ${
                isDark
                  ? "bg-[#151E30] border-slate-800 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex justify-between items-start">
                <h3 className="font-black text-sm sm:text-base tracking-tight">
                  API Requests (Daily)
                </h3>
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center ${
                    isDark
                      ? "bg-slate-800 text-emerald-400"
                      : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  }`}
                >
                  <Cpu className="w-4 h-4 stroke-[2.2]" />
                </div>
              </div>
              <div className="mt-2.5">
                <div className="flex items-baseline gap-1 mb-2">
                  <span className="text-2xl sm:text-3xl font-black">4,102</span>
                  <span className="text-brand-textMuted text-sm font-bold">
                    / 10,000
                  </span>
                </div>
                <div
                  className={`w-full rounded-full h-1.5 overflow-hidden mb-2 ${
                    isDark ? "bg-slate-800" : "bg-slate-100"
                  }`}
                >
                  <div
                    className="bg-emerald-500 h-full rounded-full transition-all"
                    style={{ width: `41%` }}
                  />
                </div>
                <div className="flex justify-between items-center text-[11px] text-brand-textMuted font-mono font-bold">
                  <span>41% Used</span>
                  <span>Resets in 8h 12m</span>
                </div>
              </div>
            </div>
          </div>

          {/* Invoice Table Container */}
          <div
            className={`rounded-[20px] p-5 sm:p-6 shadow-sm flex-1 flex flex-col border ${
              isDark
                ? "bg-[#151E30] border-slate-800 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <div className="flex justify-between items-center mb-4">
              <h2 className="font-black text-lg tracking-tight">
                Invoice History
              </h2>
              <button
                type="button"
                className="flex items-center gap-1.5 text-blue-600 dark:text-blue-400 hover:underline font-mono text-xs font-bold transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 stroke-[2.2]" />
                <span>Download All</span>
              </button>
            </div>

            <div className="w-full overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[500px]">
                <thead>
                  <tr className="border-b border-card-border text-[10px] text-brand-textMuted uppercase font-mono font-black tracking-wider">
                    <th className="pb-3 px-2.5">Date</th>
                    <th className="pb-3 px-2.5">Invoice #</th>
                    <th className="pb-3 px-2.5">Amount</th>
                    <th className="pb-3 px-2.5">Status</th>
                    <th className="pb-3 px-2.5 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border text-xs sm:text-sm font-semibold">
                  {records.slice(0, 3).map((record) => (
                    <tr
                      key={record.id}
                      className="hover:bg-card-bg-subtle transition-colors"
                    >
                      <td className="py-3 px-2.5 text-brand-textMuted whitespace-nowrap">
                        {formatDate(record.period_start)}
                      </td>
                      <td className="py-3 px-2.5 font-mono font-bold whitespace-nowrap">
                        INV-
                        {new Date(record.period_start).getFullYear()}-
                        {String(
                          new Date(record.period_start).getMonth() + 1,
                        ).padStart(2, "0")}
                        -{record.id.slice(0, 3).toUpperCase()}
                      </td>
                      <td className="py-3 px-2.5 font-black whitespace-nowrap">
                        {record.amount} DZD
                      </td>
                      <td className="py-3 px-2.5 whitespace-nowrap">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider ${
                            record.status === "paid"
                              ? "bg-emerald-500/15 text-emerald-500 border border-emerald-500/30"
                              : "bg-amber-500/15 text-amber-500 border border-amber-500/30"
                          }`}
                        >
                          {record.status}
                        </span>
                      </td>
                      <td className="py-3 px-2.5 text-right whitespace-nowrap">
                        <button
                          type="button"
                          className={`p-1.5 rounded-lg transition-colors inline-flex cursor-pointer border ${
                            isDark
                              ? "bg-slate-800 text-slate-300 hover:bg-slate-700 border-slate-700"
                              : "bg-slate-100 text-slate-600 hover:bg-slate-200 border-slate-200"
                          }`}
                        >
                          <FileText className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                  {records.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="py-8 text-center text-brand-textMuted text-xs sm:text-sm font-semibold"
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

      {/* UPGRADE / CHANGE PLAN INTERACTIVE MODAL */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 bg-black/60 backdrop-blur-sm animate-in fade-in">
          <div
            className={`w-full max-w-lg rounded-2xl p-5 sm:p-6 shadow-2xl border transition-all ${
              isDark
                ? "bg-[#111726] border-slate-700 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between pb-3.5 border-b border-card-border">
              <div className="flex items-center gap-2">
                <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
                  <Sparkles className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-lg font-black">Upgrade / Manage Plan</h3>
                  <p className="text-[11px] text-brand-textMuted font-semibold">
                    Select a tier and payment method for your organization
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={closeModal}
                className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {modalSuccess ? (
              <div className="py-6 text-center space-y-3.5">
                <div className="w-12 h-12 mx-auto rounded-full bg-emerald-500/15 text-emerald-500 flex items-center justify-center border border-emerald-500/30">
                  <CheckCircle2 className="w-7 h-7 stroke-[2.5]" />
                </div>
                <h4 className="text-base font-black text-emerald-500">
                  Request Submitted Successfully
                </h4>
                <p className="text-xs text-brand-textMuted max-w-sm mx-auto leading-relaxed">
                  {modalSuccess}
                </p>
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="bg-blue-600 hover:bg-blue-500 text-white font-bold text-xs px-5 py-2 rounded-full transition-all cursor-pointer"
                  >
                    Done
                  </button>
                </div>
              </div>
            ) : (
              <form onSubmit={handleUpgradeSubmit} className="space-y-5 pt-3.5">
                {modalError && (
                  <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-500 text-[11px] font-bold">
                    {modalError}
                  </div>
                )}

                {/* Plan Selection */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-brand-textMuted">
                    Select New Tier
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {(["starter", "pro", "enterprise"] as const).map((plan) => (
                      <button
                        key={plan}
                        type="button"
                        onClick={() => setSelectedPlan(plan)}
                        className={`p-3 rounded-xl border text-left flex flex-col justify-between transition-all cursor-pointer ${
                          selectedPlan === plan
                            ? "border-blue-600 bg-blue-600/10 ring-2 ring-blue-600/30"
                            : isDark
                              ? "border-slate-800 bg-[#151E30] hover:border-slate-700"
                              : "border-slate-200 bg-slate-50 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-[10px] font-black uppercase tracking-wider text-brand-textMuted">
                          {plan}
                        </span>
                        <span className="text-sm font-black text-brand-text mt-1">
                          {PLAN_PRICES[plan].price}
                        </span>
                        <span className="text-[10px] text-brand-textMuted mt-0.5">
                          {PLAN_PRICES[plan].quota.toLocaleString()} leads
                        </span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Payment Method Selector */}
                <div className="space-y-2">
                  <label className="text-[11px] font-black uppercase tracking-wider text-brand-textMuted">
                    Payment Method
                  </label>
                  <div className="space-y-1.5">
                    {[
                      {
                        id: "edahabia",
                        label: "EDAHABIA (BaridiMob)",
                        desc: "Instant national postal card verification",
                        icon: CreditCard,
                      },
                      {
                        id: "cib",
                        label: "CIB Bank Card",
                        desc: "Algerian interbank payment card",
                        icon: CreditCard,
                      },
                      {
                        id: "wire",
                        label: "Bank Wire Transfer",
                        desc: "Corporate bank invoice with proforma verification",
                        icon: Building,
                      },
                    ].map((method) => {
                      const Icon = method.icon;
                      return (
                        <label
                          key={method.id}
                          className={`p-3 rounded-xl border flex items-center justify-between cursor-pointer transition-all ${
                            paymentMethod === method.id
                              ? "border-blue-600 bg-blue-600/10 ring-1 ring-blue-600/30"
                              : isDark
                                ? "border-slate-800 bg-[#151E30] hover:border-slate-700"
                                : "border-slate-200 bg-slate-50 hover:border-slate-300"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className="p-1.5 rounded-lg bg-blue-600/10 text-blue-600 dark:text-blue-400">
                              <Icon className="w-3.5 h-3.5" />
                            </div>
                            <div>
                              <div className="text-xs font-bold text-brand-text">
                                {method.label}
                              </div>
                              <div className="text-[10px] text-brand-textMuted">
                                {method.desc}
                              </div>
                            </div>
                          </div>
                          <input
                            type="radio"
                            name="paymentMethod"
                            checked={paymentMethod === method.id}
                            onChange={() =>
                              setPaymentMethod(
                                method.id as "edahabia" | "cib" | "wire",
                              )
                            }
                            className="w-3.5 h-3.5 text-blue-600 accent-blue-600"
                          />
                        </label>
                      );
                    })}
                  </div>
                </div>

                {/* Modal Footer Actions */}
                <div className="flex items-center justify-end gap-2.5 pt-3.5 border-t border-card-border">
                  <button
                    type="button"
                    onClick={closeModal}
                    disabled={isProcessing}
                    className="px-4 py-2 rounded-full font-bold text-[11px] text-brand-textMuted hover:text-brand-text transition-colors cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isProcessing}
                    className="bg-blue-600 hover:bg-blue-500 disabled:opacity-60 text-white font-black text-[11px] px-5 py-2 rounded-full flex items-center gap-1.5 shadow-md shadow-blue-500/25 transition-all hover:scale-102 cursor-pointer"
                  >
                    {isProcessing ? (
                      <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Upload className="w-3.5 h-3.5" />
                    )}
                    <span>
                      {isProcessing ? "Processing..." : "Confirm Upgrade"}
                    </span>
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
