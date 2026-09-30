// Columns of the Player Studio campaigns table (DataTable, src/components/ui/data-table.tsx).
// Cell contents and formats live in studioCampaignCells.tsx.
import type { ColumnDef } from "@tanstack/react-table";
import { ArrowRight } from "lucide-react";

import { Button } from "../ui/button";
import {
  CampaignNameCell,
  DesignCell,
  GameCell,
  StatusCell,
  formatPeriod,
  type Translate,
} from "./studioCampaignCells";
import {
  matchesStatusFilter,
  type StatusFilter,
  type StudioCampaignRow,
} from "./studioCampaignRows";

export function studioCampaignColumns({
  t,
  now,
  onOpen,
}: {
  t: Translate;
  now: Date;
  onOpen: (row: StudioCampaignRow) => void;
}): ColumnDef<StudioCampaignRow, unknown>[] {
  return [
    {
      id: "name",
      accessorKey: "name",
      header: t("playerStudio.columns.campaign", "Campaign"),
      sortingFn: "text",
      cell: ({ row }) => <CampaignNameCell row={row.original} />,
    },
    {
      id: "game",
      accessorKey: "gameType",
      header: t("playerStudio.columns.game", "Game"),
      enableSorting: false,
      filterFn: (row, _columnId, value) => row.original.gameType === value,
      cell: ({ row }) => <GameCell row={row.original} t={t} />,
    },
    {
      id: "status",
      accessorKey: "displayStatus",
      header: t("playerStudio.columns.status", "Status"),
      enableSorting: false,
      filterFn: (row, _columnId, value) =>
        matchesStatusFilter(row.original, value as StatusFilter),
      cell: ({ row }) => <StatusCell row={row.original} t={t} />,
    },
    {
      id: "period",
      accessorFn: (row) => Date.parse(row.startDate) || 0,
      header: t("playerStudio.columns.period", "Period"),
      sortingFn: "basic",
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {formatPeriod(row.original.startDate, row.original.endDate)}
        </span>
      ),
    },
    {
      id: "players",
      accessorKey: "players",
      header: t("playerStudio.columns.players", "Players"),
      sortingFn: "basic",
      meta: { className: "text-right" },
      cell: ({ row }) => (
        <span className="tabular-nums text-foreground">
          {row.original.players.toLocaleString("en-US")}
        </span>
      ),
    },
    {
      id: "design",
      // Never saved (default design) sorts below any saved one.
      accessorFn: (row) =>
        row.designSavedAt ? Date.parse(row.designSavedAt) : -1,
      header: t("playerStudio.columns.design", "Design"),
      sortingFn: "basic",
      cell: ({ row }) => <DesignCell row={row.original} now={now} t={t} />,
    },
    {
      id: "open",
      header: () => (
        <span className="sr-only">
          {t("playerStudio.columns.actions", "Actions")}
        </span>
      ),
      enableSorting: false,
      meta: { className: "w-px text-right" },
      cell: ({ row }) => (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onOpen(row.original)}
          aria-label={`${t("playerStudio.open", "Open")} ${row.original.name}`}
        >
          <span className="hidden @2xl:inline">
            {t("playerStudio.open", "Open")}
          </span>
          <ArrowRight aria-hidden />
        </Button>
      ),
    },
  ];
}
