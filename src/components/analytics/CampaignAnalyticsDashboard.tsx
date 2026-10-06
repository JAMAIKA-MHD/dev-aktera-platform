import React from "react";
import { CheckCircle2, Flame, Timer, Trophy, Users } from "lucide-react";
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

  const burn = analytics.prize_burn_rate;

  return (
    <div id="campaign-analytics-dashboard" className="space-y-4">
      <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-5 gap-4">
        <StatCard
          title="Total entries"
          value={analytics.total_entries.toLocaleString()}
          caption="Participations recorded"
          icon={<Users className="w-4 h-4" />}
        />
        <StatCard
          title="Average dwell time"
          value={formatDuration(analytics.avg_dwell_time_seconds)}
          caption={
            analytics.avg_dwell_time_seconds === null
              ? "No dwell time recorded yet"
              : "Time spent per participant"
          }
          icon={<Timer className="w-4 h-4" />}
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
        <div className="col-span-12 xl:col-span-8">
          <ParticipantsLineChart data={analytics.participants_over_time} />
        </div>
        <div className="col-span-12 xl:col-span-4">
          <OsDonutChart data={analytics.os_distribution} />
        </div>
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 xl:col-span-7">
          <PrizeDistributionAreaChart
            data={analytics.prize_distribution}
            days={analytics.participants_over_time}
          />
        </div>
        <div className="col-span-12 xl:col-span-5">
          <TimeSegmentationChart
            hourly={analytics.hourly_distribution}
            weekday={analytics.weekday_distribution}
            timezone={analytics.timezone}
          />
        </div>
      </div>

      <AlgeriaWilayaMap
        locations={analytics.location_distribution}
        unknownCount={analytics.location_unknown_count}
      />
    </div>
  );
};
