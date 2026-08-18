import { useState, useCallback } from "react";
import { PrizeTemplate } from "../types";
import { toFriendlyErrorMessage } from "../lib/errorMessages";
import {
  TemplateItemRow,
  ImportMode,
  DuplicateConflict,
  ImportValidationResult,
  GeneratedCodesResult,
  fetchTemplateItemsService,
  createMissingTemplateItemsService,
  updateSingleTemplateItemService,
  bulkUpdateTemplateItemsService,
  validateAndPrepareImportService,
  resolveConflictAndRevalidateService,
  generateRandomVoucherCodesService,
} from "../services/inventoryService";

export type {
  TemplateItemRow,
  ImportMode,
  DuplicateConflict,
  ImportValidationResult,
};

export function useInventoryManager(organizationId: string | null) {
  const [templateItems, setTemplateItems] = useState<TemplateItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [unresolvedConflicts, setUnresolvedConflicts] = useState<
    DuplicateConflict[]
  >([]);

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
          try {
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
          } catch (createErr) {
            console.warn(
              "[useInventoryManager] Non-fatal: error creating missing slots:",
              createErr,
            );
          }
        }

        setTemplateItems(rows);
        return rows;
      } catch (err) {
        console.error(
          "[useInventoryManager] Failed to load reward items:",
          err,
        );
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

  /**
   * Validates an import file or pasted lines through the pure inventoryService.
   */
  const validateImport = useCallback(
    (
      mode: ImportMode,
      rawInput: { rawRows?: Record<string, unknown>[]; rawLines?: string[] },
      totalStock: number,
    ): ImportValidationResult => {
      return validateAndPrepareImportService({
        mode,
        rawInput,
        currentItems: templateItems,
        totalStock,
      });
    },
    [templateItems],
  );

  /**
   * Resolves a duplicate conflict at a specific line and re-validates.
   */
  const resolveConflict = useCallback(
    (
      prevResult: ImportValidationResult,
      conflictLineNumber: number,
      newCode: string,
      totalStock: number,
    ): ImportValidationResult => {
      return resolveConflictAndRevalidateService(
        prevResult,
        conflictLineNumber,
        newCode,
        templateItems,
        totalStock,
      );
    },
    [templateItems],
  );

  /**
   * Executes a validated import result to the database and refreshes item list.
   */
  const executeImport = useCallback(
    async (
      template: PrizeTemplate,
      validationResult: ImportValidationResult,
      persistConflictsWarning = false,
    ): Promise<boolean> => {
      if (validationResult.itemsToSave.length === 0) return false;

      const success = await saveAllItemsBulk(
        template,
        validationResult.itemsToSave,
      );

      if (success) {
        if (persistConflictsWarning && validationResult.conflicts.length > 0) {
          setUnresolvedConflicts(validationResult.conflicts);
        } else {
          setUnresolvedConflicts([]);
        }
      }

      return success;
    },
    [saveAllItemsBulk],
  );

  /**
   * Generates random voucher codes with collision checking.
   */
  const generateRandomCodes = useCallback(
    (count: number, prefix = "", length = 8): GeneratedCodesResult => {
      const existingCodes = templateItems
        .filter((item) => item.item_value && item.item_value.trim().length > 0)
        .map((item) => item.item_value!.trim());

      return generateRandomVoucherCodesService({
        count,
        prefix,
        length,
        existingCodes,
      });
    },
    [templateItems],
  );

  /**
   * Fills all currently empty slots (or a target count) with generated random codes.
   */
  const fillEmptySlotsWithRandom = useCallback(
    async (
      template: PrizeTemplate,
      count?: number,
      prefix = "",
      length = 8,
    ): Promise<boolean> => {
      const emptySlots = templateItems.filter(
        (item) => !item.item_value || item.item_value.trim().length === 0,
      );

      if (emptySlots.length === 0) return true;

      const slotsToFill =
        count !== undefined ? emptySlots.slice(0, count) : emptySlots;
      const genResult = generateRandomCodes(slotsToFill.length, prefix, length);

      if (!genResult.success || genResult.codes.length < slotsToFill.length) {
        setError(
          genResult.errorMessage ||
            "Failed to generate unique codes without collision.",
        );
        return false;
      }

      const itemsToSave = slotsToFill.map((slot, idx) => ({
        id: slot.id,
        item_value: genResult.codes[idx],
      }));

      return await saveAllItemsBulk(template, itemsToSave);
    },
    [templateItems, generateRandomCodes, saveAllItemsBulk],
  );

  const clearUnresolvedConflicts = useCallback(() => {
    setUnresolvedConflicts([]);
  }, []);

  return {
    templateItems,
    setTemplateItems,
    loading,
    saving,
    error,
    setError,
    unresolvedConflicts,
    setUnresolvedConflicts,
    clearUnresolvedConflicts,
    loadTemplateItems,
    updateSingleItemValue,
    saveAllItemsBulk,
    validateImport,
    resolveConflict,
    executeImport,
    generateRandomCodes,
    fillEmptySlotsWithRandom,
  };
}
