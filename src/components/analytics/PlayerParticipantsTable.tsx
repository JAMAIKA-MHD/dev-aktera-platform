// Players table of the analytics page (one campaign or all of them): search, a filter
// menu, sortable columns and numbered pagination, on top of the shared DataTable.
import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { ColumnDef, ColumnFiltersState } from "@tanstack/react-table";
import { ListFilter, Search, Trophy, Users } from "lucide-react";

import type { PlayerParticipantEntry } from "../../hooks/useAnalytics";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { DataTable } from "../ui/data-table";
import { Input } from "../ui/input";
import {
  activePlayerFilterCount,
  DEVICE_FILTERS,
  DEVICE_LABELS,
  formatDwellTime,
  matchesDeviceFilter,
  matchesDwellRange,
  matchesPlayerSearch,
  matchesResultFilter,
  matchesWilayaFilter,
  NO_PLAYER_FILTERS,
  playerName,
  RESULT_FILTERS,
  wilayaLabel,
  wilayaOptions,
  type DeviceFilter,
  type PlayerFilters,
  type ResultFilter,
  type WilayaFilter,
} from "./playerParticipantRows";

const PAGE_SIZE = 10;

function playerColumns(
  showCampaign: boolean,
): ColumnDef<PlayerParticipantEntry, unknown>[] {
  const columns: ColumnDef<PlayerParticipantEntry, unknown>[] = [
    {
      id: "name",
      accessorFn: playerName,
      header: "Participant Name",
      cell: ({ row }) => (
        <span className="font-bold text-brand-text">
          {playerName(row.original)}
        </span>
      ),
    },
    {
      id: "campaign",
      accessorFn: (player) => player.campaign_name || "Default Campaign",
      header: "Campaign",
      cell: ({ getValue }) => (
        <span className="text-blue-400">{String(getValue())}</span>
      ),
    },
    {
      id: "phone",
      accessorKey: "phone_number",
      header: "Phone Number",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.phone_number}
        </span>
      ),
    },
    {
      id: "result",
      accessorFn: (player) => (player.is_winner ? "winner" : "no_win"),
      header: "Result / Prize",
      enableSorting: false,
      filterFn: (row, _columnId, value) =>
        matchesResultFilter(row.original, value as ResultFilter),
      cell: ({ row }) =>
        row.original.is_winner ? (
          <span className="flex w-fit items-center gap-1 rounded-full border border-emerald-500/30 bg-emerald-500/20 px-2 py-0.5 text-[10px] font-bold text-emerald-400">
            <Trophy className="size-3" aria-hidden />
            {row.original.prize_name || "WINNER"}
          </span>
        ) : (
          <span className="w-fit rounded-full border border-brand-border/30 bg-white/5 px-2 py-0.5 text-[10px] font-bold text-muted-foreground">
            No Win
          </span>
        ),
    },
    {
      id: "dwell",
      accessorKey: "dwell_time_seconds",
      header: "Time Spent in Game",
      filterFn: (row, _columnId, value) => {
        const [min, max] = value as [number | null, number | null];
        return matchesDwellRange(row.original, min, max);
      },
      cell: ({ row }) => (
        <span className="font-medium text-orange-400">
          {formatDwellTime(row.original.dwell_time_seconds)}
        </span>
      ),
    },
    {
      id: "wilaya",
      accessorFn: wilayaLabel,
      header: "Wilaya",
      filterFn: (row, _columnId, value) =>
        matchesWilayaFilter(row.original, value as WilayaFilter),
      cell: ({ getValue }) => (
        <span className="text-muted-foreground" dir="auto">
          {String(getValue())}
        </span>
      ),
    },
    {
      id: "device",
      accessorFn: (player) => DEVICE_LABELS[player.os],
      header: "Device",
      filterFn: (row, _columnId, value) =>
        matchesDeviceFilter(row.original, value as DeviceFilter),
      cell: ({ getValue }) => (
        <span className="text-muted-foreground">{String(getValue())}</span>
      ),
    },
    {
      id: "coupon",
      accessorFn: (player) => player.redeemed_coupon_value ?? "",
      header: "Coupon Code",
      enableSorting: false,
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {row.original.redeemed_coupon_value || "—"}
        </span>
      ),
    },
    {
      id: "date",
      accessorKey: "created_at",
      header: "Date Submitted",
      meta: { className: "text-right" },
      cell: ({ row }) => (
        <span className="text-muted-foreground">
          {new Date(row.original.created_at).toLocaleDateString("en-US", {
            month: "short",
            day: "numeric",
            hour: "2-digit",
            minute: "2-digit",
          })}
        </span>
      ),
    },
  ];
  return showCampaign
    ? columns
    : columns.filter((column) => column.id !== "campaign");
}

function FilterGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="space-y-1.5">
      <p className={filterLabelClass}>{label}</p>
      <div className="flex flex-wrap gap-1">
        {options.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={value === option.value ? "secondary" : "ghost"}
            aria-pressed={value === option.value}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-7",
              value === option.value && "font-semibold text-foreground",
            )}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  );
}

/** "" -> null; anything else -> a whole number of seconds, never below 0. */
const toSeconds = (raw: string): number | null => {
  if (raw.trim() === "") return null;
  const value = Math.floor(Number(raw));
  return Number.isFinite(value) ? Math.max(0, value) : null;
};

const filterLabelClass =
  "text-[10px] font-bold uppercase tracking-wide text-muted-foreground";

function SecondsRange({
  min,
  max,
  onChange,
}: {
  min: number | null;
  max: number | null;
  onChange: (min: number | null, max: number | null) => void;
}) {
  const reversed = min !== null && max !== null && min > max;
  return (
    <div role="group" aria-label="Time spent in game" className="space-y-1.5">
      <p className={filterLabelClass}>Time spent (seconds)</p>
      <div className="flex items-center gap-2">
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={min ?? ""}
          onChange={(event) => onChange(toSeconds(event.target.value), max)}
          placeholder="Min"
          aria-label="Minimum seconds"
          className="h-8 border-border/50 bg-transparent shadow-none"
        />
        <span className="text-xs text-muted-foreground">to</span>
        <Input
          type="number"
          inputMode="numeric"
          min={0}
          step={1}
          value={max ?? ""}
          onChange={(event) => onChange(min, toSeconds(event.target.value))}
          placeholder="Max"
          aria-label="Maximum seconds"
          className="h-8 border-border/50 bg-transparent shadow-none"
        />
      </div>
      {reversed && (
        <p className="text-[11px] text-red-400">
          The minimum is above the maximum: no player can match.
        </p>
      )}
    </div>
  );
}

function PlayerFilterMenu({
  filters,
  onChange,
  wilayas,
}: {
  filters: PlayerFilters;
  onChange: (filters: PlayerFilters) => void;
  wilayas: { value: WilayaFilter; label: string }[];
}) {
  const [open, setOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const activeCount = activePlayerFilterCount(filters);

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) setOpen(false);
    };
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <div ref={containerRef} className="relative">
      <Button
        variant="outline"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => setOpen((current) => !current)}
        className="border-border/50 bg-transparent shadow-none"
      >
        <ListFilter aria-hidden />
        Filter
        {activeCount > 0 && (
          <span className="rounded-full bg-brand-accent/20 px-1.5 text-[10px] font-bold text-brand-accent">
            {activeCount}
          </span>
        )}
      </Button>
      {open && (
        <div
          role="dialog"
          aria-label="Filter players"
          className="absolute left-0 top-full z-20 mt-2 w-72 max-w-[calc(100vw-2rem)] space-y-3 rounded-lg border border-border bg-card-bg p-3 shadow-lg"
        >
          <FilterGroup
            label="Result"
            options={RESULT_FILTERS}
            value={filters.result}
            onChange={(result) => onChange({ ...filters, result })}
          />
          <SecondsRange
            min={filters.minSeconds}
            max={filters.maxSeconds}
            onChange={(minSeconds, maxSeconds) =>
              onChange({ ...filters, minSeconds, maxSeconds })
            }
          />
          <div className="space-y-1.5">
            <label htmlFor="player-wilaya-filter" className={filterLabelClass}>
              Wilaya
            </label>
            <select
              id="player-wilaya-filter"
              value={filters.wilaya}
              onChange={(event) =>
                onChange({ ...filters, wilaya: event.target.value })
              }
              className="h-8 w-full cursor-pointer rounded-md border border-border/50 bg-card-bg px-2 text-xs text-foreground outline-none focus-visible:ring-1"
            >
              {wilayas.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          <FilterGroup
            label="Device"
            options={DEVICE_FILTERS}
            value={filters.device}
            onChange={(device) => onChange({ ...filters, device })}
          />
          <Button
            variant="ghost"
            size="sm"
            disabled={activeCount === 0}
            onClick={() => onChange(NO_PLAYER_FILTERS)}
            className="w-full"
          >
            Clear filters
          </Button>
        </div>
      )}
    </div>
  );
}

