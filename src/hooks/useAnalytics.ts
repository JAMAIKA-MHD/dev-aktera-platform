import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from '../contexts/AuthContext';
import { toFriendlyErrorMessage } from '../lib/errorMessages';

export interface CampaignAnalytics {
  campaign_id: string;
  campaign_name: string;
  total_entries: number;
  total_winners: number;
  win_rate: number;
  total_prizes: number;
}

export interface AnalyticsSummary {
  total_entries: number;
  total_winners: number;
  win_rate: number;
  total_campaigns: number;
  active_campaigns: number;
  by_campaign: CampaignAnalytics[];
}

interface DbCampaignRow {
  id: string;
  name: string;
  status: string;
}

interface DbEntryRow {
  campaign_id: string;
  is_winner: boolean;
}

interface DbPrizeRow {
  campaign_id: string;
  quantity: number;
}

export function useAnalytics() {
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
    setError(null);

    const fetchAnalytics = async () => {
      try {
        const [{ data: campaignsData, error: campaignsError }, { data: entriesData, error: entriesError }, { data: prizesData, error: prizesError }] =
          await Promise.all([
            supabase
              .from('campaigns')
              .select('id, name, status')
              .eq('organization_id', organization.id)
              .neq('status', 'archived'),
            supabase
              .from('entries')
              .select('campaign_id, is_winner')
              .eq('organization_id', organization.id),
            supabase
              .from('prizes')
              .select('campaign_id, quantity')
              .eq('organization_id', organization.id),
          ]);

        if (campaignsError) throw campaignsError;
        if (entriesError) throw entriesError;
        if (prizesError) throw prizesError;

        if (cancelled) return;

        const campaigns = (campaignsData as DbCampaignRow[]) ?? [];
        const entries = (entriesData as DbEntryRow[]) ?? [];
        const prizes = (prizesData as DbPrizeRow[]) ?? [];

        const entriesByCampaign: Record<string, number> = {};
        const winnersByCampaign: Record<string, number> = {};
        const prizesByCampaign: Record<string, number> = {};

        for (const entry of entries) {
          entriesByCampaign[entry.campaign_id] = (entriesByCampaign[entry.campaign_id] ?? 0) + 1;
          if (entry.is_winner) {
            winnersByCampaign[entry.campaign_id] = (winnersByCampaign[entry.campaign_id] ?? 0) + 1;
          }
        }

        for (const prize of prizes) {
          prizesByCampaign[prize.campaign_id] = (prizesByCampaign[prize.campaign_id] ?? 0) + Number(prize.quantity ?? 0);
        }

        const byCampaign: CampaignAnalytics[] = campaigns.map((campaign) => {
          const totalEntries = entriesByCampaign[campaign.id] ?? 0;
          const totalWinners = winnersByCampaign[campaign.id] ?? 0;
          return {
            campaign_id: campaign.id,
            campaign_name: campaign.name,
            total_entries: totalEntries,
            total_winners: totalWinners,
            win_rate: totalEntries > 0 ? totalWinners / totalEntries : 0,
            total_prizes: prizesByCampaign[campaign.id] ?? 0,
          };
        });

        const totalEntries = entries.length;
        const totalWinners = entries.filter((entry) => entry.is_winner).length;

        setAnalytics({
          total_entries: totalEntries,
          total_winners: totalWinners,
          win_rate: totalEntries > 0 ? totalWinners / totalEntries : 0,
          total_campaigns: campaigns.length,
          active_campaigns: campaigns.filter((campaign) => campaign.status === 'active').length,
          by_campaign: byCampaign,
        });
      } catch (err) {
        if (!cancelled) {
          setError(toFriendlyErrorMessage(err, 'Unable to load analytics right now. Please try again.'));
          setAnalytics(null);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    void fetchAnalytics();

    return () => {
      cancelled = true;
    };
  }, [organization]);

  return { analytics, loading, error };
}
