import { useEffect, useState } from "react";
import { supabase } from "../lib/supabase";
import { useAuth } from "../contexts/AuthContext";
import { toFriendlyErrorMessage } from "../lib/errorMessages";

export interface CampaignAnalytics {
  campaign_id: string;
  campaign_name: string;
  total_entries: number;
  total_winners: number;
  win_rate: number;
  total_prizes: number;
  quiz_passed_count: number;
  quiz_total_count: number;
  quiz_pass_rate: number;
  coupon_confirmed_count: number;
  coupon_total_count: number;
  coupon_confirmation_rate: number;
}

export interface HourlyDistributionItem {
  hour: string; // e.g., "00:00 - 04:00", "04:00 - 08:00", etc.
  count: number;
  winners: number;
  label: string;
}

export interface DailyDistributionItem {
  date: string; // e.g., "Aug 02"
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

export interface AnalyticsSummary {
  total_entries: number;
  total_winners: number;
  win_rate: number;
  total_campaigns: number;
  active_campaigns: number;
  total_prizes_allocated: number;
  quiz_total_count: number;
  quiz_passed_count: number;
  quiz_pass_rate: number;
  coupon_total_count: number;
  coupon_confirmed_count: number;
  coupon_confirmation_rate: number;
  by_campaign: CampaignAnalytics[];
  hourly_distribution: HourlyDistributionItem[];
  daily_distribution: DailyDistributionItem[];
  carrier_distribution: CarrierDistributionItem[];
}

interface DbCampaignRow {
  id: string;
  name: string;
  status: string;
}

interface DbEntryRow {
  id: string;
  campaign_id: string;
  is_winner: boolean;
  quiz_passed: boolean | null;
  coupon_confirmed: boolean | null;
  redeemed_coupon_value: string | null;
  phone_number: string | null;
  created_at: string;
}

interface DbPrizeRow {
  campaign_id: string;
  quantity: number;
}

const HOURLY_BUCKETS = [
  { start: 0, end: 4, label: "00:00 - 04:00 (Night pulse)" },
  { start: 4, end: 8, label: "04:00 - 08:00 (Morning)" },
  { start: 8, end: 12, label: "08:00 - 12:00 (Work hours)" },
  { start: 12, end: 16, label: "12:00 - 16:00 (Midday)" },
  { start: 16, end: 20, label: "16:00 - 20:00 (Evening)" },
  { start: 20, end: 24, label: "20:00 - 00:00 (Prime time)" },
];

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
        const [
          { data: campaignsData, error: campaignsError },
          { data: entriesData, error: entriesError },
          { data: prizesData, error: prizesError },
        ] = await Promise.all([
          supabase
            .from("campaigns")
            .select("id, name, status")
            .eq("organization_id", organization.id)
            .neq("status", "archived"),
          supabase
            .from("entries")
            .select(
              "id, campaign_id, is_winner, quiz_passed, coupon_confirmed, redeemed_coupon_value, phone_number, created_at",
            )
            .eq("organization_id", organization.id),
          supabase
            .from("prizes")
            .select("campaign_id, quantity")
            .eq("organization_id", organization.id),
        ]);

        if (campaignsError) throw campaignsError;
        if (entriesError) throw entriesError;
        if (prizesError) throw prizesError;

        if (cancelled) return;

        const campaigns = (campaignsData as DbCampaignRow[]) ?? [];
        const entries = (entriesData as DbEntryRow[]) ?? [];
        const prizes = (prizesData as DbPrizeRow[]) ?? [];

        // Per campaign trackers
        const entriesByCampaign: Record<string, number> = {};
        const winnersByCampaign: Record<string, number> = {};
        const prizesByCampaign: Record<string, number> = {};
        const quizPassedByCampaign: Record<string, number> = {};
        const quizTotalByCampaign: Record<string, number> = {};
        const couponConfirmedByCampaign: Record<string, number> = {};
        const couponTotalByCampaign: Record<string, number> = {};

        // Hourly buckets tracker (0-5 index)
        const hourlyCounts = [0, 0, 0, 0, 0, 0];
        const hourlyWinners = [0, 0, 0, 0, 0, 0];

