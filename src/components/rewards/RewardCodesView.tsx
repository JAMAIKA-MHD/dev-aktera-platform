import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import {
  AlertTriangle,
  ArrowLeft,
  Check,
  Clipboard,
  ClipboardCheck,
  Download,
  FileText,
  Search,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { AnimatePresence, motion } from "motion/react";

import { PATHS } from "../../dashboard/paths";
import { useInventoryManager } from "../../hooks/useInventoryManager";
import {
  buildCodeExportRows,
  codeExportColumns,
  filterCodeRows,
  type CodeExportScope,
} from "../../lib/codeExport";
import type { StoredExpiry } from "../../lib/expiryPolicy";
import { parseCSVFile, parseExcelFile } from "../../lib/exportUtils";
import type {
  ImportMode,
  ImportValidationResult,
} from "../../services/inventoryService";
import type { PrizeTemplate } from "../../types";
import { DataTable } from "../ui/data-table";
import { ExportFileDialog, type ExportedSummary } from "./ExportFileDialog";
import { CodeStockSummary } from "./CodeStockSummary";
import { PhysicalDeliveryPanel } from "./PhysicalDeliveryPanel";
import { RewardExpiryPanel } from "./RewardExpiryPanel";
import {
  RewardCodesContext,
  codeRowClassName,
  matchesCodeSearch,
  physicalCodeColumns,
  voucherCodeColumns,
  type RewardCodesContextValue,
} from "./rewardCodeColumns";

type PrizeTemplatePayload = Omit<
  PrizeTemplate,
  "id" | "allocatedStock" | "availableStock"
>;

interface RewardCodesViewProps {
  /** The reward, read from the live list: it follows every change without a reload. */
  reward: PrizeTemplate;
  organizationId: string | null;
  /** False for a read-only viewer. */
  canEdit: boolean;
  onUpdatePrize: (id: string, updates: PrizeTemplatePayload) => Promise<void>;
  onRefreshPrizes?: () => void;
}

const CODES_PAGE_SIZE = 50;

// The codes of one reward, on a page of their own (the address holds the reward's id): how it
// expires, what is left to give, the codes themselves, and for a physical reward its winners.
export const RewardCodesView: React.FC<RewardCodesViewProps> = ({
  reward,
  organizationId,
  canEdit,
  onUpdatePrize,
  onRefreshPrizes,
}) => {
  const [codesSearch, setCodesSearch] = useState("");
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);

  // Import mode and validation state
  const [importMode, setImportMode] = useState<ImportMode>("append");
  const [activeValidationResult, setActiveValidationResult] =
    useState<ImportValidationResult | null>(null);
  const [conflictFixInputs, setConflictFixInputs] = useState<
    Record<number, string>
  >({});
  const [isGeneratingRandom, setIsGeneratingRandom] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    templateItems,
    setTemplateItems,
    loading: codesLoading,
    saving: codesSaving,
    unresolvedConflicts,
    clearUnresolvedConflicts,
    loadTemplateItems,
    updateSingleItemValue,
    updateItemExpiry,
    setExpiryForAll,
    codeCounts,
    validateImport,
    resolveConflict,
    executeImport,
    generateRandomCodes,
    fillEmptySlotsWithRandom,
  } = useInventoryManager(organizationId, reward.expiresAt ?? null);

  // The slots are loaded for this reward, and again if its stock changes under us.
  const rewardRef = useRef(reward);
  rewardRef.current = reward;
  useEffect(() => {
    void loadTemplateItems(rewardRef.current);
  }, [reward.id, reward.totalStock, loadTemplateItems]);

  // The cards of the library show the stock: bring them up to date when the page is left.
  const refreshRef = useRef(onRefreshPrizes);
  refreshRef.current = onRefreshPrizes;
  useEffect(() => () => refreshRef.current?.(), []);

  const showSuccess = (text: string) => {
    setMessage(text);
    window.setTimeout(() => setMessage(null), 3500);
  };

  // Copy all non-empty codes
  const handleCopyAllCodes = async () => {
    const codesToCopy = templateItems
      .map((item) => item.item_value)
      .filter((val): val is string => Boolean(val && val.trim().length > 0));

    if (codesToCopy.length === 0) {
      alert("No prepared codes found to copy.");
      return;
    }

    try {
      await navigator.clipboard.writeText(codesToCopy.join("\n"));
      setCopiedAll(true);
      window.setTimeout(() => setCopiedAll(false), 2500);
    } catch {
      alert("Failed to copy to clipboard.");
    }
  };

  // Import codes from File
  const handleFileImport = async (file: File) => {
    if (!reward) return;

    try {
      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
      const rows = isExcel
        ? await parseExcelFile<Record<string, unknown>>(file)
        : await parseCSVFile<Record<string, unknown>>(file);

      if (!rows || rows.length === 0) {
        alert("Import file is empty or could not be parsed.");
        return;
      }

      const validation = validateImport(
        importMode,
        { rawRows: rows },
        reward.totalStock,
      );

      if (validation.overflow) {
        alert(
          validation.errorMessage ||
            "Import rejected: code count exceeds available slots.",
        );
        return;
      }

      if (!validation.success && validation.conflicts.length > 0) {
        const initialFixes: Record<number, string> = {};
        validation.conflicts.forEach((c) => {
          initialFixes[c.lineNumber] = "";
        });
        setConflictFixInputs(initialFixes);
        setActiveValidationResult(validation);
        return;
      }

      const success = await executeImport(reward, validation);
      if (success) {
        onRefreshPrizes?.();
        showSuccess(
          `Successfully imported ${validation.importedCount} code(s) in ${importMode === "append" ? "Append" : "Replace All"} mode.`,
        );
      }
    } catch (err) {
      alert(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  // Handle Bulk Paste Lines
  const handleApplyBulkPaste = async () => {
    if (!reward) return;

    const lines = bulkPasteText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const validation = validateImport(
      importMode,
      { rawLines: lines },
      reward.totalStock,
    );

    if (validation.overflow) {
      alert(
        validation.errorMessage ||
          "Import rejected: code count exceeds available slots.",
      );
      return;
    }

    if (!validation.success && validation.conflicts.length > 0) {
      const initialFixes: Record<number, string> = {};
      validation.conflicts.forEach((c) => {
        initialFixes[c.lineNumber] = "";
      });
      setConflictFixInputs(initialFixes);
      setActiveValidationResult(validation);
      return;
    }

    const success = await executeImport(reward, validation);
    if (success) {
      setShowBulkPaste(false);
      setBulkPasteText("");
      onRefreshPrizes?.();
      showSuccess(
        `Applied ${validation.importedCount} code(s) in ${importMode === "append" ? "Append" : "Replace All"} mode.`,
      );
    }
  };

  const handleApplyConflictFix = (lineNumber: number) => {
    if (!activeValidationResult || !reward) return;
    const replacement = (conflictFixInputs[lineNumber] || "").trim();
    if (!replacement) return;

    const updatedValidation = resolveConflict(
      activeValidationResult,
      lineNumber,
      replacement,
      reward.totalStock,
    );

    setActiveValidationResult(updatedValidation);
  };

  const handleProceedWithConflicts = async () => {
    if (!activeValidationResult || !reward) return;
    const success = await executeImport(reward, activeValidationResult, true);
    if (success) {
      setActiveValidationResult(null);
      setShowBulkPaste(false);
      setBulkPasteText("");
      onRefreshPrizes?.();
      showSuccess(
        `Imported ${activeValidationResult.importedCount} codes with duplicate warnings retained.`,
      );
    }
  };

  const handleFillRandomSlots = async () => {
    if (!reward) return;
    setIsGeneratingRandom(true);
    try {
      const success = await fillEmptySlotsWithRandom(reward);
      if (success) {
        onRefreshPrizes?.();
        showSuccess(
          "Filled empty slots with collision-free random 8-character uppercase codes.",
        );
      }
    } finally {
      setIsGeneratingRandom(false);
    }
  };

  // The rows of the file, as the export window shows them before the download.
  const exportRows = useMemo(
    () =>
      buildCodeExportRows(templateItems, {
        category: reward.category,
        inheritedExpiresAt: reward.expiresAt ?? null,
        expiryDays: reward.expiryDays ?? null,
      }),
    [templateItems, reward.category, reward.expiresAt, reward.expiryDays],
  );
  const exportScopes = useMemo(
    () => [
      { id: "all" as const, label: "Every slot" },
      { id: "filled" as const, label: "Slots with a code" },
      { id: "available" as const, label: "Available" },
      { id: "used" as const, label: "Used" },
      ...(reward.category === "voucher"
        ? [{ id: "expired" as const, label: "Expired" }]
        : []),
    ],
    [reward.category],
  );
  const handleExported = ({ count, fileName }: ExportedSummary) =>
    showSuccess(
      `Exported ${count} ${count === 1 ? "row" : "rows"} to ${fileName}.`,
    );

  const preparedCount = templateItems.filter((item) =>
    Boolean(item.item_value && item.item_value.trim().length > 0),
  ).length;

  // Changes how the reward's codes expire, from this page.
  const handleSaveRewardExpiry = async (expiry: StoredExpiry) => {
    await onUpdatePrize(reward.id, {
      name: reward.name,
      category: reward.category,
      description: reward.description,
      itemValue: reward.itemValue,
      totalStock: reward.totalStock,
      image: reward.image,
      expiresAt: expiry.expiresAt,
      expiryDays: expiry.expiryDays,
      filledValuesCount: reward.filledValuesCount,
      campaignUsageCount: reward.campaignUsageCount,
      quantityWonCount: reward.quantityWonCount,
    });
  };

  // What the cells of the table need; the columns themselves never change (see the columns file).
  const tableContext = useMemo<RewardCodesContextValue>(
    () => ({
      category: reward.category,
      inheritedExpiresAt: reward.expiresAt ?? null,
      periodDays: reward.expiryDays ?? null,
      canEdit,
      onEdit: (id, value) =>
        setTemplateItems((current) =>
          current.map((item) =>
            item.id === id ? { ...item, item_value: value } : item,
          ),
        ),
      onCommit: (id, value) => {
        void updateSingleItemValue(id, value);
        onRefreshPrizes?.();
      },
      onClear: async (id) => {
        await updateSingleItemValue(id, "");
        onRefreshPrizes?.();
      },
      onGenerate: async (id) => {
        const generated = generateRandomCodes(1);
        if (generated.success && generated.codes[0]) {
          await updateSingleItemValue(id, generated.codes[0]);
          onRefreshPrizes?.();
          showSuccess(`Generated code: ${generated.codes[0]}`);
        }
      },
      onChangeExpiry: (id, expiresAt) => updateItemExpiry(id, expiresAt),
    }),
    [
      reward.category,
      reward.expiresAt,
      reward.expiryDays,
      canEdit,
      setTemplateItems,
      updateSingleItemValue,
      updateItemExpiry,
      generateRandomCodes,
      onRefreshPrizes,
    ],
  );

  return (
    <div className="mx-auto max-w-[1400px] space-y-5 pb-16 text-brand-text">
      <nav aria-label="Breadcrumb">
        <Link
          to={PATHS.prizesLocal}
          className="inline-flex items-center gap-2 rounded-xl px-1 py-1 text-xs font-bold text-brand-textMuted transition-colors hover:text-emerald-500 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500"
        >
          <ArrowLeft className="h-4 w-4" aria-hidden="true" />
          Local Library
        </Link>
      </nav>

      {message && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          role="status"
          className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm"
        >
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{message}</span>
        </motion.div>
      )}

      <section
        aria-label={`Codes of ${reward.name}`}
        className="flex flex-col overflow-hidden rounded-[32px] border border-card-border bg-card-bg shadow-sm"
      >
        <header className="p-6 sm:p-7 border-b border-card-border flex items-center justify-between gap-4">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2.5">
              <h2
                title={reward.name}
                className="min-w-0 text-xl sm:text-2xl font-black text-brand-text line-clamp-2 [overflow-wrap:anywhere]"
              >
                {reward.name}
              </h2>
              <span className="shrink-0 px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                {reward.category}
              </span>
            </div>
            <p className="text-xs text-brand-textMuted mt-1">
              Prepared Codes:{" "}
              <strong className="text-emerald-500">{preparedCount}</strong> /{" "}
              {templateItems.length} total units reserved in inventory.
            </p>
          </div>
        </header>

        {/* Persistent Duplicate Conflicts Alert */}
        {unresolvedConflicts.length > 0 && (
          <div className="mx-6 mt-4 p-3.5 rounded-2xl border border-amber-500/40 bg-amber-500/15 flex items-center justify-between text-xs text-amber-300">
            <div className="flex items-center gap-2.5">
              <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
              <span>
                <strong>Warning:</strong> {unresolvedConflicts.length} duplicate
                voucher code(s) exist in this template.
              </span>
            </div>
            <button
              type="button"
              onClick={clearUnresolvedConflicts}
              className="px-3 py-1 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 font-bold transition cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

        {reward.category === "voucher" && (
          <RewardExpiryPanel
            expiresAt={reward.expiresAt}
            expiryDays={reward.expiryDays}
            canEdit={canEdit}
            onSave={handleSaveRewardExpiry}
          />
        )}

        {reward.category === "voucher" && !codesLoading && (
          <CodeStockSummary
            counts={codeCounts}
            remainingToWin={Math.max(
              0,
              reward.allocatedStock - (reward.quantityWonCount ?? 0),
            )}
            canEdit={canEdit}
            busy={codesSaving}
            onApplyExpiry={(expiresAt, onlyWithoutDate) =>
              setExpiryForAll(reward, expiresAt, onlyWithoutDate)
            }
          />
        )}

        {reward.category === "physical" && (
          <PhysicalDeliveryPanel
            organizationId={organizationId}
            templateId={reward.id}
            canEdit={canEdit}
          />
        )}

        {/* Action Toolbar */}
        <div className="p-4 sm:px-7 bg-card-bg-subtle border-b border-card-border flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Search in codes */}
          <div className="relative flex-1 min-w-[180px] max-w-xs">
            <Search className="absolute left-3.5 w-4 h-4 text-brand-textMuted top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search codes..."
              value={codesSearch}
              onChange={(e) => setCodesSearch(e.target.value)}
              className="w-full bg-card-bg border border-card-border rounded-xl pl-9 pr-3 py-2 text-xs text-brand-text placeholder-brand-textMuted focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Import Mode Selector + Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* Import Mode Selector */}
            <div className="flex items-center bg-card-bg p-1 rounded-xl border border-card-border">
              <button
                type="button"
                onClick={() => setImportMode("append")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  importMode === "append"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-brand-textMuted hover:text-brand-text"
                }`}
                title="Preserves existing codes and fills next empty slots"
              >
                Append
              </button>
              <button
                type="button"
                onClick={() => setImportMode("replace")}
                className={`px-2.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                  importMode === "replace"
                    ? "bg-emerald-600 text-white shadow-sm"
                    : "text-brand-textMuted hover:text-brand-text"
                }`}
                title="Overwrites existing codes from slot 1"
              >
                Replace All
              </button>
            </div>

            {/* Auto-Fill Random Codes */}
            <button
              type="button"
              onClick={handleFillRandomSlots}
              disabled={isGeneratingRandom || codesSaving}
              className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-purple-600 hover:bg-purple-700 text-white cursor-pointer transition-all shadow-sm disabled:opacity-50"
              title="Auto-fills all empty slots with unique 8-character uppercase alphanumeric codes"
            >
              <Sparkles className="w-4 h-4" />
              <span>
                {isGeneratingRandom ? "Generating..." : "Auto-Fill Empty"}
              </span>
            </button>

            {/* Copy All */}
            <button
              onClick={handleCopyAllCodes}
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-card-border bg-card-bg hover:bg-card-bg-subtle cursor-pointer transition-all shadow-sm"
            >
              {copiedAll ? (
                <ClipboardCheck className="w-4 h-4 text-emerald-500" />
              ) : (
                <Clipboard className="w-4 h-4 text-slate-500" />
              )}
              <span>{copiedAll ? "Copied" : "Copy"}</span>
            </button>

            {/* Bulk Paste Toggle */}
            <button
              onClick={() => setShowBulkPaste(!showBulkPaste)}
              className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border cursor-pointer transition-all shadow-sm ${
                showBulkPaste
                  ? "bg-blue-600 text-white border-blue-600"
                  : "border-card-border bg-card-bg hover:bg-card-bg-subtle"
              }`}
            >
              <FileText className="w-4 h-4" />
              <span>Paste Bulk</span>
            </button>

            {/* Export: opens the window that describes the file */}
            <button
              type="button"
              onClick={() => setExporting(true)}
              className="px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border border-card-border bg-card-bg hover:bg-card-bg-subtle cursor-pointer transition-all shadow-sm"
            >
              <Download className="w-4 h-4 text-slate-500" />
              <span>Export</span>
            </button>

            {/* Import File (Hidden file input) */}
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFileImport(file);
              }}
            />
            <button
              onClick={() => fileInputRef.current?.click()}
              className="px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-all shadow-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Import File</span>
            </button>
          </div>
        </div>

        {/* Bulk Paste Dropdown Section */}
        <AnimatePresence>
          {showBulkPaste && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="p-5 border-b border-card-border bg-card-bg space-y-3 shrink-0"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-brand-text">
                  Paste codes line-by-line (one per row):
                </span>
                <span className="text-[11px] text-brand-textMuted">
                  Mode:{" "}
                  <strong className="text-emerald-500 uppercase">
                    {importMode}
                  </strong>{" "}
                  (
                  {importMode === "append"
                    ? "Fills empty slots sequentially"
                    : "Overwrites from slot 1"}
                  )
                </span>
              </div>
              <textarea
                rows={4}
                placeholder="COUPON-DZ-101&#10;COUPON-DZ-102&#10;COUPON-DZ-103"
                value={bulkPasteText}
                onChange={(e) => setBulkPasteText(e.target.value)}
                className="w-full bg-card-bg-subtle border border-card-border rounded-xl p-3 text-xs font-mono text-brand-text placeholder-brand-textMuted focus:outline-none focus:border-emerald-500"
              />
              <div className="flex justify-end gap-2">
                <button
                  onClick={() => setShowBulkPaste(false)}
                  className="px-4 py-1.5 text-xs text-brand-textMuted hover:text-brand-text cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={handleApplyBulkPaste}
                  disabled={!bulkPasteText.trim() || codesSaving}
                  className="px-5 py-1.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50 cursor-pointer transition-all"
                >
                  {codesSaving
                    ? "Saving..."
                    : `Apply (${importMode === "append" ? "Append" : "Replace All"})`}
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Codes table (shadcn data table) */}
        <div className="p-4 sm:p-7">
          <RewardCodesContext.Provider value={tableContext}>
            <DataTable
              ariaLabel={`Codes of ${reward.name}`}
              columns={
                reward.category === "voucher"
                  ? voucherCodeColumns
                  : physicalCodeColumns
              }
              data={templateItems}
              getRowId={(item) => item.id}
              loading={codesLoading}
              pageSize={CODES_PAGE_SIZE}
              globalFilter={codesSearch}
              globalFilterFn={matchesCodeSearch}
              rowClassName={codeRowClassName}
              emptyState={
                <div className="py-16 flex flex-col items-center justify-center text-center text-brand-textMuted text-xs">
                  This reward has no code slot yet.
                </div>
              }
              noResultsState={
                <div className="py-16 flex flex-col items-center justify-center text-center text-brand-textMuted text-xs">
                  No codes matching your search query.
                </div>
              }
            />
          </RewardCodesContext.Provider>
        </div>

        <footer className="p-4 sm:p-5 bg-card-bg-subtle border-t border-card-border flex flex-wrap items-center justify-between gap-3">
          <span className="text-xs text-brand-textMuted">
            Changes save automatically to the database when you click outside an
            input.
          </span>
          <Link
            to={PATHS.prizesLocal}
            className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white transition-all"
          >
            Done
          </Link>
        </footer>
      </section>

      <ExportFileDialog<CodeExportScope>
        open={exporting}
        onOpenChange={setExporting}
        title={`Export the codes of ${reward.name}`}
        description="A spreadsheet with one row per code slot: the code, whether it is still available, used or expired, and when it expires."
        fileBaseName={`octoreach_codes_${reward.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}`}
        sheetName="Codes"
        columns={codeExportColumns(reward.category)}
        rows={exportRows}
        scopes={exportScopes}
        defaultScope="all"
        filterRows={filterCodeRows}
        notes={[
          "The file can be imported back with Import File: only the Index and Code columns are read, the others are ignored.",
          "Dates are written YYYY-MM-DD, in Algeria time.",
        ]}
        onExported={handleExported}
      />

      {/* CONFLICT RESOLUTION MODAL */}
      <AnimatePresence>
        {activeValidationResult &&
          activeValidationResult.conflicts.length > 0 && (
            <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md">
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="bg-card-bg border border-card-border rounded-3xl w-full max-w-2xl max-h-[85vh] shadow-2xl flex flex-col overflow-hidden"
              >
                <div className="p-5 border-b border-card-border bg-amber-500/10 flex items-center justify-between shrink-0">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5" />
                    </div>
                    <div>
                      <h3 className="text-base font-black text-brand-text">
                        Duplicate Codes Detected (
                        {activeValidationResult.conflicts.length})
                      </h3>
                      <p className="text-xs text-amber-300/80">
                        Some codes in this batch collide with existing template
                        codes or appear multiple times.
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveValidationResult(null)}
                    className="text-brand-textMuted hover:text-brand-text cursor-pointer"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <div className="flex-1 overflow-y-auto p-5 space-y-3">
                  <p className="text-xs text-brand-textMuted">
                    You can provide replacement codes inline below, or proceed
                    with warnings retained:
                  </p>

                  <div className="space-y-2.5">
                    {activeValidationResult.conflicts.map((conflict, idx) => (
                      <div
                        key={idx}
                        className="p-3.5 rounded-2xl bg-card-bg-subtle border border-card-border space-y-2"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-mono font-bold text-brand-text">
                            Line #{conflict.lineNumber}:{" "}
                            <code className="text-amber-400 bg-amber-500/10 px-1.5 py-0.5 rounded">
                              {conflict.code}
                            </code>
                          </span>
                          <span className="text-[10px] font-bold uppercase px-2 py-0.5 rounded bg-amber-500/20 text-amber-300">
                            {conflict.reason === "batch_duplicate"
                              ? "Duplicate in Batch"
                              : "Already Exists in Template"}
                          </span>
                        </div>

                        <div className="flex items-center gap-2">
                          <input
                            type="text"
                            placeholder="Enter new unique code..."
                            value={conflictFixInputs[conflict.lineNumber] ?? ""}
                            onChange={(e) =>
                              setConflictFixInputs({
                                ...conflictFixInputs,
                                [conflict.lineNumber]: e.target.value,
                              })
                            }
                            className="flex-1 bg-card-bg border border-card-border rounded-xl px-3 py-1.5 text-xs font-mono text-brand-text focus:outline-none focus:border-emerald-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleApplyConflictFix(conflict.lineNumber)
                            }
                            disabled={
                              !conflictFixInputs[conflict.lineNumber]?.trim()
                            }
                            className="px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition disabled:opacity-40 cursor-pointer"
                          >
                            Fix
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="p-4 border-t border-card-border bg-card-bg-subtle flex items-center justify-between shrink-0">
                  <button
                    type="button"
                    onClick={() => setActiveValidationResult(null)}
                    className="px-4 py-2 rounded-xl text-xs font-bold text-brand-textMuted hover:text-brand-text cursor-pointer"
                  >
                    Cancel Import
                  </button>
                  <button
                    type="button"
                    onClick={handleProceedWithConflicts}
                    className="px-5 py-2 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold transition cursor-pointer shadow-sm"
                  >
                    Proceed Anyway (Keep Warnings)
                  </button>
                </div>
              </motion.div>
            </div>
          )}
      </AnimatePresence>
    </div>
  );
};
