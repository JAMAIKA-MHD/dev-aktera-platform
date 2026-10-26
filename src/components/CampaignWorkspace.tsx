import { rewardTypeName } from "../lib/rewardTypes";
import React, { useMemo, useState } from "react";
import { Campaign, LeadEntry, PrizeTemplate } from "../types";
import {
  BarChart3,
  Check,
  ChevronRight,
  Copy,
  ExternalLink,
  FlaskConical,
  Palette,
  Pause,
  Pencil,
  Play,
  Rocket,
} from "lucide-react";
import { useLanguage } from "../contexts/LanguageContext";
import { DEFAULT_CAMPAIGN_IMAGE_URL } from "../lib/defaultImages";
import { cn } from "../lib/utils";
import { campaignDurationDays, gameMeta } from "./campaigns/campaignMeta";
import {
  ActionMenu,
  CampaignStatusBadge,
  CxBadge,
  CxBar,
  CxButton,
  cxButtonClass,
  cxCount,
  cxFocus,
  cxPanel,
  cxRoot,
  cxText,
  type ActionMenuItem,
} from "./campaigns/campaignUi";
import { GameEmblem } from "./campaigns/GameEmblem";
import { CampaignTestModal } from "./CampaignTestModal";
import { formatPeriod } from "./playerStudio/studioCampaignCells";

// Behind the phone when the campaign has no image of its own: the game's colors.
const GAME_BACKDROPS: Record<string, { gradient: string; glow: string }> = {
  quiz: {
    gradient: "bg-gradient-to-br from-[#180d38] via-[#0B1120] to-[#251352]",
    glow: "bg-purple-600",
  },
  scratch_card: {
    gradient: "bg-gradient-to-br from-[#2f1807] via-[#0B1120] to-[#3a1d06]",
    glow: "bg-amber-500",
  },
  mystery_box: {
    gradient: "bg-gradient-to-br from-[#0a1c38] via-[#0B1120] to-[#0e274d]",
    glow: "bg-blue-600",
  },
  hit_it: {
    gradient: "bg-gradient-to-br from-[#330c14] via-[#0B1120] to-[#450e19]",
    glow: "bg-rose-600",
  },
  lucky_wheel: {
    gradient: "bg-gradient-to-br from-[#06201B] via-[#0B1120] to-[#0A2E26]",
    glow: "bg-emerald-500",
  },
};

// How many participants the details page lists; the rest are in the analytics.
const PARTICIPANTS_SHOWN = 8;

const MONTH = new Intl.DateTimeFormat("en-US", { month: "short" });
const TIME = new Intl.DateTimeFormat("en-GB", {
  hour: "2-digit",
  minute: "2-digit",
});
// "28 Sep, 14:02"
function formatEntryDate(timestamp: string) {
  const date = new Date(timestamp);
  if (Number.isNaN(date.getTime())) return "—";
  return `${date.getDate()} ${MONTH.format(date)}, ${TIME.format(date)}`;
}

const TH =
  "border-b border-cx-border bg-cx-sunken px-5 py-3 text-left text-xs font-bold uppercase leading-4 tracking-[0.06em] text-cx-ink-subtle whitespace-nowrap";
const TD = "px-5 py-3.5 align-middle text-cx-ink-muted";
const ROW = "border-b border-cx-border last:border-b-0";

// One number of the summary strip: caption, value, then a line or a bar under it.
function Stat({
  label,
  value,
  unit,
  children,
}: {
  label: string;
  value: React.ReactNode;
  unit?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="grid grid-cols-1 content-start gap-1.5 bg-cx-surface p-5">
      <dt className={cxText.label}>{label}</dt>
      <dd className="grid grid-cols-1 gap-1.5">
        <span
          className={cn(
            cxText.statValue,
            "flex flex-wrap items-baseline gap-x-1.5",
          )}
        >
          {value}
          {unit && (
            <small className="text-[13px] font-semibold leading-[18px] tracking-normal text-cx-ink-subtle">
              {unit}
            </small>
          )}
        </span>
        {children}
      </dd>
    </div>
  );
}

