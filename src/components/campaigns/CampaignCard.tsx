// One campaign in the campaigns grid: what it is, how it is doing, and its actions.
import type { KeyboardEvent, MouseEvent } from "react";
import {
  Archive,
  BarChart3,
  CalendarDays,
  Copy,
  Palette,
  Pause,
  Pencil,
  Play,
  Rocket,
  Trash2,
} from "lucide-react";

import type { Campaign } from "../../types";
import { cn } from "../../lib/utils";
import { formatPeriod } from "../playerStudio/studioCampaignCells";
import { campaignTimeline, formatCount, gameMeta } from "./campaignMeta";
import {
  ActionMenu,
  CampaignStatusBadge,
  CxBar,
  CxButton,
  cxFocus,
  cxPanel,
  cxText,
  type ActionMenuItem,
} from "./campaignUi";
import { GameEmblem, gameColorClass, gamePatternClass } from "./GameEmblem";

type Translate = (key: string, fallback?: string) => string;

export interface CampaignCardProps {
  campaign: Campaign;
  t: Translate;
  onOpen: () => void;
  onEdit?: () => void;
  onCustomizePlayerScreen?: () => void;
  onOpenAnalytics?: () => void;
  onToggleStatus: () => void;
  onRelaunch: () => void;
  onArchive: () => void;
  onDelete: () => void;
}

function Metric({
  label,
  value,
  divided = false,
}: {
  label: string;
  value: string;
  /** Set apart from the metric before it by a hairline. */
  divided?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-0.5",
        divided && "border-l border-cx-border pl-2 @sm:pl-3",
      )}
    >
      <span className={cxText.label}>{label}</span>
      <span className="whitespace-nowrap text-base font-bold leading-6 tabular-nums">
        {value}
      </span>
    </div>
  );
}

// A click on a button or a menu inside the card is handled by that control.
const isFromControl = (target: EventTarget) =>
  target instanceof Element &&
  target.closest("button, a, [role='menu']") !== null;

