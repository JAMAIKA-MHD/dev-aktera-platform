/**
 * useEntries — Fetch all entries for a given campaign.
 *
 * Used by the dashboard entries table and the analytics page. Entries
 * are org-scoped via RLS, so the query only returns rows the
 * authenticated user's organization owns.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toFriendlyErrorMessage } from '../lib/errorMessages';
import type { Entry } from '../types';

/** Return type of the hook. */
interface UseEntriesResult {
  /** Array of entries submitted to the campaign. */
  entries: Entry[];
  /** True while the query is in flight. */
  loading: boolean;
  /** Error message if the query failed, null otherwise. */
  error: string | null;
  /** Re-run the query (e.g. after exporting or deleting entries). */
  refetch: () => void;
}

/**
 * @param campaignId - The campaign UUID. When null/undefined, returns
 *                     an empty array with no error.
 */
export function useEntries(campaignId: string | null | undefined): UseEntriesResult {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchFlag, setRefetchFlag] = useState(0);

  const refetch = useCallback(() => setRefetchFlag((f) => f + 1), []);

  useEffect(() => {
    if (!campaignId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchEntries = async () => {
      const { data, error: queryError } = await supabase
        .from('entries')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (queryError) {
        setError(
          toFriendlyErrorMessage(queryError, {
            fallback: 'Failed to load entries. Please try again.',
          }),
        );
        setEntries([]);
      } else {
        setError(null);
        setEntries((data as Entry[]) ?? []);
      }
      setLoading(false);
    };

    fetchEntries();

    return () => {
      cancelled = true;
    };
  }, [campaignId, refetchFlag]);

  return { entries, loading, error, refetch };
}

export default useEntries;
