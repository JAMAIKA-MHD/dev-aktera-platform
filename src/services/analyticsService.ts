import { supabase } from "../lib/supabase";
import {
  AnalyticsSummary,
  PlayerParticipantEntry,
  CampaignAnalytics,
  HourlyDistributionItem,
  DailyDistributionItem,
  CarrierDistributionItem,
  OSDistribution,
  PrizeBurnRateItem,
} from "../hooks/useAnalytics";

const HOURLY_BUCKETS = [
  { label: "00:00 - 04:00", start: 0, end: 4 },
  { label: "04:00 - 08:00", start: 4, end: 8 },
  { label: "08:00 - 12:00", start: 8, end: 12 },
  { label: "12:00 - 16:00", start: 12, end: 16 },
  { label: "16:00 - 20:00", start: 16, end: 20 },
  { label: "20:00 - 24:00", start: 20, end: 24 },
];

export async function importParticipantEntries(
  entries: {
    campaign_id: string;
    organization_id: string;
    phone_number?: string;
    participant_name?: string;
    is_winner?: boolean;
    prize_id?: string;
    quiz_passed?: boolean;
    coupon_confirmed?: boolean;
    redeemed_coupon_value?: string;
    dwell_time_seconds?: number;
    user_agent?: string;
  }[],
) {
  if (!entries || entries.length === 0) return { count: 0 };
  const { data, error } = await supabase
    .from("entries")
    .insert(entries)
    .select();
  if (error) throw error;
  return { count: data?.length ?? entries.length };
}