        // Daily trend tracker (Key: YYYY-MM-DD)
        const dailyMap: Record<string, { entries: number; winners: number }> =
          {};

        // Carrier distribution tracker
        let mobilisCount = 0;
        let djezzyCount = 0;
        let ooredooCount = 0;
        let otherCarrierCount = 0;

        // Process all entry rows dynamically
        for (const entry of entries) {
          const campId = entry.campaign_id;
          entriesByCampaign[campId] = (entriesByCampaign[campId] ?? 0) + 1;

          if (entry.is_winner) {
            winnersByCampaign[campId] = (winnersByCampaign[campId] ?? 0) + 1;
          }

          // Quiz metrics
          if (entry.quiz_passed !== null && entry.quiz_passed !== undefined) {
            quizTotalByCampaign[campId] =
              (quizTotalByCampaign[campId] ?? 0) + 1;
            if (entry.quiz_passed) {
              quizPassedByCampaign[campId] =
                (quizPassedByCampaign[campId] ?? 0) + 1;
            }
          }

          // Coupon metrics
          if (entry.redeemed_coupon_value || entry.coupon_confirmed !== null) {
            couponTotalByCampaign[campId] =
              (couponTotalByCampaign[campId] ?? 0) + 1;
            if (entry.coupon_confirmed) {
              couponConfirmedByCampaign[campId] =
                (couponConfirmedByCampaign[campId] ?? 0) + 1;
            }
          }

          // Hourly distribution from created_at
          if (entry.created_at) {
            const entryDate = new Date(entry.created_at);
            const hour = entryDate.getHours();
            const bucketIndex = Math.min(Math.floor(hour / 4), 5);
            hourlyCounts[bucketIndex] = (hourlyCounts[bucketIndex] ?? 0) + 1;
            if (entry.is_winner) {
              hourlyWinners[bucketIndex] =
                (hourlyWinners[bucketIndex] ?? 0) + 1;
            }

            // Daily distribution
            const dateStr = entryDate.toISOString().split("T")[0] ?? "Unknown";
            if (!dailyMap[dateStr]) {
              dailyMap[dateStr] = { entries: 0, winners: 0 };
            }
            dailyMap[dateStr].entries += 1;
            if (entry.is_winner) {
              dailyMap[dateStr].winners += 1;
            }
          }

          // Carrier prefix classification (Algerian mobile prefixes: 06=Mobilis, 07=Djezzy, 05=Ooredoo)
          if (entry.phone_number) {
            const cleanPhone = entry.phone_number.replace(/\D/g, "");
            if (cleanPhone.startsWith("06") || cleanPhone.startsWith("2136")) {
              mobilisCount++;
            } else if (
              cleanPhone.startsWith("07") ||
              cleanPhone.startsWith("2137")
            ) {
              djezzyCount++;
            } else if (
              cleanPhone.startsWith("05") ||
              cleanPhone.startsWith("2135")
            ) {
              ooredooCount++;
            } else {
              otherCarrierCount++;
            }
          }
        }

        // Aggregate prizes allocated per campaign
        for (const prize of prizes) {
          prizesByCampaign[prize.campaign_id] =
            (prizesByCampaign[prize.campaign_id] ?? 0) +
            Number(prize.quantity ?? 0);
        }

        // Build CampaignAnalytics list
        const byCampaign: CampaignAnalytics[] = campaigns.map((campaign) => {
          const totalEntries = entriesByCampaign[campaign.id] ?? 0;
          const totalWinners = winnersByCampaign[campaign.id] ?? 0;
          const qTotal = quizTotalByCampaign[campaign.id] ?? 0;
          const qPassed = quizPassedByCampaign[campaign.id] ?? 0;
          const cTotal = couponTotalByCampaign[campaign.id] ?? 0;
          const cConfirmed = couponConfirmedByCampaign[campaign.id] ?? 0;

          return {
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            total_entries: totalEntries,
            total_winners: totalWinners,
            win_rate: totalEntries > 0 ? totalWinners / totalEntries : 0,
            total_prizes: prizesByCampaign[campaign.id] ?? 0,
            quiz_total_count: qTotal,
            quiz_passed_count: qPassed,
            quiz_pass_rate: qTotal > 0 ? qPassed / qTotal : 0,
            coupon_total_count: cTotal,
            coupon_confirmed_count: cConfirmed,
            coupon_confirmation_rate: cTotal > 0 ? cConfirmed / cTotal : 0,
          };
        });

