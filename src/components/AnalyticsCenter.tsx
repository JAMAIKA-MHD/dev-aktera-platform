import React, { useMemo, useState } from "react";
import { useAnalytics } from "../hooks/useAnalytics";
import { useAuth } from "../contexts/AuthContext";
import { useTheme } from "../contexts/ThemeContext";
import { exportToExcel } from "../lib/exportUtils";
import { useCampaignReport } from "../hooks/useCampaignReport";
import { CampaignAnalyticsDashboard } from "./analytics/CampaignAnalyticsDashboard";
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
        {isAllCampaigns && (
          <button className="glass-panel px-2.5 py-1 rounded-xl text-[11px] flex items-center gap-1.5 text-brand-textMuted hover:text-brand-text transition-colors shadow-sm cursor-pointer border-transparent">
            All Time <i className="fa-solid fa-chevron-down text-[9px]"></i>
          </button>
        )}
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
        <div className="grid grid-cols-12 gap-4 mb-4 relative">
          {/* Left Column: KPIs & Win Rate */}
          <div className="col-span-12 xl:col-span-8 flex flex-col gap-4">
            {/* KPI Cards */}
            <div className="grid grid-cols-3 gap-4">
              {/* Impressions */}
              <div className="glass-panel rounded-xl p-3 flex flex-col justify-between relative overflow-hidden h-28 group hover:bg-white/5 transition-all cursor-default">
                <div className="absolute -right-5 -top-5 w-20 h-20 bg-emerald-500/10 rounded-full blur-xl group-hover:bg-emerald-500/20 transition-all"></div>
                <div className="relative z-10">
                  <h3 className="text-[8px] uppercase font-semibold text-brand-textMuted tracking-wider">
                    <span className="material-symbols-outlined text-xs mr-1 align-middle text-brand-text/50">
                      visibility
                    </span>
                    TOTAL IMPRESSIONS
                  </h3>
                  <div className="text-2xl font-bold text-brand-text mt-0.5">
                    {analytics?.total_impressions.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-brand-textMuted mt-0.5">
                    Unique views
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-12 z-0">
                  <svg
                    className="w-full h-full preserve-3d"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 30"
                  >
                    <defs>
                      <linearGradient
                        id="grad-green"
                        x1="0%"
                        x2="0%"
                        y1="0%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgba(74, 222, 128, 0.4)"
                        ></stop>
                        <stop
                          offset="100%"
                          stopColor="rgba(74, 222, 128, 0)"
                        ></stop>
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,30 L0,25 C10,25 15,10 25,10 C35,10 40,20 50,20 C60,20 65,5 75,5 C85,5 90,15 100,15 L100,30 Z"
                      fill="url(#grad-green)"
                    ></path>
                    <path
                      className="sparkline sparkline-glow"
                      d="M0,25 C10,25 15,10 25,10 C35,10 40,20 50,20 C60,20 65,5 75,5 C85,5 90,15 100,15"
                      stroke="#4ade80"
                    ></path>
                  </svg>
                </div>
              </div>
              {/* Entries */}
              <div className="glass-panel rounded-xl p-3 flex flex-col justify-between relative overflow-hidden h-28 group hover:bg-white/5 transition-all cursor-default">
                <div className="absolute -right-5 -top-5 w-20 h-20 bg-blue-500/10 rounded-full blur-xl group-hover:bg-blue-500/20 transition-all"></div>
                <div className="relative z-10">
                  <h3 className="text-[8px] uppercase font-semibold text-brand-textMuted tracking-wider">
                    <span className="material-symbols-outlined text-xs mr-1 align-middle text-brand-text/50">
                      receipt_long
                    </span>
                    TOTAL ENTRIES
                  </h3>
                  <div className="text-2xl font-bold text-brand-text mt-0.5">
                    {analytics?.total_entries.toLocaleString()}
                  </div>
                  <div className="text-[10px] text-brand-textMuted mt-0.5">
                    Captured form
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-12 z-0">
                  <svg
                    className="w-full h-full preserve-3d"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 30"
                  >
                    <defs>
                      <linearGradient
                        id="grad-blue"
                        x1="0%"
                        x2="0%"
                        y1="0%"
                        y2="100%"
                      >
                        <stop
                          offset="0%"
                          stopColor="rgba(56, 189, 248, 0.4)"
                        ></stop>
                        <stop
                          offset="100%"
                          stopColor="rgba(56, 189, 248, 0)"
                        ></stop>
                      </linearGradient>
                    </defs>
                    <path
                      d="M0,30 L0,20 C15,20 20,25 30,25 C40,25 50,10 60,10 C70,10 80,18 90,18 C95,18 98,12 100,12 L100,30 Z"
                      fill="url(#grad-blue)"
                    ></path>
                    <path
                      className="sparkline sparkline-blue-glow"
                      d="M0,20 C15,20 20,25 30,25 C40,25 50,10 60,10 C70,10 80,18 90,18 C95,18 98,12 100,12"
                      stroke="#38bdf8"
                    ></path>
                  </svg>
                </div>
              </div>
              {/* Conversion */}
              <div className="glass-panel rounded-xl p-3 flex flex-col justify-between relative overflow-hidden h-28 group hover:bg-white/5 transition-all cursor-default">
                <div className="absolute -right-5 -top-5 w-20 h-20 bg-white/5 rounded-full blur-xl group-hover:bg-white/10 transition-all"></div>
                <div className="relative z-10">
                  <h3 className="text-[8px] uppercase font-semibold text-brand-textMuted tracking-wider">
                    <span className="material-symbols-outlined text-xs mr-1 align-middle text-brand-text/50">
                      trending_up
                    </span>
                    Conversion Rate
                  </h3>
                  <div className="text-2xl font-bold text-brand-text mt-0.5">
                    {(analytics?.form_completion_rate || 0).toFixed(1)}%
                  </div>
                  <div className="text-[10px] text-brand-textMuted mt-0.5">
                    Plays / Impa
                  </div>
                </div>
                <div className="absolute bottom-0 left-0 w-full h-12 z-0">
                  <svg
                    className="w-full h-full preserve-3d"
                    preserveAspectRatio="none"
                    viewBox="0 0 100 30"
                  >
                    <path
                      d="M0,30 L0,15 C10,15 20,5 30,5 C40,5 45,20 55,20 C65,20 75,8 85,8 C90,8 95,15 100,15 L100,30 Z"
                      fill="url(#grad-blue)"
                    ></path>
                    <path
                      className="sparkline"
                      d="M0,15 C10,15 20,5 30,5 C40,5 45,20 55,20 C65,20 75,8 85,8 C90,8 95,15 100,15"
                      stroke="rgba(255,255,255,0.3)"
                    ></path>
                  </svg>
                </div>
              </div>
            </div>
            {/* Win Rate Chart */}
            <div className="glass-panel rounded-xl p-4 flex-1 relative min-h-[180px]">
              <div className="flex justify-between items-start mb-3">
                <h2 className="text-base font-semibold text-brand-text">
                  Win Rate %
                </h2>
              </div>
              <div className="absolute inset-0 pt-16 pb-6 px-6 flex items-end">
                <div className="w-full h-full flex flex-col justify-between relative">
                  <div className="border-b border-brand-border/30 w-full flex items-end text-[10px] text-brand-textMuted">
                    <span className="absolute -left-6">100%</span>
                  </div>
                  <div className="border-b border-brand-border/30 w-full flex items-end text-[10px] text-brand-textMuted">
                    <span className="absolute -left-6">80%</span>
                  </div>
                  <div className="border-b border-brand-border/30 w-full flex items-end text-[10px] text-brand-textMuted">
                    <span className="absolute -left-6">60%</span>
                  </div>
                  <div className="border-b border-brand-border/30 w-full flex items-end text-[10px] text-brand-textMuted">
                    <span className="absolute -left-6">40%</span>
                  </div>
                  <div className="border-b border-brand-border/30 w-full flex items-end text-[10px] text-brand-textMuted">
                    <span className="absolute -left-6">20%</span>
                  </div>
                  <div className="border-b border-brand-border/30 w-full flex items-end text-[10px] text-brand-textMuted">
                    <span className="absolute -left-6">0%</span>
                  </div>

                  <div className="absolute inset-0 top-0 bottom-0 left-0 right-0 flex justify-between items-end px-2 pt-2">
                    {[
                      { day: "Sun", v1: 45, v2: 55 },
                      { day: "Mon", v1: 50, v2: 50 },
                      { day: "Tue", v1: 50, v2: 50 },
                      { day: "Wed", v1: 45, v2: 55 },
                      { day: "Thu", v1: 55, v2: 45 },
                      { day: "Fri", v1: 50, v2: 50 },
                      { day: "Sat", v1: 50, v2: 50 },
                      { day: "Sun", v1: 50, v2: 50 },
                    ].map((d, i) => (
                      <div
                        key={i}
                        className="w-8 flex flex-col justify-end gap-0.5 relative"
                        style={{ height: Math.random() * 40 + 50 + "%" }}
                      >
                        <div
                          className="w-full bg-blue-500 rounded-t-sm"
                          style={{ height: d.v1 + "%" }}
                        ></div>
                        <div
                          className="w-full bg-blue-600 rounded-b-sm"
                          style={{ height: d.v2 + "%" }}
                        ></div>
                        <span className="absolute -bottom-5 left-1/2 -translate-x-1/2 text-[10px] text-brand-textMuted">
                          {d.day}
                        </span>
                      </div>
                    ))}
                  </div>

                  <div className="absolute inset-0 top-0 bottom-0 left-0 right-0 px-6 pt-2 pointer-events-none">
                    <svg
                      className="w-full h-full preserve-3d"
                      preserveAspectRatio="none"
                      viewBox="0 0 100 100"
                    >
                      <path
                        className="drop-shadow-[0_2px_4px_rgba(168,85,247,0.4)]"
                        d="M4,25 L17,20 L31,55 L44,40 L58,35 L71,45 L85,25 L98,60"
                        fill="none"
                        stroke="#a855f7"
                        strokeWidth="2"
                      ></path>
                      <circle cx="4" cy="25" fill="#a855f7" r="1.5"></circle>
                      <circle cx="17" cy="20" fill="#a855f7" r="1.5"></circle>
                      <circle cx="31" cy="55" fill="#a855f7" r="1.5"></circle>
                      <circle cx="44" cy="40" fill="#a855f7" r="1.5"></circle>
                      <circle cx="58" cy="35" fill="#a855f7" r="1.5"></circle>
                      <circle cx="71" cy="45" fill="#a855f7" r="1.5"></circle>
                      <circle cx="85" cy="25" fill="#a855f7" r="1.5"></circle>
                      <circle cx="98" cy="60" fill="#a855f7" r="1.5"></circle>
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column: Line Percentage */}
          <div className="col-span-12 xl:col-span-4 glass-panel rounded-2xl p-5 flex flex-col relative overflow-hidden pl-32 xl:pl-5">
            <div>
              <h2 className="text-lg font-semibold text-brand-text">
                Line Percentage
              </h2>
              <p className="text-xs text-brand-textMuted">
                User Engagement Goal Progress
              </p>
            </div>
            <div className="flex-1 relative mt-6 mb-4 min-h-[180px]">
              <div className="absolute inset-0 flex flex-col justify-between">
                <div className="border-b border-brand-border/30 w-full flex items-end text-[10px] text-brand-textMuted h-0">
                  <span className="absolute -left-6 bottom-[-6px]">100%</span>
                </div>
                <div className="border-b border-brand-border/30 w-full flex items-end text-[10px] text-brand-textMuted h-0">
                  <span className="absolute -left-6 bottom-[-6px]">75%</span>
                </div>
                <div className="border-b border-brand-border/30 w-full flex items-end text-[10px] text-brand-textMuted h-0">
                  <span className="absolute -left-6 bottom-[-6px]">50%</span>
                </div>
                <div className="border-b border-brand-border/30 w-full flex items-end text-[10px] text-brand-textMuted h-0">
                  <span className="absolute -left-6 bottom-[-6px]">25%</span>
                </div>
                <div className="border-b border-brand-border/30 w-full flex items-end text-[10px] text-brand-textMuted h-0">
                  <span className="absolute -left-6 bottom-[-6px]">0%</span>
                </div>
              </div>
              <div className="absolute inset-0 px-2">
                <svg
                  className="w-full h-full preserve-3d"
                  preserveAspectRatio="none"
                  viewBox="0 0 100 100"
                >
                  <path
                    className="drop-shadow-[0_0_8px_rgba(103,232,249,0.6)]"
                    d="M0,80 L15,65 L30,55 L45,30 L60,35 L75,20 L90,10"
                    fill="none"
                    stroke="#67e8f9"
                    strokeWidth="1.5"
                  ></path>
                  <circle
                    cx="0"
                    cy="80"
                    fill="#0b0e14"
                    r="1.5"
                    stroke="#67e8f9"
                    strokeWidth="1"
                  ></circle>
                  <circle
                    cx="15"
                    cy="65"
                    fill="#0b0e14"
                    r="1.5"
                    stroke="#67e8f9"
                    strokeWidth="1"
                  ></circle>
                  <circle
                    cx="30"
                    cy="55"
                    fill="#0b0e14"
                    r="1.5"
                    stroke="#67e8f9"
                    strokeWidth="1"
                  ></circle>
                  <circle
                    cx="45"
                    cy="30"
                    fill="#0b0e14"
                    r="1.5"
                    stroke="#67e8f9"
                    strokeWidth="1"
                  ></circle>
                  <circle
                    cx="60"
                    cy="35"
                    fill="#0b0e14"
                    r="1.5"
                    stroke="#67e8f9"
                    strokeWidth="1"
                  ></circle>
                  <circle
                    cx="75"
                    cy="20"
                    fill="#0b0e14"
                    r="1.5"
                    stroke="#67e8f9"
                    strokeWidth="1"
                  ></circle>
                  <circle
                    className="drop-shadow-[0_0_5px_rgba(103,232,249,1)]"
                    cx="90"
                    cy="10"
                    fill="#67e8f9"
                    r="2"
                  ></circle>
                </svg>
              </div>
              <div className="absolute bottom-[-20px] left-0 right-0 flex justify-between px-2 text-[10px] text-brand-textMuted">
                <span>Mon</span>
                <span>Tue</span>
                <span>Wed</span>
                <span>Thu</span>
                <span>Fri</span>
                <span>Sat</span>
                <span>Sun</span>
              </div>
            </div>
            <div className="grid grid-cols-3 gap-2 mt-4 pt-3 border-t border-brand-border/30">
              <div>
                <div className="text-xl font-bold text-brand-text">
                  {Math.round(analytics?.form_completion_rate || 78)}%
                </div>
                <div className="text-[8px] font-semibold text-brand-textMuted uppercase tracking-wider mt-0.5">
                  CURRENT
                </div>
              </div>
              <div className="text-center">
                <div className="text-xl font-bold text-brand-text">65%</div>
                <div className="text-[8px] text-brand-textMuted uppercase">
                  Previous
                </div>
              </div>
              <div>
                <div className="text-xl font-bold text-emerald-400">+13%</div>
                <div className="text-[8px] text-brand-textMuted uppercase">
                  Growth
                </div>
              </div>
            </div>
          </div>
        </div>
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
