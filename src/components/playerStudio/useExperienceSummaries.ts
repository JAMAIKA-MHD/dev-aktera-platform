// When each campaign's Studio design was last saved (table campaign_experiences, backend
// task B1.2). RLS returns the rows of the signed-in member's organization only: no new table,
// no SQL function. A failure never blocks the page: the Design column just shows "—".
import { useCallback, useEffect, useState } from "react";
import type { SupabaseClient } from "@supabase/supabase-js";

import { supabase } from "../../lib/supabase";

export interface ExperienceSummaries {
  savedAt: ReadonlyMap<string, string>; // campaign id → updated_at (ISO)
  loading: boolean;
  failed: boolean;
  refetch: () => Promise<void>;
}

const EMPTY: ReadonlyMap<string, string> = new Map();

export function useExperienceSummaries(
  organizationId: string | null,
  client: Pick<SupabaseClient, "from"> = supabase,
): ExperienceSummaries {
  const [savedAt, setSavedAt] = useState<ReadonlyMap<string, string>>(EMPTY);
  const [loading, setLoading] = useState(organizationId !== null);
  const [failed, setFailed] = useState(false);

  const refetch = useCallback(async () => {
    if (!organizationId) {
      setSavedAt(EMPTY);
      setLoading(false);
      return;
    }
    setLoading(true);
    const { data, error } = await client
      .from("campaign_experiences")
      .select("campaign_id, updated_at");
    if (error || !Array.isArray(data)) {
      // No personal data here: only the error message.
      console.warn(
        "[useExperienceSummaries] could not read the saved designs:",
        error?.message,
      );
      setSavedAt(EMPTY);
      setFailed(true);
    } else {
      setSavedAt(
        new Map(
          (data as { campaign_id: string; updated_at: string }[]).map((row) => [
            row.campaign_id,
            row.updated_at,
          ]),
        ),
      );
      setFailed(false);
    }
    setLoading(false);
  }, [client, organizationId]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { savedAt, loading, failed, refetch };
}
