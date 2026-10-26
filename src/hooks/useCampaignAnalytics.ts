import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { toFriendlyErrorMessage } from "../lib/errorMessages";
import { fetchCampaignDashboardAnalytics } from "../services/analyticsService";
import { CampaignDashboardAnalytics } from "../types";

const REFRESH_INTERVAL_MS = 30000;

/**
 * Analytics dashboard data for a single campaign, kept live through
 * realtime changes on the campaign's entries / impressions / prizes
 * and a periodic background refresh.
 */
export function useCampaignAnalytics(campaignId: string | null) {
  const [analytics, setAnalytics] = useState<CampaignDashboardAnalytics | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const requestIdRef = useRef(0);

  const loadAnalytics = useCallback(
    async (isBackgroundRefresh = false) => {
      if (!campaignId) return;
      const requestId = ++requestIdRef.current;

      if (!isBackgroundRefresh) {
        setLoading(true);
        setError(null);
      }

      try {
        const result = await fetchCampaignDashboardAnalytics(campaignId);
        if (requestId !== requestIdRef.current) return;
        setAnalytics(result);
        setError(null);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        // A failed background refresh keeps the last good data on screen.
        if (!isBackgroundRefresh) {
          setAnalytics(null);
          setError(
            toFriendlyErrorMessage(
              err,
              "Failed to load analytics for this campaign.",
            ),
          );
        }
      } finally {
        if (requestId === requestIdRef.current) setLoading(false);
      }
    },
    [campaignId],
  );

  useEffect(() => {
    if (!campaignId) {
      requestIdRef.current++;
      setAnalytics(null);
      setError(null);
      setLoading(false);
      return;
    }

    setAnalytics(null);
    void loadAnalytics(false);

    const intervalId = window.setInterval(() => {
      void loadAnalytics(true);
    }, REFRESH_INTERVAL_MS);

    const filter = `campaign_id=eq.${campaignId}`;
    const refresh = () => {
      void loadAnalytics(true);
    };
    const channelId = Math.random().toString(36).substring(2, 9);
    const channel = supabase
      .channel(`campaign_analytics_${campaignId}_${channelId}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "entries", filter },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "campaign_impressions", filter },
        refresh,
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "prizes", filter },
        refresh,
      )
      .subscribe();

    return () => {
      window.clearInterval(intervalId);
      void supabase.removeChannel(channel);
    };
  }, [campaignId, loadAnalytics]);

  return { analytics, loading, error, refetch: () => loadAnalytics(false) };
}
