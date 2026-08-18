import React, { useMemo, useRef, useState } from "react";
import { PrizeTemplate } from "../types";
import {
  AlertTriangle,
  Check,
  Code,
  Database,
  Download,
  FileSpreadsheet,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  Minus,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  Upload,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { useInventoryManager } from "../hooks/useInventoryManager";
import { toFriendlyErrorMessage } from "../lib/errorMessages";
import { DEFAULT_PRIZE_IMAGE_URL } from "../lib/defaultImages";
import {
  parseCSVFile,
  parseExcelFile,
  exportToCSV,
  exportToExcel,
} from "../lib/exportUtils";
import {
  ImportMode,
  ImportValidationResult,
} from "../services/inventoryService";

interface InventoryManagerProps {
  prizes: PrizeTemplate[];
  organizationId: string | null;
  onUpdateStock: (id: string, amount: number) => Promise<void>;
  onRefreshPrizes?: () => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  prizes,
  organizationId,
  onUpdateStock,
  onRefreshPrizes,
}) => {
  const [searchTerm, setSearchTerm] = useState("");
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState("");
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [selectedTemplate, setSelectedTemplate] =
    useState<PrizeTemplate | null>(null);

  // Import Mode state (default "append" as requested)
  const [importMode, setImportMode] = useState<ImportMode>("append");
  const [activeValidationResult, setActiveValidationResult] =
    useState<ImportValidationResult | null>(null);
  const [conflictFixInputs, setConflictFixInputs] = useState<
    Record<number, string>
  >({});
  const [isGeneratingRandom, setIsGeneratingRandom] = useState(false);

  const {
    templateItems,
    setTemplateItems,
    loading: itemsLoading,
    saving: itemsSaving,
    error: _hookError,
    unresolvedConflicts,
    clearUnresolvedConflicts,
    loadTemplateItems,
    updateSingleItemValue,
    validateImport,
    resolveConflict,
    executeImport,
    generateRandomCodes,
    fillEmptySlotsWithRandom,
  } = useInventoryManager(organizationId);

  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const totalStockInPool = prizes.reduce((acc, p) => acc + p.totalStock, 0);
  const totalAllocated = prizes.reduce((acc, p) => acc + p.allocatedStock, 0);
  const totalAvailable = prizes.reduce((acc, p) => acc + p.availableStock, 0);
  const totalPreparedValues = prizes.reduce(
    (acc, p) => acc + (p.filledValuesCount ?? 0),
    0,
  );

  const filteredPrizes = useMemo(
    () =>
      prizes.filter((p) =>
        [p.name, p.category, p.itemValue, p.description]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      ),
    [prizes, searchTerm],
  );

  const showSuccess = (message: string) => {
    setSuccessMsg(message);
    window.setTimeout(() => setSuccessMsg(""), 4000);
  };

  const activeTemplateItems = useMemo(
    () =>
      selectedTemplate
        ? templateItems.filter(
            (item) => item.item_index <= selectedTemplate.totalStock,
          )
        : templateItems,
    [selectedTemplate, templateItems],
  );

  const overflowTemplateItems = useMemo(
    () =>
      selectedTemplate
        ? templateItems.filter(
            (item) => item.item_index > selectedTemplate.totalStock,
          )
        : [],
    [selectedTemplate, templateItems],
  );

  const openValuesModal = async (template: PrizeTemplate) => {
    setSelectedTemplate(template);
    setActiveValidationResult(null);
    setConflictFixInputs({});
    await loadTemplateItems(template);
  };

  const closeValuesModal = () => {
    setSelectedTemplate(null);
    setTemplateItems([]);
    setErrorMsg(null);
    setActiveValidationResult(null);
    setConflictFixInputs({});
    onRefreshPrizes?.();
  };

  const handleLocalItemChange = (id: string, value: string) => {
    setTemplateItems((current) =>
      current.map((item) =>
        item.id === id
          ? {
              ...item,
              item_value: value,
            }
          : item,
      ),
    );
  };

  const downloadBulkTemplate = () => {
    const templateData = [
      { item_index: 1, item_value: "COUPON-DZ-001" },
      { item_index: 2, item_value: "COUPON-DZ-002" },
      { item_index: 3, item_value: "COUPON-DZ-003" },
    ];
    exportToCSV(
      templateData as unknown as Record<string, unknown>[],
      "octoreach-voucher-import-template.csv",
    );
  };

  const exportCurrentValues = (format: "xlsx" | "csv" = "xlsx") => {
    if (!selectedTemplate) return;

    const dataToExport = activeTemplateItems.map((item) => ({
      "Item Index": item.item_index,
      "Voucher / Reference Value": item.item_value ?? "",
      Source: item.source_type,
      Status: item.is_redeemed
        ? "Redeemed"
        : item.item_value?.trim()
          ? "Prepared"
          : "Empty",
      "Redeemed At": item.redeemed_at ?? "",
    }));

    const filename = `octoreach_vouchers_${selectedTemplate.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}`;

    if (format === "xlsx") {
      exportToExcel(
        dataToExport as unknown as Record<string, unknown>[],
        filename,
        "Voucher Values",
      );
    } else {
      exportToCSV(
        dataToExport as unknown as Record<string, unknown>[],
        filename,
      );
    }
  };

  const handleBulkUpload = async (file: File) => {
    if (!selectedTemplate) return;

    setErrorMsg(null);

    try {
      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
      const rows = isExcel
        ? await parseExcelFile<Record<string, unknown>>(file)
        : await parseCSVFile<Record<string, unknown>>(file);

      if (!rows || rows.length === 0) {
        throw new Error("Import file is empty or could not be parsed.");
      }

      // Delegate all parsing, overflow checks, slot mapping and duplicate checks to the service
      const validation = validateImport(
        importMode,
        { rawRows: rows },
        selectedTemplate.totalStock,
      );

      // Handle overflow error
      if (validation.overflow) {
        setErrorMsg(
          validation.errorMessage ||
            "Import rejected: code count exceeds available slots.",
        );
        return;
      }

      // Handle duplicate conflicts
      if (!validation.success && validation.conflicts.length > 0) {
        const initialFixes: Record<number, string> = {};
        validation.conflicts.forEach((c) => {
          initialFixes[c.lineNumber] = "";
        });
        setConflictFixInputs(initialFixes);
        setActiveValidationResult(validation);
        return;
      }

      // If valid, execute import via hook
      const success = await executeImport(selectedTemplate, validation);
      if (success) {
        onRefreshPrizes?.();
        showSuccess(
          `Successfully imported ${validation.importedCount} voucher values in ${importMode === "append" ? "Append" : "Replace All"} mode for ${selectedTemplate.name}.`,
        );
      }
    } catch (err) {
      setErrorMsg(
        toFriendlyErrorMessage(
          err,
          "Failed to import voucher file. Please verify the file format and try again.",
        ),
      );
    }
  };

  // Conflict resolution handler: fix individual line
  const handleApplyConflictFix = (lineNumber: number) => {
    if (!activeValidationResult || !selectedTemplate) return;
    const replacement = (conflictFixInputs[lineNumber] || "").trim();
    if (!replacement) return;

    const updatedValidation = resolveConflict(
      activeValidationResult,
      lineNumber,
      replacement,
      selectedTemplate.totalStock,
    );

    setActiveValidationResult(updatedValidation);
  };

  // Proceed with import despite duplicate warnings
  const handleProceedWithConflicts = async () => {
    if (!activeValidationResult || !selectedTemplate) return;
    const success = await executeImport(
      selectedTemplate,
      activeValidationResult,
      true, // persist conflicts warning
    );
    if (success) {
      setActiveValidationResult(null);
      onRefreshPrizes?.();
      showSuccess(
        `Imported ${activeValidationResult.importedCount} codes with duplicate warnings retained.`,
      );
    }
  };

  // Random code generator actions
  const handleFillRandomSlots = async () => {
    if (!selectedTemplate) return;
    setIsGeneratingRandom(true);
    try {
      const success = await fillEmptySlotsWithRandom(selectedTemplate);
      if (success) {
        onRefreshPrizes?.();
        showSuccess(
          "Successfully filled empty slots with collision-free 8-character uppercase codes.",
        );
      }
    } finally {
      setIsGeneratingRandom(false);
    }
  };

  const handleGenerateSingleRandom = async (itemId: string) => {
    if (!selectedTemplate) return;
    const gen = generateRandomCodes(1);
    if (gen.success && gen.codes[0]) {
      await updateSingleItemValue(itemId, gen.codes[0]);
      onRefreshPrizes?.();
      showSuccess(`Generated code: ${gen.codes[0]}`);
    }
  };

  const handleAdjustStock = async (id: string, isIncrement = true) => {
    const rawValue = adjustments[id];
    const amount = Number.parseInt(rawValue, 10);

    if (Number.isNaN(amount) || amount <= 0) {
      setErrorMsg("Stock adjustments must be a positive whole number.");
      return;
    }

    setErrorMsg(null);
    try {
      await onUpdateStock(id, isIncrement ? amount : -amount);
      setAdjustments((prev) => ({ ...prev, [id]: "" }));
      showSuccess("Stock level updated successfully.");
      onRefreshPrizes?.();
    } catch (err) {
      setErrorMsg(toFriendlyErrorMessage(err, "Failed to adjust stock."));
    }
  };

  return (
    <div
      id="inventory-manager-root"
      className="max-w-7xl mx-auto space-y-6 text-brand-text pb-16"
    >
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-card-border pb-5">
        <div>
          <h2 className="text-2xl sm:text-3xl font-black tracking-tight flex items-center gap-3">
            <span>Stock Room & Inventory</span>
            <span className="text-xs px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 font-mono font-bold">
              Global Pool
            </span>
          </h2>
          <p className="text-xs text-brand-textMuted mt-1">
            Centrally manage reward inventory, prepare digital voucher codes,
            and monitor live campaign allocations.
          </p>
        </div>

        {/* Search & Layout View Toggles */}
        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-brand-textMuted" />
            <input
              type="text"
              placeholder="Search rewards or SKU..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="bg-card-bg-subtle border border-card-border rounded-2xl pl-10 pr-4 py-2 text-xs text-brand-text placeholder-brand-textMuted focus:outline-none focus:border-blue-500 w-48 sm:w-64 transition-all"
            />
          </div>

          <div className="flex items-center bg-card-bg-subtle border border-card-border rounded-2xl p-1">
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === "grid"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-brand-textMuted hover:text-brand-text"
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`p-1.5 rounded-xl transition-all cursor-pointer ${
                viewMode === "table"
                  ? "bg-blue-600 text-white shadow-sm"
                  : "text-brand-textMuted hover:text-brand-text"
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Global Stock KPI Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Stock in Pool */}
        <div className="bg-card-bg border border-card-border rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-textMuted">
              Total In Pool
            </span>
            <div className="w-8 h-8 rounded-full bg-blue-500/10 text-blue-500 flex items-center justify-center">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono">
            {totalStockInPool.toLocaleString()}
          </p>
          <p className="text-[11px] text-brand-textMuted">
            Physical stock registered across templates
          </p>
        </div>

        {/* Live Allocated */}
        <div className="bg-card-bg border border-card-border rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-textMuted">
              Allocated
            </span>
            <div className="w-8 h-8 rounded-full bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-indigo-500">
            {totalAllocated.toLocaleString()}
          </p>
          <p className="text-[11px] text-brand-textMuted">
            Reserved in active & paused campaigns
          </p>
        </div>

        {/* Available to Campaign Creators */}
        <div className="bg-card-bg border border-card-border rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-textMuted">
              Available
            </span>
            <div className="w-8 h-8 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <Check className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-emerald-500">
            {totalAvailable.toLocaleString()}
          </p>
          <p className="text-[11px] text-brand-textMuted">
            Ready to be bound to new or updated campaigns
          </p>
        </div>

        {/* Prepared Digital Codes */}
        <div className="bg-card-bg border border-card-border rounded-3xl p-5 shadow-sm space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold uppercase tracking-wider text-brand-textMuted">
              Prepared Codes
            </span>
            <div className="w-8 h-8 rounded-full bg-purple-500/10 text-purple-500 flex items-center justify-center">
              <Code className="w-4 h-4" />
            </div>
          </div>
          <p className="text-2xl sm:text-3xl font-black font-mono text-purple-500">
            {totalPreparedValues.toLocaleString()}
          </p>
          <p className="text-[11px] text-brand-textMuted">
            Unique coupon secrets ready for instant delivery
          </p>
        </div>
      </div>

      {/* Notifications / Alerts */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-400 text-xs font-bold flex items-center gap-2"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 text-xs font-bold flex items-center justify-between gap-2"
        >
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorMsg}</span>
          </div>
          <button
            onClick={() => setErrorMsg(null)}
            className="text-rose-400 hover:text-rose-200 cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </motion.div>
      )}

      {/* Inventory Grid View */}
      {viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredPrizes.map((p) => {
            const hasLowStock = p.availableStock < 50;
            const prepPct =
              p.totalStock > 0
                ? Math.round(((p.filledValuesCount ?? 0) / p.totalStock) * 100)
                : 0;

            return (
              <div
                key={p.id}
                className="bg-card-bg border border-card-border rounded-3xl p-5 shadow-sm space-y-4 hover:border-blue-500/40 transition-all flex flex-col justify-between"
              >
                <div className="space-y-3">
                  {/* Top image & Category Badge */}
                  <div className="flex items-start justify-between gap-3">
                    <div className="w-14 h-14 rounded-2xl bg-card-bg-subtle border border-card-border overflow-hidden shrink-0 flex items-center justify-center">
                      <img
                        src={p.image || DEFAULT_PRIZE_IMAGE_URL}
                        alt={p.name}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          e.currentTarget.src = DEFAULT_PRIZE_IMAGE_URL;
                        }}
                      />
                    </div>
                    <div className="text-right">
                      <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2.5 py-1 rounded-full bg-blue-500/10 text-blue-500 border border-blue-500/20">
                        {p.category}
                      </span>
                      {p.itemValue && (
                        <p className="text-xs font-black text-brand-text font-mono mt-1">
                          {p.itemValue}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Title & Description */}
                  <div>
                    <h3 className="text-base font-black tracking-tight text-brand-text">
                      {p.name}
                    </h3>
                    <p className="text-xs text-brand-textMuted line-clamp-2 mt-0.5">
                      {p.description || "No description provided."}
                    </p>
                  </div>

                  {/* Stock Levels Visual Bar */}
                  <div className="space-y-1.5 pt-1">
                    <div className="flex justify-between text-xs font-mono font-bold">
                      <span className="text-brand-textMuted">
                        Available Pool:
                      </span>
                      <span
                        className={
                          hasLowStock ? "text-amber-500" : "text-emerald-500"
                        }
                      >
                        {p.availableStock.toLocaleString()} /{" "}
                        {p.totalStock.toLocaleString()}
                      </span>
                    </div>
                    <div className="w-full bg-card-bg-subtle h-2 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full ${
                          hasLowStock ? "bg-amber-500" : "bg-emerald-500"
                        }`}
                        style={{
                          width: `${
                            p.totalStock > 0
                              ? Math.min(
                                  100,
                                  Math.round(
                                    (p.availableStock / p.totalStock) * 100,
                                  ),
                                )
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>

                  {/* Preparation & Usage Badges */}
                  <div className="grid grid-cols-2 gap-2 text-[11px] font-medium text-brand-textMuted pt-1">
                    <div className="bg-card-bg-subtle p-2 rounded-xl border border-card-border">
                      <span>Codes Prepared:</span>
                      <p className="font-bold text-brand-text font-mono">
                        {p.filledValuesCount ?? 0} ({prepPct}%)
                      </p>
                    </div>
                    <div className="bg-card-bg-subtle p-2 rounded-xl border border-card-border">
                      <span>In Active Usage:</span>
                      <p className="font-bold text-brand-text font-mono">
                        {p.allocatedStock.toLocaleString()} units
                      </p>
                    </div>
                  </div>
                </div>

                {/* Card Footer Actions */}
                <div className="space-y-3 pt-3 border-t border-card-border">
                  {/* Digital Codes Management Button */}
                  <button
                    type="button"
                    onClick={() => openValuesModal(p)}
                    className="w-full py-2.5 px-4 rounded-2xl bg-card-bg-subtle hover:bg-blue-600 hover:text-white border border-card-border text-xs font-bold flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm group"
                  >
                    <Code className="w-4 h-4 text-blue-500 group-hover:text-white" />
                    <span>
                      Manage Secret Codes ({p.filledValuesCount ?? 0}/
                      {p.totalStock})
                    </span>
                  </button>

                  {/* Quick Increment/Decrement Adjustments */}
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder="Qty"
                      min="1"
                      value={adjustments[p.id] ?? ""}
                      onChange={(e) =>
                        setAdjustments({
                          ...adjustments,
                          [p.id]: e.target.value,
                        })
                      }
                      className="w-20 bg-card-bg-subtle border border-card-border rounded-xl px-2.5 py-1.5 text-xs text-brand-text font-mono font-bold placeholder-brand-textMuted focus:outline-none focus:border-blue-500"
                    />
                    <button
                      type="button"
                      onClick={() => handleAdjustStock(p.id, true)}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-card-bg-subtle hover:bg-card-bg hover:border-emerald-500/50 border border-card-border text-xs font-bold text-emerald-500 flex items-center justify-center gap-1 cursor-pointer transition-all"
                      title="Add to total stock pool"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Add</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => handleAdjustStock(p.id, false)}
                      className="flex-1 py-1.5 px-2.5 rounded-xl bg-card-bg-subtle hover:bg-card-bg hover:border-rose-500/50 border border-card-border text-xs font-bold text-rose-500 flex items-center justify-center gap-1 cursor-pointer transition-all"
                      title="Reduce from total stock pool"
                    >
                      <Minus className="w-3.5 h-3.5" />
                      <span>Reduce</span>
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="bg-card-bg border border-card-border rounded-3xl overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-card-bg-subtle border-b border-card-border text-brand-textMuted uppercase font-black text-[10px] tracking-wider">
                <tr>
                  <th className="py-3.5 px-5">Reward</th>
                  <th className="py-3.5 px-4">Category</th>
                  <th className="py-3.5 px-4">Face Value</th>
                  <th className="py-3.5 px-4">Available / Total</th>
                  <th className="py-3.5 px-4">Prepared Codes</th>
                  <th className="py-3.5 px-4">Allocated</th>
                  <th className="py-3.5 px-5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-card-border">
                {filteredPrizes.map((p) => {
                  const isLow = p.availableStock < 50;
                  return (
                    <tr
                      key={p.id}
                      className="hover:bg-card-bg-subtle/50 transition-colors"
                    >
                      <td className="py-3.5 px-5 flex items-center gap-3">
                        <img
                          src={p.image || DEFAULT_PRIZE_IMAGE_URL}
                          alt={p.name}
                          className="w-9 h-9 rounded-xl object-cover border border-card-border shrink-0"
                          onError={(e) => {
                            e.currentTarget.src = DEFAULT_PRIZE_IMAGE_URL;
                          }}
                        />
                        <div>
                          <p className="font-bold text-brand-text">{p.name}</p>
                          <p className="text-[11px] text-brand-textMuted truncate max-w-xs">
                            {p.description || "No description"}
                          </p>
                        </div>
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-textMuted uppercase">
                        {p.category}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-brand-text">
                        {p.itemValue || "—"}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold">
                        <span
                          className={
                            isLow ? "text-amber-500" : "text-emerald-500"
                          }
                        >
                          {p.availableStock.toLocaleString()}
                        </span>{" "}
                        / {p.totalStock.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-purple-400">
                        {p.filledValuesCount ?? 0} / {p.totalStock}
                      </td>
                      <td className="py-3.5 px-4 font-mono font-bold text-indigo-400">
                        {p.allocatedStock.toLocaleString()}
                      </td>
                      <td className="py-3.5 px-5 text-right">
                        <button
                          type="button"
                          onClick={() => openValuesModal(p)}
                          className="px-3 py-1.5 rounded-xl bg-card-bg-subtle hover:bg-blue-600 hover:text-white border border-card-border text-xs font-bold text-blue-500 transition-all cursor-pointer"
                        >
                          Manage Codes
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* MODAL: Digital Secret Codes Management */}
      <AnimatePresence>
        {selectedTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card-bg border border-card-border rounded-3xl w-full max-w-5xl max-h-[90vh] shadow-2xl flex flex-col overflow-hidden"
            >
              {/* Modal Header */}
              <div className="p-5 sm:p-6 border-b border-card-border flex items-center justify-between bg-card-bg-subtle shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-blue-500/10 text-blue-500 flex items-center justify-center">
                    <Code className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="text-lg font-black tracking-tight text-brand-text">
                      {selectedTemplate.name} — Secret Codes Pool
                    </h3>
                    <p className="text-xs text-brand-textMuted">
                      Total Capacity: {selectedTemplate.totalStock} slots •
                      Prepared:{" "}
                      {
                        activeTemplateItems.filter((item) =>
                          item.item_value?.trim(),
                        ).length
                      }{" "}
                      • Empty:{" "}
                      {
                        activeTemplateItems.filter(
                          (item) => !item.item_value || !item.item_value.trim(),
                        ).length
                      }
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={closeValuesModal}
                  className="p-2 rounded-xl text-brand-textMuted hover:text-brand-text hover:bg-card-bg transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Persistent Duplicate Conflicts Alert */}
              {unresolvedConflicts.length > 0 && (
                <div className="mx-6 mt-4 p-3.5 rounded-2xl border border-amber-500/40 bg-amber-500/15 flex items-center justify-between text-xs text-amber-300">
                  <div className="flex items-center gap-2.5">
                    <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                    <span>
                      <strong>Warning:</strong> {unresolvedConflicts.length}{" "}
                      duplicate voucher code(s) exist in this template. Check
                      below to ensure unique values.
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

              {/* Toolbar: Import Mode Selector + Actions */}
              <div className="p-4 sm:p-6 border-b border-card-border space-y-4 shrink-0">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  {/* Left: Mode selector & File Upload */}
                  <div className="flex flex-wrap items-center gap-2.5">
                    {/* Import Mode Radio Toggle */}
                    <div className="flex items-center bg-card-bg-subtle p-1 rounded-2xl border border-card-border">
                      <button
                        type="button"
                        onClick={() => setImportMode("append")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          importMode === "append"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-brand-textMuted hover:text-brand-text"
                        }`}
                        title="Preserves existing codes and places new ones into next available empty slots"
                      >
                        Append (Fill Empty)
                      </button>
                      <button
                        type="button"
                        onClick={() => setImportMode("replace")}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                          importMode === "replace"
                            ? "bg-blue-600 text-white shadow-sm"
                            : "text-brand-textMuted hover:text-brand-text"
                        }`}
                        title="Overwrites existing codes starting from slot 1"
                      >
                        Replace All
                      </button>
                    </div>

                    {/* Import File Button */}
                    <input
                      ref={modalFileInputRef}
                      type="file"
                      accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) void handleBulkUpload(file);
                        e.target.value = "";
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => modalFileInputRef.current?.click()}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                    >
                      <Upload className="w-4 h-4" />
                      <span>Import Excel / CSV</span>
                    </button>

                    {/* Auto-Fill Random Codes Button */}
                    <button
                      type="button"
                      onClick={handleFillRandomSlots}
                      disabled={isGeneratingRandom || itemsSaving}
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-2xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm disabled:opacity-50"
                      title="Generates 8-character unique alphanumeric codes for all empty slots"
                    >
                      <Sparkles className="w-4 h-4" />
                      <span>
                        {isGeneratingRandom
                          ? "Generating..."
                          : "Auto-Fill Empty (Random)"}
                      </span>
                    </button>
                  </div>

                  {/* Right: Export options */}
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={downloadBulkTemplate}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-card-bg-subtle hover:bg-card-bg border border-card-border text-xs font-bold text-brand-textMuted hover:text-brand-text transition-all cursor-pointer"
                      title="Download sample CSV template"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Template</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => exportCurrentValues("xlsx")}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/20 text-xs font-bold text-emerald-500 transition-all cursor-pointer"
                    >
                      <FileSpreadsheet className="w-3.5 h-3.5" />
                      <span>Export Excel</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => exportCurrentValues("csv")}
                      className="inline-flex items-center gap-1.5 px-3 py-2 rounded-2xl bg-card-bg-subtle hover:bg-card-bg border border-card-border text-xs font-bold text-brand-textMuted hover:text-brand-text transition-all cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Export CSV</span>
                    </button>
                  </div>
                </div>
              </div>

              {/* Codes Table List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6">
                {itemsLoading ? (
                  <div className="py-20 flex flex-col items-center justify-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                    <p className="text-xs text-brand-textMuted font-bold">
                      Loading secret codes from database...
                    </p>
                  </div>
                ) : activeTemplateItems.length === 0 ? (
                  <div className="py-20 text-center text-xs text-brand-textMuted">
                    No items found for this template.
                  </div>
                ) : (
                  <div className="border border-card-border rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-card-bg-subtle border-b border-card-border text-brand-textMuted uppercase font-black text-[10px] tracking-wider">
                        <tr>
                          <th className="py-3 px-4 w-16">Slot</th>
                          <th className="py-3 px-4">
                            Coupon / Unique Secret Value
                          </th>
                          <th className="py-3 px-4 w-36 text-center">Status</th>
                          <th className="py-3 px-4 w-28 text-right">
                            Quick Gen
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-card-border">
                        {activeTemplateItems.map((instance) => {
                          const isRedeemed = Boolean(
                            instance.is_redeemed || instance.is_used,
                          );
                          const hasValue = Boolean(instance.item_value?.trim());

                          return (
                            <tr
                              key={instance.id}
                              className={`transition-colors ${
                                isRedeemed
                                  ? "bg-red-500/10 hover:bg-red-500/15 border-l-4 border-l-red-500"
                                  : "hover:bg-card-bg-subtle/50"
                              }`}
                            >
                              <td className="py-3 px-4 font-mono font-bold text-brand-textMuted">
                                #{instance.item_index}
                              </td>
                              <td className="py-2 px-4">
                                <input
                                  type="text"
                                  disabled={isRedeemed}
                                  value={instance.item_value ?? ""}
                                  onChange={(e) =>
                                    handleLocalItemChange(
                                      instance.id,
                                      e.target.value,
                                    )
                                  }
                                  onBlur={(e) =>
                                    void updateSingleItemValue(
                                      instance.id,
                                      e.target.value,
                                    )
                                  }
                                  placeholder={
                                    isRedeemed
                                      ? "Redeemed by player"
                                      : selectedTemplate.category === "voucher"
                                        ? "Enter coupon code / voucher value..."
                                        : "Optional serial / ID..."
                                  }
                                  className={`w-full font-mono text-xs font-bold rounded-xl px-3 py-2 outline-none transition-all ${
                                    isRedeemed
                                      ? "bg-red-500/15 text-red-500 dark:text-red-400 font-black line-through cursor-not-allowed border border-red-500/40"
                                      : "bg-card-bg-subtle border border-card-border focus:border-blue-500 text-brand-text"
                                  }`}
                                />
                              </td>
                              <td className="py-3 px-4 text-center">
                                {isRedeemed ? (
                                  <span
                                    className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/40"
                                    title={`Redeemed at: ${instance.redeemed_at || "N/A"}`}
                                  >
                                    <Lock className="w-3 h-3 text-red-500" />
                                    Redeemed
                                  </span>
                                ) : hasValue ? (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                    Prepared
                                  </span>
                                ) : (
                                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-card-bg-subtle text-brand-textMuted border border-card-border">
                                    Empty
                                  </span>
                                )}
                              </td>
                              <td className="py-3 px-4 text-right">
                                {!isRedeemed && !hasValue && (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      handleGenerateSingleRandom(instance.id)
                                    }
                                    className="p-1.5 rounded-lg bg-card-bg-subtle hover:bg-purple-600 hover:text-white text-purple-400 transition-all cursor-pointer border border-card-border"
                                    title="Generate 8-char random alphanumeric code"
                                  >
                                    <Sparkles className="w-3.5 h-3.5" />
                                  </button>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}

                {overflowTemplateItems.length > 0 && (
                  <div className="mt-4 overflow-hidden rounded-2xl border border-orange-500/30">
                    <div className="border-b border-orange-500/30 bg-orange-500/10 px-4 py-2.5 text-xs text-orange-300 font-bold">
                      Historical rows outside current stock (
                      {overflowTemplateItems.length})
                    </div>
                    <table className="w-full text-left text-xs">
                      <thead className="bg-card-bg-subtle border-b border-card-border text-brand-textMuted uppercase font-black text-[10px]">
                        <tr>
                          <th className="py-2.5 px-4 w-16">Slot</th>
                          <th className="py-2.5 px-4">
                            Historical Stored Value
                          </th>
                          <th className="py-2.5 px-4 w-28 text-right">
                            Source
                          </th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-card-border bg-black/20">
                        {overflowTemplateItems.map((instance) => (
                          <tr key={instance.id}>
                            <td className="py-2.5 px-4 font-mono font-bold text-brand-textMuted">
                              #{instance.item_index}
                            </td>
                            <td className="py-2.5 px-4 font-mono text-xs text-brand-text">
                              {instance.item_value?.trim() || "—"}
                            </td>
                            <td className="py-2.5 px-4 text-right text-brand-textMuted capitalize">
                              {instance.source_type}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 border-t border-card-border bg-card-bg-subtle flex items-center justify-between shrink-0">
                <span className="text-xs text-brand-textMuted">
                  {itemsSaving ? (
                    <span className="text-blue-500 font-bold flex items-center gap-1.5">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving changes...
                    </span>
                  ) : (
                    "Values save automatically to Supabase when focus leaves the input."
                  )}
                </span>
                <button
                  type="button"
                  onClick={closeValuesModal}
                  className="px-6 py-2 rounded-2xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition-all cursor-pointer shadow-sm"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

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
                            className="flex-1 bg-card-bg border border-card-border rounded-xl px-3 py-1.5 text-xs font-mono text-brand-text focus:outline-none focus:border-blue-500"
                          />
                          <button
                            type="button"
                            onClick={() =>
                              handleApplyConflictFix(conflict.lineNumber)
                            }
                            disabled={
                              !conflictFixInputs[conflict.lineNumber]?.trim()
                            }
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold transition disabled:opacity-40 cursor-pointer"
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
