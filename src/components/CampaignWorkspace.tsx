import React, { useMemo, useState } from "react";
import { Campaign, LeadEntry, PrizeTemplate } from "../types";
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
  Box,
  Check,
  Sparkles,
  HelpCircle,
  Disc,
} from "lucide-react";
import { motion } from "motion/react";
import { useTheme } from "../contexts/ThemeContext";
import { DEFAULT_CAMPAIGN_IMAGE_URL } from "../lib/defaultImages";

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
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [copied, setCopied] = useState(false);

  const campaignEntries = useMemo(
    () => leads.filter((entry) => entry.campaignId === campaign.id),
    [campaign.id, leads],
  );

  const campaignLink = `${window.location.origin}/play/${campaign.slug}`;
  const totalAllocated = campaign.prizes.reduce(
    (sum, prize) => sum + prize.quantity,
    0,
  );

  const enrichedPrizes = campaign.prizes.map((prize) => {
    const template = prizes.find((item) => item.id === prize.templateId);
    return {
      ...prize,
      templateName: template?.name ?? "Unknown reward",
      category: template?.category ?? "voucher",
      faceValue: template?.itemValue ?? "N/A",
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

  const formatDate = (dateStr?: string) => {
    if (!dateStr) return "N/A";
    const parts = dateStr.split("-");
    if (parts.length === 3) {
      return `${parts[2]}/${parts[1]}/${parts[0]}`;
    }
    return dateStr;
  };

  // State styling badge
  const getStateBadge = () => {
    switch (campaign.status) {
      case "active":
        return {
          label: "Active",
          text: "text-emerald-500",
        };
      case "paused":
        return {
          label: "Paused",
          text: "text-amber-500",
        };
      case "archived":
        return {
          label: "Archived",
          text: "text-red-500",
        };
      case "draft":
      default:
        return {
          label: "Draft",
          text: "text-blue-500",
        };
    }
  };

  const stateBadge = getStateBadge();

  const getDetailsGameIcon = () => {
    if (campaign.type === "quiz") {
      return "/images/icons/quiz-icon-for-details.jpg";
    }
    return "/images/icons/spin-wheel-icon-free-vector.jpg";
  };

  return (
    <div
      id="campaign-workspace-root"
      className="space-y-8 text-brand-text max-w-[1800px] mx-auto pb-16"
    >
      {/* Top Header Row with Back Button & Centered Campaign Name */}
      <div className="flex items-center justify-between">
        <button
          type="button"
          onClick={onBack}
          className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition-all cursor-pointer border ${
            isDark
              ? "bg-[#151E30] border-slate-800 text-white hover:bg-slate-800"
              : "bg-white border-slate-200 text-slate-800 hover:bg-slate-100"
          }`}
        >
          <ArrowLeft className="h-4 w-4 stroke-[2.5]" />
          <span>Back to Campaigns</span>
        </button>

        <h1 className="text-2xl sm:text-3xl font-black text-brand-text tracking-tight text-center">
          {campaign.name}
        </h1>

        <div className="w-28 hidden sm:block"></div>
      </div>

      {/* UPPER MAIN SECTION: Left Preview Card + Right Controls & KPI Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* LEFT COLUMN: Campaign Hero Preview Card with State Badge & Game Icon */}
        <div className="lg:col-span-5 relative">
          {/* Outer Card Container */}
          <div
            className={`rounded-[32px] p-6 sm:p-7 flex flex-col items-center justify-center min-h-[380px] sm:min-h-[420px] relative border shadow-md overflow-hidden ${
              isDark
                ? "bg-[#151E30] border-slate-800 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            {/* Top State Pill Tag + Circular Game Emblem Overhang */}
            <div className="absolute top-4 right-4 flex items-center z-20">
              {/* State Pill */}
              <div
                className={`flex items-center gap-1.5 px-4 py-1.5 rounded-full font-black text-xs shadow-md border ${
                  isDark
                    ? "bg-[#151E30] border-slate-700 text-slate-200"
                    : "bg-white border-slate-200 text-slate-800"
                }`}
              >
                <span className="text-brand-textMuted">State :</span>
                <span className={`font-black ${stateBadge.text}`}>
                  {stateBadge.label}
                </span>
              </div>

              {/* Circular Game Emblem */}
              <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-full overflow-hidden border-2 border-emerald-500 bg-[#262A30] shadow-xl flex items-center justify-center shrink-0 -ml-2">
                <img
                  src={getDetailsGameIcon()}
                  alt={campaign.type}
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    e.currentTarget.src =
                      campaign.type === "quiz"
                        ? "/images/icons/quiz-badge.svg"
                        : "/images/icons/wheel-badge.svg";
                  }}
                />
              </div>
            </div>

            {/* Campaign Visual / Hero Image / Interactive Game Canvas */}
            <div className="w-full h-full flex-1 flex flex-col items-center justify-center relative min-h-[300px] rounded-2xl overflow-hidden border border-slate-700/60 shadow-inner bg-[#0B1120]">
              {campaign.heroImageUrl ? (
                <div className="relative w-full h-full min-h-[300px] flex items-center justify-center bg-slate-950 overflow-hidden">
                  <img
                    src={campaign.heroImageUrl}
                    alt={campaign.name}
                    className="w-full h-full object-cover rounded-xl"
                    onError={(e) => {
                      e.currentTarget.src = DEFAULT_CAMPAIGN_IMAGE_URL;
                    }}
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-5">
                    <p className="text-white font-black text-xl drop-shadow-md">
                      {campaign.name}
                    </p>
                  </div>
                </div>
              ) : (
                /* Rich Studio Game Theme Canvas (High contrast in all themes) */
                <div
                  className={`relative w-full h-full min-h-[300px] flex flex-col items-center justify-center p-6 text-center select-none overflow-hidden ${
                    campaign.type === "quiz"
                      ? "bg-gradient-to-br from-[#120D2C] via-[#0B1120] to-[#1E1242] text-white"
                      : "bg-gradient-to-br from-[#06201B] via-[#0B1120] to-[#0A2E26] text-white"
                  }`}
                >
                  {/* Decorative background ambient glow */}
                  <div
                    className={`absolute w-64 h-64 rounded-full blur-3xl opacity-40 pointer-events-none ${
                      campaign.type === "quiz"
                        ? "bg-purple-600"
                        : "bg-emerald-500"
                    }`}
                  ></div>

                  {/* Center Game Graphic Element */}
                  <div className="relative z-10 flex flex-col items-center space-y-3.5">
                    <div
                      className={`w-20 h-20 rounded-3xl flex items-center justify-center shadow-2xl border ${
                        campaign.type === "quiz"
                          ? "bg-indigo-600/25 border-indigo-500/50 text-indigo-400 shadow-indigo-500/20"
                          : "bg-emerald-600/25 border-emerald-500/50 text-emerald-400 shadow-emerald-500/20"
                      }`}
                    >
                      {campaign.type === "quiz" ? (
                        <HelpCircle className="w-10 h-10 stroke-[2.2]" />
                      ) : (
                        <Disc className="w-10 h-10 stroke-[2.2] animate-spin-slow" />
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <h3 className="text-2xl font-black tracking-tight text-white drop-shadow-md">
                        {campaign.name}
                      </h3>
                      <span
                        className={`inline-block px-3.5 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider border ${
                          campaign.type === "quiz"
                            ? "bg-purple-500/20 border-purple-500/30 text-purple-300"
                            : "bg-emerald-500/20 border-emerald-500/30 text-emerald-300"
                        }`}
                      >
                        {campaign.type === "quiz"
                          ? "Trivia Quiz Challenge"
                          : "Lucky Spin Wheel"}
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* RIGHT COLUMN: Action Buttons Row + 5 KPI Metric Cards */}
        <div className="lg:col-span-7 space-y-6">
          {/* Row of 4 Action Buttons */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Prepare Relaunch */}
            <button
              type="button"
              onClick={() => onRelaunch(campaign)}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition-all hover:scale-102 cursor-pointer border ${
                isDark
                  ? "bg-[#151E30] border-slate-800 text-slate-200 hover:bg-slate-800"
                  : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
              }`}
            >
              <RefreshCw className="h-4 w-4 stroke-[2.2] text-indigo-500" />
              <span>Prepare relaunch</span>
            </button>

            {/* Copy Link */}
            <button
              type="button"
              onClick={handleCopyLink}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition-all hover:scale-102 cursor-pointer border ${
                isDark
                  ? "bg-[#151E30] border-slate-800 text-slate-200 hover:bg-slate-800"
                  : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
              }`}
            >
              {copied ? (
                <Check className="h-4 w-4 stroke-[2.5] text-emerald-500" />
              ) : (
                <Copy className="h-4 w-4 stroke-[2.2] text-slate-500" />
              )}
              <span>{copied ? "Copied!" : "Copy link"}</span>
            </button>

            {/* Open Analytics */}
            <button
              type="button"
              onClick={() => onOpenAnalytics(campaign.id)}
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition-all hover:scale-102 cursor-pointer border ${
                isDark
                  ? "bg-[#151E30] border-slate-800 text-slate-200 hover:bg-slate-800"
                  : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
              }`}
            >
              <span>Open analytics</span>
            </button>

            {/* Open Live Page */}
            <a
              href={campaignLink}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 rounded-2xl px-5 py-2.5 text-xs sm:text-sm font-bold shadow-sm transition-all hover:scale-102 cursor-pointer border ${
                isDark
                  ? "bg-[#151E30] border-slate-800 text-slate-200 hover:bg-slate-800"
                  : "bg-white border-slate-200 text-slate-800 hover:bg-slate-50"
              }`}
            >
              <span>Open live page</span>
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>

          {/* Metric Cards Grid (5 KPI Cards with light-mode friendly pastel icon badges) */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            {/* 1. Participants */}
            <div
              className={`rounded-3xl p-5 border shadow-sm flex flex-col justify-between ${
                isDark
                  ? "bg-[#151E30] border-slate-800 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-brand-textMuted">
                    Participants
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-black mt-1">
                    {campaign.participantsCount}
                  </h4>
                </div>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isDark
                      ? "bg-slate-800 text-blue-400"
                      : "bg-blue-50 text-blue-600 border border-blue-100"
                  }`}
                >
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] font-medium text-brand-textMuted mt-3">
                Entries recorded so far
              </p>
            </div>

            {/* 2. Prizes Won */}
            <div
              className={`rounded-3xl p-5 border shadow-sm flex flex-col justify-between ${
                isDark
                  ? "bg-[#151E30] border-slate-800 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-brand-textMuted">
                    Prizes Won
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-black mt-1">
                    {campaign.rewardsClaimed}
                  </h4>
                </div>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isDark
                      ? "bg-slate-800 text-amber-400"
                      : "bg-amber-50 text-amber-600 border border-amber-100"
                  }`}
                >
                  <Trophy className="w-4 h-4" />
                </div>
              </div>
              {/* Progress bar */}
              <div
                className={`w-full h-2 rounded-full overflow-hidden mt-3 ${
                  isDark ? "bg-slate-800" : "bg-slate-100"
                }`}
              >
                <div
                  className="bg-emerald-500 h-full rounded-full transition-all"
                  style={{
                    width: `${Math.min(
                      totalAllocated > 0
                        ? (campaign.rewardsClaimed / totalAllocated) * 100
                        : 0,
                      100,
                    )}%`,
                  }}
                ></div>
              </div>
              <p className="text-[11px] font-medium text-brand-textMuted mt-1">
                Winning entries in this campaign
              </p>
            </div>

            {/* 3. Date */}
            <div
              className={`rounded-3xl p-5 border shadow-sm flex flex-col justify-between ${
                isDark
                  ? "bg-[#151E30] border-slate-800 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-start justify-between">
                <h4 className="text-base font-black">Date</h4>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isDark
                      ? "bg-slate-800 text-purple-400"
                      : "bg-purple-50 text-purple-600 border border-purple-100"
                  }`}
                >
                  <Calendar className="w-4 h-4" />
                </div>
              </div>
              <div className="space-y-1 mt-2 text-xs font-bold">
                <div className="flex items-center justify-between">
                  <span className="text-brand-textMuted">start</span>
                  <span className="font-black">
                    {formatDate(campaign.startDate)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-brand-textMuted">end</span>
                  <span className="font-black">
                    {formatDate(campaign.endDate)}
                  </span>
                </div>
              </div>
            </div>

            {/* 4. Win Probability */}
            <div
              className={`rounded-3xl p-5 border shadow-sm flex flex-col justify-between ${
                isDark
                  ? "bg-[#151E30] border-slate-800 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-brand-textMuted">
                    Win Probability
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-black text-emerald-500 mt-1">
                    {campaign.winProbability}%
                  </h4>
                </div>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isDark
                      ? "bg-emerald-950/60 text-emerald-400"
                      : "bg-emerald-50 text-emerald-600 border border-emerald-100"
                  }`}
                >
                  <Gift className="w-4 h-4" />
                </div>
              </div>
              <div
                className={`w-full h-2 rounded-full overflow-hidden mt-3 ${
                  isDark ? "bg-slate-800" : "bg-slate-100"
                }`}
              >
                <div
                  className="bg-emerald-500 h-full rounded-full"
                  style={{
                    width: `${Math.min(campaign.winProbability, 100)}%`,
                  }}
                ></div>
              </div>
              <p className="text-[11px] font-medium text-brand-textMuted mt-1">
                Server-side win chance
              </p>
            </div>

            {/* 5. Allocated Stock */}
            <div
              className={`rounded-3xl p-5 border shadow-sm flex flex-col justify-between ${
                isDark
                  ? "bg-[#151E30] border-slate-800 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex items-start justify-between">
                <div>
                  <span className="text-xs font-bold text-brand-textMuted">
                    Allocated Stock
                  </span>
                  <h4 className="text-2xl sm:text-3xl font-black mt-1">
                    {totalAllocated}
                  </h4>
                </div>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center ${
                    isDark
                      ? "bg-slate-800 text-indigo-400"
                      : "bg-indigo-50 text-indigo-600 border border-indigo-100"
                  }`}
                >
                  <Box className="w-4 h-4" />
                </div>
              </div>
              <p className="text-[11px] font-medium text-brand-textMuted mt-3">
                Units reserved from templates
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* LOWER SECTION: Allocated Rewards Card + Recent Participants Card */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
        {/* Allocated Rewards Card */}
        <div
          className={`lg:col-span-6 rounded-[32px] p-6 sm:p-8 border shadow-sm space-y-4 ${
            isDark
              ? "bg-[#151E30] border-slate-800 text-white"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black">Allocated Rewards</h3>
            <span className="text-xs font-mono font-bold text-brand-textMuted uppercase">
              {enrichedPrizes.length} ROWS
            </span>
          </div>

          <div className="space-y-3">
            {enrichedPrizes.map((prize, idx) => (
              <div
                key={idx}
                className={`p-4 rounded-2xl flex items-center justify-between border ${
                  isDark
                    ? "bg-[#121929] border-slate-700/80 text-white"
                    : "bg-slate-50/80 border-slate-200/80 text-slate-900"
                }`}
              >
                <div>
                  <h5 className="font-bold text-sm">{prize.templateName}</h5>
                  <p className="text-xs text-brand-textMuted mt-0.5">
                    {prize.category} • {prize.faceValue}
                  </p>
                </div>
                <div className="flex items-center gap-6 text-xs text-center font-bold">
                  <div>
                    <span className="text-[10px] text-brand-textMuted uppercase font-mono block">
                      Qty
                    </span>
                    <span className="font-black">{prize.quantity}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-brand-textMuted uppercase font-mono block">
                      Weight
                    </span>
                    <span className="font-black">{prize.weight}</span>
                  </div>
                  <div>
                    <span className="text-[10px] text-brand-textMuted uppercase font-mono block">
                      Prepared
                    </span>
                    <span className="font-black">{prize.preparedValues}</span>
                  </div>
                </div>
              </div>
            ))}

            {enrichedPrizes.length === 0 && (
              <div className="py-8 text-center text-xs text-brand-textMuted">
                No reward templates allocated to this campaign.
              </div>
            )}
          </div>
        </div>

        {/* Recent Participants Card */}
        <div
          className={`lg:col-span-6 rounded-[32px] p-6 sm:p-8 border shadow-sm space-y-4 ${
            isDark
              ? "bg-[#151E30] border-slate-800 text-white"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-black">Recent Participants</h3>
            <span className="text-xs font-mono font-bold text-brand-textMuted uppercase">
              {campaignEntries.length} TOTAL
            </span>
          </div>

          {campaignEntries.length === 0 ? (
            <div className="py-12 flex flex-col items-center justify-center text-center border border-dashed border-card-border rounded-2xl p-6">
              <div
                className={`w-12 h-12 rounded-full flex items-center justify-center mb-3 ${
                  isDark
                    ? "bg-slate-800 text-slate-500"
                    : "bg-slate-100 text-slate-400 border border-slate-200"
                }`}
              >
                <Users className="w-6 h-6" />
              </div>
              <p className="text-xs sm:text-sm font-semibold text-brand-textMuted">
                No participations yet for this campaign.
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full text-xs text-left">
                <thead className="border-b border-card-border text-brand-textMuted uppercase font-bold text-[10px]">
                  <tr>
                    <th className="py-2.5 px-3">Player</th>
                    <th className="py-2.5 px-3">Phone</th>
                    <th className="py-2.5 px-3">Prize</th>
                    <th className="py-2.5 px-3">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-card-border">
                  {campaignEntries.slice(0, 8).map((entry) => (
                    <tr
                      key={entry.id}
                      className="hover:bg-card-bg-subtle transition-colors"
                    >
                      <td className="py-2.5 px-3 font-bold">
                        {entry.playerName}
                      </td>
                      <td className="py-2.5 px-3 text-brand-textMuted">
                        {entry.phoneNumber || "—"}
                      </td>
                      <td className="py-2.5 px-3 font-bold text-emerald-500">
                        {entry.prizeWon || "—"}
                      </td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`px-2 py-0.5 rounded-full text-[9px] font-black uppercase ${
                            entry.status === "confirmed"
                              ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400"
                              : "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300"
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
      </div>
    </div>
  );
};
