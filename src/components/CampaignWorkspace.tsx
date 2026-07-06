import React, { useMemo, useState } from 'react';
import { Campaign, LeadEntry, PrizeTemplate } from '../types';
import {
  ArrowLeft,
  Calendar,
  Copy,
  ExternalLink,
  Gift,
  Pause,
  Pencil,
  Play,
  RefreshCw,
  Trophy,
  Users,
} from 'lucide-react';
import { motion } from 'motion/react';
import { DEFAULT_CAMPAIGN_IMAGE_URL } from '../lib/defaultImages';

interface CampaignWorkspaceProps {
  campaign: Campaign;
  prizes: PrizeTemplate[];
  leads: LeadEntry[];
  onBack: () => void;
  onEditDraft: (campaign: Campaign) => void;
  onRelaunch: (campaign: Campaign) => void;
  onCreateUpdateDraft: (campaign: Campaign) => void;
  onToggleStatus: (id: string) => void;
  onOpenAnalytics: (id: string) => void;
}

export const CampaignWorkspace: React.FC<CampaignWorkspaceProps> = ({
  campaign,
  prizes,
  leads,
  onBack,
  onEditDraft,
  onRelaunch,
  onCreateUpdateDraft,
  onToggleStatus,
  onOpenAnalytics,
}) => {
  const [copied, setCopied] = useState(false);

  const campaignEntries = useMemo(
    () => leads.filter((entry) => entry.campaignId === campaign.id),
    [campaign.id, leads],
  );

  const campaignLink = `${window.location.origin}/play/${campaign.slug}`;
  const totalAllocated = campaign.prizes.reduce((sum, prize) => sum + prize.quantity, 0);

  const enrichedPrizes = campaign.prizes.map((prize) => {
    const template = prizes.find((item) => item.id === prize.templateId);
    return {
      ...prize,
      templateName: template?.name ?? 'Unknown reward',
      category: template?.category ?? 'voucher',
      faceValue: template?.itemValue ?? 'N/A',
      preparedValues: template?.filledValuesCount ?? 0,
    };
  });

  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(campaignLink);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      setCopied(false);
    }
  };

  const statusClasses: Record<Campaign['status'], string> = {
    active: 'bg-emerald-50 border-emerald-100 text-emerald-700',
    paused: 'bg-amber-50 border-amber-100 text-amber-700',
    draft: 'bg-blue-50 border-blue-100 text-blue-700',
    archived: 'bg-slate-50 border-slate-100 text-slate-500',
  };

  return (
    <div id="campaign-workspace-root" className="space-y-6 text-slate-800 pb-12">
      <div className="flex items-center gap-3">
        <button
          type="button"
          onClick={onBack}
          className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to campaigns</span>
        </button>
      </div>

      <div className="flex flex-col gap-4 rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm xl:flex-row xl:items-start xl:justify-between">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full border px-2.5 py-0.5 text-[10px] font-bold uppercase ${statusClasses[campaign.status]}`}>
              {campaign.status}
            </span>
            <span className="rounded-full border border-slate-200 bg-slate-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-slate-500">
              {campaign.type.replace('_', ' ')}
            </span>
            {campaign.parentCampaignId ? (
              <span className="rounded-full border border-indigo-100 bg-indigo-50 px-2.5 py-0.5 text-[10px] font-bold uppercase text-indigo-600">
                Source lineage
              </span>
            ) : null}
          </div>

          <div>
            <img
              src={campaign.heroImageUrl || DEFAULT_CAMPAIGN_IMAGE_URL}
              alt={`${campaign.name} visual`}
              className="mb-3 h-28 w-full max-w-md rounded-2xl border border-slate-200 object-cover"
              onError={(event) => {
                event.currentTarget.src = DEFAULT_CAMPAIGN_IMAGE_URL;
              }}
            />
            <h2 className="text-2xl font-extrabold tracking-tight text-slate-900">{campaign.name}</h2>
            <p className="mt-1 text-sm text-slate-500" dir="auto">
              {campaign.arabicName || 'No Arabic campaign copy configured yet.'}
            </p>
          </div>

          <div className="grid grid-cols-1 gap-3 text-sm text-slate-600 sm:grid-cols-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-mono uppercase text-slate-400">Public path</p>
              <p className="mt-1 font-semibold text-slate-800">/play/{campaign.slug}</p>
            </div>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
              <p className="text-[10px] font-mono uppercase text-slate-400">Launch window</p>
              <p className="mt-1 font-semibold text-slate-800">{campaign.startDate} to {campaign.endDate}</p>
            </div>
          </div>
        </div>

        <div className="flex flex-wrap gap-2 xl:max-w-sm xl:justify-end">
          {campaign.status === 'draft' ? (
            <button
              type="button"
              onClick={() => onEditDraft(campaign)}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
            >
              <Pencil className="h-4 w-4" />
              <span>Edit draft</span>
            </button>
          ) : null}

          {(campaign.status === 'active' || campaign.status === 'paused') ? (
            <button
              type="button"
              onClick={() => onCreateUpdateDraft(campaign)}
              className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm font-semibold text-sky-700 shadow-sm transition hover:bg-sky-100"
            >
              <Pencil className="h-4 w-4" />
              <span>Create update draft</span>
            </button>
          ) : null}

          {(campaign.status === 'active' || campaign.status === 'paused') ? (
            <button
              type="button"
              onClick={() => onToggleStatus(campaign.id)}
              className={`inline-flex min-h-12 items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold shadow-sm transition ${
                campaign.status === 'active'
                  ? 'border border-amber-200 bg-amber-50 text-amber-700 hover:bg-amber-100'
                  : 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
              }`}
            >
              {campaign.status === 'active' ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
              <span>{campaign.status === 'active' ? 'Pause campaign' : 'Resume campaign'}</span>
            </button>
          ) : null}

          <button
            type="button"
            onClick={() => onRelaunch(campaign)}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-indigo-200 bg-indigo-50 px-4 py-3 text-sm font-semibold text-indigo-700 transition hover:bg-indigo-100"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Prepare relaunch</span>
          </button>

          <button
            type="button"
            onClick={() => onOpenAnalytics(campaign.id)}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Users className="h-4 w-4" />
            <span>Open analytics</span>
          </button>

          <button
            type="button"
            onClick={handleCopyLink}
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
          >
            <Copy className="h-4 w-4" />
            <span>{copied ? 'Copied' : 'Copy link'}</span>
          </button>

          <a
            href={campaignLink}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-12 items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-indigo-500"
          >
            <ExternalLink className="h-4 w-4" />
            <span>Open live page</span>
          </a>
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
        {[
          { label: 'Participants', value: campaign.participantsCount, desc: 'Entries recorded so far', icon: Users, tone: 'text-slate-900' },
          { label: 'Prizes won', value: campaign.rewardsClaimed, desc: 'Winning entries in this campaign', icon: Trophy, tone: 'text-indigo-600' },
          { label: 'Win probability', value: `${campaign.winProbability}%`, desc: 'Server-side win chance', icon: Gift, tone: 'text-emerald-600' },
          { label: 'Allocated stock', value: totalAllocated, desc: 'Units reserved from templates', icon: Calendar, tone: 'text-amber-600' },
        ].map((item) => (
          <div key={item.label} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{item.label}</p>
                <h3 className={`mt-3 text-3xl font-black ${item.tone}`}>{item.value}</h3>
                <p className="mt-1 text-[11px] text-slate-500">{item.desc}</p>
              </div>
              <div className="rounded-xl bg-slate-50 p-2 text-slate-500">
                <item.icon className="h-4 w-4" />
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 gap-6 xl:grid-cols-[1.2fr_0.8fr]">
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="text-base font-extrabold text-slate-900">Campaign configuration</h3>
            <div className="mt-4 grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-mono uppercase text-slate-400">Mechanic</p>
                <p className="mt-1 font-semibold capitalize text-slate-800">{campaign.type.replace('_', ' ')}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-mono uppercase text-slate-400">Configured rewards</p>
                <p className="mt-1 font-semibold text-slate-800">{campaign.prizes.length} prize slots</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-mono uppercase text-slate-400">Quiz questions</p>
                <p className="mt-1 font-semibold text-slate-800">{campaign.questions.length}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                <p className="text-[10px] font-mono uppercase text-slate-400">Lifecycle</p>
                <p className="mt-1 font-semibold text-slate-800 capitalize">{campaign.status}</p>
              </div>
            </div>
          </div>

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-extrabold text-slate-900">Allocated rewards</h3>
              <span className="text-[10px] font-mono uppercase text-slate-400">{campaign.prizes.length} rows</span>
            </div>
            <div className="mt-4 space-y-3">
              {enrichedPrizes.map((prize, index) => (
                <div key={`${campaign.id}-${prize.templateId}-${index}`} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                  <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                    <div>
                      <p className="text-sm font-bold text-slate-800">{prize.templateName}</p>
                      <p className="mt-1 text-[11px] text-slate-500">
                        {prize.category} • {prize.faceValue}
                      </p>
                    </div>
                    <div className="grid grid-cols-3 gap-3 text-center text-[11px]">
                      <div>
                        <p className="font-mono text-slate-400">Qty</p>
                        <p className="mt-1 font-bold text-slate-800">{prize.quantity}</p>
                      </div>
                      <div>
                        <p className="font-mono text-slate-400">Weight</p>
                        <p className="mt-1 font-bold text-slate-800">{prize.weight}</p>
                      </div>
                      <div>
                        <p className="font-mono text-slate-400">Prepared</p>
                        <p className="mt-1 font-bold text-slate-800">{prize.preparedValues}</p>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </motion.div>

        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          {campaign.type === 'quiz' ? (
            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
              <h3 className="text-base font-extrabold text-slate-900">Quiz setup</h3>
              <div className="mt-4 space-y-3">
                {campaign.questions.map((question, index) => (
                  <div key={question.id} className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4">
                    <p className="text-[10px] font-mono uppercase text-slate-400">Question {index + 1}</p>
                    <p className="mt-1 text-sm font-semibold text-slate-800">{question.questionText}</p>
                    <ul className="mt-3 space-y-2 text-[11px] text-slate-600">
                      {question.options.map((option, optionIndex) => (
                        <li
                          key={`${question.id}-${optionIndex}`}
                          className={`rounded-xl border px-3 py-2 ${
                            optionIndex === question.correctIndex
                              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
                              : 'border-slate-200 bg-white'
                          }`}
                          dir="auto"
                        >
                          {option}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          ) : null}

          <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-sm">
            <div className="flex items-center justify-between gap-3">
              <h3 className="text-base font-extrabold text-slate-900">Recent participants</h3>
              <span className="text-[10px] font-mono uppercase text-slate-400">{campaignEntries.length} total</span>
            </div>
            {campaignEntries.length === 0 ? (
              <div className="mt-4 rounded-2xl border border-dashed border-slate-250 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                No participations yet for this campaign.
              </div>
            ) : (
              <div className="mt-4 overflow-hidden rounded-[24px] border border-slate-200">
                <table className="min-w-full">
                  <thead className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Name</th>
                      <th className="px-4 py-3">Phone</th>
                      <th className="px-4 py-3">Prize</th>
                      <th className="px-4 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {campaignEntries.slice(0, 10).map((entry) => (
                      <tr key={entry.id}>
                        <td className="px-4 py-3 text-sm text-slate-800">{entry.playerName}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{entry.phoneNumber || '—'}</td>
                        <td className="px-4 py-3 text-sm text-slate-600">{entry.prizeWon || '—'}</td>
                        <td className="px-4 py-3 text-sm">
                          <span
                            className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase ${
                              entry.status === 'confirmed'
                                ? 'bg-emerald-50 text-emerald-700'
                                : 'bg-slate-100 text-slate-600'
                            }`}
                          >
                            {entry.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </motion.div>
      </div>
    </div>
  );
};
