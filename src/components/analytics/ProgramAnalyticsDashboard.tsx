import React, { useMemo } from "react";
import { ClipboardList, Gift, Repeat, Users } from "lucide-react";
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
import { CampaignLeaderboard } from "./CampaignLeaderboard";
import { SectionTitle } from "./AnalyticsControls";
import {
  ChartPanel,
  OsDonutChart,
  TimeSegmentationChart,
} from "./CampaignAnalyticsCharts";
import { KpiCard, KpiGrid, percentOf, roundedShare } from "./KpiCards";

const STATUS_TILES: {
  key: Exclude<keyof ProgramCampaignStatusCounts, "total">;
  label: string;
  dot: string;
  /** Tile background and figure colour, so each state reads at a glance. */
  tint: string;
}[] = [
  {
    key: "active",
    label: "Active",
    dot: "bg-emerald-500",
    tint: "bg-emerald-500/12 text-emerald-700 dark:bg-emerald-400/15 dark:text-emerald-300",
  },
  {
    key: "paused",
    label: "Paused",
    dot: "bg-amber-500",
    tint: "bg-amber-500/12 text-amber-700 dark:bg-amber-400/15 dark:text-amber-300",
  },
  {
    key: "draft",
    label: "Draft",
    dot: "bg-blue-500",
    tint: "bg-blue-500/12 text-blue-700 dark:bg-blue-400/15 dark:text-blue-300",
  },
  {
    key: "ended",
    label: "Ended",
    dot: "bg-violet-500",
    tint: "bg-violet-500/12 text-violet-700 dark:bg-violet-400/15 dark:text-violet-300",
  },
  {
    key: "archived",
    label: "Archived",
    dot: "bg-slate-400",
    tint: "bg-slate-500/12 text-slate-600 dark:bg-slate-400/15 dark:text-slate-300",
  },
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
      {/* One strip, no gaps or dividers: each state is told apart by its colour. */}
      <dl
        className="mt-3 grid overflow-hidden rounded-xl"
        style={{
          gridTemplateColumns: `repeat(${tiles.length}, minmax(0, 1fr))`,
        }}
      >
        {tiles.map((tile) => (
          <div
            key={tile.key}
            className={`min-w-0 px-3 py-2.5 ${tile.tint} ${counts[tile.key] === 0 ? "opacity-60" : ""}`}
          >
            <dd className="text-2xl font-bold">
              {counts[tile.key].toLocaleString()}
            </dd>
            <dt className="mt-0.5 flex items-center gap-1.5 text-[11px] font-medium">
              <span className={`h-2 w-2 shrink-0 rounded-full ${tile.dot}`} />
              <span className="truncate">{tile.label}</span>
            </dt>
          </div>
        ))}
      </dl>
    </div>
  );
};

// Mechanics shown before the table scrolls; the hint below it appears past this.
const MECHANICS_VISIBLE = 4;

