/**
 * usePrizes — Fetch all prizes for a given campaign.
 *
 * Used by the campaign detail page (to show allocated prizes) and by
 * the public play route (to render the roulette wheel segments). The
 * public route relies on the RLS policy that allows anon reads of
 * prizes for active campaigns.
 */

import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { toFriendlyErrorMessage } from '../lib/errorMessages';
import type { Prize } from '../types';

/** Return type of the hook. */
interface UsePrizesResult {
  /** Array of prizes allocated to the campaign. */
  prizes: Prize[];
  /** True while the query is in flight. */
  loading: boolean;
  /** Error message if the query failed, null otherwise. */
  error: string | null;
}

/**
 * @param campaignId - The campaign UUID. When null/undefined, returns
 *                     an empty array with no error.
 */
export function usePrizes(campaignId: string | null | undefined): UsePrizesResult {
  const [prizes, setPrizes] = useState<Prize[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!campaignId) {
      setPrizes([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchPrizes = async () => {
      const { data, error: queryError } = await supabase
        .from('prizes')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });

      if (cancelled) return;

      if (queryError) {
        setError(
          toFriendlyErrorMessage(queryError, {
            fallback: 'Failed to load prizes. Please try again.',
          }),
        );
        setPrizes([]);
      } else {
        setError(null);
        setPrizes((data as Prize[]) ?? []);
      }
      setLoading(false);
    };

    fetchPrizes();

    return () => {
      cancelled = true;
    };
  }, [campaignId]);

  return { prizes, loading, error };
}

export default usePrizes;