function StateMessage({ children }: { children: ReactNode }) {
  return (
    <div className="flex flex-col items-center gap-3 px-6 py-12 text-center">
      {children}
    </div>
  );
}

export interface PlayerParticipantsTableProps {
  players: PlayerParticipantEntry[];
  /** Number of players left after the search and the filters. */
  shownCount: number;
  /** All campaigns together: each row also names its campaign. */
  showCampaign: boolean;
  query: string;
  onQueryChange: (query: string) => void;
  filters: PlayerFilters;
  onFiltersChange: (filters: PlayerFilters) => void;
}

export function PlayerParticipantsTable({
  players,
  shownCount,
  showCampaign,
  query,
  onQueryChange,
  filters,
  onFiltersChange,
}: PlayerParticipantsTableProps) {
  const columns = useMemo(() => playerColumns(showCampaign), [showCampaign]);
  const wilayas = useMemo(() => wilayaOptions(players), [players]);
  const columnFilters = useMemo<ColumnFiltersState>(
    () => [
      ...(filters.result === "all"
        ? []
        : [{ id: "result", value: filters.result }]),
      ...(filters.minSeconds === null && filters.maxSeconds === null
        ? []
        : [{ id: "dwell", value: [filters.minSeconds, filters.maxSeconds] }]),
      ...(filters.wilaya === "all"
        ? []
        : [{ id: "wilaya", value: filters.wilaya }]),
      ...(filters.device === "all"
        ? []
        : [{ id: "device", value: filters.device }]),
    ],
    [filters],
  );
  const filtering = query.trim() !== "" || activePlayerFilterCount(filters) > 0;
  const searchLabel = "Search players…";

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative w-full sm:w-72">
          <Search
            className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground"
            aria-hidden
          />
          <Input
            type="search"
            value={query}
            onChange={(event) => onQueryChange(event.target.value)}
            placeholder={searchLabel}
            aria-label={searchLabel}
            className="border-border/50 bg-transparent pl-9 shadow-none focus-visible:ring-1"
          />
        </div>
        <PlayerFilterMenu
          filters={filters}
          onChange={onFiltersChange}
          wilayas={wilayas}
        />
        <p className="ml-auto text-xs text-muted-foreground" aria-live="polite">
          {filtering
            ? `${shownCount} of ${players.length} players`
            : `${players.length} ${players.length === 1 ? "player" : "players"}`}
        </p>
      </div>
      <DataTable<PlayerParticipantEntry>
        columns={columns}
        data={players}
        ariaLabel="Player participants"
        getRowId={(player) => player.id}
        globalFilter={query}
        globalFilterFn={(row, _columnId, value) =>
          matchesPlayerSearch(row.original, String(value))
        }
        columnFilters={columnFilters}
        pageSize={PAGE_SIZE}
        pageNumbers
        hiddenColumnsBelow={{
          coupon: "md",
          wilaya: "sm",
          device: "sm",
        }}
        emptyState={
          <StateMessage>
            <Users className="size-8 text-muted-foreground/50" aria-hidden />
            <p className="text-sm font-semibold text-muted-foreground">
              No player participations recorded in database yet for this
              selection.
            </p>
          </StateMessage>
        }
        noResultsState={
          <StateMessage>
            <p className="text-sm font-semibold text-foreground">
              No player matches your search or filters
            </p>
            <Button
              variant="outline"
              onClick={() => {
                onQueryChange("");
                onFiltersChange(NO_PLAYER_FILTERS);
              }}
            >
              Clear filters
            </Button>
          </StateMessage>
        }
      />
    </div>
  );
}
