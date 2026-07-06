import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toFriendlyErrorMessage } from '../lib/errorMessages';
import { useAuth } from '../context/AuthContext';
import type { PrizeTemplate } from '../types';

export interface InventoryRow {
  id: string;
  organization_id: string;
  prize_template_name: string;
  prize_category: 'voucher' | 'physical';
  stock_quantity: number;
  reserved_quantity: number;
  available_quantity: number;
  distributed_quantity: number;
  active_campaign_count: number;
  filled_values_count: number;
  created_at: string;
  updated_at: string;
}

/** Return type of the hook. */
interface UseInventoryResult {
  inventory: InventoryRow[];
  loading: boolean;
  error: string | null;
  refetch: () => void;
}

export function useInventory(): UseInventoryResult {
  const { organization } = useAuth();
  const [inventory, setInventory] = useState<InventoryRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchFlag, setRefetchFlag] = useState(0);

  const refetch = useCallback(() => setRefetchFlag((f) => f + 1), []);

  useEffect(() => {
    if (!organization) {
      setInventory([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchInventory = async () => {
      const { data: templateData, error: templateError } = await supabase
        .from('prize_templates')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (templateError) {
        setError(
          toFriendlyErrorMessage(templateError, {
            fallback: 'Failed to load inventory. Please try again.',
          }),
        );
        setInventory([]);
        setLoading(false);
        return;
      }

      const templates = (templateData as PrizeTemplate[]) ?? [];
      const templateIds = templates.map((template) => template.id);
      const reservedByTemplateId: Record<string, number> = {};
      const distributedByTemplateId: Record<string, number> = {};
      const campaignIdsByTemplateId: Record<string, Set<string>> = {};
      const filledValuesCountByTemplateId: Record<string, number> = {};

      if (templateIds.length > 0) {
        // Fetch prize allocation data
        const { data: prizeRows, error: prizeError } = await supabase
          .from('prizes')
          .select('prize_template_id, quantity, quantity_won, campaign_id, campaigns!inner(status)')
          .in('prize_template_id', templateIds);

        if (cancelled) return;

        if (prizeError) {
          setError(
            toFriendlyErrorMessage(prizeError, {
              fallback: 'Failed to calculate template stock usage.',
            }),
          );
          setInventory([]);
          setLoading(false);
          return;
        }

        const rows =
          (prizeRows as Array<{
            prize_template_id: string;
            quantity: number;
            quantity_won: number;
            campaign_id: string;
            campaigns: Array<{ status: 'draft' | 'active' | 'paused' | 'ended' | 'archived' }>;
          }> | null) ?? [];

        for (const row of rows) {
          const quantity = Number(row.quantity ?? 0);
          const quantityWon = Number(row.quantity_won ?? 0);
          const status = row.campaigns[0]?.status;
          const templateId = row.prize_template_id;

          distributedByTemplateId[templateId] = (distributedByTemplateId[templateId] ?? 0) + quantityWon;

          if (status === 'draft' || status === 'active' || status === 'paused') {
            reservedByTemplateId[templateId] = (reservedByTemplateId[templateId] ?? 0) + quantity;
            if (!campaignIdsByTemplateId[templateId]) {
              campaignIdsByTemplateId[templateId] = new Set<string>();
            }
            campaignIdsByTemplateId[templateId].add(row.campaign_id);
          }
        }

        // Fetch filled values count for each template
        const { data: itemRows, error: itemError } = await supabase
          .from('prize_template_items')
          .select('prize_template_id')
          .in('prize_template_id', templateIds)
          .not('item_value', 'is', null);

        if (cancelled) return;

        if (itemError) {
          console.warn('Warning: Failed to fetch filled values count:', itemError);
        } else {
          const items = (itemRows as Array<{ prize_template_id: string }>) ?? [];
          for (const item of items) {
            filledValuesCountByTemplateId[item.prize_template_id] =
              (filledValuesCountByTemplateId[item.prize_template_id] ?? 0) + 1;
          }
        }
      }

      setError(null);
      setInventory(
        templates.map((template) => {
          const stockQuantity = Number(template.stock_quantity ?? 0);
          const reservedQuantity = reservedByTemplateId[template.id] ?? 0;
          const availableQuantity = Math.max(stockQuantity - reservedQuantity, 0);
          return {
            id: template.id,
            organization_id: template.organization_id,
            prize_template_name: template.name,
            prize_category: template.category,
            stock_quantity: stockQuantity,
            reserved_quantity: reservedQuantity,
            available_quantity: availableQuantity,
            distributed_quantity: distributedByTemplateId[template.id] ?? 0,
            active_campaign_count: campaignIdsByTemplateId[template.id]?.size ?? 0,
            filled_values_count: filledValuesCountByTemplateId[template.id] ?? 0,
            created_at: template.created_at,
            updated_at: template.updated_at,
          };
        }),
      );
      setLoading(false);
    };

    fetchInventory();

    return () => {
      cancelled = true;
    };
  }, [organization, refetchFlag]);

  return { inventory, loading, error, refetch };
}

export default useInventory;
