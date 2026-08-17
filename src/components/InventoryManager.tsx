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
  Minus,
  MousePointerClick,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  X,
} from "lucide-react";
import { motion } from "motion/react";
import { useInventoryManager } from "../hooks/useInventoryManager";
import { toFriendlyErrorMessage } from "../lib/errorMessages";
import { DEFAULT_PRIZE_IMAGE_URL } from "../lib/defaultImages";
import {
  parseCSVFile,
  parseExcelFile,
  exportToCSV,
  exportToExcel,
} from "../lib/exportUtils";

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

  const {
    templateItems,
    setTemplateItems,
    loading: itemsLoading,
    saving: itemsSaving,
    error: hookError,
    loadTemplateItems,
    updateSingleItemValue,
    saveAllItemsBulk,
  } = useInventoryManager(organizationId);

  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const totalStockInPool = prizes.reduce((acc, p) => acc + p.totalStock, 0);
  const totalAllocated = prizes.reduce((acc, p) => acc + p.allocatedStock, 0);
  const totalAvailable = prizes.reduce((acc, p) => acc + p.availableStock, 0);
  const totalPreparedValues = prizes.reduce(
    (acc, p) => acc + (p.filledValuesCount ?? 0),
    0,
  );
  const totalDistributed = prizes.reduce(
    (acc, p) => acc + (p.quantityWonCount ?? 0),
    0,
  );
  const totalCampaignBindings = prizes.reduce(
    (acc, p) => acc + (p.campaignUsageCount ?? 0),
    0,
  );
  const lowStockCount = prizes.filter((p) => p.availableStock < 50).length;

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
    window.setTimeout(() => setSuccessMsg(""), 3500);
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
    await loadTemplateItems(template);
  };

  const closeValuesModal = () => {
    setSelectedTemplate(null);
    setTemplateItems([]);
    setErrorMsg(null);
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

  const handleSaveSingleItem = async (id: string, value: string) => {
    const success = await updateSingleItemValue(id, value);
    if (success) {
      onRefreshPrizes?.();
    }
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
      Status: item.item_value?.trim() ? "Prepared" : "Empty",
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

      // Identify column keys regardless of case or spaces
      const sampleRow = rows[0] ?? {};
      const keys = Object.keys(sampleRow);
      const valKey =
        keys.find(
          (k) =>
            k
              .toLowerCase()
              .replace(/[^a-z]/g, "")
              .includes("itemvalue") ||
            k.toLowerCase().includes("value") ||
            k.toLowerCase().includes("code"),
        ) ??
        keys[1] ??
        keys[0];
      const idxKey =
        keys.find(
          (k) =>
            k
              .toLowerCase()
              .replace(/[^a-z]/g, "")
              .includes("itemindex") || k.toLowerCase().includes("index"),
        ) ?? keys[0];

      if (!valKey) {
        throw new Error(
          "CSV/Excel file must include an item_value or code column.",
        );
      }

      const updates = rows.map((row, rIdx) => {
        const rawIdx = String(row[idxKey ?? ""] ?? "").trim();
        const parsedIdx = Number.parseInt(rawIdx, 10);
        const item_index =
          Number.isInteger(parsedIdx) && parsedIdx > 0 ? parsedIdx : rIdx + 1;
        const item_value = String(row[valKey] ?? "").trim();
        return { item_index, item_value };
      });

      const itemsToSave: { id: string; item_value: string | null }[] = [];
      let importedCount = 0;

      for (const update of updates) {
        const matchedItem = templateItems.find(
          (t) => t.item_index === update.item_index,
        );
        if (matchedItem) {
          itemsToSave.push({
            id: matchedItem.id,
            item_value: update.item_value.length > 0 ? update.item_value : null,
          });
          importedCount++;
        }
      }

      await saveAllItemsBulk(selectedTemplate, itemsToSave);
      onRefreshPrizes?.();
      showSuccess(
        `Successfully imported ${importedCount} voucher values for ${selectedTemplate.name}.`,
      );
    } catch (err) {
      setErrorMsg(
        toFriendlyErrorMessage(
          err,
          "Failed to import voucher file. Please verify the file format and try again.",
        ),
      );
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
      setAdjustments((current) => ({ ...current, [id]: "" }));
      showSuccess(
        `Stock adjusted by ${isIncrement ? "+" : "-"}${amount} units.`,
      );
    } catch (err) {
      setErrorMsg(toFriendlyErrorMessage(err, "Failed to update stock."));
    }
  };

  return (
    <div id="inventory-manager-root" className="space-y-6 text-brand-text">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <div className="max-w-xl">
          <h2 className="text-2xl font-bold tracking-tight text-white mb-2">
            Stock Room & Vault
          </h2>
          <p className="text-brand-textMuted text-xs leading-relaxed">
            Centrally manage your inventory across all active campaigns. Select
            a specific reward template to securely configure its value pool or
            import bulk data via CSV.
          </p>
        </div>

        <div className="flex items-center gap-4">
          <div className="relative w-64">
            <Search className="absolute left-3 w-3.5 h-3.5 text-brand-textMuted top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search templates..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white/5 hover:bg-white/10 border-transparent focus:bg-white/10 focus:border-blue-500/50 rounded-lg pl-9 pr-3 text-xs text-white placeholder-brand-textMuted min-h-[36px] focus:outline-none"
            />
          </div>
          <div className="flex items-center bg-white/5 border border-white/5 p-1 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "grid"
                  ? "bg-white/10 text-white"
                  : "text-brand-textMuted hover:text-white"
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Cards</span>
            </button>
            <button
              onClick={() => setViewMode("table")}
              className={`px-3 py-1.5 rounded-md text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === "table"
                  ? "bg-white/10 text-white"
                  : "text-brand-textMuted hover:text-white"
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>List</span>
            </button>
          </div>
        </div>
      </div>

      {/* MESSAGES */}
      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-500/20 border border-emerald-500/30 text-emerald-400 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm"
        >
          <Check className="w-4.5 h-4.5 text-emerald-400 shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/20 border border-red-500/30 text-red-400 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm"
        >
          <AlertTriangle className="w-4.5 h-4.5 text-red-400 shrink-0" />
          <span>{errorMsg}</span>
        </motion.div>
      )}

      {/* TOP STATS */}
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-3">
        <div className="bg-card-bg border border-brand-border/30 p-3 rounded-[16px] flex items-center gap-3 group">
          <div className="bg-white/5 w-8 h-8 rounded-lg flex items-center justify-center text-white/50 border border-white/10 shrink-0">
            <Database className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[9px] font-extrabold font-mono text-brand-textMuted uppercase tracking-widest mb-0.5">
              Total Stock
            </span>
            <span className="text-base font-black text-white leading-none">
              {totalStockInPool.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-card-bg border border-brand-border/30 p-3 rounded-[16px] flex items-center gap-3 group">
          <div className="bg-orange-500/10 w-8 h-8 rounded-lg flex items-center justify-center text-orange-400 border border-orange-500/20 shrink-0">
            <ShieldCheck className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[9px] font-extrabold font-mono text-brand-textMuted uppercase tracking-widest mb-0.5">
              Reserved
            </span>
            <span className="text-base font-black text-orange-400 leading-none">
              {totalAllocated.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-card-bg border border-brand-border/30 p-3 rounded-[16px] flex items-center gap-3 group">
          <div className="bg-emerald-500/10 w-8 h-8 rounded-lg flex items-center justify-center text-emerald-400 border border-emerald-500/20 shrink-0">
            <Pencil className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[9px] font-extrabold font-mono text-brand-textMuted uppercase tracking-widest mb-0.5">
              Prepared
            </span>
            <span className="text-base font-black text-emerald-400 leading-none">
              {totalPreparedValues.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-card-bg border border-brand-border/30 p-3 rounded-[16px] flex items-center gap-3 group">
          <div
            className={`${lowStockCount > 0 ? "bg-red-500/10 text-red-400 border-red-500/20" : "bg-white/5 text-white/50 border-white/10"} w-8 h-8 rounded-lg flex items-center justify-center border shrink-0`}
          >
            <AlertTriangle className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[9px] font-extrabold font-mono text-brand-textMuted uppercase tracking-widest mb-0.5">
              Available
            </span>
            <span className="text-base font-black text-white leading-none">
              {totalAvailable.toLocaleString()}
            </span>
          </div>
        </div>

        <div className="bg-card-bg border border-brand-border/30 p-3 rounded-[16px] flex items-center gap-3 group">
          <div className="bg-sky-500/10 w-8 h-8 rounded-lg flex items-center justify-center text-sky-400 border border-sky-500/20 shrink-0">
            <Check className="w-3.5 h-3.5" />
          </div>
          <div className="flex flex-col justify-center">
            <span className="text-[9px] font-extrabold font-mono text-brand-textMuted uppercase tracking-widest mb-0.5">
              Distributed
            </span>
            <span className="text-base font-black text-sky-400 leading-none">
              {totalDistributed.toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* MAIN BODY */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* LEFT COLUMN: LIST */}
        <div className="lg:col-span-2">
          {viewMode === "grid" ? (
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
              {filteredPrizes.map((p) => {
                const stockPercentage =
                  p.totalStock > 0
                    ? Math.round((p.availableStock / p.totalStock) * 100)
                    : 0;

                return (
                  <div
                    key={p.id}
                    onClick={() => openValuesModal(p)}
                    className="bg-card-bg border border-brand-border/30 rounded-[12px] p-3 shadow-sm flex flex-col gap-3 hover:border-blue-500/30 transition-colors cursor-pointer group"
                  >
                    {/* TOP SECTION */}
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-900/40 border border-blue-500/20 flex items-center justify-center shrink-0">
                          {p.category === "voucher" ? (
                            <FileSpreadsheet className="w-3.5 h-3.5 text-blue-400" />
                          ) : (
                            <Database className="w-3.5 h-3.5 text-emerald-400" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5 mb-0.5">
                            <h3 className="font-extrabold text-white text-xs leading-tight line-clamp-1">
                              {p.name}
                            </h3>
                            <span className="bg-blue-900/30 text-blue-400 border border-blue-500/20 px-1 py-0.25 rounded text-[6px] font-bold uppercase tracking-wider shrink-0">
                              {p.category}
                            </span>
                          </div>
                          <span className="text-[8px] font-mono text-brand-textMuted">
                            ID:{" "}
                            <span className="text-brand-textMuted/70">
                              {p.id.slice(0, 8)}...
                            </span>
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-col items-end gap-1 shrink-0">
                        <span className="font-mono text-blue-400 font-bold text-[10px]">
                          {p.itemValue} DA
                        </span>
                        <div
                          className="flex items-center gap-0.5 bg-white/5 p-0.5 rounded border border-white/10"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => handleAdjustStock(p.id, true)}
                            className="w-4 h-4 rounded bg-blue-600 flex items-center justify-center hover:bg-blue-500 text-white transition-colors"
                          >
                            <Plus className="w-2 h-2" />
                          </button>
                          <button
                            onClick={() => handleAdjustStock(p.id, false)}
                            className="w-4 h-4 rounded bg-white/5 flex items-center justify-center hover:bg-white/10 text-white transition-colors"
                          >
                            <Minus className="w-2 h-2" />
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* BOTTOM SECTION */}
                    <div className="bg-card-bg-subtle rounded-lg p-2.5 flex flex-col gap-3">
                      {/* Distribution Chart (Mock) */}
                      <div className="w-full">
                        <div className="flex justify-between items-center mb-1.5">
                          <span className="text-[7px] font-bold text-brand-textMuted uppercase">
                            Dist
                          </span>
                          <span className="text-[7px] font-bold text-white uppercase">
                            Total: {p.totalStock.toLocaleString()}
                          </span>
                        </div>
                        <div className="flex items-end gap-0.5 h-6 w-full border-b border-blue-600 pb-0.5">
                          <div className="w-1/6 bg-blue-600/30 h-[20%] rounded-t-[2px] transition-all group-hover:h-[25%]" />
                          <div className="w-1/6 bg-blue-600/30 h-[30%] rounded-t-[2px] transition-all group-hover:h-[40%]" />
                          <div className="w-1/6 bg-blue-600/50 h-[50%] rounded-t-[2px] transition-all group-hover:h-[60%]" />
                          <div className="w-1/6 bg-blue-600 h-[70%] rounded-t-[2px] transition-all group-hover:h-[90%]" />
                          <div className="w-1/6 bg-blue-600/80 h-[100%] rounded-t-[2px] transition-all group-hover:h-[80%]" />
                          <div className="w-1/6 bg-blue-600 h-[80%] rounded-t-[2px] transition-all group-hover:h-[100%]" />
                        </div>
                      </div>

                      {/* Progress & Stats */}
                      <div className="flex gap-3 items-center justify-between border-t border-brand-border/40 pt-2">
                        <div className="flex items-center gap-2">
                          <div className="w-8 h-8 rounded-full border-2 border-blue-600 flex items-center justify-center relative bg-black/20 shrink-0">
                            <span className="font-bold text-white text-[8px]">
                              {stockPercentage}%
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-[7px] font-bold text-brand-textMuted uppercase">
                              Available
                            </span>
                            <span className="text-[8px] font-bold text-blue-400">
                              {p.availableStock.toLocaleString()}
                            </span>
                          </div>
                        </div>

                        <div className="flex flex-col gap-0.5 items-end border-l border-brand-border/40 pl-2">
                          <span className="text-[7px] font-bold text-brand-textMuted uppercase">
                            Active
                          </span>
                          <span className="text-[10px] font-bold text-white">
                            {p.campaignUsageCount || 0}
                          </span>
                        </div>

                        <div className="flex flex-col gap-0.5 items-end border-l border-brand-border/40 pl-2">
                          <span className="text-[7px] font-bold text-brand-textMuted uppercase">
                            Reserved
                          </span>
                          <span className="text-[10px] font-bold text-orange-400">
                            {p.allocatedStock.toLocaleString()}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredPrizes.length === 0 && (
                <div className="col-span-full text-center py-12 bg-card-bg border border-brand-border/30 rounded-[20px]">
                  <Database className="w-8 h-8 text-brand-textMuted/50 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-white">
                    No matching stocks found
                  </h4>
                  <p className="text-[11px] text-brand-textMuted mt-1">
                    Try refining your search text or clear filters.
                  </p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-card-bg border border-brand-border/30 rounded-[20px] p-6 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-brand-border/30 text-[10px] font-mono text-brand-textMuted uppercase">
                      <th className="pb-3 pl-1 font-semibold">Reward Title</th>
                      <th className="pb-3 font-semibold text-center">
                        Category
                      </th>
                      <th className="pb-3 font-semibold text-center">
                        Prepared
                      </th>
                      <th className="pb-3 font-semibold text-center">
                        Reserved
                      </th>
                      <th className="pb-3 font-semibold text-center">Won</th>
                      <th className="pb-3 font-semibold text-center">
                        Campaigns
                      </th>
                      <th className="pb-3 font-semibold text-center">
                        Available
                      </th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-brand-border/30 text-xs text-brand-text">
                    {filteredPrizes.map((p) => {
                      const isLow = p.availableStock < 50;
                      return (
                        <tr
                          key={p.id}
                          className="hover:bg-white/5 transition-all duration-150 cursor-pointer"
                          onClick={() => openValuesModal(p)}
                        >
                          <td className="py-3.5 pl-1">
                            <p className="font-bold text-white leading-tight">
                              {p.name}
                            </p>
                            <span className="text-[9px] text-brand-textMuted font-mono">
                              ID: {p.id}
                            </span>
                          </td>
                          <td className="py-3.5 text-center">
                            <span
                              className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                                p.category === "voucher"
                                  ? "bg-blue-500/20 text-blue-400"
                                  : "bg-emerald-500/20 text-emerald-400"
                              }`}
                            >
                              {p.category}
                            </span>
                          </td>
                          <td className="py-3.5 text-center font-mono text-white">
                            {p.filledValuesCount ?? 0} / {p.totalStock}
                          </td>
                          <td className="py-3.5 text-center font-mono text-white">
                            {p.allocatedStock}
                          </td>
                          <td className="py-3.5 text-center font-mono text-sky-400">
                            {p.quantityWonCount ?? 0}
                          </td>
                          <td className="py-3.5 text-center font-mono text-white">
                            {p.campaignUsageCount ?? 0}
                          </td>
                          <td className="py-3.5 text-center">
                            <span
                              className={`inline-flex items-center gap-1.5 font-bold font-mono ${isLow ? "text-orange-400" : "text-white"}`}
                            >
                              {isLow && (
                                <AlertTriangle className="w-3.5 h-3.5 text-orange-400" />
                              )}
                              <span>
                                {p.availableStock} / {p.totalStock}
                              </span>
                            </span>
                          </td>
                          <td
                            className="py-3.5 text-right"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <div className="flex items-center gap-1 justify-end">
                              <button
                                onClick={() => handleAdjustStock(p.id, true)}
                                className="bg-blue-600 hover:bg-blue-500 border border-transparent text-white p-1.5 rounded-lg cursor-pointer transition-colors"
                                title="Restock"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleAdjustStock(p.id, false)}
                                className="bg-white/5 hover:bg-white/10 border border-transparent text-brand-textMuted hover:text-white p-1.5 rounded-lg cursor-pointer transition-colors"
                                title="Deduct"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: VALUE ROOM PANEL */}
        <div className="lg:col-span-1 hidden lg:block">
          <div className="sticky top-6 bg-card-bg border border-brand-border/30 rounded-[20px] p-6 shadow-sm flex flex-col gap-6">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-blue-400 shrink-0">
                <FileSpreadsheet className="w-4 h-4" />
              </div>
              <h3 className="font-extrabold text-white text-lg">Value Room</h3>
            </div>

            <p className="text-[11px] font-semibold text-brand-textMuted leading-relaxed">
              Bulk CSV import is securely scoped per template. Select a reward
              card first to securely enter manual codes or import your CSV pool.
            </p>

            <div className="flex flex-col gap-5 mt-2">
              <div className="flex gap-3">
                <FileSpreadsheet className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-white">
                    Voucher templates:
                  </span>
                  <span className="text-[10px] text-brand-textMuted leading-relaxed">
                    Provide the actual pin/code for each unit to be distributed.
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Database className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1">
                  <span className="text-xs font-bold text-white">
                    Physical items:
                  </span>
                  <span className="text-[10px] text-brand-textMuted leading-relaxed">
                    Reference/warehouse IDs are optional per unit.
                  </span>
                </div>
              </div>

              <div className="flex gap-3">
                <Code className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                <div className="flex flex-col gap-1 w-full">
                  <span className="text-xs font-bold text-white">
                    Required CSV Structure:
                  </span>
                  <div className="bg-black/50 border border-brand-border/50 p-2 rounded-lg mt-1 w-full flex items-center justify-center">
                    <span className="text-[10px] font-mono text-blue-300">
                      Item_Index,Item_value
                    </span>
                  </div>
                </div>
              </div>
            </div>

            <div className="border border-dashed border-brand-border/60 rounded-xl p-4 mt-2 flex flex-col items-center justify-center text-center gap-2 bg-card-bg-subtle/30">
              <MousePointerClick className="w-5 h-5 text-brand-textMuted opacity-70" />
              <span className="text-[10px] font-semibold text-brand-textMuted leading-relaxed max-w-[200px]">
                Select any reward card from the list to access its secure Value
                Room.
              </span>
            </div>
          </div>
        </div>
      </div>

      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-brand-background/80 backdrop-blur-sm p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] glass-panel border-brand-border/30 shadow-2xl">
            <div className="flex flex-col gap-4 border-b border-brand-border/30 px-6 py-5 sm:flex-row sm:items-start sm:justify-between bg-black/20">
              <div>
                <img
                  src={selectedTemplate.image || DEFAULT_PRIZE_IMAGE_URL}
                  alt={`${selectedTemplate.name} preview`}
                  className="mb-3 h-20 w-28 rounded-2xl border border-brand-border/30 object-cover"
                  onError={(event) => {
                    event.currentTarget.src = DEFAULT_PRIZE_IMAGE_URL;
                  }}
                />
                <h2 className="text-lg font-bold text-white">
                  Reward room — {selectedTemplate.name}
                </h2>
                <p className="mt-1 text-sm text-brand-textMuted">
                  {selectedTemplate.category === "voucher"
                    ? "Enter the real voucher / coupon code for each unit."
                    : "Enter an optional serial, reference, or warehouse ID for each physical unit."}
                </p>
              </div>
              <button
                type="button"
                onClick={closeValuesModal}
                className="rounded-2xl glass-panel hover:bg-white/10 p-2.5 text-brand-textMuted transition hover:text-white border-transparent"
                aria-label="Close values modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/5 border border-brand-border/30 px-4 py-3">
                  <p className="text-[10px] font-mono uppercase text-brand-textMuted">
                    Category
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {selectedTemplate.category}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-brand-border/30 px-4 py-3">
                  <p className="text-[10px] font-mono uppercase text-brand-textMuted">
                    Prepared
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {
                      activeTemplateItems.filter((item) =>
                        item.item_value?.trim(),
                      ).length
                    }{" "}
                    / {selectedTemplate.totalStock}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-brand-border/30 px-4 py-3">
                  <p className="text-[10px] font-mono uppercase text-brand-textMuted">
                    Face value
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {selectedTemplate.itemValue}
                  </p>
                </div>
                <div className="rounded-2xl bg-white/5 border border-brand-border/30 px-4 py-3">
                  <p className="text-[10px] font-mono uppercase text-brand-textMuted">
                    Reserved / Won
                  </p>
                  <p className="mt-1 text-sm font-bold text-white">
                    {selectedTemplate.allocatedStock} reserved •{" "}
                    {selectedTemplate.quantityWonCount ?? 0} won
                  </p>
                </div>
              </div>

              <div className="rounded-2xl bg-black/20 border border-brand-border/30 px-4 py-3 text-[11px] text-brand-textMuted">
                <p>
                  Active campaign usage:{" "}
                  <strong className="text-white">
                    {selectedTemplate.campaignUsageCount ?? 0}
                  </strong>{" "}
                  campaign(s). Available stock shown in this room excludes
                  reserved units but does not remove historical rows used for
                  audit.
                </p>
              </div>

              {overflowTemplateItems.length > 0 && (
                <div className="rounded-2xl border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-[11px] text-orange-400">
                  Stock was reduced after this template had more item rows. The
                  extra historical rows are preserved below for audit and past
                  coupon tracing, but they are no longer part of the active
                  stock pool.
                </div>
              )}

              <div className="flex flex-wrap items-center justify-between gap-3 bg-black/20 border border-brand-border/30 p-4 rounded-2xl">
                <div className="flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={downloadBulkTemplate}
                    className="inline-flex items-center gap-2 rounded-2xl glass-panel px-3.5 py-2.5 text-xs font-semibold text-brand-textMuted shadow-sm transition hover:text-white hover:bg-white/10 border-transparent cursor-pointer"
                  >
                    <Download className="h-4 w-4" />
                    <span>Download Template</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => modalFileInputRef.current?.click()}
                    className="inline-flex items-center gap-2 rounded-2xl bg-blue-600 px-4 py-2.5 text-xs font-semibold text-white shadow-sm transition hover:bg-blue-500 cursor-pointer"
                  >
                    <Upload className="h-4 w-4" />
                    <span>Import Excel / CSV Values</span>
                  </button>
                  <input
                    ref={modalFileInputRef}
                    type="file"
                    accept=".csv, .xlsx, .xls, text/csv, application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleBulkUpload(file);
                      event.target.value = "";
                    }}
                  />
                </div>

                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => exportCurrentValues("xlsx")}
                    className="inline-flex items-center gap-1.5 rounded-2xl border border-emerald-500/30 bg-emerald-500/20 px-3 py-2 text-xs font-bold text-emerald-400 transition hover:bg-emerald-500/30 cursor-pointer shadow-sm"
                    title="Export current values to Excel (.xlsx)"
                  >
                    <FileSpreadsheet className="h-4 w-4" />
                    <span>Export Excel</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => exportCurrentValues("csv")}
                    className="inline-flex items-center gap-1.5 rounded-2xl glass-panel border-transparent px-3 py-2 text-xs font-bold text-brand-textMuted transition hover:bg-white/10 hover:text-white cursor-pointer shadow-sm"
                    title="Export current values to CSV"
                  >
                    <Download className="h-4 w-4" />
                    <span>Export CSV</span>
                  </button>
                </div>
              </div>

              {itemsLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-blue-500" />
                </div>
              ) : (
                <div className="overflow-hidden rounded-[24px] border border-brand-border/30">
                  <table className="min-w-full">
                    <thead className="border-b border-brand-border/30 bg-black/20 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-brand-textMuted">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Value / Reference</th>
                        <th className="px-4 py-3 text-center">Status</th>
                        <th className="px-4 py-3 text-right">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-border/30 bg-white/5">
                      {activeTemplateItems.map((instance) => {
                        const hasValue = !!instance.item_value?.trim();
                        return (
                          <tr
                            key={instance.id}
                            className="hover:bg-white/10 transition-all"
                          >
                            <td className="px-4 py-3 text-sm font-mono font-bold text-brand-textMuted">
                              #{instance.item_index}
                            </td>
                            <td className="px-4 py-3">
                              <input
                                type="text"
                                value={instance.item_value ?? ""}
                                onChange={(event) =>
                                  handleLocalItemChange(
                                    instance.id,
                                    event.target.value,
                                  )
                                }
                                placeholder={
                                  selectedTemplate.category === "voucher"
                                    ? "Enter coupon code / voucher value"
                                    : "Optional serial / reference / warehouse ID"
                                }
                                onBlur={(event) =>
                                  void updateSingleItemValue(
                                    instance.id,
                                    event.target.value,
                                  )
                                }
                                className="w-full rounded-2xl glass-panel border-transparent focus:border-blue-500/50 hover:bg-white/5 px-4 py-3 text-sm text-white placeholder-brand-textMuted outline-none transition focus:bg-white/10 min-h-12 font-mono"
                              />
                            </td>
                            <td className="px-4 py-3 text-center">
                              <span
                                className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase ${
                                  hasValue
                                    ? "bg-emerald-500/20 text-emerald-400 border border-emerald-500/30"
                                    : "bg-white/5 text-brand-textMuted border border-transparent"
                                }`}
                              >
                                {hasValue ? "Prepared" : "Empty"}
                              </span>
                            </td>
                            <td className="px-4 py-3 text-right text-xs">
                              <span
                                className={`px-2 py-0.5 rounded text-[10px] font-semibold capitalize ${
                                  instance.source_type === "bulk"
                                    ? "bg-blue-500/20 text-blue-400"
                                    : "bg-white/10 text-brand-textMuted"
                                }`}
                              >
                                {instance.source_type}
                              </span>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}

              {overflowTemplateItems.length > 0 && (
                <div className="overflow-hidden rounded-[24px] border border-orange-500/30">
                  <div className="border-b border-orange-500/30 bg-orange-500/10 px-4 py-3">
                    <h3 className="text-sm font-bold text-orange-400">
                      Historical rows outside current stock
                    </h3>
                    <p className="mt-1 text-[11px] text-orange-400/80">
                      These rows remain read-only because the template stock was
                      reduced after they were created.
                    </p>
                  </div>
                  <table className="min-w-full">
                    <thead className="border-b border-orange-500/30 bg-orange-500/5 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-orange-400">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Stored value / reference</th>
                        <th className="px-4 py-3">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-orange-500/10 bg-black/20">
                      {overflowTemplateItems.map((instance) => (
                        <tr key={instance.id}>
                          <td className="px-4 py-3 text-sm text-brand-textMuted">
                            #{instance.item_index}
                          </td>
                          <td className="px-4 py-3 text-sm text-white">
                            {instance.item_value?.trim() || "—"}
                          </td>
                          <td className="px-4 py-3 text-sm text-brand-textMuted capitalize">
                            {instance.source_type}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {itemsSaving && (
                <p className="inline-flex items-center gap-2 text-sm font-medium text-blue-500">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving changes...</span>
                </p>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
