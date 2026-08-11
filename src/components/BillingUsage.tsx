import React, { useMemo } from "react";
import {
  AlertTriangle,
  Check,
  CreditCard,
  Receipt,
  ShieldCheck,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useAnalytics } from "../hooks/useAnalytics";
import { useBilling, BillingRecord } from "../hooks/useBilling";

const PLAN_LABELS: Record<BillingRecord["plan"], string> = {
  free: "Ramadan Starter",
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
  if (!value) return "Not scheduled yet";
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

  const currentPlanKey = organization?.plan ?? "free";
  const currentPlan = PLAN_PRICES[currentPlanKey];
  const totalEntries = analytics?.total_entries ?? 0;
  const activeCampaigns = analytics?.active_campaigns ?? 0;
  const usagePercent = Math.min(
    100,
    currentPlan.quota > 0 ? (totalEntries / currentPlan.quota) * 100 : 0,
  );
  const paidAmount = useMemo(
    () =>
      records
        .filter((record) => record.status === "paid")
        .reduce((sum, record) => sum + Number(record.amount), 0),
    [records],
  );
  const pendingAmount = useMemo(
    () =>
      records
        .filter((record) => record.status === "pending")
        .reduce((sum, record) => sum + Number(record.amount), 0),
    [records],
  );

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">
        {error}
      </div>
    );
  }

  return (
    <div id="billing-usage-root" className="space-y-6 text-slate-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-gray-200 pb-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
            Billing & Quota Room
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Track live usage against the current plan and review billing history
            returned by Supabase.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
        {[
          {
            title: "Current plan",
            value: PLAN_LABELS[currentPlanKey],
            desc: currentPlan.period,
            icon: CreditCard,
            color: "text-indigo-600",
          },
          {
            title: "Paid amount",
            value: `${paidAmount.toLocaleString()} DZD`,
            desc: "Settled invoice total",
            icon: Receipt,
            color: "text-emerald-600",
          },
          {
            title: "Pending amount",
            value: `${pendingAmount.toLocaleString()} DZD`,
            desc: "Awaiting payment collection",
            icon: AlertTriangle,
            color: "text-amber-600",
          },
          {
            title: "Invoice rows",
            value: records.length,
            desc: "Returned by the billing table",
            icon: ShieldCheck,
            color: "text-sky-600",
          },
        ].map((stat) => (
          <div
            key={stat.title}
            className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                {stat.title}
              </span>
              <stat.icon className={`w-4 h-4 ${stat.color}`} />
            </div>
            <h4 className="text-2xl font-extrabold mt-3 mb-1 text-slate-900">
              {stat.value}
            </h4>
            <p className="text-[11px] text-slate-500">{stat.desc}</p>
          </div>
        ))}
      </div>

      <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm grid grid-cols-1 md:grid-cols-2 gap-6 items-center">
        <div className="space-y-3.5">
          <div className="flex justify-between items-center text-xs">
            <span className="font-bold text-slate-700 uppercase tracking-wider font-mono">
              Monthly Capture Leads Meter
            </span>
            <span className="text-indigo-600 font-bold font-mono">
              {totalEntries.toLocaleString()} /{" "}
              {currentPlan.quota.toLocaleString()} Captures
            </span>
          </div>
          <div className="w-full bg-gray-100 rounded-full h-3 overflow-hidden border border-gray-200">
            <div
              className="bg-gradient-to-r from-indigo-600 to-indigo-400 h-full rounded-full"
              style={{ width: `${usagePercent}%` }}
            />
          </div>
          <p
            className={`text-[10px] flex items-center gap-1.5 leading-normal ${usagePercent >= 90 ? "text-amber-600" : "text-emerald-600"}`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>
              {usagePercent >= 90
                ? "Nearing limit. Upgrade planning should happen soon."
                : "Usage is still within the current plan allowance."}
            </span>
          </p>
        </div>

        <div className="space-y-1.5 text-xs text-slate-500 pl-0 md:pl-6 border-t md:border-t-0 md:border-l border-gray-200 pt-4 md:pt-0">
          <p className="font-bold text-slate-700 uppercase tracking-wider font-mono text-[10px]">
            Monthly active details:
          </p>
          <p>
            • <strong>Active portals:</strong> {activeCampaigns} live url(s)
          </p>
          <p>
            • <strong>Current tier:</strong> {PLAN_LABELS[currentPlanKey]}
          </p>
          <p>
            • <strong>Invoice cycle resets:</strong>{" "}
            {formatDate(records[0]?.period_end)}
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] gap-6">
        <div className="bg-white border border-gray-200 rounded-2xl p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3 mb-4">
            <div>
              <h3 className="text-sm font-bold text-slate-800">
                Invoice history
              </h3>
              <p className="text-[11px] text-slate-500 mt-0.5">
                Live rows from the `billing` table for this organization.
              </p>
            </div>
          </div>

          {records.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-5 text-center text-xs text-slate-500">
              No billing entries yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-400">
                    <th className="pb-3 pl-1 font-semibold">Plan</th>
                    <th className="pb-3 font-semibold">Cycle</th>
                    <th className="pb-3 font-semibold">Period</th>
                    <th className="pb-3 font-semibold text-right">Amount</th>
                    <th className="pb-3 pr-1 text-right font-semibold">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                  {records.map((record) => {
                    const statusClasses =
                      record.status === "paid"
                        ? "bg-emerald-50 border-emerald-200 text-emerald-700"
                        : record.status === "pending"
                          ? "bg-amber-50 border-amber-200 text-amber-700"
                          : "bg-rose-50 border-rose-200 text-rose-700";

                    return (
                      <tr key={record.id} className="hover:bg-slate-50/60">
                        <td className="py-3 pl-1 font-semibold text-slate-800">
                          {PLAN_LABELS[record.plan]}
                        </td>
                        <td className="py-3">{record.billing_cycle}</td>
                        <td className="py-3 font-mono text-[11px] text-slate-500">
                          {formatDate(record.period_start)} -{" "}
                          {formatDate(record.period_end)}
                        </td>
                        <td className="py-3 text-right">
                          {Number(record.amount).toLocaleString()} DZD
                        </td>
                        <td className="py-3 pr-1 text-right">
                          <span
                            className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${statusClasses}`}
                          >
                            {record.status}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 gap-6">
          {(Object.keys(PLAN_LABELS) as BillingRecord["plan"][]).map(
            (planKey) => {
              const isCurrent = currentPlanKey === planKey;
              const pricing = PLAN_PRICES[planKey];
              return (
                <div
                  key={planKey}
                  className={`bg-white border rounded-2xl p-6 flex flex-col justify-between shadow-sm relative overflow-hidden ${
                    isCurrent
                      ? "border-indigo-400 ring-2 ring-indigo-100"
                      : "border-gray-200"
                  }`}
                >
                  {isCurrent && (
                    <div className="absolute right-0 top-0 bg-indigo-600 text-white text-[9px] font-bold px-3 py-1 uppercase tracking-widest rounded-bl-xl font-mono">
                      Active Plan
                    </div>
                  )}

                  <div>
                    <span className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest">
                      {PLAN_LABELS[planKey]}
                    </span>
                    <div className="flex items-baseline gap-1 mt-2">
                      <span className="text-3xl font-extrabold text-slate-900">
                        {pricing.price}
                      </span>
                      <span className="text-xs text-slate-400 font-mono">
                        {pricing.period}
                      </span>
                    </div>

                    <ul className="space-y-3 mt-6 text-xs text-slate-600">
                      {pricing.features.map((feature) => (
                        <li key={feature} className="flex items-start gap-2.5">
                          <Check className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
                          <span>{feature}</span>
                        </li>
                      ))}
                    </ul>
                  </div>

                  <button
                    disabled
                    title="Checkout and upgrade automation will be added in a later milestone."
                    className={`w-full text-xs font-bold py-3.5 rounded-xl transition-all mt-8 min-h-11 ${
                      isCurrent
                        ? "bg-gray-100 text-slate-400 border border-gray-200 cursor-not-allowed"
                        : "bg-indigo-600/80 text-white cursor-not-allowed"
                    }`}
                  >
                    {isCurrent ? "Current Active Tier" : "Upgrade Flow Planned"}
                  </button>
                </div>
              );
            },
          )}
        </div>
      </div>
    </div>
  );
};