type TabId = "rewards" | "participants";

interface CampaignWorkspaceProps {
  campaign: Campaign;
  prizes: PrizeTemplate[];
  leads: LeadEntry[];
  onBack: () => void;
  onEditCampaign: (campaign: Campaign) => void;
  onCustomizePlayerScreen?: (campaign: Campaign) => void;
  onRelaunch: (campaign: Campaign) => void;
  onToggleStatus: (id: string) => void;
  onOpenAnalytics: (id: string) => void;
  /** The phone playing the campaign's saved design, shown over its image. */
  preview?: React.ReactNode;
}

export const CampaignWorkspace: React.FC<CampaignWorkspaceProps> = ({
  campaign,
  prizes,
  leads,
  onBack,
  onEditCampaign,
  onCustomizePlayerScreen,
  onRelaunch,
  onToggleStatus,
  onOpenAnalytics,
  preview,
}) => {
  const { t } = useLanguage();
  const [copied, setCopied] = useState(false);
  const [isTestModalOpen, setIsTestModalOpen] = useState(false);
  const [tab, setTab] = useState<TabId>("rewards");

  const campaignEntries = useMemo(
    () => leads.filter((entry) => entry.campaignId === campaign.id),
    [campaign.id, leads],
  );

  const campaignLink = `${window.location.origin}/play/${campaign.slug}`;
  const totalAllocated = campaign.prizes.reduce(
    (sum, prize) => sum + prize.quantity,
    0,
  );
  const totalWeight = campaign.prizes.reduce(
    (sum, prize) => sum + Number(prize.weight || 0),
    0,
  );
  const wonPercent =
    totalAllocated > 0
      ? Math.round((campaign.rewardsClaimed / totalAllocated) * 100)
      : 0;
  const days = campaignDurationDays(campaign.startDate, campaign.endDate);

  const enrichedPrizes = campaign.prizes.map((prize) => {
    const template = prizes.find((item) => item.id === prize.templateId);
    return {
      ...prize,
      templateName: template?.name ?? "Unknown reward",
      category: template?.category ?? "voucher",
      faceValue: template?.itemValue ?? "N/A",
      preparedValues: template?.filledValuesCount ?? 0,
      won: prize.quantity_won ?? 0,
      share:
        totalWeight > 0
          ? Math.round((Number(prize.weight || 0) / totalWeight) * 100)
          : 0,
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

  const game = gameMeta(campaign.gameType);
  const toggle =
    campaign.status === "active"
      ? { label: "Pause", icon: Pause }
      : campaign.status === "draft"
        ? { label: "Publish", icon: Rocket }
        : { label: "Resume", icon: Play };
  const ToggleIcon = toggle.icon;
  const menuItems: ActionMenuItem[] = [
    ...(onCustomizePlayerScreen
      ? [
          {
            label: "Design player screens",
            icon: Palette,
            onSelect: () => onCustomizePlayerScreen(campaign),
          },
        ]
      : []),
    {
      label: "Open analytics",
      icon: BarChart3,
      onSelect: () => onOpenAnalytics(campaign.id),
    },
    {
      label: "Simulate plays",
      icon: FlaskConical,
      onSelect: () => setIsTestModalOpen(true),
    },
    {
      label: "Duplicate & relaunch",
      icon: Copy,
      onSelect: () => onRelaunch(campaign),
    },
  ];

  const backdrop =
    GAME_BACKDROPS[campaign.gameType] ?? GAME_BACKDROPS.lucky_wheel;

  const tabs: { id: TabId; label: string; count: number }[] = [
    { id: "rewards", label: "Rewards", count: enrichedPrizes.length },
    {
      id: "participants",
      label: "Participants",
      count: campaignEntries.length,
    },
  ];

  return (
    <div
      id="campaign-workspace-root"
      className={cn(
        cxRoot,
        "mx-auto grid max-w-[1800px] grid-cols-1 gap-6 xl:grid-cols-2",
      )}
    >
      {/* LEFT HALF: the campaign's details, all visible, nothing folded away */}
      <div className="@container grid grid-cols-1 min-w-0 content-start gap-4 xl:pb-16">
        <nav
          aria-label="Breadcrumb"
          className="flex min-w-0 items-center gap-2 text-[13px] font-medium text-cx-ink-subtle"
        >
          <button
            type="button"
            onClick={onBack}
            className={cn(
              cxFocus,
              "cursor-pointer rounded-cx-sm text-cx-ink-muted transition-colors duration-[120ms] hover:text-cx-ink hover:underline",
            )}
          >
            Campaigns
          </button>
          <ChevronRight className="size-4 shrink-0" aria-hidden />
          <span className="truncate" aria-current="page">
            {campaign.name}
          </span>
        </nav>

        {/* Header: the campaign, its state, and the one filled action */}
        <header className="flex flex-wrap items-start gap-4 pb-2">
          {/* Beside the actions when there is room, above them otherwise */}
          <div className="flex min-w-0 flex-1 basis-full items-start gap-4 @3xl:basis-64">
            <GameEmblem gameType={campaign.gameType} size={56} />
            <div className="grid grid-cols-1 min-w-0 flex-1 gap-2">
              <h1 className={cn(cxText.pageTitle, "[overflow-wrap:anywhere]")}>
                {campaign.name}
              </h1>
              <p className="flex flex-wrap items-center gap-x-3 gap-y-2 font-medium text-cx-ink-muted">
                <CampaignStatusBadge campaign={campaign} t={t} />
                <span>{t(game.key, game.label)}</span>
                <span
                  className="size-[3px] rounded-full bg-cx-ink-subtle"
                  aria-hidden
                />
                <span>
                  {formatPeriod(campaign.startDate, campaign.endDate)}
                </span>
              </p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <CxButton
              variant="primary"
              onClick={() => onEditCampaign(campaign)}
            >
              <Pencil aria-hidden />
              Edit campaign
            </CxButton>
            {campaign.status !== "archived" && (
              <CxButton onClick={() => onToggleStatus(campaign.id)}>
                <ToggleIcon aria-hidden />
                {toggle.label}
              </CxButton>
            )}
            <ActionMenu
              label="More actions"
              placement="bottom"
              variant="secondary"
              size="md"
              items={menuItems}
            />
          </div>
        </header>

        <dl
          aria-label="Campaign summary"
          className="grid grid-cols-2 gap-px overflow-hidden rounded-cx-lg bg-cx-border shadow-cx-card ring-1 ring-cx-border @2xl:grid-cols-4"
        >
          <Stat label="Participants" value={campaign.participantsCount}>
            <span className={cxText.caption}>Entries recorded</span>
          </Stat>
          <Stat
            label="Prizes won"
            value={campaign.rewardsClaimed}
            unit={`of ${totalAllocated}`}
          >
            <CxBar
              percent={wonPercent}
              tone="success"
              label={`${wonPercent}% of prizes won`}
            />
          </Stat>
          <Stat
            label="Win chance"
            value={
              campaign.autoPacePrizes ? "Paced" : `${campaign.winProbability}%`
            }
          >
            <span className={cxText.caption}>
              {campaign.autoPacePrizes
                ? "Dynamic daily quota pacing"
                : "Server-side win chance"}
            </span>
          </Stat>
          <Stat
            label="Duration"
            value={days ?? "—"}
            unit={days === null ? undefined : days === 1 ? "day" : "days"}
          >
            <span className={cxText.caption}>
              {formatPeriod(campaign.startDate, campaign.endDate)}
            </span>
          </Stat>
        </dl>

        {/* Share: the one link players need, always visible */}
        <section
          aria-label="Player link"
          className={cn(
            cxPanel,
            "flex flex-wrap items-center gap-3 py-3 pl-5 pr-3",
          )}
        >
          <span className={cxText.label}>Player link</span>
          <code
            title={campaignLink}
            className="min-w-0 flex-1 basis-48 truncate font-mono text-[13px] leading-5 text-cx-ink"
          >
            {campaignLink}
          </code>
          <CxButton size="sm" onClick={handleCopyLink}>
            {copied ? (
              <Check className="text-cx-success" aria-hidden />
            ) : (
              <Copy aria-hidden />
            )}
            {copied ? "Copied" : "Copy link"}
          </CxButton>
          <a
            href={campaignLink}
            target="_blank"
            rel="noopener noreferrer"
            aria-label="Open live page"
            className={cxButtonClass({ size: "sm" })}
          >
            <ExternalLink aria-hidden />
            Open
          </a>
        </section>

        <div
          role="tablist"
          aria-label="Campaign details"
          className="mt-2 flex gap-6 border-b border-cx-border"
        >
          {tabs.map((item) => (
            <button
              key={item.id}
              type="button"
              role="tab"
              id={`campaign-tab-${item.id}`}
              aria-selected={tab === item.id}
              aria-controls={`campaign-panel-${item.id}`}
              onClick={() => setTab(item.id)}
              className={cn(
                cxFocus,
                "-mb-px inline-flex cursor-pointer items-center gap-2 border-b-2 px-0.5 py-3 font-semibold transition-colors duration-[120ms] hover:text-cx-ink",
                tab === item.id
                  ? "border-cx-brand text-cx-ink"
                  : "border-transparent text-cx-ink-muted",
              )}
            >
              {item.label}
              <span className={cxCount}>{item.count}</span>
            </button>
          ))}
        </div>

        {tab === "rewards" && (
          <section
            role="tabpanel"
            id="campaign-panel-rewards"
            aria-labelledby="campaign-tab-rewards"
            className={cn(cxPanel, "overflow-hidden")}
          >
            {enrichedPrizes.length === 0 ? (
              <p className="px-5 py-10 text-center text-cx-ink-muted">
                No reward templates allocated to this campaign.
              </p>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full border-collapse tabular-nums">
                  <thead>
                    <tr>
                      <th className={TH}>Reward</th>
                      <th className={TH}>Awarded</th>
                      <th className={cn(TH, "text-right")}>Remaining</th>
                      <th className={cn(TH, "text-right")}>
                        {campaign.gameType === "lucky_wheel"
                          ? "Wheel share"
                          : "Share of wins"}
                      </th>
                      <th className={cn(TH, "text-right")}>Prepared</th>
                    </tr>
                  </thead>
                  <tbody>
                    {enrichedPrizes.map((prize, idx) => (
                      <tr key={idx} className={ROW}>
                        <td className={TD}>
                          <span className="font-semibold text-cx-ink">
                            {prize.templateName}
                          </span>
                          <span className={cn(cxText.caption, "block")}>
                            {rewardTypeName(prize.category)} · {prize.faceValue}
                          </span>
                        </td>
                        <td className={TD}>
                          <div className="grid grid-cols-1 min-w-[130px] gap-1.5">
                            <span className="font-semibold text-cx-ink">
                              {prize.won} of {prize.quantity}
                            </span>
                            <CxBar
                              percent={
                                prize.quantity > 0
                                  ? (prize.won / prize.quantity) * 100
                                  : 0
                              }
                            />
                          </div>
                        </td>
                        <td className={cn(TD, "text-right")}>
                          {Math.max(prize.quantity - prize.won, 0)}
                        </td>
                        <td
                          className={cn(TD, "text-right")}
                          title={`Weight ${prize.weight}`}
                        >
                          {prize.share}%
                        </td>
                        <td className={cn(TD, "text-right")}>
                          {prize.preparedValues}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        )}

        {tab === "participants" && (
          <section
            role="tabpanel"
            id="campaign-panel-participants"
            aria-labelledby="campaign-tab-participants"
            className={cn(cxPanel, "overflow-hidden")}
          >
            {campaignEntries.length === 0 ? (
              <p className="px-5 py-10 text-center text-cx-ink-muted">
                No participations yet for this campaign.
              </p>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="w-full border-collapse tabular-nums">
                    <thead>
                      <tr>
                        <th className={TH}>Player</th>
                        <th className={TH}>Result</th>
                        <th className={TH}>Prize</th>
                        <th className={TH}>Status</th>
                        <th className={cn(TH, "text-right")}>Date</th>
                      </tr>
                    </thead>
                    <tbody>
                      {campaignEntries
                        .slice(0, PARTICIPANTS_SHOWN)
                        .map((entry) => (
                          <tr key={entry.id} className={ROW}>
                            <td className={TD}>
                              <span className="font-semibold text-cx-ink">
                                {entry.playerName}
                              </span>
                              <span className={cn(cxText.caption, "block")}>
                                {entry.phoneNumber || "—"}
                              </span>
                            </td>
                            <td className={TD}>
                              <CxBadge
                                tone={entry.prizeWon ? "success" : "neutral"}
                              >
                                {entry.prizeWon ? "Won" : "No win"}
                              </CxBadge>
                            </td>
                            <td className={TD}>{entry.prizeWon || "—"}</td>
                            <td className={cn(TD, "capitalize")}>
                              {entry.status}
                            </td>
                            <td
                              className={cn(TD, "whitespace-nowrap text-right")}
                            >
                              {formatEntryDate(entry.timestamp)}
                            </td>
                          </tr>
                        ))}
                    </tbody>
                  </table>
                </div>
                <div
                  className={cn(
                    cxText.caption,
                    "flex items-center justify-between gap-4 border-t border-cx-border bg-cx-sunken px-5 py-3",
                  )}
                >
                  <span className="tabular-nums">
                    Showing{" "}
                    {Math.min(campaignEntries.length, PARTICIPANTS_SHOWN)} of{" "}
                    {campaignEntries.length}
                  </span>
                  <button
                    type="button"
                    onClick={() => onOpenAnalytics(campaign.id)}
                    className={cn(
                      cxFocus,
                      "cursor-pointer rounded-cx-sm text-sm font-semibold text-cx-brand-text hover:underline",
                    )}
                  >
                    View all participants
                  </button>
                </div>
              </>
            )}
          </section>
        )}
      </div>

      {/* RIGHT HALF: the campaign's image, and on it the phone playing the saved design */}
      <aside
        aria-label="Player preview"
        className="relative flex h-[720px] flex-col self-start overflow-hidden rounded-cx-xl border border-cx-border shadow-cx-card xl:sticky xl:top-2 xl:h-[calc(100dvh-7rem)] xl:min-h-[480px]"
      >
        {campaign.heroImageUrl ? (
          <img
            src={campaign.heroImageUrl}
            alt=""
            className="absolute inset-0 size-full object-cover"
            onError={(e) => {
              e.currentTarget.src = DEFAULT_CAMPAIGN_IMAGE_URL;
            }}
          />
        ) : (
          <div
            className={`absolute inset-0 flex items-center justify-center ${backdrop.gradient}`}
          >
            <div
              className={`h-64 w-64 rounded-full opacity-40 blur-3xl ${backdrop.glow}`}
            ></div>
          </div>
        )}
        <div className="absolute inset-0 bg-black/30" aria-hidden />
        <div className="relative flex min-h-0 flex-1 flex-col">{preview}</div>
      </aside>

      <CampaignTestModal
        campaign={campaign}
        prizes={prizes}
        isOpen={isTestModalOpen}
        onClose={() => setIsTestModalOpen(false)}
        onDataInjected={() => {
          onOpenAnalytics(campaign.id);
        }}
      />
    </div>
  );
};
