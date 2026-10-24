// Players table of the analytics page: search and filter rules, and the rows written to
// the Excel export. Kept apart from the table so the page can export what the table shows.
import type {
  PlayerDevice,
  PlayerParticipantEntry,
} from "../../hooks/useAnalytics";
import { ALGERIA_WILAYAS, resolveWilayaCode } from "../../lib/algeriaWilayas";

export type ResultFilter = "all" | "winner" | "no_win";
export type DeviceFilter = "all" | PlayerDevice;
/** "all", "unknown" (no recognised wilaya) or a wilaya code, as a string. */
export type WilayaFilter = string;

export interface PlayerFilters {
  result: ResultFilter;
  /** Time spent in game, in seconds, both included; null: no bound. */
  minSeconds: number | null;
  maxSeconds: number | null;
  wilaya: WilayaFilter;
  device: DeviceFilter;
}

export const NO_PLAYER_FILTERS: PlayerFilters = {
  result: "all",
  minSeconds: null,
  maxSeconds: null,
  wilaya: "all",
  device: "all",
};

export const RESULT_FILTERS: { value: ResultFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "winner", label: "Win" },
  { value: "no_win", label: "Loss" },
];

export const DEVICE_LABELS: Record<PlayerDevice, string> = {
  android: "Android",
  ios: "iOS",
  desktop: "Desktop",
  other: "Other",
};

export const DEVICE_FILTERS: { value: DeviceFilter; label: string }[] = [
  { value: "all", label: "All" },
  ...(Object.keys(DEVICE_LABELS) as PlayerDevice[]).map((device) => ({
    value: device,
    label: DEVICE_LABELS[device],
  })),
];

const UNKNOWN_WILAYA = "unknown";

/** The player's wilaya code as a filter value, "unknown" when not recognised. */
export const wilayaKey = (player: PlayerParticipantEntry): WilayaFilter => {
  const code = resolveWilayaCode(player.wilaya);
  return code === null ? UNKNOWN_WILAYA : String(code);
};

/** "16 - Alger" for a recognised wilaya, else the raw label, else "Unknown". */
export const wilayaLabel = (player: PlayerParticipantEntry): string => {
  const code = resolveWilayaCode(player.wilaya);
  const wilaya =
    code === null ? undefined : ALGERIA_WILAYAS.find((w) => w.code === code);
  if (wilaya) return `${String(wilaya.code).padStart(2, "0")} - ${wilaya.name}`;
  return player.wilaya || "Unknown";
};

/** The wilayas present among the players, by code, then "Unknown" when some have none. */
export function wilayaOptions(
  players: PlayerParticipantEntry[],
): { value: WilayaFilter; label: string }[] {
  const byKey = new Map<WilayaFilter, string>();
  for (const player of players) {
    const key = wilayaKey(player);
    if (!byKey.has(key))
      byKey.set(key, key === UNKNOWN_WILAYA ? "Unknown" : wilayaLabel(player));
  }
  const known = [...byKey.entries()]
    .filter(([key]) => key !== UNKNOWN_WILAYA)
    .sort(([a], [b]) => Number(a) - Number(b))
    .map(([value, label]) => ({ value, label }));
  return [
    { value: "all", label: "All wilayas" },
    ...known,
    ...(byKey.has(UNKNOWN_WILAYA)
      ? [{ value: UNKNOWN_WILAYA, label: "Unknown" }]
      : []),
  ];
}

export const formatDwellTime = (seconds: number): string => {
  if (!seconds || seconds <= 0) return "0s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

export const playerName = (player: PlayerParticipantEntry) =>
  player.participant_name || "Anonymous Player";

export const matchesResultFilter = (
  player: PlayerParticipantEntry,
  filter: ResultFilter,
) => filter === "all" || player.is_winner === (filter === "winner");

export const matchesDwellRange = (
  player: PlayerParticipantEntry,
  minSeconds: number | null,
  maxSeconds: number | null,
) =>
  (minSeconds === null || player.dwell_time_seconds >= minSeconds) &&
  (maxSeconds === null || player.dwell_time_seconds <= maxSeconds);

export const matchesWilayaFilter = (
  player: PlayerParticipantEntry,
  filter: WilayaFilter,
) => filter === "all" || wilayaKey(player) === filter;

export const matchesDeviceFilter = (
  player: PlayerParticipantEntry,
  filter: DeviceFilter,
) => filter === "all" || player.os === filter;

export const matchesPlayerFilters = (
  player: PlayerParticipantEntry,
  filters: PlayerFilters,
) =>
  matchesResultFilter(player, filters.result) &&
  matchesDwellRange(player, filters.minSeconds, filters.maxSeconds) &&
  matchesWilayaFilter(player, filters.wilaya) &&
  matchesDeviceFilter(player, filters.device);

// Name, phone, campaign, prize or coupon code contains the query (case-insensitive).
export function matchesPlayerSearch(
  player: PlayerParticipantEntry,
  query: string,
) {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  return [
    playerName(player),
    player.phone_number,
    player.campaign_name,
    player.prize_name,
    player.redeemed_coupon_value,
  ].some((value) => value?.toLowerCase().includes(needle));
}

export function filterPlayers(
  players: PlayerParticipantEntry[],
  query: string,
  filters: PlayerFilters,
) {
  return players.filter(
    (player) =>
      matchesPlayerSearch(player, query) &&
      matchesPlayerFilters(player, filters),
  );
}

export const activePlayerFilterCount = (filters: PlayerFilters) =>
  Number(filters.result !== "all") +
  Number(filters.minSeconds !== null || filters.maxSeconds !== null) +
  Number(filters.wilaya !== "all") +
  Number(filters.device !== "all");

export function toPlayerExportRows(
  players: PlayerParticipantEntry[],
  withCampaign: boolean,
): Record<string, unknown>[] {
  return players.map((p) => ({
    "Participant Name": playerName(p),
    ...(withCampaign
      ? { Campaign: p.campaign_name || "Default Campaign" }
      : {}),
    "Phone Number": p.phone_number,
    "Game Outcome": p.is_winner ? "WINNER" : "NO WIN",
    "Prize Awarded": p.is_winner ? p.prize_name || "Winning Reward" : "None",
    "Time Spent in Game": formatDwellTime(p.dwell_time_seconds),
    "Dwell Time (seconds)": p.dwell_time_seconds,
    Wilaya: wilayaLabel(p),
    Device: DEVICE_LABELS[p.os],
    "Coupon Code": p.redeemed_coupon_value || "N/A",
    "Coupon Confirmed": p.coupon_confirmed ? "Yes" : "No",
    "Date Submitted": new Date(p.created_at).toLocaleString(),
  }));
}
