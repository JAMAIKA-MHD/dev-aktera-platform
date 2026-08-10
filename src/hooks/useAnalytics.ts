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
  unique_users_count: number;
  repeat_users_count: number;
  avg_participations_per_user: number;
  max_user_participations: number;
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

export function useAnalytics(selectedCampaignId?: string) {
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
        let payload: Partial<AnalyticsSummary> = {};
        const targetCampId =
          selectedCampaignId === "all" || !selectedCampaignId
            ? null
            : selectedCampaignId;

        // 1. Try PostgreSQL Analytics RPC
        const { data: rpcData, error: rpcError } = await supabase.rpc(
          "get_campaign_analytics_v2",
          {
            p_organization_id: organization.id,
            p_campaign_id: targetCampId,
          },
        );

        if (!rpcError && rpcData) {
          payload = rpcData as unknown as AnalyticsSummary;
        }

        if (cancelled) return;

        // 2. Fetch raw tables for fallback & timeline calculations
        let entriesQuery = supabase
          .from("entries")
          .select(
            "id, campaign_id, is_winner, quiz_passed, coupon_confirmed, redeemed_coupon_value, phone_number, created_at",
          )
          .eq("organization_id", organization.id);

        let prizesQuery = supabase
          .from("prizes")
          .select("id, name, campaign_id, quantity, quantity_won")
          .eq("organization_id", organization.id)
          .eq("is_active", true);

        if (targetCampId) {
          entriesQuery = entriesQuery.eq("campaign_id", targetCampId);
          prizesQuery = prizesQuery.eq("campaign_id", targetCampId);
        }

        const [
          { data: campaignsData },
          { data: entriesData },
          { data: prizesData },
        ] = await Promise.all([
          supabase
            .from("campaigns")
            .select("id, name, status")
            .eq("organization_id", organization.id)
            .neq("status", "archived"),
          entriesQuery,
          prizesQuery,
        ]);

        if (cancelled) return;

        const rawEntries = entriesData ?? [];
        const rawCampaigns = campaignsData ?? [];
        const rawPrizes = prizesData ?? [];

        // Hourly buckets tracker
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

        // Fallback Carrier & User repeat tracker
        let mobilisCount = 0;
        let djezzyCount = 0;
        let ooredooCount = 0;
        let otherCarrierCount = 0;

        const phoneMap: Record<string, number> = {};

        for (const entry of rawEntries) {
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

          const phone = (entry.phone_number ?? "").trim();
          if (phone) {
            phoneMap[phone] = (phoneMap[phone] ?? 0) + 1;
            if (phone.startsWith("06") || phone.startsWith("2136")) {
              mobilisCount++;
            } else if (phone.startsWith("07") || phone.startsWith("2137")) {
              djezzyCount++;
            } else if (phone.startsWith("05") || phone.startsWith("2135")) {
              ooredooCount++;
            } else {
              otherCarrierCount++;
            }
          }
        }

        const uniquePhones = Object.keys(phoneMap);
        const uniqueUsersFallback = uniquePhones.length;
        const repeatUsersFallback = uniquePhones.filter(
          (p) => phoneMap[p] > 1,
        ).length;
        const maxUserEntriesFallback = uniquePhones.reduce(
          (max, p) => Math.max(max, phoneMap[p]),
          0,
        );
        const avgParticipationsFallback =
          uniqueUsersFallback > 0
            ? Number((rawEntries.length / uniqueUsersFallback).toFixed(2))
            : 0;

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

        const prizeBurnRate: PrizeBurnRateItem[] = rawPrizes.map((p) => {
          const qty = Number(p.quantity ?? 0);
          const won = Number(p.quantity_won ?? 0);
          const burnRate = qty > 0 ? Number(((won / qty) * 100).toFixed(1)) : 0;
          return {
            id: p.id,
            name: p.name,
            campaign_id: p.campaign_id,
            quantity: qty,
            quantity_won: won,
            remaining: Math.max(0, qty - won),
            burn_rate_percentage: burnRate,
          };
        });

        const totalEntriesFallback = rawEntries.length;
        const totalWinsFallback = rawEntries.filter((e) => e.is_winner).length;
        const totalPhoneEntriesFallback =
          mobilisCount + djezzyCount + ooredooCount + otherCarrierCount;

        const fallbackCarriers: CarrierDistributionItem[] = [
          {
            name: "Mobilis (06)",
            code: "mobilis",
            count: mobilisCount,
            percentage:
              totalPhoneEntriesFallback > 0
                ? Number(
                    ((mobilisCount / totalPhoneEntriesFallback) * 100).toFixed(
                      1,
                    ),
                  )
                : 0,
            color: "#059669",
          },
          {
            name: "Djezzy (07)",
            code: "djezzy",
            count: djezzyCount,
            percentage:
              totalPhoneEntriesFallback > 0
                ? Number(
                    ((djezzyCount / totalPhoneEntriesFallback) * 100).toFixed(
                      1,
                    ),
                  )
                : 0,
            color: "#DC2626",
          },
          {
            name: "Ooredoo (05)",
            code: "ooredoo",
            count: ooredooCount,
            percentage:
              totalPhoneEntriesFallback > 0
                ? Number(
                    ((ooredooCount / totalPhoneEntriesFallback) * 100).toFixed(
                      1,
                    ),
                  )
                : 0,
            color: "#2563EB",
          },
          {
            name: "Other Networks",
            code: "other",
            count: otherCarrierCount,
            percentage:
              totalPhoneEntriesFallback > 0
                ? Number(
                    (
                      (otherCarrierCount / totalPhoneEntriesFallback) *
                      100
                    ).toFixed(1),
                  )
                : 0,
            color: "#64748B",
          },
        ];

        const fallbackByCampaign: CampaignAnalytics[] = rawCampaigns.map(
          (c) => {
            const cEntries = rawEntries.filter((e) => e.campaign_id === c.id);
            const cWins = cEntries.filter((e) => e.is_winner).length;
            const cWinRate =
              cEntries.length > 0
                ? Number(((cWins / cEntries.length) * 100).toFixed(1))
                : 0;

            return {
              campaign_id: c.id,
              campaign_name: c.name,
              status: c.status,
              total_entries: cEntries.length,
              total_winners: cWins,
              win_rate: cWinRate,
              quiz_pass_rate: 0,
              coupon_confirmation_rate: 0,
            };
          },
        );

        const completeSummary: AnalyticsSummary = {
          total_impressions: payload.total_impressions ?? totalEntriesFallback,
          total_entries: payload.total_entries ?? totalEntriesFallback,
          total_wins: payload.total_wins ?? totalWinsFallback,
          game_play_rate: payload.game_play_rate ?? 100,
          form_completion_rate: payload.form_completion_rate ?? 100,
          win_rate:
            payload.win_rate ??
            (totalEntriesFallback > 0
              ? Number(
                  ((totalWinsFallback / totalEntriesFallback) * 100).toFixed(1),
                )
              : 0),
          avg_dwell_time_seconds: payload.avg_dwell_time_seconds ?? 0,
          active_campaigns: rawCampaigns.filter((c) => c.status === "active")
            .length,
          unique_users_count: payload.unique_users_count ?? uniqueUsersFallback,
          repeat_users_count: payload.repeat_users_count ?? repeatUsersFallback,
          avg_participations_per_user:
            payload.avg_participations_per_user ?? avgParticipationsFallback,
          max_user_participations:
            payload.max_user_participations ?? maxUserEntriesFallback,
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
          carrier_distribution: payload.carrier_distribution?.length
            ? payload.carrier_distribution
            : fallbackCarriers,
          prize_burn_rate: payload.prize_burn_rate?.length
            ? payload.prize_burn_rate
            : prizeBurnRate,
          by_campaign: payload.by_campaign?.length
            ? payload.by_campaign
            : fallbackByCampaign,
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
  }, [organization, selectedCampaignId]);

  return { analytics, loading, error };
}
