import React, { useMemo } from "react";
import { Gift, ReceiptText, Repeat, Users } from "lucide-react";
import { useAuth } from "../../contexts/AuthContext";
import { useProgramAnalytics } from "../../hooks/useProgramAnalytics";
import { formatRate } from "../../lib/campaignAnalyticsTransforms";
import {
  programPeriodStart,
  type ProgramPeriodKey,
} from "../../lib/programAnalyticsTransforms";
import { ProgramAnalytics, ProgramCampaignStatusCounts } from "../../types";
import { gameMeta } from "../campaigns/campaignMeta";
import { AlgeriaWilayaMap } from "./AlgeriaWilayaMap";
import { SectionTitle } from "./AnalyticsControls";
import {
  ChartPanel,
  OsDonutChart,
  StatCard,
  TimeSegmentationChart,
  useChartTheme,
} from "./CampaignAnalyticsCharts";

const shorten = (name: string, max: number) =>
  name.length > max ? `${name.slice(0, max - 1)}…` : name;

const STATUS_TILES: {
  key: Exclude<keyof ProgramCampaignStatusCounts, "total">;
  label: string;
  dot: string;
}[] = [
  { key: "active", label: "Active", dot: "bg-emerald-500" },
  { key: "paused", label: "Paused", dot: "bg-amber-500" },
  { key: "draft", label: "Draft", dot: "bg-blue-500" },
  { key: "ended", label: "Ended", dot: "bg-violet-500" },
  { key: "archived", label: "Archived", dot: "bg-slate-400" },
];

const headCell =
  "pb-2 px-2 font-medium uppercase text-[10px] tracking-wider text-brand-text-muted";

interface SectionProps {
  analytics: ProgramAnalytics;
}

const CampaignStatusPanel: React.FC<SectionProps> = ({ analytics }) => {
  const counts = analytics.campaign_status;
  // "Ended" only exists on older campaigns: shown when there is one.
  const tiles = STATUS_TILES.filter(
    (tile) => tile.key !== "ended" || counts.ended > 0,
  );
  return (
    <div className="glass-panel rounded-xl p-4">
      <div className="flex items-baseline justify-between gap-2">
        <h3 className="text-[10px] uppercase font-semibold tracking-wider text-brand-text-muted">
          Campaigns by state
        </h3>
        <span className="text-[11px] text-brand-text-muted">
          {counts.total.toLocaleString()} in total · as of now
        </span>
      </div>
      <dl
        className="mt-3 grid gap-3"
        style={{
          gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`,
        }}
      >
        {tiles.map((tile) => (
          <div key={tile.key}>
            <dd className="text-2xl font-bold text-brand-text">
              {counts[tile.key].toLocaleString()}
            </dd>
            <dt className="mt-0.5 flex items-center gap-1.5 text-[11px] text-brand-text-muted">
              <span className={`h-2 w-2 rounded-full ${tile.dot}`} />
              {tile.label}
            </dt>
          </div>
        ))}
      </dl>
    </div>
  );
};

const Leaderboard: React.FC<
  SectionProps & { onSelectCampaign: (campaignId: string) => void }
> = ({ analytics, onSelectCampaign }) => {
  const chart = useChartTheme();
  const rows = analytics.leaderboard;
  const maxEntries = rows[0]?.entries ?? 0;

  return (
    <ChartPanel
      title="Campaign leaderboard"
      subtitle="Entries, completion rate and rewards won per campaign. Select a campaign to open it."
      isEmpty={rows.length === 0}
      emptyMessage="No campaigns yet."
      className="h-full"
    >
      <div className="max-h-96 overflow-auto">
        <table className="w-full border-collapse text-left text-xs">
          <thead>
            <tr className="border-b border-brand-border/50">
              <th className={`${headCell} w-8`}>#</th>
              <th className={headCell}>Campaign</th>
              <th className={`${headCell} w-2/5`}>Entries</th>
              <th className={`${headCell} text-right`}>Completion</th>
              <th className={`${headCell} text-right`}>Rewards</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-brand-border/30">
            {rows.map((row, index) => (
              <tr
                key={row.campaign_id}
                className="cursor-pointer transition-colors hover:bg-card-bg-subtle"
                onClick={() => onSelectCampaign(row.campaign_id)}
              >
                <td className="py-2.5 px-2 text-brand-text-muted">
                  {index + 1}
                </td>
                <td className="py-2.5 px-2">
                  <div
                    className="font-semibold text-brand-text"
                    title={row.campaign_name}
                    dir="auto"
                  >
                    {shorten(row.campaign_name, 40)}
                  </div>
                  <div className="text-[10px] capitalize text-brand-text-muted">
                    {gameMeta(row.game_type).label} · {row.status}
                  </div>
                </td>
                <td className="py-2.5 px-2">
                  <div className="flex items-center gap-2">
                    <div className="h-1.5 flex-1 overflow-hidden rounded-full bg-card-bg-subtle">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${maxEntries > 0 ? (row.entries / maxEntries) * 100 : 0}%`,
                          backgroundColor: chart.series[0],
                        }}
                      />
                    </div>
                    <span className="w-12 text-right font-semibold text-brand-text">
                      {row.entries.toLocaleString()}
                    </span>
                  </div>
                </td>
                <td
                  className="py-2.5 px-2 text-right text-brand-text"
                  title={
                    row.completion_rate === null
                      ? "No visitor sessions tracked in this period"
                      : `${row.completed_impressions.toLocaleString()} of ${row.impressions.toLocaleString()} visitors completed the form`
                  }
                >
                  {formatRate(row.completion_rate)}
                </td>
                <td className="py-2.5 px-2 text-right text-brand-text">
                  {row.rewards.toLocaleString()}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </ChartPanel>
  );
};

