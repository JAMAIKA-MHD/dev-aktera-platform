import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { toFriendlyErrorMessage } from "../lib/errorMessages";

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

export interface AnalyticsSummary {
  total_impressions: number;
  total_entries: number;
  total_wins: number;
  game_play_rate: number;
  form_completion_rate: number;
  win_rate: number;
  avg_dwell_time_seconds: number;
  active_campaigns: number;
  quiz_pass_rate: number;
  quiz_total: number;
  quiz_passed: number;
  coupon_confirmation_rate: number;
  coupon_total: number;
  coupon_confirmed: number;
  os_distribution: OSDistribution;
  carrier_distribution: CarrierDistributionItem[];
  prize_burn_rate: PrizeBurnRateItem[];
  by_campaign: CampaignAnalytics[];
  hourly_distribution: HourlyDistributionItem[];
  daily_distribution: DailyDistributionItem[];
}

export function useAnalytics() {
  const { organization } = useAuth();
  const [analytics, setAnalytics] = useState<AnalyticsSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!organization) {
      setAnalytics(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);
    setError(null);

    const fetchAnalytics = async () => {
      try {
        // Execute PostgreSQL Analytics RPC
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "get_campaign_analytics_v2",
          { p_organization_id: organization.id },
        );

        if (rpcError) throw rpcError;
        if (cancelled) return;

        const payload = rpcData as unknown as AnalyticsSummary;

        // Fetch fallback timelines if needed
        const [{ data: entriesData }, { data: prizesData }] = await Promise.all(
          [
            supabase
              .from("entries")
              .select("created_at, is_winner")
              .eq("organization_id", organization.id),
            supabase
              .from("prizes")
              .select("id, name, campaign_id, quantity, quantity_won")
              .eq("organization_id", organization.id)
              .eq("is_active", true),
          ],
        );

        // Compute hourly buckets
        const HOURLY_BUCKETS = [
          { start: 0, end: 4, label: "00:00 - 04:00 (Night pulse)" },
          { start: 4, end: 8, label: "04:00 - 08:00 (Morning)" },
          { start: 8, end: 12, label: "08:00 - 12:00 (Work hours)" },
          { start: 12, end: 16, label: "12:00 - 16:00 (Midday)" },
          { start: 16, end: 20, label: "16:00 - 20:00 (Evening)" },
          { start: 20, end: 24, label: "20:00 - 00:00 (Prime time)" },
        ];

        const hourlyCounts = [0, 0, 0, 0, 0, 0];
        const hourlyWinners = [0, 0, 0, 0, 0, 0];
        const dailyMap: Record<string, { entries: number; winners: number }> =
          {};

        for (const entry of entriesData ?? []) {
          if (entry.created_at) {
            const d = new Date(entry.created_at);
            const hour = d.getHours();
            const bIdx = Math.min(Math.floor(hour / 4), 5);
            hourlyCounts[bIdx] = (hourlyCounts[bIdx] ?? 0) + 1;
            if (entry.is_winner) {
              hourlyWinners[bIdx] = (hourlyWinners[bIdx] ?? 0) + 1;
            }

            const dateStr = d.toISOString().split("T")[0];
            dailyMap[dateStr] ??= { entries: 0, winners: 0 };
            dailyMap[dateStr].entries += 1;
            if (entry.is_winner) dailyMap[dateStr].winners += 1;
          }
        }

        const hourly_distribution: HourlyDistributionItem[] =
          HOURLY_BUCKETS.map((b, idx) => ({
            hour: `${b.start.toString().padStart(2, "0")}:00 - ${b.end.toString().padStart(2, "0")}:00`,
            count: hourlyCounts[idx] ?? 0,
            winners: hourlyWinners[idx] ?? 0,
            label: b.label,
          }));

        const sortedDates = Object.keys(dailyMap).sort();
        const daily_distribution: DailyDistributionItem[] = sortedDates
          .slice(-14)
          .map((dStr) => {
            const dObj = new Date(dStr);
            const formattedLabel = isNaN(dObj.getTime())
              ? dStr
              : dObj.toLocaleDateString("en-US", {
                  month: "short",
                  day: "numeric",
                });
            return {
              date: formattedLabel,
              entries: dailyMap[dStr]?.entries ?? 0,
              winners: dailyMap[dStr]?.winners ?? 0,
            };
          });

        const prizeBurnRate: PrizeBurnRateItem[] = (prizesData ?? []).map(
          (p) => {
            const qty = Number(p.quantity ?? 0);
            const won = Number(p.quantity_won ?? 0);
            const burnRate =
              qty > 0 ? Number(((won / qty) * 100).toFixed(1)) : 0;
            return {
              id: p.id,
              name: p.name,
              campaign_id: p.campaign_id,
              quantity: qty,
              quantity_won: won,
              remaining: Math.max(0, qty - won),
              burn_rate_percentage: burnRate,
            };
          },
        );

        const completeSummary: AnalyticsSummary = {
          total_impressions: payload.total_impressions ?? 0,
          total_entries: payload.total_entries ?? 0,
          total_wins: payload.total_wins ?? 0,
          game_play_rate: payload.game_play_rate ?? 0,
          form_completion_rate: payload.form_completion_rate ?? 0,
          win_rate: payload.win_rate ?? 0,
          avg_dwell_time_seconds: payload.avg_dwell_time_seconds ?? 0,
          active_campaigns: (payload.by_campaign ?? []).filter(
            (c) => c.status === "active",
          ).length,
          quiz_pass_rate: payload.quiz_pass_rate ?? 0,
          quiz_total: payload.quiz_total ?? 0,
          quiz_passed: payload.quiz_passed ?? 0,
          coupon_confirmation_rate: payload.coupon_confirmation_rate ?? 0,
          coupon_total: payload.coupon_total ?? 0,
          coupon_confirmed: payload.coupon_confirmed ?? 0,
          os_distribution: payload.os_distribution ?? {
            android: 0,
            ios: 0,
            desktop: 0,
            other: 0,
          },
          carrier_distribution: payload.carrier_distribution ?? [],
          prize_burn_rate: payload.prize_burn_rate?.length
            ? payload.prize_burn_rate
            : prizeBurnRate,
          by_campaign: payload.by_campaign ?? [],
          hourly_distribution,
          daily_distribution,
        };

        setAnalytics(completeSummary);
      } catch (err) {
        if (!cancelled) {
          setError(
            toFriendlyErrorMessage(
              err,
              "Failed to compute campaign business analytics.",
            ),
          );
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchAnalytics();

    return () => {
      cancelled = true;
    };
  }, [organization]);

  return { analytics, loading, error };
}
