import React, { useMemo, useState } from "react";
import { Megaphone, Plus, Search, SearchX, X } from "lucide-react";

import { Campaign } from "../types";
import { useLanguage } from "../contexts/LanguageContext";
import { searchable } from "../lib/searchText";
import { cn } from "../lib/utils";
import { CampaignCard } from "./campaigns/CampaignCard";
import { GameEmblem } from "./campaigns/GameEmblem";
import { NewCampaignButton } from "./campaigns/NewCampaignButton";
import {
  GAME_TYPES,
  gameMeta,
  isScheduled,
  STATUS_META,
  STATUS_ORDER,
  type CampaignStatus,
  type GameType,
} from "./campaigns/campaignMeta";
import {
  ConfirmDialog,
  CxButton,
  cxCount,
  cxField,
  cxFocus,
  cxRoot,
  cxText,
} from "./campaigns/campaignUi";
import { pageWindow } from "./ui/data-table-parts";
import { EmptyState, ErrorState, LoadingState } from "./ui/EmptyState";

interface CampaignsListProps {
  campaigns: Campaign[];
  onSelectCampaign: (id: string) => void;
  onEditCampaign?: (camp: Campaign) => void;
  onCustomizePlayerScreen?: (camp: Campaign) => void;
  onRelaunch: (camp: Campaign) => void;
  onToggleStatus: (id: string) => void;
  onArchive: (id: string) => void;
  onDelete: (id: string) => void;
  onOpenAnalytics?: (id: string) => void;
  onOpenWizard: () => void;
  /** A quick-start card: opens the wizard on that game. */
  onQuickStart?: (game: GameType) => void;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
}

// A published campaign whose first day has not come yet is "scheduled", as its badge says.
type ListStatus = CampaignStatus | "scheduled";
type StatusFilter = "all" | ListStatus;
const listStatusOf = (campaign: Campaign): ListStatus =>
  isScheduled(campaign) ? "scheduled" : campaign.status;
type GameFilter = "all" | GameType;

const PAGE_SIZE = 12;

// The chosen filter or page: tinted, not filled (the filled button is "create").
const CHOSEN =
  "bg-cx-brand-soft text-cx-brand-text not-disabled:hover:bg-cx-brand-soft";

