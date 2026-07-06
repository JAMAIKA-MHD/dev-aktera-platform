/**
 * useCampaign — Fetch a single campaign by its UUID.
 *
 * Used by the campaign detail / edit pages and by the public play
 * route (which fetches by slug instead — see useCampaignBySlug below).
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toFriendlyErrorMessage } from '../lib/errorMessages';
import type { Campaign } from '../types';

/** Return type of the hook. */
interface UseCampaignResult {
  /** The campaign, or null if not found / still loading. */
  campaign: Campaign | null;
  /** True while the query is in flight. */
  loading: boolean;
  /** Error message if the query failed, null otherwise. */
  error: string | null;
}

/**
 * @param id - The campaign's UUID. When null/undefined, the hook returns
 *             a null campaign with no error (useful for "create" pages).
 */
export function useCampaign(id: string | null | undefined): UseCampaignResult {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // No id → nothing to fetch (e.g. on a "new campaign" page).
    if (!id) {
      setCampaign(null);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchCampaign = async () => {
      const { data, error: queryError } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', id)
        .maybeSingle();

      if (cancelled) return;

      if (queryError) {
        setError(
          toFriendlyErrorMessage(queryError, {
            fallback: 'Failed to load campaign details. Please try again.',
          }),
        );
        setCampaign(null);
      } else {
        setError(null);
        setCampaign(data as Campaign | null);
      }
      setLoading(false);
    };

    fetchCampaign();

    return () => {
      cancelled = true;
    };
  }, [id]);

  return { campaign, loading, error };
}

export default useCampaign;
