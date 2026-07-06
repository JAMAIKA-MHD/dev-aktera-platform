/**
 * usePrizeTemplates — Fetch all prize templates for the current org.
 *
 * Prize templates are the reusable catalog of prizes an organization
 * can allocate across campaigns. This hook powers the "Prix" (Prizes)
 * dashboard page where admins manage their template library.
 */

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '../lib/supabase';
import { toFriendlyErrorMessage } from '../lib/errorMessages';
import { useAuth } from '../context/AuthContext';
import type { PrizeTemplate } from '../types';

export interface PrizeTemplateInventorySummary extends PrizeTemplate {
  reserved_quantity: number;
  available_quantity: number;
}

/** Return type of the hook. */
interface UsePrizeTemplatesResult {
  /** Array of prize templates owned by the org. */
  templates: PrizeTemplateInventorySummary[];
  /** True while the query is in flight. */
  loading: boolean;
  /** Error message if the query failed, null otherwise. */
  error: string | null;
  /** Re-run the query (e.g. after creating or updating a template). */
  refetch: () => void;
}

export function usePrizeTemplates(): UsePrizeTemplatesResult {
  const { organization } = useAuth();
  const [templates, setTemplates] = useState<PrizeTemplateInventorySummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [refetchFlag, setRefetchFlag] = useState(0);

  const refetch = useCallback(() => setRefetchFlag((f) => f + 1), []);

  useEffect(() => {
    if (!organization) {
      setTemplates([]);
      setLoading(false);
      return;
    }

    let cancelled = false;
    setLoading(true);

    const fetchTemplates = async () => {
      const { data: templateData, error: templateError } = await supabase
        .from('prize_templates')
        .select('*')
        .eq('organization_id', organization.id)
        .order('created_at', { ascending: false });

      if (cancelled) return;

      if (templateError) {
        setError(
          toFriendlyErrorMessage(templateError, {
            fallback: 'Failed to load prize templates. Please try again.',
          }),
        );
        setTemplates([]);
        setLoading(false);
        return;
      }

      const templatesRows = (templateData as PrizeTemplate[]) ?? [];
      const templateIds = templatesRows.map((template) => template.id);
      const reservedByTemplateId: Record<string, number> = {};

      if (templateIds.length > 0) {
        const { data: reservedRows, error: reservedError } = await supabase
          .from('prizes')
          .select('prize_template_id, quantity, campaigns!inner(status)')
          .in('prize_template_id', templateIds)
          .in('campaigns.status', ['draft', 'active', 'paused']);

        if (cancelled) return;

        if (reservedError) {
          setError(
            toFriendlyErrorMessage(reservedError, {
              fallback: 'Failed to calculate available prize stock.',
            }),
          );
          setTemplates([]);
          setLoading(false);
          return;
        }

        const rows = (reservedRows as Array<{ prize_template_id: string; quantity: number }> | null) ?? [];
        for (const row of rows) {
          const quantity = Number(row.quantity ?? 0);
          reservedByTemplateId[row.prize_template_id] =
            (reservedByTemplateId[row.prize_template_id] ?? 0) + quantity;
        }
      }

      setError(null);
      setTemplates(
        templatesRows.map((template) => {
          const reservedQuantity = reservedByTemplateId[template.id] ?? 0;
          const stockQuantity = Number(template.stock_quantity ?? 0);
          const availableQuantity = Math.max(stockQuantity - reservedQuantity, 0);
          return {
            ...template,
            reserved_quantity: reservedQuantity,
            available_quantity: availableQuantity,
          };
        }),
      );
      setLoading(false);
    };

    fetchTemplates();

    return () => {
      cancelled = true;
    };
  }, [organization, refetchFlag]);

  return { templates, loading, error, refetch };
}

export default usePrizeTemplates;
