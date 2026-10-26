import { useCallback, useEffect, useRef, useState } from "react";
import { supabase } from "../lib/supabase";
import { toFriendlyErrorMessage } from "../lib/errorMessages";
import {
  fetchBillingUsageAnalytics,
  fetchRewardAnalytics,
  fetchRewardStockUsage,
} from "../services/analyticsService";
import {
  BillingUsageAnalytics,
  RewardAnalytics,
  RewardCategory,
  RewardStockUsage,
} from "../types";

const REFRESH_INTERVAL_MS = 60000;

/**
 * One analytics payload of an organization, kept live: reloaded when one of `liveTables`
 * changes and on a periodic background refresh. Changing `load` keeps the previous numbers
 * on screen until the new ones arrive (`refreshing`). `load` and `liveTables` must be stable.
 */
function useOrganizationAnalytics<T>(
  organizationId: string | null,
  load: (organizationId: string) => Promise<T>,
  liveTables: readonly string[],
  fallbackError: string,
) {
  const [analytics, setAnalytics] = useState<T | null>(null);
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
        const result = await load(organizationId);
        if (requestId !== requestIdRef.current) return;
        setAnalytics(result);
        setError(null);
      } catch (err) {
        if (requestId !== requestIdRef.current) return;
        // A failed background refresh keeps the last good data on screen.
        if (!isBackgroundRefresh) {
          setAnalytics(null);
          setError(toFriendlyErrorMessage(err, fallbackError));
        }
      } finally {
        if (requestId === requestIdRef.current) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    },
    [organizationId, load, fallbackError],
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
      `org_analytics_${organizationId}_${channelId}`,
    );
    for (const table of liveTables) {
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
  }, [organizationId, loadAnalytics, liveTables]);

  return {
    analytics,
    loading,
    refreshing,
    error,
    refetch: () => loadAnalytics(false),
  };
}

const REWARD_TABLES = [
  "entries",
  "prizes",
  "prize_templates",
  "prize_template_items",
  "campaigns",
] as const;

/** Reward stock analytics of an organization (`get_reward_analytics`): stock right now. */
export function useRewardAnalytics(organizationId: string | null) {
  return useOrganizationAnalytics<RewardAnalytics>(
    organizationId,
    fetchRewardAnalytics,
    REWARD_TABLES,
    "Failed to load reward analytics.",
  );
}

/**
 * How fast the reward stock was used, day by day (`get_reward_stock_usage`), for every
 * reward (`category` null) or one type, since `from` (a calendar day, or null for all time).
 */
export function useRewardStockUsage(
  organizationId: string | null,
  category: RewardCategory | null,
  from: string | null,
) {
  const load = useCallback(
    (id: string): Promise<RewardStockUsage> =>
      fetchRewardStockUsage(id, category, from),
    [category, from],
  );
  return useOrganizationAnalytics(
    organizationId,
    load,
    REWARD_TABLES,
    "Failed to load stock usage.",
  );
}

const BILLING_TABLES = ["entries", "campaigns", "billing"] as const;

/** Plan usage of an organization (`get_billing_usage_analytics`). */
export function useBillingUsageAnalytics(organizationId: string | null) {
  return useOrganizationAnalytics<BillingUsageAnalytics>(
    organizationId,
    fetchBillingUsageAnalytics,
    BILLING_TABLES,
    "Failed to load billing usage.",
  );
}
