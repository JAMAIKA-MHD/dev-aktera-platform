import React from "react";
import { CheckCircle2, Flame, Trophy, Users } from "lucide-react";
import { useCampaignAnalytics } from "../../hooks/useCampaignAnalytics";
import { AlgeriaWilayaMap } from "./AlgeriaWilayaMap";
import {
  OsDonutChart,
  ParticipantsLineChart,
  PrizeDistributionAreaChart,
  StatCard,
  TimeSegmentationChart,
} from "./CampaignAnalyticsCharts";

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
      {/* Four cards in one row at every width, like the other analytics sections. */}
      <div className="grid grid-cols-4 gap-2 sm:gap-4">
        <StatCard
          title="Total entries"
          value={analytics.total_entries.toLocaleString()}
          caption={
            analytics.avg_dwell_time_seconds === null
              ? "Participations recorded · no dwell time yet"
              : `Participations recorded · ${formatDuration(analytics.avg_dwell_time_seconds)} average time spent`
          }
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          title="Win rate"
          value={formatRate(analytics.win_rate)}
          caption={`${analytics.total_wins.toLocaleString()} winners of ${analytics.total_entries.toLocaleString()} entries`}
          icon={<Trophy className="w-4 h-4" />}
        />
        <StatCard
          title="Completion rate"
          value={formatRate(analytics.completion_rate)}
          caption={
            analytics.completion_rate === null
              ? "No visitor sessions tracked yet"
              : `${analytics.completed_impressions.toLocaleString()} of ${analytics.total_impressions.toLocaleString()} visitors completed the form`
          }
          icon={<CheckCircle2 className="w-4 h-4" />}
        />
        <StatCard
          title="Prize burn rate"
          value={formatRate(burn.percentage)}
          caption={
            burn.percentage === null
              ? "No prize stock allocated"
              : `${burn.total_won.toLocaleString()} of ${burn.total_quantity.toLocaleString()} prizes won`
          }
          icon={<Flame className="w-4 h-4" />}
        />
      </div>

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
