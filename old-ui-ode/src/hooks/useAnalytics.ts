/**
 * useAnalytics — Fetch aggregate analytics for the current organization.
 *
 * Computes high-level metrics across all campaigns: total entries,
 * total winners, win rate, total prize value distributed, and
 * per-campaign breakdowns. This powers the analytics dashboard page.
 *
 * The aggregation is done client-side from the entries and prizes
 * fetched via RLS-scoped queries. For larger datasets this should be
 * moved to a database view or edge function, but for the initial
 * implementation client-side aggregation is sufficient.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../context/AuthContext';
import { toFriendlyErrorMessage } from '../lib/errorMessages';
import type { Entry, Campaign, Prize } from '../types';

/** Per-campaign analytics breakdown. */
export interface CampaignAnalytics {
  /** The campaign's UUID. */
  campaign_id: string;
  /** The campaign's display name. */
  campaign_name: string;
  /** Total entries submitted. */
  total_entries: number;
  /** Number of winning entries. */
  total_winners: number;
  /** Win rate (0–1). */
  win_rate: number;
  /** Number of prizes allocated. */
  total_prizes: number;
}

/** Organization-level aggregate metrics. */
export interface AnalyticsSummary {
  /** Total entries across all campaigns. */
  total_entries: number;
  /** Total winning entries across all campaigns. */
  total_winners: number;
  /** Overall win rate (0–1). */
  win_rate: number;
  /** Total number of campaigns (excluding archived). */
  total_campaigns: number;
  /** Number of currently active campaigns. */
  active_campaigns: number;
  /** Per-campaign breakdown. */
  by_campaign: CampaignAnalytics[];
}

/** Return type of the hook. */
interface UseAnalyticsResult {
  /** The computed analytics summary, or null while loading. */
  analytics: AnalyticsSummary | null;
  /** True while the queries are in flight. */
  loading: boolean;
  /** Error message if any query failed, null otherwise. */
  error: string | null;
}

export function useAnalytics(): UseAnalyticsResult {
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

    const fetchAnalytics = async () => {
      try {
        // Fetch all non-archived campaigns for the org.
        const { data: campaignsData, error: campaignsError } = await supabase
          .from('campaigns')
          .select('*')
          .eq('organization_id', organization.id)
          .neq('status', 'archived');

        if (campaignsError) throw campaignsError;
        const campaigns = (campaignsData as Campaign[]) ?? [];

        // Fetch all entries for the org (RLS scopes to own org).
        const { data: entriesData, error: entriesError } = await supabase
          .from('entries')
          .select('*')
          .eq('organization_id', organization.id);

        if (entriesError) throw entriesError;
        const entries = (entriesData as Entry[]) ?? [];

        // Fetch all prizes for the org (for per-campaign prize counts).
        const { data: prizesData, error: prizesError } = await supabase
          .from('prizes')
          .select('*')
          .eq('organization_id', organization.id);

        if (prizesError) throw prizesError;
        const prizes = (prizesData as Prize[]) ?? [];

        if (cancelled) return;

        // Build per-campaign breakdown.
        const byCampaign: CampaignAnalytics[] = campaigns.map((c) => {
          const campaignEntries = entries.filter((e) => e.campaign_id === c.id);
          const campaignWinners = campaignEntries.filter((e) => e.is_winner);
          const campaignPrizes = prizes.filter((p) => p.campaign_id === c.id);
          return {
            campaign_id: c.id,
            campaign_name: c.name,
            total_entries: campaignEntries.length,
            total_winners: campaignWinners.length,
            win_rate: campaignEntries.length > 0
              ? campaignWinners.length / campaignEntries.length
              : 0,
            total_prizes: campaignPrizes.length,
          };
        });

        // Compute org-level aggregates.
        const totalEntries = entries.length;
        const totalWinners = entries.filter((e) => e.is_winner).length;
        const activeCampaigns = campaigns.filter((c) => c.status === 'active').length;

        const summary: AnalyticsSummary = {
          total_entries: totalEntries,
          total_winners: totalWinners,
          win_rate: totalEntries > 0 ? totalWinners / totalEntries : 0,
          total_campaigns: campaigns.length,
          active_campaigns: activeCampaigns,
          by_campaign: byCampaign,
        };

        setError(null);
        setAnalytics(summary);
      } catch (err: unknown) {
        if (!cancelled) {
          setError(
            toFriendlyErrorMessage(err, {
              fallback: 'Unable to load analytics right now. Please try again.',
            }),
          );
          setAnalytics(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    fetchAnalytics();

    return () => {
      cancelled = true;
    };
  }, [organization]);

  return { analytics, loading, error };
}

export default useAnalytics;
