import {
  AlertTriangle,
  ArrowRight,
  BarChart3,
  Calendar,
  Gift,
  Megaphone,
  Plus,
  Sparkles,
  TrendingUp,
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { adaptCampaignToUiSummary, adaptPrizeTemplateToUiRewardCard, Phase2StatusPill } from '../../features/phase2-ui';
import { useCampaigns } from '../../hooks/useCampaigns';
import { usePrizeTemplates } from '../../hooks/usePrizeTemplates';

export default function Home() {
  const navigate = useNavigate();
  const { organization } = useAuth();
  const { campaigns, loading, error } = useCampaigns();
  const { templates, loading: templatesLoading, error: templatesError } = usePrizeTemplates();

  const activeCampaigns = campaigns.filter(
    (campaign) => campaign.status === 'active' && new Date(campaign.end_date) > new Date(),
  );
  const averageWinRate = campaigns.length
    ? Math.round(
        campaigns.reduce((sum, campaign) => sum + campaign.win_probability * 100, 0) / campaigns.length,
      )
    : 0;

  const recentCampaigns = activeCampaigns.slice(0, 4).map((campaign) => adaptCampaignToUiSummary(campaign));
  const lowStockTemplates = templates
    .map((template) => adaptPrizeTemplateToUiRewardCard(template))
    .filter((template) => template.stockHealthTone !== 'success')
    .slice(0, 4);

  const metricCards = [
    {
      title: 'Active Campaigns',
      value: activeCampaigns.length,
      desc: 'Running real-time wheels & quizzes',
      icon: TrendingUp,
      color: 'text-indigo-600',
    },
    {
      title: 'Reward Library Items',
      value: templates.length,
      desc: 'Voucher and physical prize templates',
      icon: Gift,
      color: 'text-emerald-600',
    },
    {
      title: 'Average Win Rate',
      value: `${averageWinRate}%`,
      desc: 'Server-backed probability average',
      icon: BarChart3,
      color: 'text-amber-600',
    },
    {
      title: 'Stock Alerts',
      value: lowStockTemplates.length,
      desc: 'Templates needing stock attention',
      icon: AlertTriangle,
      color: 'text-rose-600',
    },
  ];

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="rounded-[28px] border border-rose-200 bg-rose-50 p-5 text-sm text-rose-700">
        Failed to load dashboard data: {error}
      </div>
    );
  }

  return (
    <div className="space-y-6 text-slate-800">
      <div className="flex flex-col gap-4 border-b border-slate-200 pb-6 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">
            Welcome Back{organization?.name ? `, ${organization.name}` : ''}! 👋
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            Track your zero-party consumer engagement and reward redemption across Algeria.
          </p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard/campaigns/new')}
          className="touch-target inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-sm font-bold text-white shadow-md transition hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5" />
          <span>Launch New Campaign</span>
        </button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((card) => {
          const Icon = card.icon;
          return (
            <div
              key={card.title}
              className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-[0_2px_10px_rgba(15,23,42,0.04)]"
            >
              <div className="flex items-start justify-between">
                <span className="text-xs font-bold uppercase tracking-wider text-slate-400">{card.title}</span>
                <Icon className={`h-5 w-5 ${card.color}`} />
              </div>
              <h3 className="mt-3 text-3xl font-extrabold tracking-tight text-slate-900">{card.value}</h3>
              <p className="mt-1 text-[11px] leading-normal text-slate-500">{card.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-6 lg:col-span-2">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between gap-3">
              <div>
                <h3 className="text-base font-bold text-slate-800">Active Campaign Radios</h3>
                <p className="text-xs text-slate-500">Currently collecting zero-party consumer leads</p>
              </div>
              <button
                type="button"
                onClick={() => navigate('/dashboard/campaigns')}
                className="inline-flex items-center gap-1 text-xs font-semibold text-indigo-600 transition hover:text-indigo-800"
              >
                <span>View all</span>
                <ArrowRight className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3.5">
              {recentCampaigns.length === 0 ? (
                <div className="rounded-2xl border border-slate-100 bg-slate-50/70 px-4 py-6 text-center text-sm text-slate-400">
                  No campaigns currently active. Launch a new one to start collecting data.
                </div>
              ) : (
                recentCampaigns.map((campaign) => (
                  <button
                    key={campaign.id}
                    type="button"
                    onClick={() => navigate(campaign.dashboardPath)}
                    className="group flex w-full flex-col gap-3 rounded-2xl border border-slate-100 bg-slate-50/60 p-4 text-left transition hover:border-slate-300 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-bold text-slate-800 transition group-hover:text-indigo-600">
                          {campaign.name}
                        </span>
                        <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] font-mono uppercase text-indigo-600">
                          {campaign.mechanic.label}
                        </span>
                        <Phase2StatusPill label={campaign.status.label} tone={campaign.status.tone} />
                      </div>
                      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-2 text-[11px] text-slate-500">
                        <span className="inline-flex items-center gap-1.5">
                          <Calendar className="h-3.5 w-3.5" />
                          {campaign.startDateLabel} - {campaign.endDateLabel}
                        </span>
                        <span className="inline-flex items-center gap-1.5">
                          <TrendingUp className="h-3.5 w-3.5" />
                          Win probability: {campaign.winProbabilityPercent}%
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-4">
                      <div className="rounded-lg border border-slate-200 bg-white p-2 text-slate-400 transition group-hover:border-indigo-500 group-hover:bg-indigo-600 group-hover:text-white">
                        <ArrowRight className="h-4 w-4" />
                      </div>
                    </div>
                  </button>
                ))
              )}
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg border border-emerald-100 bg-emerald-50 p-2 text-emerald-600">
                <Megaphone className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Workflow Shortcuts</h3>
                <p className="text-[11px] text-slate-500">Open the main build surfaces directly from the overview</p>
              </div>
            </div>

            <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard/campaigns/new')}
                className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-500 p-5 text-left text-white transition hover:from-indigo-500 hover:to-violet-500"
              >
                <Plus className="h-5 w-5" />
                <p className="mt-4 text-sm font-bold">Campaign Wizard</p>
                <p className="mt-1 text-xs text-indigo-100">Launch a new wheel or quiz flow.</p>
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard/analytics')}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-5 text-left transition hover:border-slate-300 hover:bg-white"
              >
                <BarChart3 className="h-5 w-5 text-emerald-600" />
                <p className="mt-4 text-sm font-bold text-slate-800">Analytics Desk</p>
                <p className="mt-1 text-xs text-slate-500">Review live dashboards and exports.</p>
              </button>
              <button
                type="button"
                onClick={() => navigate('/dashboard/sandbox')}
                className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50 to-violet-50 p-5 text-left transition hover:border-indigo-200"
              >
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <p className="mt-4 text-sm font-bold text-slate-800">Interactive Player Sandbox</p>
                <p className="mt-1 text-xs text-slate-500">Preview the mobile player UI with live content.</p>
              </button>
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center gap-2">
              <div className="rounded-lg border border-amber-100 bg-amber-50 p-2 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-slate-800">Algeria Warehouse Alerts</h3>
                <p className="text-[10px] text-slate-400">Prizes nearing critical stock levels</p>
              </div>
            </div>

            {templatesLoading ? (
              <div className="space-y-3">
                <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
                <div className="h-16 animate-pulse rounded-xl bg-slate-100" />
              </div>
            ) : templatesError ? (
              <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-700">
                Reward library loaded with warnings: {templatesError}
              </div>
            ) : lowStockTemplates.length === 0 ? (
              <div className="rounded-xl border border-slate-100 bg-slate-50/60 px-4 py-4 text-[11px] text-slate-400">
                All campaign prizes have sufficient safety margins.
              </div>
            ) : (
              <div className="space-y-3">
                {lowStockTemplates.map((template) => (
                  <div
                    key={template.id}
                    className="flex items-center justify-between rounded-xl border border-amber-100 bg-amber-50/30 p-3"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-slate-800">{template.name}</h4>
                      <span className="text-[10px] font-mono capitalize text-slate-400">{template.categoryLabel} reward</span>
                    </div>
                    <div className="text-right">
                      <span className="block text-xs font-bold text-amber-600">{template.availableStock} left</span>
                      <span className="text-[9px] text-slate-400">Total: {template.totalStock}</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <button
              type="button"
              onClick={() => navigate('/dashboard/inventory')}
              className="touch-target mt-4 w-full rounded-xl border border-slate-200 bg-slate-100 py-2.5 text-xs font-bold text-slate-700 transition hover:bg-slate-200"
            >
              Access Inventory Room
            </button>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-sm font-bold text-slate-800">Algerian Context Optimization</h3>
            <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
              DZENGAGE keeps English interface labels while allowing prize names and campaign copy to remain Arabic-safe where needed.
            </p>
            <div className="mt-4 rounded-xl border border-slate-200/60 bg-slate-50 p-4 font-mono text-[11px] leading-normal text-slate-700">
              <span className="mb-1 block text-[9px] uppercase tracking-wider text-slate-400">Standard Greeting Translation</span>
              <span dir="auto">"سجل واربح هدايا فورية قيمة!"</span>
              <span className="mb-1 mt-3 block text-[9px] uppercase tracking-wider text-slate-400">Darija Variant</span>
              <span dir="auto">"أدخل معلوماتك واربح كادو مع جيل الجزائر!"</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
