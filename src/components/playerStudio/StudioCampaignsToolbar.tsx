// Search, status and game filters, and the campaign counter of the Player Studio page.
import { Search } from "lucide-react";

import type { Campaign } from "../../types";
import { cn } from "../../lib/utils";
import { Button } from "../ui/button";
import { Input } from "../ui/input";
import { gameLabel, type Translate } from "./studioCampaignCells";
import type { StatusFilter } from "./studioCampaignRows";

export type GameFilter = "all" | Campaign["gameType"];

const STATUS_FILTERS: { value: StatusFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "active", label: "Active" },
  { value: "paused", label: "Paused" },
  { value: "draft", label: "Draft" },
  { value: "ended", label: "Ended" },
];
const GAME_TYPES: Campaign["gameType"][] = [
  "lucky_wheel",
  "quiz",
  "scratch_card",
  "mystery_box",
  "hit_it",
];

export function StudioCampaignsToolbar({
  t,
  query,
  onQueryChange,
  status,
  onStatusChange,
  game,
  onGameChange,
  counter,
}: {
  t: Translate;
  query: string;
  onQueryChange: (query: string) => void;
  status: StatusFilter;
  onStatusChange: (status: StatusFilter) => void;
  game: GameFilter;
  onGameChange: (game: GameFilter) => void;
  counter: string;
}) {
  const searchLabel = t("playerStudio.search", "Search campaigns…");
  return (
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
          className="bg-background pl-9"
        />
      </div>
      <div
        role="group"
        aria-label={t("playerStudio.filterStatus", "Filter by status")}
        className="flex flex-wrap gap-1 rounded-lg border border-border bg-background p-1"
      >
        {STATUS_FILTERS.map((option) => (
          <Button
            key={option.value}
            size="sm"
            variant={status === option.value ? "secondary" : "ghost"}
            aria-pressed={status === option.value}
            onClick={() => onStatusChange(option.value)}
            className={cn(
              "h-7",
              status === option.value && "font-semibold text-foreground",
            )}
          >
            {t(`playerStudio.filter.${option.value}`, option.label)}
          </Button>
        ))}
      </div>
      <select
        value={game}
        onChange={(event) => onGameChange(event.target.value as GameFilter)}
        aria-label={t("playerStudio.filterGame", "Filter by game")}
        className="h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
      >
        <option value="all">{t("playerStudio.allGames", "All games")}</option>
        {GAME_TYPES.map((gameType) => (
          <option key={gameType} value={gameType}>
            {gameLabel(gameType, t)}
          </option>
        ))}
      </select>
      <p className="ml-auto text-xs text-muted-foreground" aria-live="polite">
        {counter}
      </p>
    </div>
  );
}
