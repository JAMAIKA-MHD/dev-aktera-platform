import { useCallback, useEffect, useState } from "react";

import { toFriendlyErrorMessage } from "../lib/errorMessages";
import { supabase } from "../lib/supabase";
import type { TeamMember } from "../types";

interface DbMemberRow {
  id: string;
  full_name: string;
  email: string;
  role: TeamMember["role"];
  invited_at: string | null;
  joined_at: string | null;
}

export function useTeamMembers(organizationId: string | null) {
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!organizationId) {
      setMembers([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    const { data, error: queryError } = await supabase
      .from("profiles")
      .select("id, full_name, email, role, invited_at, joined_at")
      .eq("organization_id", organizationId)
      .order("created_at", { ascending: true });
    if (queryError) {
      setError(
        toFriendlyErrorMessage(queryError, "The team could not be loaded."),
      );
    } else {
      setMembers(
        ((data ?? []) as DbMemberRow[]).map((row) => ({
          id: row.id,
          fullName: row.full_name,
          email: row.email,
          role: row.role,
          pending: Boolean(row.invited_at) && !row.joined_at,
        })),
      );
    }
    setLoading(false);
  }, [organizationId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { members, loading, error, refetch };
}
