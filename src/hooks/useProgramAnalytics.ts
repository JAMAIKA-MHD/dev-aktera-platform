import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { toFriendlyErrorMessage } from "../lib/errorMessages";
import { fetchProgramAnalytics } from "../services/analyticsService";
import { ProgramAnalytics } from "../types";

const REFRESH_INTERVAL_MS = 60000;
const LIVE_TABLES = ["entries", "campaign_impressions", "campaigns", "prizes"];

/**
 * Cross-campaign analytics of an organization since `from` (a calendar day, or null for all
 * time), kept live through realtime changes and a periodic background refresh. Changing the
 * period keeps the previous numbers on screen until the new ones arrive (`refreshing`).
 */
export function useProgramAnalytics(
  organizationId: string | null,
  from: string | null,
) {
  const [analytics, setAnalytics] = useState<ProgramAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadAnalytics = useCallback(
    async (isBackgroundRefresh = false) => {
      if (!organizationId) return;
      const requestId = ++requestIdRef.current;

      if (!isBackgroundRefresh) {
        setRefreshing(true);
        setError(null);
      }

      try {
        const result = await fetchProgramAnalytics(organizationId, from);
        if (requestId !== requestIdRef.current) return;
        setAnalytics(result);
        setError(null);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        // A failed background refresh keeps the last good data on screen.
        if (!isBackgroundRefresh) {
          setAnalytics(null);
          setError(
            toFriendlyErrorMessage(err, "Failed to load program analytics."),
          );
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [organizationId, from],
  );

  useEffect(() => {
    if (!organizationId) {
      requestIdRef.current++;
      setAnalytics(null);
      setError(null);
      setLoading(false);
      setRefreshing(false);
      return;
    }

    void loadAnalytics(false);

    const intervalId = window.setInterval(() => {
      void loadAnalytics(true);
    }, REFRESH_INTERVAL_MS);

    const filter = `organization_id=eq.${organizationId}`;
    const refresh = () => {
      void loadAnalytics(true);
    };
    const channelId = Math.random().toString(36).substring(2, 9);
    let channel = supabase.channel(
      `program_analytics_${organizationId}_${channelId}`,
    );
    for (const table of LIVE_TABLES) {
      channel = channel.on(
        "postgres_changes",
        { event: "*", schema: "public", table, filter },
        refresh,
      );
    }
    channel.subscribe();

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [organizationId, loadAnalytics]);

  return {
    analytics,
    loading,
    refreshing,
    error,
    refetch: () => loadAnalytics(false),
  };
}
