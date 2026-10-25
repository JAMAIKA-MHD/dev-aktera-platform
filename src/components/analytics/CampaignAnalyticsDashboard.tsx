import React from "react";
import { CheckCircle2, ClipboardList, Flame, Trophy } from "lucide-react";
import { useCampaignAnalytics } from "../../hooks/useCampaignAnalytics";
import { AlgeriaWilayaMap } from "./AlgeriaWilayaMap";
import {
  OsDonutChart,
  ParticipantsLineChart,
  PrizeDistributionAreaChart,
  TimeSegmentationChart,
} from "./CampaignAnalyticsCharts";
import { KpiCard, KpiGrid, percentOf, roundedShare } from "./KpiCards";

import {
  formatDuration,
  formatRate,
} from "../../lib/campaignAnalyticsTransforms";

interface CampaignAnalyticsDashboardProps {
  campaignId: string;
}

/**
 * Analytics dashboard for a single campaign.
 */
export const CampaignAnalyticsDashboard: React.FC<
  CampaignAnalyticsDashboardProps
> = ({ campaignId }) => {
  const { analytics, loading, error } = useCampaignAnalytics(campaignId);

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
        {error || "Analytics unavailable for this campaign right now."}
      </div>
    );
  }

  // Nobody has opened or played the campaign: there is nothing to chart yet.
  if (analytics.total_entries === 0 && analytics.total_impressions === 0) {
    return (
      <div className="glass-panel rounded-xl px-6 py-14 text-center">
        <h2 className="text-base font-semibold text-brand-text">
          No analytics yet for {analytics.campaign.name}
        </h2>
        <p className="mt-1 text-xs text-brand-text-muted">
          Nobody has opened or played this campaign so far. Its numbers appear
          here after the first visit.
        </p>
      </div>
    );
  }

  const burn = analytics.prize_burn_rate;

  return (
    <div id="campaign-analytics-dashboard" className="space-y-4">
      <KpiGrid>
        <KpiCard
          label="Total entries"
          kind="Volume"
          tone="blue"
          icon={ClipboardList}
          value={analytics.total_entries.toLocaleString()}
          description={
            analytics.avg_dwell_time_seconds === null
              ? "Participations recorded · no dwell time yet"
              : `Participations recorded · ${formatDuration(analytics.avg_dwell_time_seconds)} average time spent`
          }
        />
        <KpiCard
          label="Win rate"
          kind="Rewards"
          tone="amber"
          icon={Trophy}
          value={formatRate(analytics.win_rate)}
          description={`${analytics.total_wins.toLocaleString()} winners of ${analytics.total_entries.toLocaleString()} entries`}
          meter={{
            type: "seg",
            pct: percentOf(analytics.total_wins, analytics.total_entries),
            left: "Winners per entry",
            right: roundedShare(analytics.total_wins, analytics.total_entries),
          }}
        />
        <KpiCard
          label="Completion rate"
          kind="Audience"
          tone="teal"
          icon={CheckCircle2}
          value={formatRate(analytics.completion_rate)}
          description={
            analytics.completion_rate === null
              ? "No visitor sessions tracked yet"
              : `${analytics.completed_impressions.toLocaleString()} of ${analytics.total_impressions.toLocaleString()} visitors completed the form`
          }
          meter={{
            type: "seg",
            pct: percentOf(
              analytics.completed_impressions,
              analytics.total_impressions,
            ),
            left: "Visitors who completed",
            right: roundedShare(
              analytics.completed_impressions,
              analytics.total_impressions,
            ),
          }}
        />
        <KpiCard
          label="Prize burn rate"
          kind="Stock"
          tone="vio"
          icon={Flame}
          value={formatRate(burn.percentage)}
          description={
            burn.percentage === null
              ? "No prize stock allocated"
              : `${burn.total_won.toLocaleString()} of ${burn.total_quantity.toLocaleString()} prizes won`
          }
          meter={{
            type: "seg",
            pct: percentOf(burn.total_won, burn.total_quantity),
            left: "Prizes won of stock",
            right: roundedShare(burn.total_won, burn.total_quantity),
          }}
        />
      </KpiGrid>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-7">
          <ParticipantsLineChart
            key={campaignId}
            data={analytics.participants_over_time}
            campaign={analytics.campaign}
            timezone={analytics.timezone}
          />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <PrizeDistributionAreaChart
            data={analytics.prize_distribution}
            days={analytics.participants_over_time}
          />
        </div>
      </div>

      <TimeSegmentationChart
        hourly={analytics.hourly_distribution}
        weekday={analytics.weekday_distribution}
        timezone={analytics.timezone}
      />

      {/* Devices and wilayas: half a row each; the wilaya card opens the full map. */}
      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-6">
          <OsDonutChart data={analytics.os_distribution} layout="fill" />
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
