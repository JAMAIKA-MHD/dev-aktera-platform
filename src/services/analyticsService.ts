import { supabase } from "../lib/supabase";
import {
  AnalyticsSummary,
  PlayerParticipantEntry,
} from "../hooks/useAnalytics";
import {
  CampaignAnalyticsReport,
  CampaignDashboardAnalytics,
  ProgramAnalytics,
} from "../types";

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

/**
 * Loads the per-campaign analytics dashboard. Everything is computed by the
 * `get_campaign_dashboard_analytics` RPC; there is no client-side fallback,
 * so a failure (including missing access to the campaign) is thrown to the caller.
 */
export async function fetchCampaignDashboardAnalytics(
  campaignId: string,
): Promise<CampaignDashboardAnalytics> {
  const { data, error } = await supabase.rpc(
    "get_campaign_dashboard_analytics",
    { p_campaign_id: campaignId },
  );
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Analytics unavailable for this campaign.");
  return data as CampaignDashboardAnalytics;
}

/**
 * Loads the full report payload for one campaign (analytics + participants)
 * from the `get_campaign_analytics_report` RPC. Failures are thrown to the caller.
 */
export async function fetchCampaignAnalyticsReport(
  campaignId: string,
): Promise<CampaignAnalyticsReport> {
  const { data, error } = await supabase.rpc("get_campaign_analytics_report", {
    p_campaign_id: campaignId,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Report unavailable for this campaign.");
  return data as CampaignAnalyticsReport;
}

/**
 * Loads the cross-campaign analytics of an organization. Everything is computed by the
 * `get_program_analytics` RPC; there is no client-side fallback, so a failure (including
 * not being a member of the organization) is thrown to the caller.
 * `from` is a calendar day (YYYY-MM-DD) in the analytics timezone; null means all time.
 */
export async function fetchProgramAnalytics(
  organizationId: string,
  from: string | null,
): Promise<ProgramAnalytics> {
  const { data, error } = await supabase.rpc("get_program_analytics", {
    p_organization_id: organizationId,
    p_from: from,
  });
  if (error) throw new Error(error.message);
  if (!data) throw new Error("Analytics unavailable right now.");
  return data as ProgramAnalytics;
}

/** A row of the `get_campaign_participants` RPC. */
interface ParticipantRow {
  id: string;
  campaign_id: string;
  campaign_name: string | null;
  phone_number: string | null;
  participant_name: string | null;
  is_winner: boolean | null;
  prize_name: string | null;
  quiz_passed: boolean | null;
  coupon_confirmed: boolean | null;
  redeemed_coupon_value: string | null;
  dwell_time_seconds: number | string | null;
  created_at: string;
}

/**
 * Loads the organization's analytics summary (every campaign, or one) and its
 * participants. Both come from the server RPCs `get_campaign_analytics_v2` and
 * `get_campaign_participants`, which run with the caller's rights (RLS limits them to the
 * user's own organization). There is no client-side fallback: a campaign nobody has played
 * comes back with zeros and no participant, and a failure is thrown to the caller.
 */
export async function fetchAnalyticsSummaryService(
  organizationId: string | null,
  selectedCampaignId: string | null,
): Promise<{
  summary: AnalyticsSummary;
  participants: PlayerParticipantEntry[];
}> {
  const campaignId =
    selectedCampaignId === "all" || !selectedCampaignId
      ? null
      : selectedCampaignId;
  const scope = {
    p_organization_id: organizationId,
    p_campaign_id: campaignId,
  };

  const [summaryRes, participantsRes] = await Promise.all([
    supabase.rpc("get_campaign_analytics_v2", scope),
    supabase.rpc("get_campaign_participants", scope),
  ]);
  if (summaryRes.error) throw new Error(summaryRes.error.message);
  if (participantsRes.error) throw new Error(participantsRes.error.message);
  if (!summaryRes.data) throw new Error("Analytics unavailable right now.");

  const rows = (participantsRes.data ?? []) as ParticipantRow[];
  const participants: PlayerParticipantEntry[] = rows.map((row) => ({
    id: row.id,
    campaign_id: row.campaign_id,
    campaign_name: row.campaign_name,
    phone_number: row.phone_number ?? "N/A",
    participant_name: row.participant_name,
    is_winner: !!row.is_winner,
    prize_name: row.prize_name,
    quiz_passed: row.quiz_passed,
    coupon_confirmed: row.coupon_confirmed,
    redeemed_coupon_value: row.redeemed_coupon_value,
    dwell_time_seconds: Number(row.dwell_time_seconds ?? 0),
    created_at: row.created_at,
  }));

  return { summary: summaryRes.data as AnalyticsSummary, participants };
}