        // Format hourly distribution
        const hourly_distribution: HourlyDistributionItem[] =
          HOURLY_BUCKETS.map((b, idx) => ({
            hour: b.label.split(" ")[0] ?? "",
            label: b.label,
            count: hourlyCounts[idx] ?? 0,
            winners: hourlyWinners[idx] ?? 0,
          }));

        // Format daily distribution (sorted chronologically, last 14 days)
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

        // Format carrier distribution
        const totalPhoneEntries =
          mobilisCount + djezzyCount + ooredooCount + otherCarrierCount;
        const carrier_distribution: CarrierDistributionItem[] = [
          {
            name: "Mobilis (06)",
            code: "mobilis",
            count: mobilisCount,
            percentage:
              totalPhoneEntries > 0
                ? Number(((mobilisCount / totalPhoneEntries) * 100).toFixed(1))
                : 0,
            color: "#059669", // Emerald
          },
          {
            name: "Djezzy (07)",
            code: "djezzy",
            count: djezzyCount,
            percentage:
              totalPhoneEntries > 0
                ? Number(((djezzyCount / totalPhoneEntries) * 100).toFixed(1))
                : 0,
            color: "#DC2626", // Red
          },
          {
            name: "Ooredoo (05)",
            code: "ooredoo",
            count: ooredooCount,
            percentage:
              totalPhoneEntries > 0
                ? Number(((ooredooCount / totalPhoneEntries) * 100).toFixed(1))
                : 0,
            color: "#2563EB", // Blue
          },
          ...(otherCarrierCount > 0
            ? [
                {
                  name: "Other Network",
                  code: "other",
                  count: otherCarrierCount,
                  percentage: Number(
                    ((otherCarrierCount / totalPhoneEntries) * 100).toFixed(1),
                  ),
                  color: "#6B7280",
                },
              ]
            : []),
        ];

        // Overall summary totals
        const totalEntries = entries.length;
        const totalWinners = entries.filter((e) => e.is_winner).length;
        const totalQuizCount = entries.filter(
          (e) => e.quiz_passed !== null && e.quiz_passed !== undefined,
        ).length;
        const totalQuizPassed = entries.filter(
          (e) => e.quiz_passed === true,
        ).length;
        const totalCouponsCount = entries.filter(
          (e) => e.redeemed_coupon_value || e.coupon_confirmed !== null,
        ).length;
        const totalCouponsConfirmed = entries.filter(
          (e) => e.coupon_confirmed === true,
        ).length;
        const totalPrizesAllocated = prizes.reduce(
          (acc, p) => acc + Number(p.quantity ?? 0),
          0,
        );

        setAnalytics({
          total_entries: totalEntries,
          total_winners: totalWinners,
          win_rate: totalEntries > 0 ? totalWinners / totalEntries : 0,
          total_campaigns: campaigns.length,
          active_campaigns: campaigns.filter((c) => c.status === "active")
            .length,
          total_prizes_allocated: totalPrizesAllocated,
          quiz_total_count: totalQuizCount,
          quiz_passed_count: totalQuizPassed,
          quiz_pass_rate:
            totalQuizCount > 0 ? totalQuizPassed / totalQuizCount : 0,
          coupon_total_count: totalCouponsCount,
          coupon_confirmed_count: totalCouponsConfirmed,
          coupon_confirmation_rate:
            totalCouponsCount > 0
              ? totalCouponsConfirmed / totalCouponsCount
              : 0,
          by_campaign: byCampaign,
          hourly_distribution,
          daily_distribution,
          carrier_distribution,
        });
      } catch (err) {
        if (!cancelled) {
          setError(
            toFriendlyErrorMessage(
              err,
              "Unable to load analytics right now. Please try again.",
            ),
          );
          setAnalytics(null);
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
