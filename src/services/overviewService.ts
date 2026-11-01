// What the Overview reads besides the campaigns and rewards the dashboard already holds.
import { supabase } from "../lib/supabase";
import type { ActivityEntry, OverviewSnapshot } from "../types";

interface DbActivityRow {
  id: string;
  actor_name: string;
  category: ActivityEntry["category"];
  verb: string;
  object_name: string;
  object_id: string | null;
  detail: string | null;
  created_at: string;
}

export async function fetchOverviewSnapshot(
  organizationId: string,
  days: number,
): Promise<OverviewSnapshot> {
  const { data, error } = await supabase.rpc("get_overview_snapshot", {
    p_organization_id: organizationId,
    p_days: days,
  });
  if (error) throw error;
  const row = data as {
    total_participants: number;
    participants: number;
    previous_participants: number;
    claimed: number;
    redeemed: number;
    previous_claimed: number;
    previous_redeemed: number;
    available: number;
    daily: number[];
  };
  return {
    days,
    totalParticipants: row.total_participants,
    participants: row.participants,
    previousParticipants: row.previous_participants,
    claimed: row.claimed,
    redeemed: row.redeemed,
    previousClaimed: row.previous_claimed,
    previousRedeemed: row.previous_redeemed,
    available: row.available,
    daily: row.daily,
  };
}

export async function fetchActivity(
  organizationId: string,
  limit: number,
): Promise<ActivityEntry[]> {
  const { data, error } = await supabase
    .from("activity_log")
    .select(
      "id, actor_name, category, verb, object_name, object_id, detail, created_at",
    )
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  if (error) throw error;
  return ((data ?? []) as DbActivityRow[]).map((row) => ({
    id: row.id,
    actorName: row.actor_name,
    category: row.category,
    verb: row.verb,
    objectName: row.object_name,
    objectId: row.object_id,
    detail: row.detail,
    createdAt: row.created_at,
  }));
}
