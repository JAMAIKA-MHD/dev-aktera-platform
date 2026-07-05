import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { LeadEntry } from '../types';

interface DbEntry {
  id: string;
  campaign_id: string;
  phone_number: string | null;
  participant_name: string | null;
  is_winner: boolean;
  redeemed_coupon_value: string | null;
  coupon_confirmed: boolean;
  created_at: string;
  prizes: { name: string; prize_template_id: string } | null;
  campaigns: { name: string } | null;
}

function mapToUi(e: DbEntry): LeadEntry {
  return {
    id: e.id,
    campaignId: e.campaign_id,
    campaignName: e.campaigns?.name ?? '—',
    playerName: e.participant_name ?? 'Anonymous',
    phoneNumber: e.phone_number ?? '',
    prizeWon: e.is_winner ? (e.prizes?.name ?? 'Prize') : 'Better Luck Next Time',
    prizeTemplateId: e.prizes?.prize_template_id,
    couponCode: e.redeemed_coupon_value ?? undefined,
    timestamp: e.created_at.replace('T', ' ').substring(0, 16),
    consentGiven: true, // implied by Loi 18-07 gate on player landing
    status: e.coupon_confirmed ? 'confirmed' : 'pending',
  };
}

export function useEntries(organizationId: string | null) {
  const [entries, setEntries] = useState<LeadEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!organizationId) {
      setEntries([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const { data, error: err } = await supabase
        .from('entries')
        .select('id, campaign_id, phone_number, participant_name, is_winner, redeemed_coupon_value, coupon_confirmed, created_at, prizes(name, prize_template_id), campaigns(name)')
        .eq('organization_id', organizationId)
        .order('created_at', { ascending: false })
        .limit(500);

      if (err) throw err;

      setEntries(((data ?? []) as unknown as DbEntry[]).map(mapToUi));
    } catch (err) {
      setError('Failed to load entries.');
      console.error('[useEntries]', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { entries, loading, error, refetch: fetchData };
}
