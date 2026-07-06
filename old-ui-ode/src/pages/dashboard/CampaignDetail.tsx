import { useMemo, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCampaign } from '../../hooks/useCampaign';
import { useEntries } from '../../hooks/useEntries';
import { usePrizes } from '../../hooks/usePrizes';
import { useQuizQuestions } from '../../hooks/useQuizQuestions';
import { supabase } from '../../lib/supabase';
import { toFriendlyErrorMessage } from '../../lib/errorMessages';
import {
  adaptCampaignToUiSummary,
  adaptEntryToUiLeadRow,
  Phase2EmptyState,
  Phase2InlineNotice,
  Phase2MetricCard,
  Phase2PageHeader,
  Phase2SectionCard,
  Phase2StatusPill,
} from '../../features/phase2-ui';
import {
  ArrowLeft,
  BarChart3,
  Check,
  Download,
  ExternalLink,
  Gift,
  HelpCircle,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  TrendingUp,
  Trophy,
  Users,
} from 'lucide-react';
import { format } from 'date-fns';

export default function CampaignDetail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [actionLoading, setActionLoading] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [actionInfo, setActionInfo] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;

  const { campaign, loading: campaignLoading, error: campaignError } = useCampaign(id);
  const { entries, loading: entriesLoading } = useEntries(id);
  const { prizes } = usePrizes(id);
  const { questions } = useQuizQuestions(id);

  const totalEntries = entries.length;
  const winnerCount = entries.filter((entry) => entry.is_winner).length;
  const winRate = totalEntries > 0 ? Math.round((winnerCount / totalEntries) * 100) : 0;
  const prizesAwarded = prizes.reduce((sum, prize) => sum + prize.quantity_won, 0);
  const totalPrizeQuantity = prizes.reduce((sum, prize) => sum + prize.quantity, 0);
  const remainingPrizes = totalPrizeQuantity - prizesAwarded;

  const paginatedEntries = entries.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage,
  );
  const totalPages = Math.ceil(totalEntries / itemsPerPage);

  const uiCampaign = useMemo(
    () => (campaign ? adaptCampaignToUiSummary(campaign) : null),
    [campaign],
  );

  const leadRows = paginatedEntries.map((entry) =>
    adaptEntryToUiLeadRow(entry, { campaignName: campaign?.name }),
  );

  const handleStatusChange = async (newStatus: 'active' | 'paused') => {
    if (!campaign) return;
    setActionError(null);
    setActionInfo(null);
    setActionLoading(true);

    try {
      const { error } = await supabase
        .from('campaigns')
        .update({ status: newStatus })
        .eq('id', campaign.id);
      if (error) throw error;
      window.location.reload();
    } catch (err: unknown) {
      setActionError(
        toFriendlyErrorMessage(err, {
          fallback: 'Unable to update campaign status right now. Please try again.',
        }),
      );
    } finally {
      setActionLoading(false);
    }
  };

  const exportToCSV = () => {
    setActionError(null);
    if (entries.length === 0) {
      setActionInfo('No entries available to export yet.');
      return;
    }
    setActionInfo(null);

    const headers = ['Date', 'Name', 'Phone', 'Email', 'Quiz Passed', 'Winner', 'Prize'];
    const rows = entries.map((entry) => [
      format(new Date(entry.created_at), 'dd/MM/yyyy HH:mm'),
      entry.participant_name || '-',
      entry.phone_number || '-',
      entry.participant_email || '-',
      entry.quiz_passed === null ? 'N/A' : entry.quiz_passed ? 'Yes' : 'No',
      entry.is_winner ? 'Yes' : 'No',
      '-',
    ]);

    const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `entries_${campaign?.slug || 'campaign'}_${format(new Date(), 'yyyy-MM-dd')}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  if (campaignLoading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (campaignError || !campaign || !uiCampaign) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => navigate('/dashboard/campaigns')}
          className="inline-flex items-center gap-2 text-sm font-semibold text-slate-600 transition hover:text-slate-900"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to campaigns</span>
        </button>
        <Phase2InlineNotice tone="danger">{campaignError || 'Campaign not found'}</Phase2InlineNotice>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {actionError ? <Phase2InlineNotice tone="danger">{actionError}</Phase2InlineNotice> : null}
      {actionInfo ? <Phase2InlineNotice tone="info">{actionInfo}</Phase2InlineNotice> : null}

      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={() => navigate('/dashboard/campaigns')}
          className="touch-target inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back</span>
        </button>
      </div>

      <Phase2PageHeader
        eyebrow="Campaign detail"
        title={campaign.name}
        description={campaign.description || `Public path: /play/${campaign.slug}`}
        action={
          <div className="flex flex-wrap items-center gap-2">
            <Phase2StatusPill label={uiCampaign.status.label} tone={uiCampaign.status.tone} />
            {campaign.status === 'draft' ? (
              <button
                type="button"
                onClick={() => navigate(`/dashboard/campaigns/${campaign.id}/edit`)}
                className="touch-target inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" />
                <span>Edit</span>
              </button>
            ) : null}
            {campaign.status === 'active' ? (
              <button
                type="button"
                onClick={() => handleStatusChange('paused')}
                disabled={actionLoading}
                className="touch-target inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:opacity-50"
              >
                <Pause className="h-4 w-4" />
                <span>Pause</span>
              </button>
            ) : null}
            {campaign.status === 'paused' ? (
              <button
                type="button"
                onClick={() => handleStatusChange('active')}
                disabled={actionLoading}
                className="touch-target inline-flex items-center gap-2 rounded-2xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white shadow-sm transition hover:bg-emerald-500 disabled:opacity-50"
              >
                <Play className="h-4 w-4" />
                <span>Resume</span>
              </button>
            ) : null}
            {(campaign.status === 'active' || campaign.status === 'paused') ? (
              <button
                type="button"
                onClick={() =>
                  navigate(`/dashboard/campaigns/new?from=${campaign.id}&mode=update`)
                }
                className="touch-target inline-flex items-center gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
              >
                <RefreshCw className="h-4 w-4" />
                <span>Create update draft</span>
              </button>
            ) : null}
            <a
              href={`${window.location.origin}/play/${campaign.slug}`}
              target="_blank"
              rel="noopener noreferrer"
              className="touch-target inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white shadow-ui-glow transition hover:bg-indigo-500"
            >
              <ExternalLink className="h-4 w-4" />
              <span>Open live page</span>
            </a>
          </div>
        }
      />

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <Phase2MetricCard
          label="Participations"
          value={totalEntries}
          description="Entries collected from the current routed player flow."
          icon={Users}
          tone="indigo"
        />
        <Phase2MetricCard
          label="Winners"
          value={winnerCount}
          description={`Live campaign win rate: ${winRate}%`}
          icon={Trophy}
          tone="emerald"
        />
        <Phase2MetricCard
          label="Prizes awarded"
          value={`${prizesAwarded}/${totalPrizeQuantity}`}
          description={`Remaining stock in this campaign allocation: ${remainingPrizes}`}
          icon={Gift}
          tone="amber"
        />
        <Phase2MetricCard
          label="Configured win rate"
          value={`${Math.round(campaign.win_probability * 100)}%`}
          description="Server-backed probability used during prize selection."
          icon={TrendingUp}
          tone="rose"
        />
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1.75fr)_minmax(320px,1fr)]">
        <Phase2SectionCard
          title="Lead entries"
          description={`${totalEntries} total entries captured for this campaign.`}
          icon={Users}
          action={
            <button
              type="button"
              onClick={exportToCSV}
              disabled={entries.length === 0}
              className="touch-target inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              <Download className="h-4 w-4" />
              <span>Export CSV</span>
            </button>
          }
        >
          {entriesLoading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
          ) : entries.length === 0 ? (
            <Phase2EmptyState
              icon={Users}
              title="No entries yet"
              description="Player submissions will appear here once the campaign starts collecting data."
            />
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full">
                  <thead className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Participant</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Quiz</th>
                      <th className="px-4 py-3">Result</th>
                      <th className="px-4 py-3">Coupon</th>
                      <th className="px-4 py-3">Confirmed</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {leadRows.map((row, index) => {
                      const entry = paginatedEntries[index];
                      return (
                        <tr key={row.id} className="hover:bg-slate-50/80">
                          <td className="px-4 py-4 text-sm text-slate-500">
                            {format(new Date(entry.created_at), 'd MMM HH:mm')}
                          </td>
                          <td className="px-4 py-4">
                            <p className="text-sm font-semibold text-slate-900">
                              {entry.participant_name || '-'}
                            </p>
                            {entry.participant_email ? (
                              <p className="text-xs text-slate-500">{entry.participant_email}</p>
                            ) : null}
                          </td>
                          <td className="px-4 py-4 text-sm text-slate-600">
                            {row.phoneNumber || '-'}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            {entry.quiz_passed === null ? (
                              <span className="text-slate-400">N/A</span>
                            ) : entry.quiz_passed ? (
                              <Phase2StatusPill label="Passed" tone="success" />
                            ) : (
                              <Phase2StatusPill label="Failed" tone="danger" />
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            <Phase2StatusPill
                              label={entry.is_winner ? 'Winner' : 'Lost'}
                              tone={entry.is_winner ? 'warning' : 'neutral'}
                            />
                          </td>
                          <td className="px-4 py-4 text-sm">
                            {row.couponCode ? (
                              <code className="rounded-full bg-slate-100 px-3 py-1 text-xs text-slate-700">
                                {row.couponCode}
                              </code>
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                          <td className="px-4 py-4 text-sm">
                            {row.couponCode ? (
                              row.couponConfirmed ? (
                                <span className="inline-flex items-center gap-1 rounded-full border border-emerald-200 bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                                  <Check className="h-3 w-3" />
                                  Confirmed
                                </span>
                              ) : (
                                <Phase2StatusPill label="Pending" tone="warning" />
                              )
                            ) : (
                              <span className="text-slate-400">-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>

              {totalPages > 1 ? (
                <div className="mt-4 flex items-center justify-between border-t border-slate-200 pt-4">
                  <p className="text-sm text-slate-500">
                    Page {currentPage} of {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(page - 1, 1))}
                      disabled={currentPage === 1}
                      className="touch-target rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Previous
                    </button>
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages))}
                      disabled={currentPage === totalPages}
                      className="touch-target rounded-2xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      Next
                    </button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </Phase2SectionCard>

        <div className="space-y-6">
          <Phase2SectionCard
            title="Configuration"
            description="Live routed settings and safety gates for this campaign."
            icon={BarChart3}
          >
            <div className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Start</span>
                <span className="font-semibold text-slate-900">
                  {format(new Date(campaign.start_date), 'd MMMM yyyy')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">End</span>
                <span className="font-semibold text-slate-900">
                  {format(new Date(campaign.end_date), 'd MMMM yyyy')}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Phone required</span>
                <span className="font-semibold text-slate-900">
                  {campaign.require_phone ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Quiz required</span>
                <span className="font-semibold text-slate-900">
                  {campaign.require_quiz ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex items-center justify-between gap-3">
                <span className="text-slate-500">Mechanic</span>
                <span className="font-semibold text-slate-900">{uiCampaign.mechanic.label}</span>
              </div>
            </div>
          </Phase2SectionCard>

          <Phase2SectionCard
            title={`Prizes (${prizes.length})`}
            description="Current campaign allocations from the live prize table."
            icon={Gift}
          >
            {prizes.length === 0 ? (
              <Phase2EmptyState
                icon={Gift}
                title="No prizes defined"
                description="Add prize allocations through the campaign wizard to populate this section."
              />
            ) : (
              <div className="space-y-3">
                {prizes.slice(0, 6).map((prize) => (
                  <div
                    key={prize.id}
                    className="flex items-center justify-between rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <div>
                      <p className="text-sm font-semibold text-slate-900">{prize.name}</p>
                      <p className="text-xs text-slate-500">
                        {prize.win_message || 'No custom winner message'}
                      </p>
                    </div>
                    <div className="text-right text-xs text-slate-500">
                      <p className="font-semibold text-slate-900">
                        {prize.quantity_won}/{prize.quantity}
                      </p>
                      <p>won / allocated</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Phase2SectionCard>

          <Phase2SectionCard
            title={`Quiz (${questions.length})`}
            description="Question set currently linked to this campaign."
            icon={HelpCircle}
          >
            {!campaign.require_quiz ? (
              <Phase2EmptyState
                icon={HelpCircle}
                title="Quiz disabled"
                description="This campaign currently uses the instant-win wheel flow."
              />
            ) : questions.length === 0 ? (
              <Phase2EmptyState
                icon={HelpCircle}
                title="No questions yet"
                description="Add quiz questions through the campaign wizard to unlock this step."
              />
            ) : (
              <div className="space-y-3">
                {questions.slice(0, 5).map((question, index) => (
                  <div
                    key={question.id}
                    className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3"
                  >
                    <p className="text-sm font-semibold text-slate-900">
                      {index + 1}. {question.question}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </Phase2SectionCard>
        </div>
      </div>
    </div>
  );
}
