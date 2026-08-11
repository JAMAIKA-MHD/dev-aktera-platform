import React, { useState, useRef } from "react";
import { useAnalytics } from "../hooks/useAnalytics";
import { useAuth } from "../contexts/AuthContext";
import { exportToExcel, exportToCSV } from "../lib/exportUtils";
import { importParticipantEntries } from "../services/analyticsService";
import { toFriendlyErrorMessage } from "../lib/errorMessages";
import {
  Users,
  Eye,
  Trophy,
  Upload,
  Download,
  FileSpreadsheet,
  CheckCircle2,
  Clock,
  Sparkles,
  TrendingUp,
  HelpCircle,
  Repeat,
  AlertTriangle,
  Check,
  Search,
  Filter,
} from "lucide-react";
import {
  PercentageCircle,
  ParticipationHistogram,
  CarrierBreakdownChart,
  OSDistributionChart,
  PrizeBurnRateList,
} from "./analytics/AnalyticsGraphics";

interface AnalyticsCenterProps {
  initialCampaignId?: string | null;
}

function formatDwellTime(seconds: number): string {
  if (!seconds || seconds <= 0) return "0s";
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  if (mins === 0) return `${secs}s`;
  return `${mins}m ${secs}s`;
}

export const AnalyticsCenter: React.FC<AnalyticsCenterProps> = ({
  initialCampaignId,
}) => {
  const { organization } = useAuth();
  const [selectedCampId, setSelectedCampId] = useState<string>(
    initialCampaignId ?? "all",
  );
  const [exportFormat, setExportFormat] = useState<"xlsx" | "csv">("xlsx");

  // Table view state: "participants" (Player Entries) or "summary" (Campaign Breakdown)
  const [tableViewMode, setTableViewMode] = useState<
    "participants" | "summary"
  >("participants");

  // Search filter inside participants table
  const [searchQuery, setSearchQuery] = useState("");

  // Import state
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const { analytics, loading, error } = useAnalytics(selectedCampId);

  const selectedCampaign = analytics?.by_campaign.find(
    (c) => c.campaign_id === selectedCampId,
  );

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;

    setImporting(true);
    setImportSuccess(null);
    setImportError(null);

    try {
      const targetCampId =
        selectedCampId !== "all"
          ? selectedCampId
          : analytics?.by_campaign[0]?.campaign_id;

      if (!targetCampId) {
        throw new Error(
          "Please select or create a campaign before importing entries.",
        );
      }

      let newEntries: any[] = [];

      if (file.name.endsWith(".csv") || file.type.includes("csv")) {
        const text = await file.text();
        const lines = text
          .split("\n")
          .map((l) => l.trim())
          .filter(Boolean);
        if (lines.length <= 1) {
          throw new Error("CSV file is empty or has no data rows.");
        }
        const headers = lines[0].split(",").map((h) => h.trim().toLowerCase());
        const nameIdx = headers.findIndex(
          (h) => h.includes("name") || h.includes("participant"),
        );
        const phoneIdx = headers.findIndex(
          (h) => h.includes("phone") || h.includes("mobile"),
        );
        const winIdx = headers.findIndex(
          (h) => h.includes("win") || h.includes("outcome"),
        );

        for (let i = 1; i < lines.length; i++) {
          const parts = lines[i].split(",").map((p) => p.trim());
          if (parts.length < 1) continue;
          newEntries.push({
            campaign_id: targetCampId,
            organization_id: organization.id,
            participant_name: nameIdx !== -1 ? parts[nameIdx] : parts[0],
            phone_number:
              phoneIdx !== -1
                ? parts[phoneIdx]
                : parts[1] ||
                  `06${Math.floor(10000000 + Math.random() * 89999999)}`,
            is_winner:
              winIdx !== -1
                ? parts[winIdx]?.toLowerCase() === "true" ||
                  parts[winIdx]?.toLowerCase() === "winner"
                : false,
          });
        }
      } else {
        const XLSX = await import("xlsx");
        const data = await file.arrayBuffer();
        const workbook = XLSX.read(data);
        const worksheet = workbook.Sheets[workbook.SheetNames[0]];
        const jsonRows: any[] = XLSX.utils.sheet_to_json(worksheet);

        newEntries = jsonRows.map((row) => {
          const keys = Object.keys(row);
          const nameKey = keys.find(
            (k) =>
              k.toLowerCase().includes("name") ||
              k.toLowerCase().includes("participant"),
          );
          const phoneKey = keys.find(
            (k) =>
              k.toLowerCase().includes("phone") ||
              k.toLowerCase().includes("mobile"),
          );
          const winKey = keys.find(
            (k) =>
              k.toLowerCase().includes("win") ||
              k.toLowerCase().includes("outcome"),
          );

          return {
            campaign_id: targetCampId,
            organization_id: organization.id,
            participant_name: nameKey ? String(row[nameKey]) : "Imported User",
            phone_number: phoneKey
              ? String(row[phoneKey])
              : `06${Math.floor(10000000 + Math.random() * 89999999)}`,
            is_winner: winKey
              ? String(row[winKey]).toLowerCase() === "true" ||
                String(row[winKey]).toLowerCase() === "winner"
              : false,
          };
        });
      }

      if (newEntries.length === 0) {
        throw new Error("No valid participant entries found in file.");
      }

      await importParticipantEntries(newEntries);

      setImportSuccess(
        `Successfully imported ${newEntries.length} participant entries into ${
          selectedCampaign?.campaign_name ?? "campaign"
        }!`,
      );
    } catch (err) {
      setImportError(
        toFriendlyErrorMessage(
          err,
          "Failed to import entries file. Please verify format and try again.",
        ),
      );
    } finally {
      setImporting(false);
    }
  };

  const handleGenerateSampleData = async () => {
    if (!organization) return;
    setImporting(true);
    setImportSuccess(null);
    setImportError(null);

    try {
      const targetCampId =
        selectedCampId !== "all"
          ? selectedCampId
          : analytics?.by_campaign[0]?.campaign_id;

      if (!targetCampId) {
        throw new Error(
          "Please select or create at least one campaign before generating participant data.",
        );
      }

      const sampleNames = [
        "Yacine Benali",
        "Amine Khelifi",
        "Meriem Zerrouki",
        "Karim Belkacem",
        "Fatima Boumedienne",
        "Sami Ferhani",
        "Lina Mansouri",
        "Omar Saidi",
        "Nadia Brahimi",
        "Ryad Mahrez",
      ];
      const prefixes = ["06", "07", "05"];
      const userAgents = [
        "Mozilla/5.0 (Linux; Android 13; SM-G998B)",
        "Mozilla/5.0 (iPhone; CPU iPhone OS 16_5 like Mac OS X)",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64)",
      ];

      const sampleEntries = Array.from({ length: 12 }).map((_, idx) => {
        const pref = prefixes[idx % prefixes.length];
        const num = Math.floor(1000000 + Math.random() * 8999999);
        const isWin = idx % 3 === 0;
        const dwell = Math.floor(15 + Math.random() * 120);

        return {
          campaign_id: targetCampId,
          organization_id: organization.id,
          phone_number: `${pref}${num}`,
          participant_name: sampleNames[idx % sampleNames.length],
          is_winner: isWin,
          quiz_passed: true,
          coupon_confirmed: isWin,
          redeemed_coupon_value: isWin
            ? `WIN-${Math.floor(1000 + Math.random() * 9000)}`
            : undefined,
          dwell_time_seconds: dwell,
          user_agent: userAgents[idx % userAgents.length],
          created_at: new Date(Date.now() - idx * 3600000 * 4).toISOString(),
        };
      });

      await importParticipantEntries(sampleEntries);
      setImportSuccess(
        `Successfully generated and recorded 12 participant entries into the database!`,
      );
    } catch (err) {
      setImportError(
        toFriendlyErrorMessage(err, "Failed to generate sample data."),
      );
    } finally {
      setImporting(false);
    }
  };

  const handleExportData = () => {
    if (!analytics) return;

    if (selectedCampId === "all") {
      const formattedRows = analytics.by_campaign.map((row) => ({
        "Campaign Name": row.campaign_name,
        Status: row.status,
        "Total Visitors / Impressions": analytics.total_impressions,
        "Total Entries": row.total_entries,
        "Total Winners": row.total_winners,
        "Win Rate (%)": `${row.win_rate}%`,
        "Game Play Rate (%)": `${analytics.game_play_rate}%`,
        "Form Completion Rate (%)": `${analytics.form_completion_rate}%`,
        "Avg Dwell Time": formatDwellTime(analytics.avg_dwell_time_seconds),
        "Repeat Users Count": analytics.repeat_users_count,
        "Avg Participations / User": analytics.avg_participations_per_user,
        "Quiz Pass Rate (%)": `${row.quiz_pass_rate}%`,
        "Coupon Confirmation Rate (%)": `${row.coupon_confirmation_rate}%`,
      }));

      const filename = `octoreach_all_campaigns_${
        new Date().toISOString().split("T")[0]
      }`;

      if (exportFormat === "xlsx") {
        exportToExcel(
          formattedRows as unknown as Record<string, unknown>[],
          filename,
          "All Campaigns Performance",
        );
      } else {
        exportToCSV(
          formattedRows as unknown as Record<string, unknown>[],
          filename,
        );
      }
    } else {
      const campName = selectedCampaign?.campaign_name ?? selectedCampId;
      const formattedRows = analytics.participants.map((p) => ({
        "Participant Name": p.participant_name || "Anonymous Player",
        "Phone Number": p.phone_number,
        "Game Outcome": p.is_winner ? "WINNER" : "NO WIN",
        "Prize Awarded": p.is_winner
          ? p.prize_name || "Winning Reward"
          : "None",
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

      const filename = `octoreach_players_${campName.replace(/\s+/g, "_")}_${
        new Date().toISOString().split("T")[0]
      }`;

      if (exportFormat === "xlsx") {
        exportToExcel(
          formattedRows as unknown as Record<string, unknown>[],
          filename,
          `${campName} Players`,
        );
      } else {
        exportToCSV(
          formattedRows as unknown as Record<string, unknown>[],
          filename,
        );
      }
    }
  };

  if (loading) {
    return (
      <div className="flex h-96 items-center justify-center bg-white rounded-3xl border border-slate-200 shadow-sm">
        <div className="flex flex-col items-center gap-3">
          <div className="h-10 w-10 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
          <span className="text-sm font-bold text-slate-700">
            Loading Campaign Business Analytics...
          </span>
        </div>
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="rounded-3xl border border-red-200 bg-red-50 p-6 text-red-700 font-semibold shadow-sm flex items-center gap-3">
        <AlertTriangle className="w-6 h-6 text-red-600 flex-shrink-0" />
        <span>{error || "Analytics desk unavailable right now."}</span>
      </div>
    );
  }

  // Filter participants by search query
  const filteredParticipants = (analytics.participants ?? []).filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      (p.participant_name && p.participant_name.toLowerCase().includes(q)) ||
      (p.phone_number && p.phone_number.includes(q)) ||
      (p.campaign_name && p.campaign_name.toLowerCase().includes(q)) ||
      (p.prize_name && p.prize_name.toLowerCase().includes(q)) ||
      (p.redeemed_coupon_value &&
        p.redeemed_coupon_value.toLowerCase().includes(q))
    );
  });

  return (
    <div id="analytics-center-root" className="space-y-8 text-slate-800 pb-12">
      {/* 1. EXECUTIVE DASHBOARD HEADER */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm flex flex-col xl:flex-row justify-between items-start xl:items-center gap-5">
        <div>
          <div className="flex items-center gap-2.5 mb-1">
            <h1 className="text-2xl font-black tracking-tight text-slate-900">
              Analytics Desk
            </h1>
            <span className="bg-indigo-50 border border-indigo-200 text-indigo-700 text-[11px] font-extrabold px-3 py-0.5 rounded-full">
              PostgreSQL RPC v2
            </span>
          </div>
          <p className="text-slate-500 text-xs font-medium">
            Real-time campaign engagement, conversion funnel, operator footprint
            & participant records.
          </p>
        </div>

        {/* Action Controls Toolbar */}
        <div className="flex flex-wrap items-center gap-3 w-full xl:w-auto">
          {/* Campaign Selector */}
          <div className="flex items-center bg-slate-50 border border-slate-200 rounded-2xl px-3 py-1.5 shadow-sm">
            <Filter className="w-3.5 h-3.5 text-slate-400 mr-2 flex-shrink-0" />
            <select
              value={selectedCampId}
              onChange={(e) => setSelectedCampId(e.target.value)}
              className="bg-transparent text-xs text-slate-800 font-bold focus:outline-none cursor-pointer pr-2"
            >
              <option value="all">All Campaigns Combined</option>
              {(analytics?.by_campaign ?? []).map((campaign) => (
                <option key={campaign.campaign_id} value={campaign.campaign_id}>
                  {campaign.campaign_name} ({campaign.status.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Export Format Toggle */}
          <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/70">
            <button
              onClick={() => setExportFormat("xlsx")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                exportFormat === "xlsx"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              Excel
            </button>
            <button
              onClick={() => setExportFormat("csv")}
              className={`px-3 py-1.5 text-xs font-bold rounded-xl transition-all ${
                exportFormat === "csv"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-800"
              }`}
            >
              CSV
            </button>
          </div>

          <input
            type="file"
            ref={fileInputRef}
            onChange={handleImportFile}
            accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            className="hidden"
          />

          <button
            onClick={() => fileInputRef.current?.click()}
            disabled={importing}
            className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm disabled:opacity-60"
          >
            {importing ? (
              <div className="w-4 h-4 border-2 border-slate-600/30 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <Upload className="w-4 h-4 text-slate-600" />
            )}
            <span>Import</span>
          </button>

          <button
            onClick={handleExportData}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer shadow-sm"
          >
            {exportFormat === "xlsx" ? (
              <FileSpreadsheet className="w-4 h-4" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span>
              {selectedCampId === "all"
                ? "Export Overview"
                : "Export Player List"}
            </span>
          </button>
        </div>
      </div>

      {/* Import Status Banners */}
      {importSuccess && (
        <div className="flex items-center gap-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs font-bold shadow-sm">
          <Check className="w-5 h-5 text-emerald-600 flex-shrink-0" />
          <span>{importSuccess}</span>
        </div>
      )}

      {importError && (
        <div className="flex items-center gap-3 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs font-bold shadow-sm">
          <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0" />
          <span>{importError}</span>
        </div>
      )}

      {/* 2. PRIMARY EXECUTIVE KPI METRIC CARDS */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Metric 1: Total Visitors */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Total Visitors
            </span>
            <div className="w-10 h-10 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600">
              <Eye className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              {analytics.total_impressions.toLocaleString()}
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-1.5 flex items-center gap-1">
              <span>Unique link views & landing page loads</span>
            </p>
          </div>
        </div>

        {/* Metric 2: Game Conversion Rate */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Game Conversion Rate
            </span>
            <div className="w-10 h-10 rounded-2xl bg-emerald-50 border border-emerald-100 flex items-center justify-center text-emerald-600">
              <Sparkles className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              {analytics.game_play_rate}%
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-1.5">
              {analytics.total_entries} played / {analytics.total_impressions}{" "}
              visitors
            </p>
          </div>
        </div>

        {/* Metric 3: Form Completion Rate */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Form Completion Rate
            </span>
            <div className="w-10 h-10 rounded-2xl bg-sky-50 border border-sky-100 flex items-center justify-center text-sky-600">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              {analytics.form_completion_rate}%
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-1.5">
              Entries captured / teaser plays
            </p>
          </div>
        </div>

        {/* Metric 4: Dwell Time */}
        <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
          <div className="flex justify-between items-start">
            <span className="text-xs font-extrabold text-slate-500 uppercase tracking-wider">
              Brand Attention Dwell
            </span>
            <div className="w-10 h-10 rounded-2xl bg-amber-50 border border-amber-100 flex items-center justify-center text-amber-600">
              <Clock className="w-5 h-5" />
            </div>
          </div>
          <div className="mt-4">
            <div className="text-3xl lg:text-4xl font-black text-slate-900 tracking-tight">
              {formatDwellTime(analytics.avg_dwell_time_seconds)}
            </div>
            <p className="text-xs font-semibold text-slate-500 mt-1.5">
              Average player dwell time on screen
            </p>
          </div>
        </div>
      </div>

      {/* 3. SECONDARY RATIOS (Win Rate, Quiz Pass, Coupon Claim) */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <PercentageCircle
          percentage={analytics.win_rate}
          title="Win Rate %"
          subtitle={`${analytics.total_wins} winners out of ${analytics.total_entries} recorded entries`}
          color="#10B981"
          badgeText="Win Outcome Rate"
          icon={<TrendingUp className="w-5 h-5 text-emerald-600" />}
        />
        <PercentageCircle
          percentage={analytics.game_play_rate}
          title="Teaser Play Rate"
          subtitle={`${analytics.total_entries} played out of ${analytics.total_impressions} landing views`}
          color="#6366F1"
          badgeText="Teaser Funnel"
          icon={<Sparkles className="w-5 h-5 text-indigo-600" />}
        />
        <PercentageCircle
          percentage={analytics.coupon_confirmation_rate ?? 0}
          title="Coupon Claim Rate"
          subtitle={`${analytics.coupon_confirmed ?? 0} confirmed out of ${analytics.coupon_total ?? 0} issued codes`}
          color="#F59E0B"
          badgeText="Coupon Claim"
          icon={<HelpCircle className="w-5 h-5 text-amber-600" />}
        />
      </div>

      {/* 4. CHARTS GRID (Histogram & Operator Split) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ParticipationHistogram
          dailyData={analytics.daily_distribution}
          hourlyData={analytics.hourly_distribution}
        />
        <CarrierBreakdownChart carrierData={analytics.carrier_distribution} />
      </div>

      {/* 5. DEVICE & INVENTORY EXHAUSTION GRID */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <OSDistributionChart osData={analytics.os_distribution} />
        <PrizeBurnRateList prizes={analytics.prize_burn_rate} />
      </div>

      {/* 6. MODERN PLAYER PARTICIPANTS TABLE DESK */}
      <div className="bg-white border border-slate-200/90 rounded-3xl p-6 shadow-sm space-y-5">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-100">
          <div>
            <h3 className="font-extrabold text-base text-slate-900 flex items-center gap-2">
              <Trophy className="w-5 h-5 text-indigo-600" />
              {tableViewMode === "participants" ? (
                <span>
                  Player Participants & Gameplay Log{" "}
                  {selectedCampId !== "all" && (
                    <span className="text-indigo-600">
                      for {selectedCampaign?.campaign_name ?? selectedCampId}
                    </span>
                  )}
                </span>
              ) : (
                <span>Campaign Performance Breakdown</span>
              )}
            </h3>
            <p className="text-xs font-semibold text-slate-500 mt-0.5">
              {tableViewMode === "participants"
                ? "Real-time client player entries, game dwell times, and prize outcomes."
                : "Aggregated campaign metrics across all active campaigns."}
            </p>
          </div>

          {/* Right Toolbar: View Switcher & Table Search */}
          <div className="flex flex-wrap items-center gap-3">
            {tableViewMode === "participants" && (
              <div className="relative">
                <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Search player, phone, prize..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 pr-3 py-1.5 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold focus:outline-none focus:border-indigo-500 w-48 sm:w-60"
                />
              </div>
            )}

            <div className="flex items-center bg-slate-100 p-1 rounded-2xl border border-slate-200/70">
              <button
                onClick={() => setTableViewMode("participants")}
                className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all ${
                  tableViewMode === "participants"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Player Participants ({(analytics?.participants ?? []).length})
              </button>
              <button
                onClick={() => setTableViewMode("summary")}
                className={`px-3.5 py-1.5 rounded-xl font-extrabold text-xs transition-all ${
                  tableViewMode === "summary"
                    ? "bg-white text-indigo-700 shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                }`}
              >
                Campaign Breakdown ({(analytics?.by_campaign ?? []).length})
              </button>
            </div>
          </div>
        </div>

        {/* Table Content */}
        <div className="overflow-x-auto">
          {tableViewMode === "summary" ? (
            /* MODE A: All Campaigns Summary Breakdown Table */
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-left">Campaign Name</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4 text-center">Total Entries</th>
                  <th className="py-3.5 px-4 text-center">Winners</th>
                  <th className="py-3.5 px-4 text-center">Win Rate</th>
                  <th className="py-3.5 px-4 text-center">Quiz Pass Rate</th>
                  <th className="py-3.5 px-4 text-right">Coupon Claim Rate</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {analytics.by_campaign.map((row) => (
                  <tr
                    key={row.campaign_id}
                    className="hover:bg-slate-50/70 transition-all"
                  >
                    <td className="py-4 px-4 font-bold text-slate-900">
                      {row.campaign_name}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-block bg-emerald-50 text-emerald-700 border border-emerald-200 font-extrabold px-2.5 py-0.5 rounded-full text-[10px] uppercase">
                        {row.status}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-slate-800">
                      {row.total_entries}
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-emerald-600">
                      {row.total_winners}
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-indigo-600">
                      {row.win_rate}%
                    </td>
                    <td className="py-4 px-4 text-center font-mono font-bold text-slate-700">
                      {row.quiz_pass_rate}%
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-amber-600">
                      {row.coupon_confirmation_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* MODE B: Specific or All Campaign Player Participants Table */
            <table className="w-full border-collapse">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-extrabold text-[11px] uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-left">Participant Name</th>
                  {selectedCampId === "all" && (
                    <th className="py-3.5 px-4 text-left">Campaign</th>
                  )}
                  <th className="py-3.5 px-4 text-center">Phone Number</th>
                  <th className="py-3.5 px-4 text-center">Result / Prize</th>
                  <th className="py-3.5 px-4 text-center">Game Dwell Time</th>
                  <th className="py-3.5 px-4 text-center">Quiz Status</th>
                  <th className="py-3.5 px-4 text-center">Coupon Code</th>
                  <th className="py-3.5 px-4 text-right">Date Submitted</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs font-semibold text-slate-700">
                {filteredParticipants.length === 0 ? (
                  <tr>
                    <td
                      colSpan={selectedCampId === "all" ? 8 : 7}
                      className="py-12 text-center"
                    >
                      <div className="flex flex-col items-center justify-center space-y-3">
                        <Users className="w-10 h-10 text-slate-300" />
                        <p className="text-sm font-extrabold text-slate-700">
                          No player participations recorded in database yet.
                        </p>
                        <p className="text-xs text-slate-500 max-w-md">
                          Entries will appear automatically when players use
                          your shareable /play links, or you can import
                          CSV/Excel records.
                        </p>
                        <button
                          onClick={handleGenerateSampleData}
                          disabled={importing}
                          className="mt-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 px-4 py-2.5 rounded-2xl text-xs font-extrabold transition-all flex items-center gap-2 cursor-pointer shadow-sm disabled:opacity-60"
                        >
                          {importing ? (
                            <div className="w-4 h-4 border-2 border-indigo-600/30 border-t-indigo-600 rounded-full animate-spin" />
                          ) : (
                            <Sparkles className="w-4 h-4 text-indigo-600" />
                          )}
                          <span>Generate & Record Sample Database Entries</span>
                        </button>
                      </div>
                    </td>
                  </tr>
                ) : (
                  filteredParticipants.map((player) => (
                    <tr
                      key={player.id}
                      className="hover:bg-slate-50/70 transition-all"
                    >
                      <td className="py-4 px-4 font-extrabold text-slate-900">
                        {player.participant_name || "Anonymous Player"}
                      </td>
                      {selectedCampId === "all" && (
                        <td className="py-4 px-4 text-left font-bold text-indigo-700">
                          {player.campaign_name || "Default Campaign"}
                        </td>
                      )}
                      <td className="py-4 px-4 text-center font-mono font-bold text-slate-800">
                        {player.phone_number}
                      </td>
                      <td className="py-4 px-4 text-center">
                        {player.is_winner ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/90 px-3 py-1 rounded-full font-extrabold text-[11px]">
                            🏆 {player.prize_name || "WINNER"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2.5 py-0.5 rounded-full text-[11px] font-semibold">
                            No Win
                          </span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center font-mono font-bold text-amber-600">
                        {formatDwellTime(player.dwell_time_seconds)}
                      </td>
                      <td className="py-4 px-4 text-center font-mono">
                        {player.quiz_passed === true ? (
                          <span className="text-emerald-600 font-extrabold">
                            Passed
                          </span>
                        ) : player.quiz_passed === false ? (
                          <span className="text-red-500 font-extrabold">
                            Failed
                          </span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-4 px-4 text-center font-mono text-indigo-600 font-extrabold">
                        {player.redeemed_coupon_value || "—"}
                      </td>
                      <td className="py-4 px-4 text-right font-mono text-slate-500 text-xs">
                        {new Date(player.created_at).toLocaleDateString(
                          "en-US",
                          {
                            month: "short",
                            day: "numeric",
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
};
