import { useEffect, useState } from 'react';
import { AlertTriangle, Check, CreditCard, Receipt, ShieldCheck } from 'lucide-react';
import { format } from 'date-fns';
import { useAuth } from '../../context/AuthContext';
import { useAnalytics } from '../../hooks/useAnalytics';
import { supabase } from '../../lib/supabase';
import { toFriendlyErrorMessage } from '../../lib/errorMessages';
import type { Billing as BillingRecord } from '../../types';

const PLAN_LABELS: Record<string, string> = {
  free: 'Ramadan Starter',
  starter: 'Starter Growth',
  pro: 'Pro Activation',
  enterprise: 'Enterprise Bulk',
};

const PLAN_PRICES: Record<string, { price: string; period: string; quota: number }> = {
  free: { price: 'Free', period: 'For small businesses', quota: 1000 },
  starter: { price: '2,500 DA', period: 'per month', quota: 3000 },
  pro: { price: '4,500 DA', period: 'per month', quota: 10000 },
  enterprise: { price: 'Custom', period: 'for major telecoms & FMCG', quota: 100000 },
};

const PLAN_FEATURES: Record<string, string[]> = {
  free: [
    '1 Active Promo Portal',
    'Up to 1,000 Consumer Leads',
    'Basic Lucky Wheel Mechanic',
    'Algerian phone validation checks',
    'Standard Email Support',
  ],
  starter: [
    '3 Concurrent Portals',
    'Up to 3,000 Consumer Leads',
    'Expanded reward library operations',
    'CSV export coverage',
    'Faster campaign relaunch cycles',
  ],
  pro: [
    '5 Concurrent Portals',
    'Up to 10,000 Consumer Leads',
    'Full Darija/English Quiz Challenge',
    'Detailed Hourly Peak Analytics',
    'Priority Technical Support',
  ],
  enterprise: [
    'Unlimited Live Portals',
    'Over 100,000 lead streams',
    'Custom SMS API integrations',
    'Dedicated server authority',
    'SLA 99.9% uptime guarantees',
  ],
};

