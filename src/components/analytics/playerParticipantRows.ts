// Players table of the analytics page: search and filter rules, and the rows written to
// the Excel export. Kept apart from the table so the page can export what the table shows.
import type { PlayerParticipantEntry } from "../../hooks/useAnalytics";

export type ResultFilter = "all" | "winner" | "no_win";
export type QuizFilter = "all" | "passed" | "failed" | "none";

export interface PlayerFilters {
  result: ResultFilter;
  quiz: QuizFilter;
}

export const NO_PLAYER_FILTERS: PlayerFilters = { result: "all", quiz: "all" };

export const RESULT_FILTERS: { value: ResultFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "winner", label: "Winners" },
  { value: "no_win", label: "No win" },
];

export const QUIZ_FILTERS: { value: QuizFilter; label: string }[] = [
  { value: "all", label: "All" },
  { value: "passed", label: "Passed" },
  { value: "failed", label: "Failed" },
  { value: "none", label: "N/A" },
];

export const formatDwellTime = (seconds: number): string => {
  if (!seconds || seconds <= 0) return "0s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

export const playerName = (player: PlayerParticipantEntry) =>
  player.participant_name || "Anonymous Player";

export const quizStatus = (player: PlayerParticipantEntry): QuizFilter =>
  player.quiz_passed === true
    ? "passed"
    : player.quiz_passed === false
      ? "failed"
      : "none";

export const matchesResultFilter = (
  player: PlayerParticipantEntry,
  filter: ResultFilter,
) => filter === "all" || player.is_winner === (filter === "winner");

export const matchesQuizFilter = (
  player: PlayerParticipantEntry,
  filter: QuizFilter,
) => filter === "all" || quizStatus(player) === filter;

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
      matchesResultFilter(player, filters.result) &&
      matchesQuizFilter(player, filters.quiz),
  );
}

export const activePlayerFilterCount = (filters: PlayerFilters) =>
  Number(filters.result !== "all") + Number(filters.quiz !== "all");

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
    "Quiz Status":
      p.quiz_passed === true
        ? "Passed"
        : p.quiz_passed === false
          ? "Failed"
          : "N/A",
    "Coupon Code": p.redeemed_coupon_value || "N/A",
    "Coupon Confirmed": p.coupon_confirmed ? "Yes" : "No",
    "Date Submitted": new Date(p.created_at).toLocaleString(),
  }));
}
