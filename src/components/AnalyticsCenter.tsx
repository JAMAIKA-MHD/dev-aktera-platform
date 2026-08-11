import React, { useMemo, useRef, useState } from "react";
import {
  Download,
  FileSpreadsheet,
  TrendingUp,
  Users,
  CheckCircle2,
  HelpCircle,
  Upload,
  Check,
  AlertTriangle,
  Clock,
  Sparkles,
  Repeat,
  Trophy,
} from "lucide-react";
import { useAnalytics } from "../hooks/useAnalytics";
import { useAuth } from "../contexts/AuthContext";
import { importParticipantEntries } from "../services/analyticsService";
import { toFriendlyErrorMessage } from "../lib/errorMessages";
import {
  PercentageCircle,
  ParticipationHistogram,
  CarrierBreakdownChart,
  OSDistributionChart,
  PrizeBurnRateList,
} from "./analytics/AnalyticsGraphics";
import {
  exportToCSV,
  exportToExcel,
  parseCSVFile,
  parseExcelFile,
} from "../lib/exportUtils";

const formatDwellTime = (seconds: number): string => {
  if (!seconds || seconds <= 0) return "0s";
  if (seconds < 60) return `${Math.round(seconds)}s`;
  const mins = Math.floor(seconds / 60);
  const secs = Math.round(seconds % 60);
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
};

interface AnalyticsCenterProps {
  initialCampaignId?: string | null;
}

