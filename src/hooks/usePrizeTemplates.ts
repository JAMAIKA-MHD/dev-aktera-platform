import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { PrizeTemplate } from '../types';

interface DbTemplate {
  id: string;
  name: string;
  description: string | null;
  category: string;
  value: string | number;
  stock_quantity: number;
  image_url: string | null;
  created_at: string;
}

interface DbPrizeAllocation {
  prize_template_id: string;
  quantity: number;
  campaign_id: string;
  quantity_won: number;
}

interface DbCampaignStatus {
  id: string;
  status: string;
}

interface DbTemplateItemCount {
  prize_template_id: string;
  item_index: number;
}

export function usePrizeTemplates(organizationId: string | null) {
  const [prizes, setPrizes] = useState<PrizeTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(async () => {
    if (!organizationId) {
      setPrizes([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const [{ data: templates, error: tErr }, { data: allPrizes }, { data: campaigns }, { data: templateItems }] =
        await Promise.all([
          supabase
            .from('prize_templates')
            .select('id, name, description, category, value, stock_quantity, image_url, created_at')
            .eq('organization_id', organizationId)
            .order('created_at', { ascending: false }),
          supabase
            .from('prizes')
            .select('prize_template_id, quantity, quantity_won, campaign_id')
            .eq('organization_id', organizationId),
          supabase
            .from('campaigns')
            .select('id, status')
            .eq('organization_id', organizationId),
          supabase
            .from('prize_template_items')
            .select('prize_template_id, item_index')
            .eq('organization_id', organizationId)
            .not('item_value', 'is', null),
        ]);

      if (tErr) throw tErr;

      // Campaigns consuming stock are those in draft/active/paused states
      const activeCampIds = new Set(
        ((campaigns ?? []) as DbCampaignStatus[])
          .filter((c) => ['draft', 'active', 'paused'].includes(c.status))
          .map((c) => c.id)
      );

      // Sum allocated quantity per template (only from active campaigns)
      const allocatedMap: Record<string, number> = {};
      const campaignUsageMap: Record<string, number> = {};
      const winningMap: Record<string, number> = {};
      const campaignIdsByTemplate: Record<string, Set<string>> = {};
      for (const p of (allPrizes ?? []) as DbPrizeAllocation[]) {
        campaignIdsByTemplate[p.prize_template_id] ??= new Set<string>();
        campaignIdsByTemplate[p.prize_template_id].add(p.campaign_id);
        campaignUsageMap[p.prize_template_id] = campaignIdsByTemplate[p.prize_template_id].size;
        winningMap[p.prize_template_id] = (winningMap[p.prize_template_id] ?? 0) + Number(p.quantity_won ?? 0);

        if (activeCampIds.has(p.campaign_id)) {
          allocatedMap[p.prize_template_id] = (allocatedMap[p.prize_template_id] ?? 0) + p.quantity;
        }
      }

      const templateStockMap: Record<string, number> = {};
      for (const template of (templates ?? []) as DbTemplate[]) {
        templateStockMap[template.id] = Number(template.stock_quantity ?? 0);
      }

      const filledValuesMap: Record<string, number> = {};
      for (const item of (templateItems ?? []) as DbTemplateItemCount[]) {
        const templateStock = templateStockMap[item.prize_template_id] ?? 0;
        if (item.item_index <= templateStock) {
          filledValuesMap[item.prize_template_id] = (filledValuesMap[item.prize_template_id] ?? 0) + 1;
        }
      }

      const mapped: PrizeTemplate[] = ((templates ?? []) as DbTemplate[]).map((t) => {
        const totalStock = t.stock_quantity;
        const allocatedStock = allocatedMap[t.id] ?? 0;
        const availableStock = Math.max(0, totalStock - allocatedStock);

        return {
          id: t.id,
          name: t.name,
          category: (t.category === 'physical' ? 'physical' : 'voucher') as 'voucher' | 'physical',
          description: t.description ?? '',
          totalStock,
          availableStock,
          allocatedStock,
          filledValuesCount: filledValuesMap[t.id] ?? 0,
          campaignUsageCount: campaignUsageMap[t.id] ?? 0,
          quantityWonCount: winningMap[t.id] ?? 0,
          // DB value is numeric (e.g. 500), display as "500 DA"
          itemValue: Number(t.value) > 0 ? `${Number(t.value).toLocaleString()} DA` : '',
          image: t.image_url ?? undefined,
          createdAt: t.created_at,
        };
      });

      setPrizes(mapped);
    } catch (err) {
      setError('Failed to load prize templates.');
      console.error('[usePrizeTemplates]', err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { prizes, loading, error, refetch: fetchData };
}