const MechanicsPanel: React.FC<SectionProps> = ({ analytics }) => (
  <ChartPanel
    title="Performance by mechanic"
    subtitle="The same metrics, grouped by game."
    isEmpty={analytics.mechanics.length === 0}
    emptyMessage="No campaigns yet."
    className="h-full"
  >
    <table className="w-full border-collapse text-left text-xs">
      <thead>
        <tr className="border-b border-brand-border/50">
          <th className={headCell}>Mechanic</th>
          <th className={`${headCell} text-right`}>Entries</th>
          <th className={`${headCell} text-right`}>Completion</th>
          <th className={`${headCell} text-right`}>Rewards</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-brand-border/30">
        {analytics.mechanics.map((row) => {
          const game = gameMeta(row.game_type);
          const Icon = game.icon;
          return (
            <tr key={row.game_type}>
              <td className="py-2.5 px-2">
                <div className="flex items-center gap-2">
                  <span
                    className={`flex h-7 w-7 items-center justify-center rounded-lg ${game.tile}`}
                  >
                    <Icon className="h-3.5 w-3.5" />
                  </span>
                  <div>
                    <div className="font-semibold text-brand-text">
                      {game.label}
                    </div>
                    <div className="text-[10px] text-brand-text-muted">
                      {row.campaigns}{" "}
                      {row.campaigns === 1 ? "campaign" : "campaigns"}
                    </div>
                  </div>
                </div>
              </td>
              <td className="py-2.5 px-2 text-right font-semibold text-brand-text">
                {row.entries.toLocaleString()}
              </td>
              <td className="py-2.5 px-2 text-right text-brand-text">
                {formatRate(row.completion_rate)}
              </td>
              <td className="py-2.5 px-2 text-right text-brand-text">
                {row.rewards.toLocaleString()}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  </ChartPanel>
);

interface ProgramAnalyticsDashboardProps {
  /** The period applied; chosen in the analytics toolbar. */
  periodKey: ProgramPeriodKey;
  onSelectCampaign: (campaignId: string) => void;
}

/**
 * The combined view of every campaign of the organization. Every number comes from the
 * `get_program_analytics` RPC; the browser only lays them out.
 */
export const ProgramAnalyticsDashboard: React.FC<
  ProgramAnalyticsDashboardProps
> = ({ periodKey, onSelectCampaign }) => {
  const { organization } = useAuth();
  const from = useMemo(() => programPeriodStart(periodKey), [periodKey]);
  const { analytics, loading, refreshing, error } = useProgramAnalytics(
    organization?.id ?? null,
    from,
  );

  if (loading && !analytics) {
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

  const { totals, audience } = analytics;

  return (
    <div
      id="program-analytics-dashboard"
      className={`mb-4 space-y-4 transition-opacity ${refreshing ? "opacity-60" : ""}`}
    >
      <SectionTitle>Program totals</SectionTitle>

      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          title="Total entries"
          value={totals.entries.toLocaleString()}
          caption="Participations across all campaigns"
          icon={<ReceiptText className="h-4 w-4" />}
        />
        <StatCard
          title="Prizes distributed"
          value={totals.prizes_distributed.toLocaleString()}
          caption="Winning entries across all campaigns"
          icon={<Gift className="h-4 w-4" />}
        />
        <StatCard
          title="Unique audience"
          value={audience.unique_audience.toLocaleString()}
          caption="Distinct participants, by phone number"
          icon={<Users className="h-4 w-4" />}
        />
        <StatCard
          title="Repeat participation"
          value={formatRate(audience.repeat_participation_rate)}
          caption={
            audience.repeat_participation_rate === null
              ? "No identified participants yet"
              : `${audience.repeat_participants.toLocaleString()} played 2 or more campaigns`
          }
          icon={<Repeat className="h-4 w-4" />}
        />
      </div>

      <CampaignStatusPanel analytics={analytics} />

      <SectionTitle>Comparison</SectionTitle>
      <Leaderboard analytics={analytics} onSelectCampaign={onSelectCampaign} />

      <SectionTitle>Segmentation</SectionTitle>
      <MechanicsPanel analytics={analytics} />
      {/* Time segmentation and devices: always side by side. */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-7">
          <TimeSegmentationChart
            hourly={analytics.hourly_distribution}
            weekday={analytics.weekday_distribution}
            timezone={analytics.timezone}
          />
        </div>
        <div className="col-span-12 lg:col-span-5">
          <OsDonutChart data={analytics.os_distribution} />
        </div>
      </div>
      <AlgeriaWilayaMap
        locations={analytics.location_distribution}
        unknownCount={analytics.location_unknown_count}
      />
    </div>
  );
};