export default function Billing() {
  const { organization } = useAuth();
  const { analytics } = useAnalytics();
  const [records, setRecords] = useState<BillingRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organization) {
      setRecords([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchBilling = async () => {
      const { data, error: queryError } = await supabase
        .from('billing')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (queryError) {
        setError(toFriendlyErrorMessage(queryError, { fallback: 'Unable to load billing data.' }));
        setLoading(false);
        return;
      }

      setRecords((data as BillingRecord[]) ?? []);
      setLoading(false);
    };

    void fetchBilling();

    return () => {
      cancelled = true;
    };
  }, [organization]);

  const currentPlanKey = organization?.plan ?? 'free';
  const paidAmount = records.filter((record) => record.status === 'paid').reduce((sum, record) => sum + Number(record.amount), 0);
  const pendingAmount = records.filter((record) => record.status === 'pending').reduce((sum, record) => sum + Number(record.amount), 0);
  const currentQuota = PLAN_PRICES[currentPlanKey]?.quota ?? 1000;
  const totalEntries = analytics?.total_entries ?? 0;
  const usagePercent = Math.min(100, currentQuota > 0 ? (totalEntries / currentQuota) * 100 : 0);
  const currentPlanLabel = PLAN_LABELS[currentPlanKey];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700">{error}</div>;
  }

  return (
    <div className="space-y-6 text-slate-100">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-[#2D2D3F]/60 pb-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight">Billing & Quota Room</h2>
          <p className="mt-0.5 text-xs text-slate-400">
            Track your monthly active portal consumption and review invoice history.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-[#2D2D3F] bg-[#161625] p-6 shadow-md">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Current plan</span>
                <CreditCard className="h-5 w-5 text-indigo-400" />
              </div>
              <p className="mt-3 text-2xl font-extrabold text-slate-100">{currentPlanLabel}</p>
              <p className="mt-1 text-xs text-slate-500">{PLAN_PRICES[currentPlanKey].period}</p>
            </div>

            <div className="rounded-3xl border border-[#2D2D3F] bg-[#161625] p-6 shadow-md">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Paid amount</span>
                <Receipt className="h-5 w-5 text-emerald-400" />
              </div>
              <p className="mt-3 text-2xl font-extrabold text-slate-100">{paidAmount.toLocaleString()} DZD</p>
              <p className="mt-1 text-xs text-slate-500">Settled invoice volume from the live billing table.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="rounded-3xl border border-[#2D2D3F] bg-[#161625] p-6 shadow-md">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Pending amount</span>
                <AlertTriangle className="h-5 w-5 text-amber-400" />
              </div>
              <p className="mt-3 text-2xl font-extrabold text-slate-100">{pendingAmount.toLocaleString()} DZD</p>
              <p className="mt-1 text-xs text-slate-500">Entries awaiting confirmation or collection.</p>
            </div>

            <div className="rounded-3xl border border-[#2D2D3F] bg-[#161625] p-6 shadow-md">
              <div className="flex items-start justify-between">
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Invoices</span>
                <ShieldCheck className="h-5 w-5 text-indigo-400" />
              </div>
              <p className="mt-3 text-2xl font-extrabold text-slate-100">{records.length}</p>
              <p className="mt-1 text-xs text-slate-500">Historical rows returned by the existing billing flow.</p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-6 items-center rounded-3xl border border-[#2D2D3F] bg-[#161625] p-6 shadow-md md:grid-cols-2">
            <div className="space-y-3.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold uppercase tracking-wider text-slate-300">Monthly Capture Leads Meter</span>
                <span className="font-mono font-bold text-indigo-400">
                  {totalEntries.toLocaleString()} / {currentQuota.toLocaleString()} Captures
                </span>
              </div>
              <div className="h-3 w-full overflow-hidden rounded-full border border-[#2D2D3F] bg-[#0F0F1A]">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-600 to-indigo-400"
                  style={{ width: `${usagePercent}%` }}
                />
              </div>
              <p className="flex items-center gap-1.5 text-[10px] leading-normal text-amber-400">
                <AlertTriangle className="h-3.5 w-3.5" />
                <span>
                  {usagePercent >= 90
                    ? 'Nearing limit. Upgrade below to avoid live promo slowdowns.'
                    : 'Usage is still within the current plan allowance.'}
                </span>
              </p>
            </div>

            <div className="space-y-1.5 border-t border-[#2D2D3F] pt-4 pl-0 text-xs text-slate-400 md:border-l md:border-t-0 md:pt-0 md:pl-6">
              <p className="text-[10px] font-bold uppercase tracking-wider text-slate-200">Monthly active details:</p>
              <p>• <strong>Active portals:</strong> {analytics?.active_campaigns ?? 0} live urls</p>
              <p>• <strong>Current tier:</strong> {currentPlanLabel}</p>
              <p>• <strong>Invoice cycle resets:</strong> {records[0]?.period_end ? format(new Date(records[0].period_end), 'MMMM dd, yyyy') : 'Not scheduled yet'}</p>
            </div>
          </div>

          <div className="rounded-3xl border border-[#2D2D3F]/75 bg-[#161625]/90 p-6 shadow-lg">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-sm font-bold text-slate-200">Invoice History</h3>
                <p className="mt-0.5 text-[11px] text-slate-500">All rows below are sourced from the existing billing table.</p>
              </div>
            </div>

            {records.length === 0 ? (
              <div className="rounded-2xl border border-[#2D2D3F] bg-[#0F0F1A] px-4 py-5 text-center text-xs text-slate-400">
                No billing entries yet.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-[#2D2D3F] text-[10px] uppercase text-slate-400">
                      <th className="pb-3 pl-1 font-semibold">Plan</th>
                      <th className="pb-3 font-semibold">Cycle</th>
                      <th className="pb-3 font-semibold">Period</th>
                      <th className="pb-3 font-semibold text-right">Amount</th>
                      <th className="pb-3 pr-1 text-right font-semibold">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#2D2D3F]/70 text-xs text-slate-300">
                    {records.map((record) => {
                      const statusClasses =
                        record.status === 'paid'
                          ? 'bg-emerald-500/10 border-emerald-500/25 text-emerald-300'
                          : record.status === 'pending'
                            ? 'bg-amber-500/10 border-amber-500/25 text-amber-300'
                            : 'bg-rose-500/10 border-rose-500/25 text-rose-300';

                      return (
                        <tr key={record.id} className="hover:bg-white/[0.02]">
                          <td className="py-3 pl-1 font-semibold text-slate-100">{PLAN_LABELS[record.plan]}</td>
                          <td className="py-3">{record.billing_cycle}</td>
                          <td className="py-3 font-mono text-[11px] text-slate-400">
                            {format(new Date(record.period_start), 'dd/MM/yyyy')} - {format(new Date(record.period_end), 'dd/MM/yyyy')}
                          </td>
                          <td className="py-3 text-right">{Number(record.amount).toLocaleString()} DZD</td>
                          <td className="py-3 pr-1 text-right">
                            <span className={`inline-block rounded-full border px-2 py-0.5 text-[9px] font-bold uppercase ${statusClasses}`}>
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
        </div>

        <div className="grid grid-cols-1 gap-6">
          {Object.entries(PLAN_LABELS).map(([planKey, label]) => {
            const isCurrent = currentPlanKey === planKey;
            const pricing = PLAN_PRICES[planKey];
            return (
              <div
                key={planKey}
                className={`relative overflow-hidden rounded-3xl border bg-[#161625]/90 p-6 shadow-lg ${
                  isCurrent ? 'border-indigo-500/50' : 'border-[#2D2D3F]/75'
                }`}
              >
                {isCurrent ? (
                  <div className="absolute right-0 top-0 rounded-bl-xl bg-indigo-600 px-3 py-1 text-[9px] font-bold uppercase tracking-widest text-white">
                    Active Plan
                  </div>
                ) : null}

                <div>
                  <span className="text-xs font-bold uppercase tracking-widest text-slate-500">{label}</span>
                  <div className="mt-2 flex items-baseline gap-1">
                    <span className="text-3xl font-extrabold text-slate-100">{pricing.price}</span>
                    <span className="text-xs text-slate-500">{pricing.period}</span>
                  </div>
                  <ul className="mt-6 space-y-3 text-xs text-slate-300">
                    {PLAN_FEATURES[planKey].map((feature) => (
                      <li key={feature} className="flex items-start gap-2.5">
                        <Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-400" />
                        <span>{feature}</span>
                      </li>
                    ))}
                  </ul>
                </div>

                <button
                  type="button"
                  disabled
                  title="Checkout and upgrade automation will be added in a later milestone."
                  className={`touch-target mt-8 w-full rounded-xl py-3.5 text-xs font-bold transition-all min-h-11 ${
                    isCurrent
                      ? 'cursor-not-allowed border border-[#2D2D3F] bg-[#1F1F2E] text-slate-300'
                      : 'cursor-not-allowed bg-indigo-600/80 text-white shadow-lg shadow-indigo-600/20'
                  }`}
                >
                  {isCurrent ? 'Current Active Tier' : 'Upgrade Flow Planned'}
                </button>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