export const CampaignsList: React.FC<CampaignsListProps> = ({
  campaigns,
  onSelectCampaign,
  onEditCampaign,
  onCustomizePlayerScreen,
  onRelaunch,
  onToggleStatus,
  onArchive,
  onDelete,
  onOpenAnalytics,
  onOpenWizard,
  onQuickStart,
  loading = false,
  error = null,
  onRetry,
}) => {
  const { t } = useLanguage();

  const [searchTerm, setSearchTerm] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [game, setGame] = useState<GameFilter>("all");
  const [pageIndex, setPageIndex] = useState(0);
  // Archiving and deleting are confirmed first: neither can be undone from this page.
  const [pending, setPending] = useState<{
    action: "archive" | "delete";
    campaign: Campaign;
  } | null>(null);

  const statusCounts = useMemo(() => {
    const counts: Record<StatusFilter, number> = {
      all: campaigns.length,
      active: 0,
      scheduled: 0,
      paused: 0,
      draft: 0,
      archived: 0,
    };
    for (const campaign of campaigns) counts[listStatusOf(campaign)] += 1;
    return counts;
  }, [campaigns]);

  const filteredCampaigns = useMemo(() => {
    // Every word typed must be found in the campaign's name (either language), link or game.
    const words = searchable(searchTerm).split(/\s+/).filter(Boolean);
    return campaigns.filter((campaign) => {
      if (status !== "all" && listStatusOf(campaign) !== status) return false;
      if (game !== "all" && campaign.gameType !== game) return false;
      if (words.length === 0) return true;
      const meta = gameMeta(campaign.gameType);
      const haystack = searchable(
        [
          campaign.name,
          campaign.arabicName ?? "",
          campaign.slug,
          t(meta.key, meta.label),
        ].join(" "),
      );
      return words.every((word) => haystack.includes(word));
    });
  }, [campaigns, searchTerm, status, game, t]);

  // A filter change goes back to the first page; a list that shrinks (a deletion) never
  // leaves the page past its end.
  const pageCount = Math.max(
    1,
    Math.ceil(filteredCampaigns.length / PAGE_SIZE),
  );
  const page = Math.min(pageIndex, pageCount - 1);
  const pageCampaigns = filteredCampaigns.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE,
  );
  const changeSearch = (value: string) => {
    setSearchTerm(value);
    setPageIndex(0);
  };

  const filtering =
    searchTerm.trim() !== "" || status !== "all" || game !== "all";
  const clearFilters = () => {
    setSearchTerm("");
    setStatus("all");
    setGame("all");
    setPageIndex(0);
  };

  const confirmPending = () => {
    if (!pending) return;
    if (pending.action === "archive") onArchive(pending.campaign.id);
    else onDelete(pending.campaign.id);
    setPending(null);
  };

  const searchLabel = "Search campaigns…";
  const statusTabs: { value: StatusFilter; label: string }[] = [
    { value: "all", label: "All" },
    ...STATUS_ORDER.flatMap((value) => {
      const tab = {
        value,
        label: t(STATUS_META[value].key, STATUS_META[value].label),
      };
      return value === "active"
        ? [
            tab,
            {
              value: "scheduled" as const,
              label: t("campaigns.scheduled", "Scheduled"),
            },
          ]
        : [tab];
    }),
  ];

  return (
    <div
      id="campaigns-list-root"
      className={cn(cxRoot, "mx-auto max-w-[1800px] space-y-8 pb-16")}
    >
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className={cxText.pageTitle}>
            {t("campaigns.title", "Campaign Radios")}
          </h2>
          <p className="mt-1 text-cx-ink-muted">
            Create, launch and follow the games you share with your customers.
          </p>
        </div>
        <NewCampaignButton
          label={t("campaigns.newCampaign", "New campaign")}
          onCreate={onOpenWizard}
          onPickGame={(game) =>
            onQuickStart ? onQuickStart(game) : onOpenWizard()
          }
        />
      </header>

      {error && campaigns.length === 0 ? (
        <ErrorState
          title={t("campaigns.loadError", "Your campaigns could not be loaded")}
          message={error}
          onRetry={() => onRetry?.()}
        />
      ) : loading && campaigns.length === 0 ? (
        <LoadingState
          rows={4}
          label={t("campaigns.loading", "Loading campaigns")}
        />
      ) : campaigns.length === 0 ? (
        <EmptyState
          icon={Megaphone}
          variant="bare"
          headingLevel={3}
          title={t("campaigns.emptyTitle", "No campaigns yet")}
          description={t(
            "campaigns.emptyDescription",
            "Campaigns are the games your players take part in. Create a Lucky Spin, a quiz and more in a few minutes.",
          )}
          primaryAction={{
            label: t("campaigns.emptyCreate", "Create your first campaign"),
            icon: Plus,
            onClick: onOpenWizard,
          }}
          secondaryAction={{
            label: t("campaigns.emptyBrowse", "Browse campaign templates"),
            onClick: () =>
              document
                .querySelector<HTMLElement>("#campaign-quick-start button")
                ?.focus(),
          }}
        >
          <div
            id="campaign-quick-start"
            className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-5"
          >
            {GAME_TYPES.map((item) => {
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() =>
                    onQuickStart ? onQuickStart(item.id) : onOpenWizard()
                  }
                  className={cn(
                    cxFocus,
                    "flex cursor-pointer flex-col items-center gap-2 rounded-cx-lg border border-cx-border bg-cx-surface p-4 text-center transition-colors duration-[120ms] hover:border-cx-control",
                  )}
                >
                  <GameEmblem gameType={item.id} size={44} />
                  <span className="font-semibold text-cx-ink">
                    {t(item.key, item.label)}
                  </span>
                  <span className={cxText.caption}>{item.description}</span>
                </button>
              );
            })}
          </div>
        </EmptyState>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap items-center gap-3">
            <div className="relative w-full sm:w-72">
              <Search
                className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-cx-ink-subtle"
                aria-hidden
              />
              <input
                type="search"
                value={searchTerm}
                onChange={(event) => changeSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Escape") changeSearch("");
                }}
                placeholder={searchLabel}
                aria-label={searchLabel}
                className={cn(
                  cxField(),
                  "select-text px-9 [&::-webkit-search-cancel-button]:appearance-none",
                )}
              />
              {searchTerm !== "" && (
                <button
                  type="button"
                  aria-label="Clear search"
                  onClick={() => changeSearch("")}
                  className={cn(
                    cxFocus,
                    "absolute right-2 top-1/2 flex size-6 -translate-y-1/2 cursor-pointer items-center justify-center rounded-cx-sm text-cx-ink-subtle transition-colors duration-[120ms] hover:text-cx-ink",
                  )}
                >
                  <X className="size-4" aria-hidden />
                </button>
              )}
            </div>
            <div
              role="group"
              aria-label="Filter by status"
              className="flex flex-wrap gap-1"
            >
              {statusTabs.map((tab) => (
                <CxButton
                  key={tab.value}
                  size="sm"
                  variant="ghost"
                  aria-pressed={status === tab.value}
                  onClick={() => {
                    setStatus(tab.value);
                    setPageIndex(0);
                  }}
                  className={cn(
                    "px-2.5",
                    status === tab.value ? CHOSEN : "text-cx-ink-muted",
                  )}
                >
                  {tab.label}
                  <span className={cxCount}>{statusCounts[tab.value]}</span>
                </CxButton>
              ))}
            </div>
            <select
              value={game}
              onChange={(event) => {
                setGame(event.target.value as GameFilter);
                setPageIndex(0);
              }}
              aria-label="Filter by game"
              className={cn(cxField(), "w-auto")}
            >
              <option value="all">All games</option>
              {GAME_TYPES.map((item) => (
                <option key={item.id} value={item.id}>
                  {t(item.key, item.label)}
                </option>
              ))}
            </select>
            <p className={cn(cxText.caption, "ml-auto")} aria-live="polite">
              {filtering
                ? `${filteredCampaigns.length} of ${campaigns.length} campaigns`
                : `${campaigns.length} ${campaigns.length === 1 ? "campaign" : "campaigns"}`}
            </p>
          </div>

          {filteredCampaigns.length === 0 ? (
            <EmptyState
              icon={SearchX}
              headingLevel={3}
              title={t(
                "campaigns.noResults",
                "No campaign matches your filters",
              )}
              description={t(
                "campaigns.noResultsHint",
                "Try another status or game, or search for a different name.",
              )}
              primaryAction={{
                label: t("campaigns.clearFilters", "Clear filters"),
                onClick: clearFilters,
              }}
            />
          ) : (
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
              {pageCampaigns.map((campaign) => (
                <CampaignCard
                  key={campaign.id}
                  campaign={campaign}
                  t={t}
                  onOpen={() => onSelectCampaign(campaign.id)}
                  onEdit={
                    onEditCampaign ? () => onEditCampaign(campaign) : undefined
                  }
                  onCustomizePlayerScreen={
                    onCustomizePlayerScreen
                      ? () => onCustomizePlayerScreen(campaign)
                      : undefined
                  }
                  onOpenAnalytics={
                    onOpenAnalytics
                      ? () => onOpenAnalytics(campaign.id)
                      : undefined
                  }
                  onToggleStatus={() => onToggleStatus(campaign.id)}
                  onRelaunch={() => onRelaunch(campaign)}
                  onArchive={() => setPending({ action: "archive", campaign })}
                  onDelete={() => setPending({ action: "delete", campaign })}
                />
              ))}
            </div>
          )}

          {pageCount > 1 && (
            <nav
              aria-label="Pagination"
              className={cn(
                cxText.caption,
                "flex flex-wrap items-center justify-end gap-x-3 gap-y-2",
              )}
            >
              <span className="tabular-nums">
                Campaigns {page * PAGE_SIZE + 1}–
                {Math.min(filteredCampaigns.length, (page + 1) * PAGE_SIZE)} of{" "}
                {filteredCampaigns.length}
              </span>
              <CxButton
                size="sm"
                onClick={() => setPageIndex(page - 1)}
                disabled={page === 0}
              >
                Previous
              </CxButton>
              <div className="flex items-center gap-1">
                {pageWindow(page, pageCount).map((item, i) =>
                  item === "gap" ? (
                    <span key={`gap-${i}`} aria-hidden className="px-1">
                      …
                    </span>
                  ) : (
                    <CxButton
                      key={item}
                      variant="ghost"
                      size="sm"
                      aria-label={`Page ${item + 1}`}
                      aria-current={item === page ? "page" : undefined}
                      onClick={() => setPageIndex(item)}
                      className={cn(
                        "min-w-8 px-2 tabular-nums",
                        item === page ? CHOSEN : "text-cx-ink-muted",
                      )}
                    >
                      {item + 1}
                    </CxButton>
                  ),
                )}
              </div>
              <CxButton
                size="sm"
                onClick={() => setPageIndex(page + 1)}
                disabled={page >= pageCount - 1}
              >
                Next
              </CxButton>
            </nav>
          )}
        </div>
      )}

      {pending?.action === "archive" && (
        <ConfirmDialog
          title="Archive this campaign?"
          confirmLabel="Archive campaign"
          destructive
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        >
          <p>
            <strong className="text-cx-ink">{pending.campaign.name}</strong>{" "}
            will stop accepting players and move to the Archived list. Its
            entries and results are kept.
          </p>
        </ConfirmDialog>
      )}
      {pending?.action === "delete" && (
        <ConfirmDialog
          title="Delete this campaign?"
          confirmLabel="Delete permanently"
          destructive
          onConfirm={confirmPending}
          onCancel={() => setPending(null)}
        >
          <p>
            <strong className="text-cx-ink">{pending.campaign.name}</strong>{" "}
            will be removed permanently. This cannot be undone.
          </p>
        </ConfirmDialog>
      )}
    </div>
  );
};
