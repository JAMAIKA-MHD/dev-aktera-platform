import { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  AlertCircle,
  Archive,
  Calendar,
  Eye,
  Pause,
  Pencil,
  Play,
  Plus,
  RefreshCw,
  Search,
  Trash2,
} from 'lucide-react';
import { useCampaigns } from '../../hooks/useCampaigns';
import { useAnalytics } from '../../hooks/useAnalytics';
import { supabase } from '../../lib/supabase';
import { toFriendlyErrorMessage } from '../../lib/errorMessages';
import { adaptCampaignToUiSummary, Phase2InlineNotice } from '../../features/phase2-ui';
import type { Campaign } from '../../types';

type StatusFilter = 'all' | 'active' | 'paused' | 'draft' | 'archived';

const statusOptions: { id: StatusFilter; label: string }[] = [
  { id: 'all', label: 'All Portals' },
  { id: 'active', label: 'Live' },
  { id: 'paused', label: 'Paused' },
  { id: 'draft', label: 'Draft' },
  { id: 'archived', label: 'Archived' },
];

const getStatusColor = (status: Campaign['status']) => {
  switch (status) {
    case 'active':
      return 'bg-emerald-50 border-emerald-100 text-emerald-700';
    case 'paused':
      return 'bg-amber-50 border-amber-100 text-amber-700';
    case 'draft':
      return 'bg-blue-50 border-blue-100 text-blue-700';
    case 'archived':
      return 'bg-slate-50 border-slate-100 text-slate-500';
    case 'ended':
      return 'bg-rose-50 border-rose-100 text-rose-700';
    default:
      return 'bg-slate-50 border-slate-100 text-slate-500';
  }
};

