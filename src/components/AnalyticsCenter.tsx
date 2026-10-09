import React, { useMemo, useState } from "react";
import { useAnalytics } from "../hooks/useAnalytics";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { exportToExcel } from "../lib/exportUtils";
import { useCampaignReport } from "../hooks/useCampaignReport";
import { CampaignAnalyticsDashboard } from "./analytics/CampaignAnalyticsDashboard";
import { ProgramAnalyticsDashboard } from "./analytics/ProgramAnalyticsDashboard";
import { PlayerParticipantsTable } from "./analytics/PlayerParticipantsTable";
import {
  filterPlayers,
  NO_PLAYER_FILTERS,
  toPlayerExportRows,
  type PlayerFilters,
} from "./analytics/playerParticipantRows";

interface AnalyticsCenterProps {
  initialCampaignId?: string | null;
}

export const AnalyticsCenter: React.FC<AnalyticsCenterProps> = ({
  initialCampaignId,
}) => {
  const { organization: _organization } = useAuth();
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const [selectedCampId, setSelectedCampId] = useState<string>(
    initialCampaignId ?? "all",
  );
  const [tableViewMode, setTableViewMode] = useState<
    "participants" | "summary"
  >("participants");

  React.useEffect(() => {
    if (initialCampaignId) {
      setSelectedCampId(initialCampaignId);
    }
  }, [initialCampaignId]);

  // Pass selectedCampId into useAnalytics hook to trigger instant dynamic filtering
  const { analytics, loading, error } = useAnalytics(selectedCampId);
  const isAllCampaigns = selectedCampId === "all";
  // The campaign breakdown only exists for the combined view.
  const tableMode = isAllCampaigns ? tableViewMode : "participants";
  const [playerQuery, setPlayerQuery] = useState("");
  const [playerFilters, setPlayerFilters] =
    useState<PlayerFilters>(NO_PLAYER_FILTERS);
  const players = useMemo(() => analytics?.participants ?? [], [analytics]);
  const shownPlayers = useMemo(
    () => filterPlayers(players, playerQuery, playerFilters),
    [players, playerQuery, playerFilters],
  );
  const {
    generateReport,
    generating: generatingReport,
    error: reportError,
  } = useCampaignReport();
  // Reports are generated per campaign; the combined view has no report yet.
  const canGenerateReport = selectedCampId !== "all";

  const selectedCampaign = useMemo(
    () =>
      (analytics?.by_campaign ?? []).find(
        (campaign) => campaign.campaign_id === selectedCampId,
      ) ?? null,
    [analytics, selectedCampId],
  );

  // Exports the table currently on screen: every row behind the pagination, with the
  // search and the filters applied.
  const exportTable = useMemo(() => {
    const today = new Date().toISOString().split("T")[0];
    if (tableMode === "summary") {
      return {
        rows: (analytics?.by_campaign ?? []).map((row) => ({
          Campaign: row.campaign_name,
          Status: row.status,
          Entries: row.total_entries,
          Winners: row.total_winners,
          "Win Rate (%)": row.win_rate,
          "Quiz Pass (%)": row.quiz_pass_rate,
          "Coupon Claim (%)": row.coupon_confirmation_rate,
        })) as Record<string, unknown>[],
        filename: `octoreach_campaign_breakdown_${today}`,
        sheetName: "Campaign Breakdown",
      };
    }
    const scope = isAllCampaigns
      ? "all_campaigns"
      : (selectedCampaign?.campaign_name ?? selectedCampId).replace(
          /\s+/g,
          "_",
        );
    return {
      rows: toPlayerExportRows(shownPlayers, isAllCampaigns),
      filename: `octoreach_players_${scope}_${today}`,
      sheetName: "Players",
    };
  }, [
    analytics,
    tableMode,
    isAllCampaigns,
    selectedCampaign,
    selectedCampId,
    shownPlayers,
  ]);

  const handleExportData = () => {
    exportToExcel(
      exportTable.rows,
      exportTable.filename,
      exportTable.sheetName,
    );
  };

  const selectCampaign = (campaignId: string) => {
    setSelectedCampId(campaignId);
    setPlayerQuery("");
    setPlayerFilters(NO_PLAYER_FILTERS);
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-accent border-t-transparent" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="glass-panel rounded-2xl p-4 text-red-400 font-medium">
        {error || "Analytics unavailable right now."}
      </div>
    );
  }

  return (
    <div id="analytics-center-root" className="space-y-5 text-brand-text">
      {/* Page Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-3 mb-5">
        <h1 className="text-xl font-bold text-brand-text tracking-tight">
          Advanced Statistics
        </h1>
      </div>

      <div className="flex justify-between items-center mb-5">
        <div className="relative">
          <select
            value={selectedCampId}
            onChange={(e) => selectCampaign(e.target.value)}
            className="glass-panel px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 text-brand-text hover:bg-card-bg-subtle outline-none appearance-none cursor-pointer pr-8"
          >
            <option value="all">All Campaigns Combined</option>
            {analytics?.by_campaign.map((c) => (
              <option key={c.campaign_id} value={c.campaign_id}>
                {c.campaign_name || "Unnamed Campaign"}
              </option>
            ))}
          </select>
          <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-brand-textMuted">
            <span className="material-symbols-outlined text-[14px]">
              expand_more
            </span>
          </div>
        </div>

        <div className="flex items-center gap-2.5">
          <button
            className="glass-panel px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 text-brand-text hover:bg-card-bg-subtle cursor-pointer transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            onClick={handleExportData}
            disabled={exportTable.rows.length === 0}
            title={
              exportTable.rows.length === 0
                ? "The table has no rows to export"
                : "Download the table below as an Excel file"
            }
          >
            <i className="fa-solid fa-download text-brand-textMuted"></i> Export
            Data
          </button>
          <button
            className={`px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 font-bold transition-all cursor-pointer border shadow-sm disabled:opacity-50 disabled:cursor-not-allowed ${
              isDark
                ? "bg-black text-white border-slate-700 hover:bg-black/80"
                : "bg-white text-slate-800 border-slate-200 hover:bg-slate-50"
            }`}
            onClick={() => void generateReport(selectedCampId)}
            disabled={!canGenerateReport || generatingReport}
            title={
              canGenerateReport
                ? "Download the full analytics report for this campaign"
                : "Select a campaign to generate its report"
            }
          >
            <i className="fa-regular fa-file-lines text-xs"></i>{" "}
            {generatingReport ? "Generating…" : "Report"}
          </button>
        </div>
      </div>

      {reportError && (
        <div className="glass-panel rounded-xl px-3 py-2 mb-5 text-xs text-red-400 font-medium">
          {reportError}
        </div>
      )}

      {selectedCampId !== "all" ? (
        <div className="mb-4">
          <CampaignAnalyticsDashboard campaignId={selectedCampId} />
        </div>
      ) : (
        <ProgramAnalyticsDashboard
          onSelectCampaign={(campaignId) => {
            selectCampaign(campaignId);
            setTableViewMode("participants");
          }}
        />
      )}

      {/* DYNAMIC PERFORMANCE TABLE: Switches based on Toggle Mode or Dropdown Selection */}
      <div className="glass-panel rounded-xl p-4 mb-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-5">
          <div>
            <h2 className="text-base font-semibold text-brand-text">
              {tableMode === "participants"
                ? "Player Participants & Gameplay times"
                : "Campaign Performance Breakdown"}
            </h2>
            <p className="text-[11px] text-brand-textMuted">
              {tableMode === "participants"
                ? "Real-time client player entries, game dwell times, and prize outcomes."
                : "Aggregated campaign metrics across all active campaigns."}
            </p>
          </div>

          {isAllCampaigns && (
            <div className="flex items-center glass-panel p-0.5 rounded-xl text-[11px] flex-shrink-0">
              <button
                onClick={() => setTableViewMode("participants")}
                className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full cursor-pointer transition-colors ${
                  tableMode === "participants"
                    ? "bg-brand-accent/20 text-brand-accent shadow-sm"
                    : "text-brand-textMuted hover:text-brand-text"
                }`}
              >
                Participants ({players.length})
              </button>
              <button
                onClick={() => setTableViewMode("summary")}
                className={`px-2.5 py-0.5 text-[11px] font-semibold rounded-full cursor-pointer transition-colors ${
                  tableMode === "summary"
                    ? "bg-brand-accent/20 text-brand-accent shadow-sm"
                    : "text-brand-textMuted hover:text-brand-text"
                }`}
              >
                Breakdown ({analytics?.by_campaign?.length ?? 0})
              </button>
            </div>
          )}
        </div>

        {tableMode === "summary" ? (
          /* MODE A: All Campaigns Summary Breakdown Table */
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="text-brand-textMuted border-b border-brand-border/50">
                  <th className="pb-3 px-4 font-medium uppercase text-[10px] tracking-wider">
                    Campaign
                  </th>
                  <th className="pb-3 px-4 text-center font-medium uppercase text-[10px] tracking-wider">
                    Status
                  </th>
                  <th className="pb-3 px-4 text-center font-medium uppercase text-[10px] tracking-wider">
                    Entries
                  </th>
                  <th className="pb-3 px-4 text-center font-medium uppercase text-[10px] tracking-wider">
                    Winners
                  </th>
                  <th className="pb-3 px-4 text-center font-medium uppercase text-[10px] tracking-wider">
                    Win Rate
                  </th>
                  <th className="pb-3 px-4 text-center font-medium uppercase text-[10px] tracking-wider">
                    Quiz Pass %
                  </th>
                  <th className="pb-3 px-4 text-right font-medium uppercase text-[10px] tracking-wider">
                    Coupon Claim %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-border/30">
                {(analytics?.by_campaign ?? []).map((row) => (
                  <tr
                    key={row.campaign_id}
                    className="hover:bg-white/5 transition-colors cursor-pointer group"
                    onClick={() => {
                      selectCampaign(row.campaign_id);
                      setTableViewMode("participants");
                    }}
                  >
                    <td className="py-4 px-4 font-bold text-brand-text">
                      {row.campaign_name}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`px-2 py-0.5 rounded-full text-[9px] font-bold uppercase border ${
                          row.status === "active"
                            ? "bg-emerald-500/20 text-emerald-400 border-emerald-500/30"
                            : "bg-white/5 text-brand-textMuted border-brand-border/30"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center text-brand-textMuted">
                      {row.total_entries}
                    </td>
                    <td className="py-4 px-4 text-center text-emerald-400 font-bold">
                      {row.total_winners}
                    </td>
                    <td className="py-4 px-4 text-center text-brand-textMuted">
                      {row.win_rate}%
                    </td>
                    <td className="py-4 px-4 text-center text-brand-textMuted">
                      {row.quiz_pass_rate}%
                    </td>
                    <td className="py-4 px-4 text-right text-blue-400 font-bold">
                      {row.coupon_confirmation_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* MODE B: Specific or All Campaign Player Participants Table */
          <PlayerParticipantsTable
            players={players}
            shownCount={shownPlayers.length}
            showCampaign={isAllCampaigns}
            query={playerQuery}
            onQueryChange={setPlayerQuery}
            filters={playerFilters}
            onFiltersChange={setPlayerFilters}
          />
        )}
      </div>
    </div>
  );
};