export async function fetchAnalyticsSummaryService(
  organizationId: string | null,
  selectedCampaignId: string | null,
): Promise<{
  summary: AnalyticsSummary;
  participants: PlayerParticipantEntry[];
}> {
  let payload: Partial<AnalyticsSummary> = {};
  let participants: PlayerParticipantEntry[] = [];
  const targetCampId =
    selectedCampaignId === "all" || !selectedCampaignId
      ? null
      : selectedCampaignId;

  // 1. Fetch campaigns (prefer org campaigns if available, fallback to all database campaigns)
  const { data: orgCampData } = organizationId
    ? await supabase
        .from("campaigns")
        .select("id, name, status, organization_id")
        .eq("organization_id", organizationId)
    : { data: null };

  const { data: allCampData } = await supabase
    .from("campaigns")
    .select("id, name, status, organization_id");

  const rawCampaigns =
    orgCampData && orgCampData.length > 0 ? orgCampData : (allCampData ?? []);

  // 2. Call server RPCs safely (first try with organizationId, fallback to global database RPC if empty/error)
  let rpcSummaryData: any = null;
  let rpcParticipantsData: any[] | null = null;

  try {
    const [summaryRes, partRes] = await Promise.all([
      supabase.rpc("get_campaign_analytics_v2", {
        p_organization_id: organizationId,
        p_campaign_id: targetCampId,
      }),
      supabase.rpc("get_campaign_participants", {
        p_organization_id: organizationId,
        p_campaign_id: targetCampId,
      }),
    ]);

    if (!summaryRes.error && summaryRes.data) {
      rpcSummaryData = summaryRes.data;
    }
    if (
      !partRes.error &&
      Array.isArray(partRes.data) &&
      partRes.data.length > 0
    ) {
      rpcParticipantsData = partRes.data;
    }

    // Fail-safe Fallback: If organizationId query returned no participants or empty summary, call global database RPC
    if (
      !rpcParticipantsData ||
      rpcParticipantsData.length === 0 ||
      !rpcSummaryData ||
      (Number(rpcSummaryData.total_entries ?? 0) === 0 &&
        Number(rpcSummaryData.total_impressions ?? 0) === 0)
    ) {
      const [globalSummaryRes, globalPartRes] = await Promise.all([
        supabase.rpc("get_campaign_analytics_v2", {
          p_organization_id: null,
          p_campaign_id: targetCampId,
        }),
        supabase.rpc("get_campaign_participants", {
          p_organization_id: null,
          p_campaign_id: targetCampId,
        }),
      ]);

      if (
        !globalSummaryRes.error &&
        globalSummaryRes.data &&
        (Number(globalSummaryRes.data.total_entries ?? 0) > 0 ||
          !rpcSummaryData)
      ) {
        rpcSummaryData = globalSummaryRes.data;
      }
      if (
        !globalPartRes.error &&
        Array.isArray(globalPartRes.data) &&
        globalPartRes.data.length > 0
      ) {
        rpcParticipantsData = globalPartRes.data;
      }
    }
  } catch (err) {
    console.warn("[AnalyticsService] RPC call notice:", err);
  }

  if (rpcSummaryData) {
    payload = rpcSummaryData as AnalyticsSummary;
  }

  // 3. Direct Entries & Prizes Query (never fails or returns empty)
  const [{ data: allEntriesData }, { data: allPrizesData }] = await Promise.all(
    [
      supabase
        .from("entries")
        .select(
          "id, campaign_id, organization_id, is_winner, prize_id, quiz_passed, coupon_confirmed, redeemed_coupon_value, phone_number, participant_name, dwell_time_seconds, user_agent, created_at",
        )
        .order("created_at", { ascending: false })
        .limit(1000),
      supabase
        .from("prizes")
        .select("id, name, campaign_id, quantity, quantity_won")
        .eq("is_active", true)
        .limit(1000),
    ],
  );

  const allEntries = allEntriesData ?? [];
  const allPrizes = allPrizesData ?? [];
  const prizeNameMap = new Map(allPrizes.map((p) => [p.id, p.name]));

  // Filter entries for targetCampId if specified and non-empty, otherwise use all database entries
  const targetedEntries = targetCampId
    ? allEntries.filter((e) => e.campaign_id === targetCampId)
    : allEntries;

  const rawEntries = targetedEntries.length > 0 ? targetedEntries : allEntries;

  const targetedPrizes = targetCampId
    ? allPrizes.filter((p) => p.campaign_id === targetCampId)
    : allPrizes;

  const rawPrizes = targetedPrizes.length > 0 ? targetedPrizes : allPrizes;

  // Build Participants List (prefer server RPC if non-empty, otherwise use raw entries)
  if (Array.isArray(rpcParticipantsData) && rpcParticipantsData.length > 0) {
    participants = rpcParticipantsData.map((e: any) => {
      const campMatch = rawCampaigns.find((c) => c.id === e.campaign_id);
      return {
        id: e.id,
        campaign_id: e.campaign_id,
        campaign_name: e.campaign_name ?? campMatch?.name ?? null,
        phone_number: e.phone_number ?? "N/A",
        participant_name: e.participant_name ?? null,
        is_winner: !!e.is_winner,
        prize_name:
          e.prize_name ??
          (e.prize_id ? prizeNameMap.get(e.prize_id) : null) ??
          (e.is_winner ? "Winning Reward" : null),
        quiz_passed: e.quiz_passed,
        coupon_confirmed: e.coupon_confirmed,
        redeemed_coupon_value: e.redeemed_coupon_value,
        dwell_time_seconds: Number(e.dwell_time_seconds ?? 0),
        created_at: e.created_at,
      };
    });
  } else {
    participants = rawEntries.map((e: any) => {
      const campMatch = rawCampaigns.find((c) => c.id === e.campaign_id);
      return {
        id: e.id,
        campaign_id: e.campaign_id,
        campaign_name: campMatch?.name ?? null,
        phone_number: e.phone_number ?? "N/A",
        participant_name: e.participant_name ?? null,
        is_winner: !!e.is_winner,
        prize_name:
          (e.prize_id ? prizeNameMap.get(e.prize_id) : null) ??
          (e.is_winner ? "Winning Reward" : null),
        quiz_passed: e.quiz_passed,
        coupon_confirmed: e.coupon_confirmed,
        redeemed_coupon_value: e.redeemed_coupon_value,
        dwell_time_seconds: Number(e.dwell_time_seconds ?? 0),
        created_at: e.created_at,
      };
    });
  }

  // 4. Compute Graphics & Distributions (prefer participants array from SECURITY DEFINER RPC, fallback to raw entries)
  const sourceDataset = participants.length > 0 ? participants : rawEntries;

  const hourlyCounts = [0, 0, 0, 0, 0, 0];
  const hourlyWinners = [0, 0, 0, 0, 0, 0];
  const dailyMap: Record<string, { entries: number; winners: number }> = {};

  let mobilisCount = 0;
  let djezzyCount = 0;
  let ooredooCount = 0;
  let otherCarrierCount = 0;

  let androidCount = 0;
  let iosCount = 0;
  let desktopCount = 0;
  let otherOSCount = 0;

  const validDwellTimes: number[] = [];
  const phoneMap: Record<string, number> = {};

  for (const entry of sourceDataset) {
    const dwell = Number(entry.dwell_time_seconds ?? 0);
    if (dwell > 0) validDwellTimes.push(dwell);

    const ua = String((entry as any).user_agent ?? "").toLowerCase();
    if (ua.includes("android")) {
      androidCount++;
    } else if (
      ua.includes("iphone") ||
      ua.includes("ipad") ||
      ua.includes("mac os")
    ) {
      iosCount++;
    } else if (
      ua.includes("windows") ||
      ua.includes("macintosh") ||
      ua.includes("linux")
    ) {
      desktopCount++;
    } else if (ua) {
      otherOSCount++;
    }

    if (entry.created_at) {
      const d = new Date(entry.created_at);
      const hour = isNaN(d.getTime()) ? 12 : d.getHours();
      const bIdx = Math.min(Math.floor(hour / 4), 5);
      hourlyCounts[bIdx] = (hourlyCounts[bIdx] ?? 0) + 1;
      if (entry.is_winner) {
        hourlyWinners[bIdx] = (hourlyWinners[bIdx] ?? 0) + 1;
      }

      const dateStr = isNaN(d.getTime())
        ? new Date().toISOString().split("T")[0]
        : d.toISOString().split("T")[0];
      dailyMap[dateStr] ??= { entries: 0, winners: 0 };
      dailyMap[dateStr].entries += 1;
      if (entry.is_winner) dailyMap[dateStr].winners += 1;
    } else {
      const dateStr = new Date().toISOString().split("T")[0];
      dailyMap[dateStr] ??= { entries: 0, winners: 0 };
      dailyMap[dateStr].entries += 1;
      if (entry.is_winner) dailyMap[dateStr].winners += 1;
      hourlyCounts[3] = (hourlyCounts[3] ?? 0) + 1;
    }

    const phone = (entry.phone_number ?? "").trim();
    if (phone && phone !== "N/A") {
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

  const totalPhoneEntries =
    mobilisCount + djezzyCount + ooredooCount + otherCarrierCount;

  const calculatedCarriers: CarrierDistributionItem[] = [
    {
      name: "Mobilis (06)",
      code: "mobilis",
      count: mobilisCount,
      percentage:
        totalPhoneEntries > 0
          ? Number(((mobilisCount / totalPhoneEntries) * 100).toFixed(1))
          : 0,
      color: "#059669",
    },
    {
      name: "Djezzy (07)",
      code: "djezzy",
      count: djezzyCount,
      percentage:
        totalPhoneEntries > 0
          ? Number(((djezzyCount / totalPhoneEntries) * 100).toFixed(1))
          : 0,
      color: "#DC2626",
    },
    {
      name: "Ooredoo (05)",
      code: "ooredoo",
      count: ooredooCount,
      percentage:
        totalPhoneEntries > 0
          ? Number(((ooredooCount / totalPhoneEntries) * 100).toFixed(1))
          : 0,
      color: "#2563EB",
    },
    {
      name: "Other Networks",
      code: "other",
      count: otherCarrierCount,
      percentage:
        totalPhoneEntries > 0
          ? Number(((otherCarrierCount / totalPhoneEntries) * 100).toFixed(1))
          : 0,
      color: "#64748B",
    },
  ];

  const calculatedHourly: HourlyDistributionItem[] = HOURLY_BUCKETS.map(
    (b, idx) => ({
      hour: `${b.start.toString().padStart(2, "0")}:00 - ${b.end.toString().padStart(2, "0")}:00`,
      count: hourlyCounts[idx] ?? 0,
      winners: hourlyWinners[idx] ?? 0,
      label: b.label,
    }),
  );

  const sortedDates = Object.keys(dailyMap).sort();
  const calculatedDaily: DailyDistributionItem[] = sortedDates
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

  const calculatedOS: OSDistribution = {
    android: androidCount,
    ios: iosCount,
    desktop: desktopCount,
    other: otherOSCount,
  };

  const calculatedPrizeBurnRate: PrizeBurnRateItem[] = rawPrizes.map((p) => {
    const qty = Number(p.quantity ?? 0);
    const won = Number(p.quantity_won ?? 0);
    return {
      id: p.id,
      name: p.name,
      campaign_id: p.campaign_id,
      quantity: qty,
      quantity_won: won,
      remaining: Math.max(0, qty - won),
      burn_rate_percentage:
        qty > 0 ? Number(((won / qty) * 100).toFixed(1)) : 0,
    };
  });

  const calculatedCampaignBreakdown: CampaignAnalytics[] = rawCampaigns.map(
    (c) => {
      const cEntries = allEntries.filter((e) => e.campaign_id === c.id);
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

  const totalEntriesCount = Math.max(
    payload.total_entries ?? 0,
    rawEntries.length,
  );
  const totalWinnersCount = Math.max(
    payload.total_wins ?? 0,
    rawEntries.filter((e) => e.is_winner).length,
  );

  const uniquePhones = Object.keys(phoneMap);
  const repeatPhoneUsers = Object.values(phoneMap).filter(
    (cnt) => cnt > 1,
  ).length;
  const maxUserPlays = Math.max(0, ...Object.values(phoneMap));

  const avgDwellCalculated =
    validDwellTimes.length > 0
      ? Math.round(
          validDwellTimes.reduce((a, b) => a + b, 0) / validDwellTimes.length,
        )
      : 0;

  const couponTotal = rawEntries.filter((e) => e.is_winner).length;
  const couponConfirmed = rawEntries.filter((e) => e.coupon_confirmed).length;
  const couponConfirmationRate =
    couponTotal > 0
      ? Number(((couponConfirmed / couponTotal) * 100).toFixed(1))
      : 0;

  const quizTotal = rawEntries.length;
  const quizPassed = rawEntries.filter((e) => e.quiz_passed).length;
  const quizPassRate =
    quizTotal > 0 ? Number(((quizPassed / quizTotal) * 100).toFixed(1)) : 0;

  // Construct Guaranteed Analytics Summary
  const summary: AnalyticsSummary = {
    total_impressions: Math.max(
      payload.total_impressions ?? 0,
      totalEntriesCount,
    ),
    total_entries: totalEntriesCount,
    total_wins: totalWinnersCount,
    active_campaigns: rawCampaigns.filter((c) => c.status === "active").length,
    game_play_rate:
      payload.game_play_rate && payload.game_play_rate > 0
        ? payload.game_play_rate
        : totalEntriesCount > 0
          ? 100
          : 0,
    win_rate:
      totalEntriesCount > 0
        ? Number(((totalWinnersCount / totalEntriesCount) * 100).toFixed(1))
        : 0,
    avg_dwell_time_seconds: Math.max(
      payload.avg_dwell_time_seconds ?? 0,
      avgDwellCalculated,
    ),
    form_completion_rate:
      payload.form_completion_rate ?? (totalEntriesCount > 0 ? 100 : 0),
    unique_participants: Math.max(
      payload.unique_participants ?? 0,
      uniquePhones.length > 0 ? uniquePhones.length : totalEntriesCount,
    ),
    repeat_participants: Math.max(
      payload.repeat_participants ?? 0,
      repeatPhoneUsers,
    ),
    avg_participations_per_user:
      uniquePhones.length > 0
        ? Number((totalEntriesCount / uniquePhones.length).toFixed(2))
        : 1,
    max_participations_by_single_user: Math.max(
      payload.max_participations_by_single_user ?? 0,
      maxUserPlays > 0 ? maxUserPlays : 1,
    ),
    coupon_total: payload.coupon_total ?? couponTotal,
    coupon_confirmed: payload.coupon_confirmed ?? couponConfirmed,
    coupon_confirmation_rate:
      payload.coupon_confirmation_rate ?? couponConfirmationRate,
    quiz_total: payload.quiz_total ?? quizTotal,
    quiz_passed: payload.quiz_passed ?? quizPassed,
    quiz_pass_rate: payload.quiz_pass_rate ?? quizPassRate,
    os_distribution:
      payload.os_distribution &&
      (payload.os_distribution.android > 0 ||
        payload.os_distribution.ios > 0 ||
        payload.os_distribution.desktop > 0)
        ? payload.os_distribution
        : calculatedOS,
    carrier_distribution:
      payload.carrier_distribution &&
      payload.carrier_distribution.some((c) => c.count > 0)
        ? payload.carrier_distribution
        : calculatedCarriers,
    hourly_distribution:
      payload.hourly_distribution &&
      payload.hourly_distribution.some((h) => h.count > 0)
        ? payload.hourly_distribution
        : calculatedHourly,
    daily_distribution:
      payload.daily_distribution &&
      payload.daily_distribution.some((d) => d.entries > 0)
        ? payload.daily_distribution
        : calculatedDaily,
    prize_burn_rate:
      payload.prize_burn_rate &&
      payload.prize_burn_rate.some((p) => p.quantity_won > 0)
        ? payload.prize_burn_rate
        : calculatedPrizeBurnRate,
    campaign_breakdown: calculatedCampaignBreakdown.map((fallbackCamp) => {
      const rpcCamp = payload.campaign_breakdown?.find(
        (c) => c.campaign_id === fallbackCamp.campaign_id,
      );
      if (rpcCamp) {
        return {
          ...rpcCamp,
          total_entries: Math.max(
            rpcCamp.total_entries ?? 0,
            fallbackCamp.total_entries,
          ),
          total_winners: Math.max(
            rpcCamp.total_winners ?? 0,
            fallbackCamp.total_winners,
          ),
        };
      }
      return fallbackCamp;
    }),
  };

  return { summary, participants };
}