export default function CampaignList() {
  const navigate = useNavigate();
  const { campaigns, loading, error, refetch } = useCampaigns(true);
  const { analytics } = useAnalytics();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [processing, setProcessing] = useState<string | null>(null);
  const [actionError, setActionError] = useState<string | null>(null);

  const filteredCampaigns = useMemo(() => {
    return campaigns.filter((campaign) => {
      const matchesStatus = statusFilter === 'all' || campaign.status === statusFilter;
      const term = searchQuery.trim().toLowerCase();
      const matchesSearch =
        term.length === 0 ||
        campaign.name.toLowerCase().includes(term) ||
        campaign.slug.toLowerCase().includes(term) ||
        (campaign.description ?? '').toLowerCase().includes(term);
      return matchesStatus && matchesSearch;
    });
  }, [campaigns, searchQuery, statusFilter]);

  const summaryCampaigns = filteredCampaigns.map((campaign) => {
    const view = adaptCampaignToUiSummary(campaign);
    const analyticsRow = analytics?.by_campaign.find((row) => row.campaign_id === campaign.id);
    return {
      source: campaign,
      view,
      entries: analyticsRow?.total_entries ?? 0,
      winners: analyticsRow?.total_winners ?? 0,
      winProbabilityPercent: view.winProbabilityPercent,
    };
  });

  const totalByStatus = {
    active: campaigns.filter((campaign) => campaign.status === 'active').length,
    paused: campaigns.filter((campaign) => campaign.status === 'paused').length,
    draft: campaigns.filter((campaign) => campaign.status === 'draft').length,
    archived: campaigns.filter((campaign) => campaign.status === 'archived').length,
  };

  const runStatusMutation = async (campaignId: string, status: Campaign['status'], fallback: string) => {
    setActionError(null);
    setProcessing(campaignId);

    try {
      const { error: updateError } = await supabase.from('campaigns').update({ status }).eq('id', campaignId);
      if (updateError) throw updateError;
      refetch();
    } catch (err: unknown) {
      setActionError(toFriendlyErrorMessage(err, { fallback }));
    } finally {
      setProcessing(null);
    }
  };

  const handleArchive = async (campaign: Campaign) => {
    if (!window.confirm('Archive this campaign?')) return;
    await runStatusMutation(campaign.id, 'archived', 'Unable to archive this campaign right now. Please try again.');
  };

  const handlePause = async (campaign: Campaign) => {
    await runStatusMutation(campaign.id, 'paused', 'Unable to pause this campaign right now. Please try again.');
  };

  const handleResume = async (campaign: Campaign) => {
    await runStatusMutation(campaign.id, 'active', 'Unable to resume this campaign right now. Please try again.');
  };

  const handleDelete = async (campaign: Campaign) => {
    if (!window.confirm('Delete this campaign? This action cannot be undone.')) return;
    setActionError(null);
    setProcessing(campaign.id);

    try {
      const { error: deleteError } = await supabase.from('campaigns').delete().eq('id', campaign.id);
      if (deleteError) throw deleteError;
      refetch();
    } catch (err: unknown) {
      setActionError(
        toFriendlyErrorMessage(err, {
          fallback: 'Unable to delete this campaign right now. Please try again.',
        }),
      );
    } finally {
      setProcessing(null);
    }
  };

  return (
    <div id="campaigns-list-root" className="space-y-6 text-slate-800">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Campaign Radios & Portals</h2>
          <p className="mt-0.5 text-xs text-slate-500">Configure active wheels, lucky drawers, and quiz pipelines.</p>
        </div>
        <button
          type="button"
          onClick={() => navigate('/dashboard/campaigns/new')}
          className="touch-target inline-flex min-h-12 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5" />
          <span>Launch Campaign Wizard</span>
        </button>
      </div>

      {actionError ? <Phase2InlineNotice tone="danger">{actionError}</Phase2InlineNotice> : null}
      {error ? <Phase2InlineNotice tone="danger">{error}</Phase2InlineNotice> : null}

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { title: 'Live', value: totalByStatus.active, desc: 'Currently routed to public play pages', color: 'text-emerald-600' },
          { title: 'Paused', value: totalByStatus.paused, desc: 'Temporarily stopped but resumable', color: 'text-amber-600' },
          { title: 'Draft', value: totalByStatus.draft, desc: 'Editable before public release', color: 'text-indigo-600' },
          { title: 'Archived', value: totalByStatus.archived, desc: 'Closed lifecycle records kept for relaunch', color: 'text-slate-600' },
        ].map((item) => (
          <div key={item.title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{item.title}</span>
            <h4 className={`mt-3 mb-1 text-3xl font-black ${item.color}`}>{item.value}</h4>
            <p className="text-[11px] text-slate-500">{item.desc}</p>
          </div>
        ))}
      </div>

      <div className="flex flex-col items-center justify-between gap-4 md:flex-row">
        <div className="flex w-full gap-1 overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 md:w-auto">
          {statusOptions.map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setStatusFilter(option.id)}
              className={`whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${
                statusFilter === option.id
                  ? 'bg-indigo-600 text-white shadow-sm'
                  : 'text-slate-500 hover:bg-slate-100 hover:text-slate-800'
              }`}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="relative w-full md:w-72">
          <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search campaigns..."
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
          />
        </div>
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : summaryCampaigns.length === 0 ? (
        <div className="col-span-full rounded-3xl border border-slate-200 bg-white p-6 py-12 text-center">
          <AlertCircle className="mx-auto mb-2 h-10 w-10 text-slate-400" />
          <h4 className="text-base font-bold text-slate-700">No campaigns found</h4>
          <p className="mx-auto mt-1 max-w-md text-xs text-slate-500">
            Refine your filter options or trigger a new campaign via the interactive multi-step configuration wizard.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2">
          {summaryCampaigns.map(({ source, view, entries, winners, winProbabilityPercent }) => (
            <div
              key={source.id}
              className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-slate-400 hover:shadow"
            >
              <div>
                <div className="mb-2 flex items-start justify-between gap-2">
                  <span className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase ${getStatusColor(source.status)}`}>
                    {source.status}
                  </span>
                  <span className="text-[10px] text-slate-400">
                    Type: <strong className="font-sans capitalize text-slate-600">{view.mechanic.label}</strong>
                  </span>
                </div>

                <h3 className="mt-1 text-base font-extrabold leading-tight text-slate-800">{source.name}</h3>
                <p className="mt-1 text-xs text-slate-500" dir="auto">
                  {source.description || `/${source.slug}`}
                </p>

                {source.source_campaign_id ? (
                  <div className="mt-2 inline-flex items-center gap-1.5 rounded border border-indigo-100 bg-indigo-50 px-2 py-0.5 text-[10px] text-indigo-600">
                    <RefreshCw className="h-3.5 w-3.5" />
                    <span>Relaunched from past campaign</span>
                  </div>
                ) : null}
              </div>

              <div className="my-4 grid grid-cols-3 gap-2 rounded-2xl border border-slate-200/60 bg-slate-50 p-3">
                <div className="border-r border-slate-200/80 text-center">
                  <p className="text-sm font-extrabold text-slate-800">{entries}</p>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400">Entries</p>
                </div>
                <div className="border-r border-slate-200/80 text-center">
                  <p className="text-sm font-extrabold text-indigo-600">{winners}</p>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400">Prizes Won</p>
                </div>
                <div className="text-center">
                  <p className="text-sm font-extrabold text-slate-800">{winProbabilityPercent}%</p>
                  <p className="text-[9px] uppercase tracking-wider text-slate-400">Win Prob</p>
                </div>
              </div>

              <div className="mt-1 flex flex-col gap-3 border-t border-slate-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-1.5 text-[10px] text-slate-500">
                  <Calendar className="h-3.5 w-3.5 text-slate-400" />
                  <span className="font-mono">
                    {view.startDateLabel} to {view.endDateLabel}
                  </span>
                </div>

                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/campaigns/${source.id}`)}
                    title="View details"
                    className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 transition-colors hover:bg-slate-100"
                  >
                    <Eye className="h-4 w-4" />
                  </button>

                  {source.status !== 'archived' && source.status !== 'draft' ? (
                    <button
                      type="button"
                      onClick={() => (source.status === 'active' ? handlePause(source) : handleResume(source))}
                      disabled={processing === source.id}
                      title={source.status === 'active' ? 'Pause Campaign' : 'Resume Campaign'}
                      className={`rounded-lg border p-2 transition-all ${
                        source.status === 'active'
                          ? 'border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                          : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                      }`}
                    >
                      {processing === source.id ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                      ) : source.status === 'active' ? (
                        <Pause className="h-4 w-4" />
                      ) : (
                        <Play className="h-4 w-4" />
                      )}
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => navigate(`/dashboard/campaigns/new?from=${source.id}`)}
                    title="Relaunch duplicate campaign"
                    className="rounded-lg border border-indigo-200 bg-indigo-50 p-2 text-indigo-600 transition-colors hover:bg-indigo-100"
                  >
                    <RefreshCw className="h-4 w-4" />
                  </button>

                  {source.status === 'draft' ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/campaigns/${source.id}/edit`)}
                      title="Edit draft"
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  ) : null}

                  {(source.status === 'active' || source.status === 'paused') ? (
                    <button
                      type="button"
                      onClick={() => navigate(`/dashboard/campaigns/new?from=${source.id}&mode=update`)}
                      title="Create update draft"
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 transition-colors hover:bg-slate-100"
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                  ) : null}

                  {source.status !== 'archived' ? (
                    <button
                      type="button"
                      onClick={() => handleArchive(source)}
                      title="Archive campaign"
                      className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-600 transition-colors hover:bg-rose-100"
                    >
                      <Archive className="h-4 w-4" />
                    </button>
                  ) : null}

                  <button
                    type="button"
                    onClick={() => void handleDelete(source)}
                    title="Delete campaign"
                    className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-600 transition-colors hover:bg-rose-100"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
