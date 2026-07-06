/**
 * useCampaigns — Fetch all campaigns for the current organization.
 *
 * Returns campaigns filtered by the authenticated user's organization.
 * When `includeArchived` is false, archived campaigns are excluded.
 * Exposes `loading` and `error` states for UI consumption.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toFriendlyErrorMessage } from '../lib/errorMessages';
import { useAuth } from '../context/AuthContext';
import type { Campaign } from '../types';

/** Return type of the hook. */
interface UseCampaignsResult {
  /** Array of campaigns belonging to the org. */
  campaigns: Campaign[];
  /** True while the initial query is in flight. */
  loading: boolean;
  /** Error message if the query failed, null otherwise. */
  error: string | null;
  /** Re-run the query (e.g. after creating or updating a campaign). */
  refetch: () => void;
}

/**
 * @param includeArchived - When false (default), archived campaigns are excluded.
 */
export function useCampaigns(includeArchived = false): UseCampaignsResult {
  const { organization } = useAuth();
  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchFlag, setRefetchFlag] = useState(0);

  // Trigger a refetch by toggling the flag.
  const refetch = useCallback(() => setRefetchFlag((f) => f + 1), []);

  useEffect(() => {
    // Don't query until we have an organization id.
    if (!organization) {
      setCampaigns([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    /**
     * Build and execute the query. We filter by organization_id (RLS
     * also enforces this, but the filter reduces payload size and
     * makes the query deterministic).
     */
    const fetchCampaigns = async () => {
      let query = supabase
        .from('campaigns')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      // Exclude archived campaigns unless explicitly requested.
      if (!includeArchived) {
        query = query.neq('status', 'archived');
      }

      const { data, error: queryError } = await query;

      if (cancelled) return;

      if (queryError) {
        setError(
          toFriendlyErrorMessage(queryError, {
            fallback: 'Failed to load campaigns. Please try again.',
          }),
        );
        setCampaigns([]);
      } else {
        setError(null);
        setCampaigns((data as Campaign[]) ?? []);
      }
      setLoading(false);
    };

    fetchCampaigns();

    // Cleanup: prevent setting state after unmount.
    return () => {
      cancelled = true;
    };
  }, [organization, includeArchived, refetchFlag]);

  return { campaigns, loading, error, refetch };
}

export default useCampaigns;
