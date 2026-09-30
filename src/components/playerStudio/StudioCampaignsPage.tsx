// Player Studio page: every campaign of the brand in a table; opening one hands it to the
// Studio (App.tsx decides what "open" does). The Studio itself is not rendered here.
import { useMemo, useState, type ReactNode } from "react";
import type { ColumnFiltersState } from "@tanstack/react-table";
import { AlertTriangle, Plus, Sparkles } from "lucide-react";

import { useLanguage } from "../../contexts/LanguageContext";
import type { Campaign } from "../../types";
import { Button } from "../ui/button";
import { DataTable } from "../ui/data-table";
import { studioCampaignColumns } from "./studioCampaignColumns";
import {
  matchesStatusFilter,
  matchesStudioSearch,
  toStudioCampaignRows,
  type StatusFilter,
  type StudioCampaignRow,
} from "./studioCampaignRows";
import {
  StudioCampaignsToolbar,
  type GameFilter,
} from "./StudioCampaignsToolbar";
import { useExperienceSummaries } from "./useExperienceSummaries";

export interface StudioCampaignsPageProps {
  campaigns: Campaign[];
  loading: boolean;
  error: string | null;
  organizationId: string | null;
  onOpenCampaign: (campaignId: string) => void;
  onOpenStandalone: () => void;
  onCreateCampaign: () => void;
  onRetry: () => void;
}

function StateCard({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-14 text-center">
      {children}
    </div>
  );
}

export function StudioCampaignsPage({
  campaigns,
  loading,
  error,
  organizationId,
  onOpenCampaign,
  onOpenStandalone,
  onCreateCampaign,
  onRetry,
}: StudioCampaignsPageProps) {
  const { t } = useLanguage();
  const { savedAt } = useExperienceSummaries(organizationId);
  const [query, setQuery] = useState("");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [game, setGame] = useState<GameFilter>("all");

  // "Now" for the ended rule and the "saved … ago" labels, refreshed with the data.
  const now = useMemo(() => new Date(), [campaigns, savedAt]);
  const rows = useMemo(
    () => toStudioCampaignRows(campaigns, savedAt, now),
    [campaigns, savedAt, now],
  );
  const columns = useMemo(
    () =>
      studioCampaignColumns({
        t,
        now,
        onOpen: (row) => onOpenCampaign(row.id),
      }),
    [t, now, onOpenCampaign],
  );
  const columnFilters = useMemo<ColumnFiltersState>(
    () => [
      ...(status === "all" ? [] : [{ id: "status", value: status }]),
      ...(game === "all" ? [] : [{ id: "game", value: game }]),
    ],
    [status, game],
  );

  const filtering = query.trim() !== "" || status !== "all" || game !== "all";
  const shownCount = rows.filter(
    (row) =>
      matchesStudioSearch(row, query) &&
      matchesStatusFilter(row, status) &&
      (game === "all" || row.gameType === game),
  ).length;
  const counter = loading
    ? ""
    : filtering
      ? `${shownCount} of ${rows.length} campaigns`
      : `${rows.length} ${rows.length === 1 ? "campaign" : "campaigns"}`;

  const clearFilters = () => {
    setQuery("");
    setStatus("all");
    setGame("all");
  };

  return (
    <div className="mx-auto max-w-[1800px] space-y-5 pb-16 text-brand-text">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h2 className="text-2xl font-black tracking-tight text-brand-text">
            {t("playerStudio.title", "Player Studio")}
          </h2>
          <p className="mt-0.5 text-xs font-medium text-brand-text-muted">
            {t(
              "playerStudio.subtitle",
              "Design what players see, campaign by campaign.",
            )}
          </p>
        </div>
        <Button variant="outline" onClick={onOpenStandalone}>
          <Sparkles aria-hidden />
          {t("playerStudio.standalone", "Open standalone demo")}
        </Button>
      </header>

      {error && !loading ? (
        <div className="rounded-xl border border-border bg-background">
          <StateCard>
            <AlertTriangle className="size-6 text-amber-500" aria-hidden />
            <p className="font-semibold text-foreground">
              {t("playerStudio.loadError", "Could not load your campaigns.")}
            </p>
            <Button variant="outline" onClick={onRetry}>
              {t("playerStudio.retry", "Retry")}
            </Button>
          </StateCard>
        </div>
      ) : (
        <>
          <StudioCampaignsToolbar
            t={t}
            query={query}
            onQueryChange={setQuery}
            status={status}
            onStatusChange={setStatus}
            game={game}
            onGameChange={setGame}
            counter={counter}
          />
          <DataTable<StudioCampaignRow>
            columns={columns}
            data={rows}
            ariaLabel={t("playerStudio.tableLabel", "Your campaigns")}
            getRowId={(row) => row.id}
            onRowOpen={(row) => onOpenCampaign(row.id)}
            globalFilter={query}
            globalFilterFn={(row, _columnId, value) =>
              matchesStudioSearch(row.original, String(value))
            }
            columnFilters={columnFilters}
            loading={loading}
            hiddenColumnsBelow={{
              design: "sm",
              game: "md",
              players: "lg",
              period: "xl",
            }}
            emptyState={
              <StateCard>
                <p className="font-semibold text-foreground">
                  {t("playerStudio.empty", "No campaigns yet")}
                </p>
                <p className="max-w-sm text-sm text-muted-foreground">
                  {t(
                    "playerStudio.emptyHint",
                    "Create a campaign, then design what its players see here.",
                  )}
                </p>
                <Button onClick={onCreateCampaign}>
                  <Plus aria-hidden />
                  {t("playerStudio.create", "Create a campaign")}
                </Button>
              </StateCard>
            }
            noResultsState={
              <StateCard>
                <p className="font-semibold text-foreground">
                  {t(
                    "playerStudio.noResults",
                    "No campaign matches your filters",
                  )}
                </p>
                <Button variant="outline" onClick={clearFilters}>
                  {t("playerStudio.clearFilters", "Clear filters")}
                </Button>
              </StateCard>
            }
          />
        </>
      )}
    </div>
  );
}
