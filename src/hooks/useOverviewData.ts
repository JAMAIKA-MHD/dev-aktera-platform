import { useCallback, useEffect, useState } from "react";

import { toFriendlyErrorMessage } from "../lib/errorMessages";
import {
  fetchActivity,
  fetchOverviewSnapshot,
} from "../services/overviewService";
import type { ActivityEntry, OverviewSnapshot } from "../types";

// Loads one thing for the Overview, with the same three states everywhere.
function useLoaded<T>(load: (() => Promise<T>) | null, failure: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const refetch = useCallback(async () => {
    if (!load) return;
    setLoading(true);
    setError(null);
    try {
      setData(await load());
    } catch (err) {
      setError(toFriendlyErrorMessage(err, failure));
    } finally {
      setLoading(false);
    }
  }, [load, failure]);

  useEffect(() => {
    void refetch();
  }, [refetch]);

  return { data, loading, error, refetch };
}

export function useOverviewSnapshot(
  organizationId: string | null,
  days: number,
) {
  const load = useCallback(
    () => fetchOverviewSnapshot(organizationId as string, days),
    [organizationId, days],
  );
  return useLoaded<OverviewSnapshot>(
    organizationId ? load : null,
    "Your performance could not be loaded.",
  );
}

export function useActivityFeed(organizationId: string | null, limit: number) {
  const load = useCallback(
    () => fetchActivity(organizationId as string, limit),
    [organizationId, limit],
  );
  return useLoaded<ActivityEntry[]>(
    organizationId ? load : null,
    "Team activity could not be loaded.",
  );
}
