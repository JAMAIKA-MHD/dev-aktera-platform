import { useEffect, useRef, useState, useCallback } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { toFriendlyErrorMessage } from "../lib/errorMessages";
import { fetchAnalyticsSummaryService } from "../services/analyticsService";

export interface CampaignAnalytics {
  campaign_id: string;
  campaign_name: string;
  status: string;
  total_entries: number;
  total_winners: number;
  win_rate: number;
  quiz_pass_rate: number;
  coupon_confirmation_rate: number;
}

export interface HourlyDistributionItem {
  hour: string;
  count: number;
  winners: number;
  label: string;
}

export interface DailyDistributionItem {
  date: string;
  entries: number;
  winners: number;
}

export interface CarrierDistributionItem {
  name: string;
  code: string;
  count: number;
  percentage: number;
  color: string;
}

export interface OSDistribution {
  android: number;
  ios: number;
  desktop: number;
  other: number;
}

export interface PrizeBurnRateItem {
  id: string;
  name: string;
  campaign_id: string;
  quantity: number;
  quantity_won: number;
  remaining: number;
  burn_rate_percentage: number;
}

export interface PlayerParticipantEntry {
  id: string;
  campaign_id: string;
  campaign_name?: string | null;
  phone_number: string;
  participant_name: string | null;
  is_winner: boolean;
  prize_name: string | null;
  quiz_passed: boolean | null;
  coupon_confirmed: boolean | null;
  redeemed_coupon_value: string | null;
  dwell_time_seconds: number;
  created_at: string;
  /** Location captured on the entry (wilaya, else city); raw, null when unknown. */
  wilaya: string | null;
  /** Read from the user agent, as in the device chart. */
  os: PlayerDevice;
}

export type PlayerDevice = "android" | "ios" | "desktop" | "other";

export interface AnalyticsSummary {
  total_impressions: number;
  total_entries: number;
  total_wins: number;
  game_play_rate: number;
  form_completion_rate: number;
  win_rate: number;
  avg_dwell_time_seconds: number;
  active_campaigns: number;
  unique_participants?: number;
  repeat_participants?: number;
  unique_users_count?: number;
  repeat_users_count?: number;
  avg_participations_per_user?: number;
  max_user_participations?: number;
  max_participations_by_single_user?: number;
  quiz_pass_rate?: number;
  quiz_total?: number;
  quiz_passed?: number;
  coupon_confirmation_rate?: number;
  coupon_total?: number;
  coupon_confirmed?: number;
  os_distribution: OSDistribution;
  carrier_distribution: CarrierDistributionItem[];
  prize_burn_rate: PrizeBurnRateItem[];
  campaign_breakdown?: CampaignAnalytics[];
  by_campaign?: CampaignAnalytics[];
  participants?: PlayerParticipantEntry[];
  hourly_distribution: HourlyDistributionItem[];
  daily_distribution: DailyDistributionItem[];
}

export function useAnalytics(selectedCampaignId?: string) {
  const { organization } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  // Only the latest request may update the state: after switching campaigns, a slower
  // answer for the previous selection must not replace the new one.
  const requestIdRef = useRef(0);

  const loadAnalytics = useCallback(
    async (isBackgroundRefresh = false) => {
      const requestId = ++requestIdRef.current;
      if (!isBackgroundRefresh) {
        setLoading(true);
      }
      setError(null);

      try {
        const result = await fetchAnalyticsSummaryService(
          organization?.id ?? null,
          selectedCampaignId ?? null,
        );

        if (requestId !== requestIdRef.current) return;
        if (!result || !result.summary) {
          return;
        }

        const { summary, participants } = result;

        const byCampaignList = Array.isArray(summary.by_campaign)
          ? summary.by_campaign
          : Array.isArray(summary.campaign_breakdown)
            ? summary.campaign_breakdown
            : [];

        const participantsList = Array.isArray(participants)
          ? participants
          : Array.isArray(summary.participants)
            ? summary.participants
            : [];

        // The RPC names these *_users_count; the older names are kept as aliases.
        const uniqueUsers = summary.unique_users_count ?? 0;
        const repeatUsers = summary.repeat_users_count ?? 0;
        const maxUserPlays = summary.max_user_participations ?? 0;

        setAnalytics({
          ...summary,
          by_campaign: byCampaignList,
          campaign_breakdown: byCampaignList,
          active_campaigns: byCampaignList.filter(
            (campaign) => campaign.status === "active",
          ).length,
          unique_users_count: uniqueUsers,
          unique_participants: uniqueUsers,
          repeat_users_count: repeatUsers,
          repeat_participants: repeatUsers,
          max_user_participations: maxUserPlays,
          max_participations_by_single_user: maxUserPlays,
          avg_participations_per_user: summary.avg_participations_per_user ?? 0,
          os_distribution: summary.os_distribution ?? {
            android: 0,
            ios: 0,
            desktop: 0,
            other: 0,
          },
          carrier_distribution: Array.isArray(summary.carrier_distribution)
            ? summary.carrier_distribution
            : [],
          hourly_distribution: Array.isArray(summary.hourly_distribution)
            ? summary.hourly_distribution
            : [],
          daily_distribution: Array.isArray(summary.daily_distribution)
            ? summary.daily_distribution
            : [],
          prize_burn_rate: Array.isArray(summary.prize_burn_rate)
            ? summary.prize_burn_rate
            : [],
          participants: participantsList,
        });
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        if (!isBackgroundRefresh) {
          setError(
            toFriendlyErrorMessage(
              err,
              "Failed to compute campaign business analytics.",
            ),
          );
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [organization?.id, selectedCampaignId],
  );

  useEffect(() => {
    void loadAnalytics(false);

    // 1. Automatic periodic refresh every 10 seconds to keep historical metrics live
    const intervalId = window.setInterval(() => {
      void loadAnalytics(true);
    }, 10000);

    // 2. Supabase Realtime channel subscription listening to live player participations
    const channelId = Math.random().toString(36).substring(2, 9);
    const channelName = organization?.id
      ? `analytics_realtime_${organization.id}_${channelId}`
      : `analytics_realtime_global_${channelId}`;

    const channel = supabase
      .channel(channelName)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "entries",
        },
        () => {
          void loadAnalytics(true);
        },
      )
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "campaign_impressions",
        },
        () => {
          void loadAnalytics(true);
        },
      )
      .subscribe();

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [organization?.id, selectedCampaignId, loadAnalytics]);

  return { analytics, loading, error, refetch: () => loadAnalytics(false) };
}
