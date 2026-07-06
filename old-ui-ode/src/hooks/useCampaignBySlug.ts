/**
 * useCampaignBySlug — Fetch a single campaign by its slug.
 *
 * Used by the public play route to load campaign details for the landing,
 * game, and result screens. The RLS policy allows anon reads of campaigns
 * so unauthenticated players can access active campaigns.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toFriendlyErrorMessage } from '../lib/errorMessages';
import type { Campaign } from '../types';

/** Return type of the hook. */
interface UseCampaignBySlugResult {
  /** The campaign, or null if not found / still loading. */
  campaign: Campaign | null;
  /** True while the query is in flight. */
  loading: boolean;
  /** Error message if the query failed, null otherwise. */
  error: string | null;
}

/**
 * @param slug - The campaign's URL slug. When null/undefined, returns
 *               a null campaign with no error.
 */
export function useCampaignBySlug(slug: string | null | undefined): UseCampaignBySlugResult {
  const [campaign, setCampaign] = useState<Campaign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!slug) {
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
        .eq('slug', slug)
        .maybeSingle();

      if (cancelled) return;

      if (queryError) {
        setError(
          toFriendlyErrorMessage(queryError, {
            fallback: 'Failed to load this campaign. Please try again.',
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
  }, [slug]);

  return { campaign, loading, error };
}

export default useCampaignBySlug;