const MechanicsPanel: React.FC<SectionProps> = ({ analytics }) => (
  <ChartPanel
    title="Performance by mechanic"
    subtitle="The same metrics, grouped by game."
    isEmpty={analytics.mechanics.length === 0}
    emptyMessage="No campaigns yet."
    className="h-full"
  >
    {/* About four mechanics show at once; the rest scroll under the pinned header. */}
    <div className="max-h-[200px] min-h-0 flex-1 overflow-y-auto">
      <table className="w-full border-collapse text-left text-xs">
        <thead className="sticky top-0 z-10 bg-brand-surface">
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
                <td className="py-1.5 px-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`flex h-6 w-6 items-center justify-center rounded-lg ${game.tile}`}
                    >
                      <Icon className="h-3 w-3" />
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
                <td className="py-1.5 px-2 text-right font-semibold text-brand-text">
                  {row.entries.toLocaleString()}
                </td>
                <td className="py-1.5 px-2 text-right text-brand-text">
                  {formatRate(row.completion_rate)}
                </td>
                <td className="py-1.5 px-2 text-right text-brand-text">
                  {row.rewards.toLocaleString()}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
    {analytics.mechanics.length > MECHANICS_VISIBLE && (
      <p className="mt-2 text-[10px] text-brand-text-muted">
        {analytics.mechanics.length} mechanics · scroll to see them all
      </p>
    )}
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
  const topMechanic = analytics.mechanics.reduce<
    ProgramAnalytics["mechanics"][number] | null
  >((top, row) => (top && top.entries >= row.entries ? top : row), null);

  return (
    <div
      id="program-analytics-dashboard"
      className={`mb-4 space-y-4 transition-opacity ${refreshing ? "opacity-60" : ""}`}
    >
      <SectionTitle index="01">Program totals</SectionTitle>

      <KpiGrid>
        <KpiCard
          label="Total entries"
          kind="Volume"
          tone="blue"
          icon={ClipboardList}
          value={totals.entries.toLocaleString()}
          description="Participations across all campaigns"
          meter={
            topMechanic
              ? {
                  type: "seg",
                  pct: percentOf(topMechanic.entries, totals.entries),
                  left: `Top mechanic · ${gameMeta(topMechanic.game_type).label}`,
                  right: roundedShare(topMechanic.entries, totals.entries),
                }
              : null
          }
        />
        <KpiCard
          label="Prizes distributed"
          kind="Rewards"
          tone="amber"
          icon={Gift}
          value={totals.prizes_distributed.toLocaleString()}
          description="Winning entries across all campaigns"
          meter={{
            type: "seg",
            pct: percentOf(totals.prizes_distributed, totals.entries),
            left: "Win rate",
            right: roundedShare(totals.prizes_distributed, totals.entries),
          }}
        />
        <KpiCard
          label="Unique audience"
          kind="Audience"
          tone="teal"
          icon={Users}
          value={audience.unique_audience.toLocaleString()}
          description="Distinct participants, by phone number"
          meter={{
            type: "seg",
            pct: percentOf(audience.unique_audience, totals.entries),
            left: "Unique per entry",
            right: roundedShare(audience.unique_audience, totals.entries),
          }}
        />
        <KpiCard
          label="Repeat participation"
          kind="Retention"
          tone="vio"
          icon={Repeat}
          value={formatRate(audience.repeat_participation_rate)}
          description={
            audience.repeat_participation_rate === null
              ? "No identified participants yet"
              : `${audience.repeat_participants.toLocaleString()} played 2 or more campaigns`
          }
          meter={{
            type: "seg",
            pct: audience.repeat_participation_rate ?? 0,
            left: "Returning players",
            right:
              audience.repeat_participation_rate === null
                ? "—"
                : `${Math.round(audience.repeat_participation_rate)}%`,
          }}
        />
      </KpiGrid>

      <CampaignStatusPanel analytics={analytics} />

      <SectionTitle index="02">Comparison</SectionTitle>
      <CampaignLeaderboard
        rows={analytics.leaderboard}
        onSelectCampaign={onSelectCampaign}
      />

      <SectionTitle index="03">Segmentation</SectionTitle>
      <TimeSegmentationChart
        hourly={analytics.hourly_distribution}
        weekday={analytics.weekday_distribution}
        timezone={analytics.timezone}
      />
      {/* Left half: devices and mechanics share its height equally; wilayas on the
          right half. The wilaya card opens the full map. */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 grid grid-rows-2 gap-4 lg:col-span-6">
          <div className="min-h-0">
            <OsDonutChart data={analytics.os_distribution} />
          </div>
          <div className="min-h-0">
            <MechanicsPanel analytics={analytics} />
          </div>
        </div>
        <div className="col-span-12 lg:col-span-6">
          <AlgeriaWilayaMap
            locations={analytics.location_distribution}
            unknownCount={analytics.location_unknown_count}
          />
        </div>
      </div>
    </div>
  );
};
