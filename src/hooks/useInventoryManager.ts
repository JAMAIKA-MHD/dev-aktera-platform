import { useState, useCallback } from "react";
import { PrizeTemplate } from "../types";
import { toFriendlyErrorMessage } from "../lib/errorMessages";
import {
  TemplateItemRow,
  fetchTemplateItemsService,
  createMissingTemplateItemsService,
  updateSingleTemplateItemService,
  bulkUpdateTemplateItemsService,
} from "../services/inventoryService";

export type { TemplateItemRow };

export function useInventoryManager(organizationId: string | null) {
  const [templateItems, setTemplateItems] = useState<TemplateItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadTemplateItems = useCallback(
    async (template: PrizeTemplate) => {
      if (!organizationId) {
        setError("Organization not loaded.");
        return [];
      }

      setLoading(true);
      setError(null);

      try {
        let rows = await fetchTemplateItemsService(template.id);

        if (rows.length < template.totalStock) {
          const missingRows = Array.from(
            { length: template.totalStock - rows.length },
            (_, index) => ({
              prize_template_id: template.id,
              organization_id: organizationId,
              item_index: rows.length + index + 1,
              item_value: null,
              source_type: "manual" as const,
            }),
          );

          await createMissingTemplateItemsService(missingRows);
          rows = await fetchTemplateItemsService(template.id);
        }

        setTemplateItems(rows);
        return rows;
      } catch (err) {
        const msg = toFriendlyErrorMessage(err, "Failed to load reward items.");
        setError(msg);
        return [];
      } finally {
        setLoading(false);
      }
    },
    [organizationId],
  );

  const updateSingleItemValue = useCallback(
    async (id: string, value: string) => {
      setSaving(true);
      setError(null);

      try {
        const normalized = value.trim();
        const finalVal = normalized.length > 0 ? normalized : null;
        await updateSingleTemplateItemService(id, finalVal);

        setTemplateItems((current) =>
          current.map((item) =>
            item.id === id
              ? {
                  ...item,
                  item_value: finalVal,
                  source_type: "manual",
                }
              : item,
          ),
        );
        return true;
      } catch (err) {
        setError(toFriendlyErrorMessage(err, "Failed to update item value."));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [],
  );

  const saveAllItemsBulk = useCallback(
    async (
      template: PrizeTemplate,
      itemsToSave: { id: string; item_value: string | null }[],
    ) => {
      setSaving(true);
      setError(null);

      try {
        await bulkUpdateTemplateItemsService(itemsToSave);
        await loadTemplateItems(template);
        return true;
      } catch (err) {
        setError(toFriendlyErrorMessage(err, "Failed to save bulk items."));
        return false;
      } finally {
        setSaving(false);
      }
    },
    [loadTemplateItems],
  );

  return {
    templateItems,
    setTemplateItems,
    loading,
    saving,
    error,
    setError,
    loadTemplateItems,
    updateSingleItemValue,
    saveAllItemsBulk,
  };
}