export function CampaignCard({
  campaign,
  t,
  onOpen,
  onEdit,
  onCustomizePlayerScreen,
  onOpenAnalytics,
  onToggleStatus,
  onRelaunch,
  onArchive,
  onDelete,
}: CampaignCardProps) {
  const game = gameMeta(campaign.gameType);
  const isArchived = campaign.status === "archived";
  const isActive = campaign.status === "active";
  const timeline = campaignTimeline(campaign.startDate, campaign.endDate);
  const allocated = campaign.prizes.reduce(
    (sum, prize) => sum + prize.quantity,
    0,
  );
  const wonPercent =
    allocated > 0
      ? Math.min(100, Math.round((campaign.rewardsClaimed / allocated) * 100))
      : 0;
  const canDelete = campaign.status === "draft" || isArchived;

  const toggle = isActive
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
            onSelect: onCustomizePlayerScreen,
          },
        ]
      : []),
    ...(onOpenAnalytics
      ? [
          {
            label: t("campaigns.analytics", "Analytics"),
            icon: BarChart3,
            onSelect: onOpenAnalytics,
          },
        ]
      : []),
    { label: "Duplicate & relaunch", icon: Copy, onSelect: onRelaunch },
    ...(isArchived
      ? []
      : [
          {
            label: "Archive",
            icon: Archive,
            onSelect: onArchive,
            destructive: true,
          },
        ]),
    {
      label: t("campaigns.delete", "Delete"),
      icon: Trash2,
      onSelect: onDelete,
      destructive: true,
      disabled: !canDelete,
      hint: canDelete
        ? undefined
        : "Only draft or archived campaigns can be deleted. Archive it first.",
    },
  ];

  const openOnClick = (event: MouseEvent) => {
    if (!isFromControl(event.target)) onOpen();
  };
  const openOnKey = (event: KeyboardEvent) => {
    if (event.key === "Enter" && event.target === event.currentTarget) onOpen();
  };

  return (
    // The card takes its game's colours (banner, emblem, bar, donut). The badge carries
    // the status: the border only takes the game colour on hover.
    <article
      tabIndex={0}
      aria-label={campaign.name}
      onClick={openOnClick}
      onKeyDown={openOnKey}
      className={cn(
        gameColorClass(campaign.gameType),
        cxPanel,
        cxFocus,
        "cursor-pointer transition-[border-color,transform] duration-[120ms] hover:-translate-y-0.5 hover:border-cx-game",
      )}
    >
      {/* Archived campaigns are muted so that live ones stand out. */}
      <header
        className={cn(
          gamePatternClass(campaign.gameType),
          "relative flex h-[60px] items-start justify-between gap-3 overflow-hidden rounded-t-[13px] bg-cx-game-soft px-4 py-3",
          isArchived && "saturate-[.4]",
        )}
      >
        <span className="relative min-w-0 truncate text-xs font-bold uppercase leading-6 tracking-[0.06em] text-cx-game">
          {t(game.key, game.label)}
        </span>
        <CampaignStatusBadge campaign={campaign} t={t} className="relative" />
      </header>

      <div className="@container grid grid-cols-1 gap-3 px-4 pb-4">
        {/* The emblem overlaps the banner's edge */}
        <div className="relative z-[1] -mt-6 flex items-end justify-between">
          <GameEmblem
            gameType={campaign.gameType}
            size={48}
            lifted
            className={cn(isArchived && "saturate-[.4]")}
          />
          <div className="-mb-1">
            <ActionMenu
              label={`More actions for ${campaign.name}`}
              placement="bottom"
              items={menuItems}
            />
          </div>
        </div>

        {/* Two lines at most; the full name is on the details page. */}
        <h3
          className={cn(cxText.sectionTitle, "line-clamp-2 min-h-12")}
          title={campaign.name}
        >
          {campaign.name}
        </h3>

        <div className="grid grid-cols-1 gap-2">
          <div className="flex flex-wrap justify-between gap-x-3 gap-y-0.5 text-[13px] font-medium text-cx-ink-muted">
            <span className="inline-flex items-center gap-1.5">
              <CalendarDays className="size-4 shrink-0" aria-hidden />
              {formatPeriod(campaign.startDate, campaign.endDate)}
            </span>
            {timeline && <span>{timeline.label}</span>}
          </div>
          <CxBar percent={timeline?.percent ?? 0} tone="game" />
        </div>

        {/* Always in this order: prizes won (the donut), entries, win chance. On a narrow
            card the captions wrap and the gaps tighten; the numbers stay on one line. */}
        <div className="grid grid-cols-[auto_auto_auto] items-center gap-2 rounded-cx-md border border-cx-border p-2.5 @sm:gap-3 @sm:px-3">
          <div className="flex items-center gap-2 @sm:gap-3">
            <span
              aria-hidden
              className="relative grid size-10 shrink-0 place-items-center rounded-full"
              style={{
                background: `conic-gradient(var(--cx-g) ${wonPercent}%, var(--cx-surface-sunken) 0)`,
              }}
            >
              <span className="absolute inset-1.5 rounded-full bg-cx-surface" />
              <b className="relative text-[11px] font-bold leading-none tabular-nums text-cx-ink">
                {wonPercent}%
              </b>
            </span>
            <Metric
              label="Prizes won"
              value={`${formatCount(campaign.rewardsClaimed)} of ${formatCount(allocated)}`}
            />
          </div>
          <Metric
            label="Entries"
            value={formatCount(campaign.participantsCount)}
            divided
          />
          <Metric
            label="Win chance"
            value={
              campaign.autoPacePrizes ? "Paced" : `${campaign.winProbability}%`
            }
            divided
          />
        </div>

        {(onEdit || !isArchived) && (
          <footer className="flex items-center gap-2 border-t border-cx-border pt-3">
            {onEdit && (
              <CxButton size="sm" onClick={onEdit}>
                <Pencil aria-hidden />
                {t("campaigns.edit", "Edit")}
              </CxButton>
            )}
            {!isArchived && (
              <CxButton
                variant="ghost"
                size="sm"
                onClick={onToggleStatus}
                title={
                  isActive
                    ? "Players can no longer play until you resume"
                    : "Make the campaign playable"
                }
              >
                <ToggleIcon aria-hidden />
                {toggle.label}
              </CxButton>
            )}
          </footer>
        )}
      </div>
    </article>
  );
}