export const AnalyticsCenter: React.FC<AnalyticsCenterProps> = ({
  initialCampaignId,
}) => {
  const { organization } = useAuth();
  const [selectedCampId, setSelectedCampId] = useState<string>(
    initialCampaignId ?? "all",
  );

  React.useEffect(() => {
    if (initialCampaignId) {
      setSelectedCampId(initialCampaignId);
    }
  }, [initialCampaignId]);

  // Pass selectedCampId into useAnalytics hook to trigger instant dynamic filtering
  const { analytics, loading, error } = useAnalytics(selectedCampId);
  const [exportFormat, setExportFormat] = useState<"csv" | "xlsx">("xlsx");

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [importing, setImporting] = useState(false);
  const [importSuccess, setImportSuccess] = useState<string | null>(null);
  const [importError, setImportError] = useState<string | null>(null);

  const selectedCampaign = useMemo(
    () =>
      (analytics?.by_campaign ?? []).find(
        (campaign) => campaign.campaign_id === selectedCampId,
      ) ?? null,
    [analytics, selectedCampId],
  );

  const handleImportFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !organization) return;

    setImporting(true);
    setImportSuccess(null);
    setImportError(null);

    try {
      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
      const rows = isExcel
        ? await parseExcelFile<Record<string, unknown>>(file)
        : await parseCSVFile<Record<string, unknown>>(file);

      if (!rows || rows.length === 0) {
        throw new Error("Import file is empty or could not be parsed.");
      }

      const targetCampId =
        selectedCampId !== "all"
          ? selectedCampId
          : analytics?.by_campaign[0]?.campaign_id;

      if (!targetCampId) {
        throw new Error(
          "Please select or create at least one campaign before importing participant entries.",
        );
      }

      const newEntries = rows
        .map((row) => {
          const keys = Object.keys(row);
          const phoneKey =
            keys.find(
              (k) =>
                k.toLowerCase().includes("phone") ||
                k.toLowerCase().includes("mobile") ||
                k.toLowerCase().includes("tel"),
            ) ?? keys[0];
          const nameKey =
            keys.find(
              (k) =>
                k.toLowerCase().includes("name") ||
                k.toLowerCase().includes("participant") ||
                k.toLowerCase().includes("user"),
            ) ?? keys[1];

          const rawPhone = String(row[phoneKey ?? ""] ?? "").trim();
          const rawName = String(row[nameKey ?? ""] ?? "").trim();

          const isWinnerVal = String(
            row.is_winner ?? row["Winner"] ?? row["Status"] ?? "",
          ).toLowerCase();
          const isWinner =
            isWinnerVal === "true" ||
            isWinnerVal === "1" ||
            isWinnerVal.includes("win");

          return {
            campaign_id: targetCampId,
            organization_id: organization.id,
            phone_number: rawPhone || "0500000000",
            participant_name: rawName || null,
            is_winner: isWinner,
            created_at: new Date().toISOString(),
          };
        })
        .filter((entry) => entry.phone_number.length >= 8);

      if (newEntries.length === 0) {
        throw new Error("No valid participant entries found in file.");
      }

      await importParticipantEntries(newEntries);

      setImportSuccess(
        `Successfully imported ${newEntries.length} participant entries into ${
          selectedCampaign?.campaign_name ?? "campaign"
        }!`,
      );
      if (fileInputRef.current) fileInputRef.current.value = "";
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

  const handleExportData = () => {
    if (!analytics) return;

    if (selectedCampId === "all") {
      // Export Overview of All Campaigns
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
      // Export Detailed Player Participants List for Selected Campaign
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
      <div className="flex h-64 items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
      </div>
    );
  }

  if (error || !analytics) {
    return (
      <div className="rounded-2xl border border-red-200 bg-red-50 p-4 text-red-700 font-medium">
        {error || "Analytics unavailable right now."}
      </div>
    );
  }

  return (
    <div id="analytics-center-root" className="space-y-6 text-slate-800">
      {/* Header with Fail-Safe Wrapping Layout */}
      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900 flex items-center gap-2">
            <span>Campaign Business Analytics Desk</span>
          </h2>
          <p className="text-slate-500 text-xs mt-0.5">
            Engineered with PostgreSQL database RPC function for instant
            conversion, dwell time, OS split, and prize burn rate analysis.
          </p>
        </div>

        {/* Action Controls Box — Wrapped properly to prevent UI frame overflow */}
        <div className="flex flex-wrap items-center gap-2.5 w-full xl:w-auto max-w-full">
          <select
            value={selectedCampId}
            onChange={(e) => setSelectedCampId(e.target.value)}
            className="bg-white border border-slate-200 hover:border-slate-400 rounded-xl px-3.5 py-2 text-xs text-slate-800 focus:outline-none min-h-11 shadow-sm cursor-pointer font-sans font-bold flex-shrink-0"
          >
            <option value="all">All Campaigns Combined</option>
            {(analytics?.by_campaign ?? []).map((campaign) => (
              <option key={campaign.campaign_id} value={campaign.campaign_id}>
                {campaign.campaign_name} ({campaign.status.toUpperCase()})
              </option>
            ))}
          </select>

          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200/60 flex-shrink-0">
            <button
              onClick={() => setExportFormat("xlsx")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                exportFormat === "xlsx"
                  ? "bg-white text-emerald-700 shadow-sm"
                  : "text-slate-500"
              }`}
            >
              Excel (.xlsx)
            </button>
            <button
              onClick={() => setExportFormat("csv")}
              className={`px-2.5 py-1 text-[11px] font-bold rounded-lg transition-all ${
                exportFormat === "csv"
                  ? "bg-white text-indigo-700 shadow-sm"
                  : "text-slate-500"
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
            className="bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-800 px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-h-11 shadow-sm flex-shrink-0 disabled:opacity-60"
          >
            {importing ? (
              <div className="w-4 h-4 border-2 border-slate-600/30 border-t-slate-600 rounded-full animate-spin" />
            ) : (
              <Upload className="w-4 h-4" />
            )}
            <span>Import Data</span>
          </button>

          <button
            onClick={handleExportData}
            className="bg-indigo-600 hover:bg-indigo-700 text-white px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 transition-all cursor-pointer min-h-11 shadow-sm flex-shrink-0"
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

      {/* Import Banners */}
      {importSuccess && (
        <div className="flex items-center gap-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl p-4 text-xs font-bold">
          <Check className="w-4 h-4 text-emerald-600 flex-shrink-0" />
          <span>{importSuccess}</span>
        </div>
      )}

      {importError && (
        <div className="flex items-center gap-2.5 bg-red-50 border border-red-200 text-red-700 rounded-2xl p-4 text-xs font-bold">
          <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>{importError}</span>
        </div>
      )}

      {/* Primary Business KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {[
          {
            title: "Total Visitors / Impressions",
            value: analytics.total_impressions,
            desc: "Unique views on /play link (WhatsApp/QR)",
            icon: Users,
            color: "text-indigo-600",
          },
          {
            title: "Game Play Rate (Conversion %)",
            value: `${analytics.game_play_rate}%`,
            desc: "Unique Plays / Unique Impressions",
            icon: Sparkles,
            color: "text-emerald-600",
          },
          {
            title: "Form Completion Rate",
            value: `${analytics.form_completion_rate}%`,
            desc: "Entries Captured / Game Plays",
            icon: CheckCircle2,
            color: "text-sky-600",
          },
          {
            title: "Dwell Time (Brand Attention)",
            value: formatDwellTime(analytics.avg_dwell_time_seconds),
            desc: "Time spent on campaign landing screen",
            icon: Clock,
            color: "text-amber-600",
          },
          {
            title: "Repeat User Participations",
            value: `${analytics.repeat_users_count}`,
            desc: `${analytics.avg_participations_per_user} avg plays/user (Max ${analytics.max_user_participations})`,
            icon: Repeat,
            color: "text-purple-600",
          },
        ].map((stat) => (
          <div
            key={stat.title}
            className="bg-white border border-slate-200 shadow-sm rounded-[24px] p-4.5 flex flex-col justify-between"
          >
            <div className="flex justify-between items-start">
              <span className="text-[10px] font-bold font-mono text-slate-400 uppercase tracking-widest leading-tight">
                {stat.title}
              </span>
              <stat.icon className={`w-4 h-4 ${stat.color} flex-shrink-0`} />
            </div>
            <div>
              <h4 className="text-2.5xl font-extrabold mt-2 mb-1 text-slate-900">
                {stat.value}
              </h4>
              <p className="text-[10.5px] text-slate-500 leading-tight">
                {stat.desc}
              </p>
            </div>
          </div>
        ))}
      </div>

      {/* Secondary Ratios: Win Rate, Quiz Pass Rate, Coupon Claim Rate */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        <PercentageCircle
          percentage={analytics.win_rate}
          title="Win Rate %"
          subtitle={`${analytics.total_wins} winners out of ${analytics.total_entries} recorded entries`}
          color="#10B981"
          badgeText="Win Rate"
          icon={<TrendingUp className="w-4 h-4 text-emerald-600" />}
        />
        <PercentageCircle
          percentage={analytics.game_play_rate}
          title="Game Play Rate (Landing Conversion)"
          subtitle={`${analytics.total_entries} played out of ${analytics.total_impressions} total visitors`}
          color="#6366F1"
          badgeText="Teaser Conversion"
          icon={<Sparkles className="w-4 h-4 text-indigo-600" />}
        />
        <PercentageCircle
          percentage={analytics?.coupon_confirmation_rate ?? 0}
          title="Coupon Claim Rate"
          subtitle={`${analytics?.coupon_confirmed ?? 0} confirmed out of ${analytics?.coupon_total ?? 0} issued codes`}
          color="#F59E0B"
          badgeText="Coupon Claim"
          icon={<HelpCircle className="w-4 h-4 text-amber-600" />}
        />
      </div>

      {/* Visual Analytics Charts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <ParticipationHistogram
          dailyData={analytics.daily_distribution}
          hourlyData={analytics.hourly_distribution}
        />
        <CarrierBreakdownChart carrierData={analytics.carrier_distribution} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        <OSDistributionChart osData={analytics.os_distribution} />
        <PrizeBurnRateList prizes={analytics.prize_burn_rate} />
      </div>

      {/* DYNAMIC PERFORMANCE TABLE: Switches based on Dropdown Selection */}
      <div className="bg-white border border-slate-200 rounded-[28px] p-6 shadow-sm">
        <div className="flex items-center justify-between gap-3 mb-4">
          <div>
            <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
              {selectedCampId === "all" ? (
                <span>Campaign Performance Breakdown</span>
              ) : (
                <span className="flex items-center gap-2">
                  <Trophy className="w-4 h-4 text-indigo-600" />
                  Player Participants & Gameplay Times for{" "}
                  <span className="text-indigo-600">
                    {selectedCampaign?.campaign_name ?? selectedCampId}
                  </span>
                </span>
              )}
            </h3>
            <p className="text-[10px] text-slate-500">
              {selectedCampId === "all"
                ? "Aggregated campaign metrics across all active campaigns."
                : `Showing real-time player participations, game dwell times, and winning results for ${
                    selectedCampaign?.campaign_name ?? selectedCampId
                  }.`}
            </p>
          </div>
        </div>

        <div className="overflow-x-auto">
          {selectedCampId === "all" ? (
            /* MODE A: All Campaigns Summary Breakdown Table */
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-150 text-[10px] font-mono text-slate-400 uppercase">
                  <th className="pb-3 pl-1 text-left font-semibold">
                    Campaign
                  </th>
                  <th className="pb-3 text-center font-semibold">Status</th>
                  <th className="pb-3 text-center font-semibold">Entries</th>
                  <th className="pb-3 text-center font-semibold">Winners</th>
                  <th className="pb-3 text-center font-semibold">Win Rate</th>
                  <th className="pb-3 text-center font-semibold">
                    Quiz Pass %
                  </th>
                  <th className="pb-3 text-right font-semibold">
                    Coupon Claim %
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {(analytics?.by_campaign ?? []).map((row) => (
                  <tr
                    key={row.campaign_id}
                    className="hover:bg-slate-50/60 transition-all cursor-pointer"
                    onClick={() => setSelectedCampId(row.campaign_id)}
                  >
                    <td className="py-3.5 pl-1 font-bold text-slate-800">
                      {row.campaign_name}
                    </td>
                    <td className="py-3.5 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                          row.status === "active"
                            ? "bg-emerald-50 text-emerald-700"
                            : "bg-slate-100 text-slate-600"
                        }`}
                      >
                        {row.status}
                      </span>
                    </td>
                    <td className="py-3.5 text-center font-mono text-slate-700">
                      {row.total_entries}
                    </td>
                    <td className="py-3.5 text-center font-mono text-emerald-700 font-bold">
                      {row.total_winners}
                    </td>
                    <td className="py-3.5 text-center font-mono text-slate-700">
                      {row.win_rate}%
                    </td>
                    <td className="py-3.5 text-center font-mono text-slate-700">
                      {row.quiz_pass_rate}%
                    </td>
                    <td className="py-3.5 text-right font-mono text-indigo-700 font-bold">
                      {row.coupon_confirmation_rate}%
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            /* MODE B: Specific Campaign Player Participants & Time Spent Table */
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b border-slate-150 text-[10px] font-mono text-slate-400 uppercase">
                  <th className="pb-3 pl-1 text-left font-semibold">
                    Participant Name
                  </th>
                  <th className="pb-3 text-center font-semibold">
                    Phone Number
                  </th>
                  <th className="pb-3 text-center font-semibold">
                    Result / Prize
                  </th>
                  <th className="pb-3 text-center font-semibold">
                    Time Spent in Game
                  </th>
                  <th className="pb-3 text-center font-semibold">
                    Quiz Status
                  </th>
                  <th className="pb-3 text-center font-semibold">
                    Coupon Code
                  </th>
                  <th className="pb-3 text-right font-semibold">
                    Date Submitted
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                {(analytics?.participants ?? []).length === 0 ? (
                  <tr>
                    <td
                      colSpan={7}
                      className="py-8 text-center text-slate-400 italic"
                    >
                      No player participations recorded yet for this campaign.
                    </td>
                  </tr>
                ) : (
                  (analytics?.participants ?? []).map((player) => (
                    <tr
                      key={player.id}
                      className="hover:bg-slate-50/60 transition-all"
                    >
                      <td className="py-3.5 pl-1 font-bold text-slate-900">
                        {player.participant_name || "Anonymous Player"}
                      </td>
                      <td className="py-3.5 text-center font-mono text-slate-700">
                        {player.phone_number}
                      </td>
                      <td className="py-3.5 text-center">
                        {player.is_winner ? (
                          <span className="inline-flex items-center gap-1 bg-emerald-50 text-emerald-700 border border-emerald-200/80 px-2.5 py-0.5 rounded-full font-bold text-[10px]">
                            🏆 {player.prize_name || "WINNER"}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full text-[10px]">
                            No Win
                          </span>
                        )}
                      </td>
                      <td className="py-3.5 text-center font-mono font-bold text-amber-600">
                        {formatDwellTime(player.dwell_time_seconds)}
                      </td>
                      <td className="py-3.5 text-center font-mono">
                        {player.quiz_passed === true ? (
                          <span className="text-emerald-600 font-bold">
                            Passed
                          </span>
                        ) : player.quiz_passed === false ? (
                          <span className="text-red-500 font-bold">Failed</span>
                        ) : (
                          <span className="text-slate-400">N/A</span>
                        )}
                      </td>
                      <td className="py-3.5 text-center font-mono text-indigo-600 font-bold">
                        {player.redeemed_coupon_value || "—"}
                      </td>
                      <td className="py-3.5 text-right font-mono text-slate-400 text-[11px]">
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
