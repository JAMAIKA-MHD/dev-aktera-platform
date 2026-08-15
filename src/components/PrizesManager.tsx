import React, { useMemo, useRef, useState } from "react";
import {
  AlertTriangle,
  Check,
  Clipboard,
  ClipboardCheck,
  Download,
  Eye,
  EyeOff,
  FileSpreadsheet,
  FileText,
  Loader2,
  PackageSearch,
  Pencil,
  Plus,
  Search,
  Sparkles,
  Trash2,
  Upload,
  X,
  Droplet,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Campaign, PrizeTemplate } from "../types";
import { DEFAULT_PRIZE_IMAGE_URL } from "../lib/defaultImages";
import { ImageUploader } from "./common/ImageUploader";
import { useTheme } from "../contexts/ThemeContext";
import { useInventoryManager } from "../hooks/useInventoryManager";
import {
  parseCSVFile,
  parseExcelFile,
  exportToCSV,
  exportToExcel,
} from "../lib/exportUtils";

type PrizeTemplatePayload = Omit<
  PrizeTemplate,
  "id" | "allocatedStock" | "availableStock"
>;

interface PrizesManagerProps {
  prizes: PrizeTemplate[];
  campaigns?: Campaign[];
  organizationId?: string | null;
  onAddPrize: (newPrize: PrizeTemplatePayload) => Promise<void>;
  onUpdatePrize: (id: string, updates: PrizeTemplatePayload) => Promise<void>;
  onDeletePrize: (id: string) => Promise<void>;
  onRefreshPrizes?: () => void;
}

const defaultForm = {
  name: "",
  category: "voucher" as const,
  description: "",
  itemValue: "",
  totalStock: 100,
  image: "",
};

export const PrizesManager: React.FC<PrizesManagerProps> = ({
  prizes,
  campaigns = [],
  organizationId = null,
  onAddPrize,
  onUpdatePrize,
  onDeletePrize,
  onRefreshPrizes,
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [searchTerm, setSearchTerm] = useState("");
  const [showCreator, setShowCreator] = useState(false);
  const [expandedPrizeId, setExpandedPrizeId] = useState<string | null>(null);
  const [activeCodesTemplate, setActiveCodesTemplate] =
    useState<PrizeTemplate | null>(null);
  const [codesSearch, setCodesSearch] = useState("");
  const [showBulkPaste, setShowBulkPaste] = useState(false);
  const [bulkPasteText, setBulkPasteText] = useState("");
  const [copiedAll, setCopiedAll] = useState(false);

  const [editingTemplate, setEditingTemplate] = useState<PrizeTemplate | null>(
    null,
  );
  const [name, setName] = useState(defaultForm.name);
  const [category, setCategory] = useState<"voucher" | "physical">(
    defaultForm.category,
  );
  const [description, setDescription] = useState(defaultForm.description);
  const [itemValue, setItemValue] = useState(defaultForm.itemValue);
  const [totalStock, setTotalStock] = useState(defaultForm.totalStock);
  const [imageUrl, setImageUrl] = useState(defaultForm.image);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    templateItems,
    setTemplateItems,
    loading: codesLoading,
    saving: codesSaving,
    error: codesHookError,
    loadTemplateItems,
    updateSingleItemValue,
    saveAllItemsBulk,
  } = useInventoryManager(organizationId);

  const filteredPrizes = useMemo(
    () =>
      prizes.filter((prize) =>
        [prize.name, prize.description, prize.category, prize.itemValue]
          .join(" ")
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      ),
    [prizes, searchTerm],
  );

  const resetForm = () => {
    setEditingTemplate(null);
    setName(defaultForm.name);
    setCategory(defaultForm.category);
    setDescription(defaultForm.description);
    setItemValue(defaultForm.itemValue);
    setTotalStock(defaultForm.totalStock);
    setImageUrl(defaultForm.image);
    setFormError(null);
  };

  const closeCreator = () => {
    setShowCreator(false);
    resetForm();
  };

  const openCreator = (template?: PrizeTemplate) => {
    setPageError(null);
    setPageMessage(null);
    setFormError(null);

    if (template) {
      setEditingTemplate(template);
      setName(template.name);
      setCategory(template.category);
      setDescription(template.description);
      setItemValue(template.itemValue);
      setTotalStock(template.totalStock);
      setImageUrl(template.image ?? "");
    } else {
      resetForm();
    }

    setShowCreator(true);
  };

  const showSuccess = (message: string) => {
    setPageMessage(message);
    window.setTimeout(() => setPageMessage(null), 3500);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !itemValue.trim()) return;

    setSubmitting(true);
    setFormError(null);
    setPageError(null);
    setPageMessage(null);

    try {
      const payload: PrizeTemplatePayload = {
        name: name.trim(),
        category,
        description: description.trim(),
        itemValue: itemValue.trim(),
        totalStock,
        image: imageUrl || undefined,
        filledValuesCount: editingTemplate?.filledValuesCount,
        campaignUsageCount: editingTemplate?.campaignUsageCount,
        quantityWonCount: editingTemplate?.quantityWonCount,
      };

      if (editingTemplate) {
        await onUpdatePrize(editingTemplate.id, payload);
        showSuccess("Reward template updated successfully.");
      } else {
        await onAddPrize(payload);
        showSuccess("Reward template created successfully.");
      }

      closeCreator();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to save reward template. Please try again.";
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (template: PrizeTemplate) => {
    setPageError(null);
    setPageMessage(null);

    if ((template.campaignUsageCount ?? 0) > 0) {
      setPageError(
        `Cannot delete "${template.name}" because it is already linked to ${template.campaignUsageCount} campaign record(s).`,
      );
      return;
    }

    if (!window.confirm(`Delete "${template.name}" from the reward library?`))
      return;

    try {
      await onDeletePrize(template.id);
      showSuccess("Reward template deleted successfully.");
      if (editingTemplate?.id === template.id) closeCreator();
    } catch (err: unknown) {
      const msg =
        err instanceof Error
          ? err.message
          : "Failed to delete reward template. Please try again.";
      setPageError(msg);
    }
  };

  // Open Codes Modal for a Prize Ticket
  const handleOpenCodesModal = async (prize: PrizeTemplate) => {
    setActiveCodesTemplate(prize);
    setShowBulkPaste(false);
    setBulkPasteText("");
    await loadTemplateItems(prize);
  };

  const handleCloseCodesModal = () => {
    setActiveCodesTemplate(null);
    setTemplateItems([]);
    setShowBulkPaste(false);
    setBulkPasteText("");
    onRefreshPrizes?.();
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

  // Export codes to CSV or Excel
  const handleExportCodes = (format: "csv" | "xlsx" = "csv") => {
    if (!activeCodesTemplate) return;

    const dataToExport = templateItems.map((item) => ({
      Index: item.item_index,
      Code: item.item_value ?? "",
      Status: item.item_value?.trim() ? "Prepared" : "Empty",
    }));

    const filename = `octoreach_codes_${activeCodesTemplate.name.replace(/\s+/g, "_")}_${new Date().toISOString().split("T")[0]}`;

    if (format === "xlsx") {
      exportToExcel(
        dataToExport as unknown as Record<string, unknown>[],
        filename,
        "Codes",
      );
    } else {
      exportToCSV(
        dataToExport as unknown as Record<string, unknown>[],
        filename,
      );
    }
  };

  // Import codes from File
  const handleFileImport = async (file: File) => {
    if (!activeCodesTemplate) return;

    try {
      const isExcel = file.name.endsWith(".xlsx") || file.name.endsWith(".xls");
      const rows = isExcel
        ? await parseExcelFile<Record<string, unknown>>(file)
        : await parseCSVFile<Record<string, unknown>>(file);

      const parsedValues = rows
        .map((r) => {
          const val =
            r["Code"] ||
            r["code"] ||
            r["Voucher / Reference Value"] ||
            r["item_value"] ||
            r["Value"] ||
            Object.values(r)[0];
          return typeof val === "string" || typeof val === "number"
            ? String(val).trim()
            : "";
        })
        .filter((v) => v.length > 0);

      if (parsedValues.length === 0) {
        alert("No codes could be parsed from the uploaded file.");
        return;
      }

      // Map over existing items
      const itemsToSave = templateItems.map((item, idx) => ({
        id: item.id,
        item_value: parsedValues[idx] || item.item_value || null,
      }));

      await saveAllItemsBulk(activeCodesTemplate, itemsToSave);
      onRefreshPrizes?.();
      showSuccess(`Successfully imported ${parsedValues.length} code(s).`);
    } catch (err) {
      alert(
        `Import failed: ${err instanceof Error ? err.message : "Unknown error"}`,
      );
    }
  };

  // Handle Bulk Paste Lines
  const handleApplyBulkPaste = async () => {
    if (!activeCodesTemplate) return;

    const lines = bulkPasteText
      .split("\n")
      .map((l) => l.trim())
      .filter((l) => l.length > 0);

    if (lines.length === 0) return;

    const itemsToSave = templateItems.map((item, idx) => ({
      id: item.id,
      item_value: lines[idx] || item.item_value || null,
    }));

    await saveAllItemsBulk(activeCodesTemplate, itemsToSave);
    setShowBulkPaste(false);
    setBulkPasteText("");
    onRefreshPrizes?.();
    showSuccess(`Applied ${lines.length} code(s) successfully.`);
  };

  // Filtered items in the modal table
  const displayedModalItems = useMemo(() => {
    if (!codesSearch.trim()) return templateItems;
    return templateItems.filter(
      (item) =>
        (item.item_value || "")
          .toLowerCase()
          .includes(codesSearch.toLowerCase()) ||
        String(item.item_index).includes(codesSearch),
    );
  }, [templateItems, codesSearch]);

  const preparedCount = templateItems.filter((item) =>
    Boolean(item.item_value && item.item_value.trim().length > 0),
  ).length;

  return (
    <div
      id="prizes-manager-root"
      className="space-y-8 text-brand-text max-w-[1800px] mx-auto pb-16"
    >
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-black tracking-tight text-brand-text">
            Reward Library
          </h2>
          <p className="text-brand-textMuted text-sm font-medium mt-1">
            Define reusable vouchers, data passes, and branded physical rewards.
            Click any ticket to manage its codes list.
          </p>
        </div>

        <button
          type="button"
          onClick={() =>
            showCreator && !editingTemplate ? closeCreator() : openCreator()
          }
          className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-lg shadow-emerald-600/25 cursor-pointer text-sm hover:scale-102 shrink-0"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>
            {showCreator && !editingTemplate
              ? "Hide Creator"
              : "Add Custom Reward"}
          </span>
        </button>
      </div>

      {/* Status Messages */}
      {pageMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-500 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm"
        >
          <Check className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>{pageMessage}</span>
        </motion.div>
      )}

      {pageError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-bold flex items-center gap-2 shadow-sm"
        >
          <AlertTriangle className="w-4 h-4 text-red-500 shrink-0" />
          <span>{pageError}</span>
        </motion.div>
      )}

      {/* Creation / Edit Form Modal/Drawer */}
      {showCreator && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: "auto" }}
          onSubmit={handleSubmit}
          className="bg-card-bg border border-card-border rounded-[28px] p-7 space-y-5 shadow-xl"
        >
          <div className="flex items-center justify-between gap-3 border-b border-brand-border/20 pb-4">
            <h3 className="font-black text-base text-emerald-500 flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-emerald-500" />
              <span>
                {editingTemplate
                  ? "Edit Reusable Reward Template"
                  : "Create Reusable Reward Template"}
              </span>
            </h3>
            <button
              type="button"
              onClick={closeCreator}
              className="rounded-2xl bg-card-bg-subtle p-2 text-brand-textMuted transition hover:text-brand-text border border-card-border cursor-pointer"
              aria-label="Close reward creator"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-2xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-brand-text uppercase tracking-wider">
                Reward Name
              </label>
              <input
                type="text"
                placeholder="e.g. Djezzy 1500 DA Voucher"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-card-bg-subtle border border-card-border focus:border-emerald-500 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-brand-text placeholder-brand-textMuted min-h-11 focus:outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-brand-text uppercase tracking-wider">
                Display Value / Face Value
              </label>
              <input
                type="text"
                placeholder="e.g. 36,666 DA"
                value={itemValue}
                onChange={(e) => setItemValue(e.target.value)}
                className="w-full bg-card-bg-subtle border border-card-border focus:border-emerald-500 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-brand-text placeholder-brand-textMuted min-h-11 focus:outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-brand-text uppercase tracking-wider">
                Category
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCategory("voucher")}
                  className={`py-2.5 px-3 rounded-2xl border text-center transition-all cursor-pointer text-xs font-bold ${
                    category === "voucher"
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-500 font-black"
                      : "bg-card-bg-subtle border-card-border text-brand-textMuted hover:bg-card-bg"
                  }`}
                >
                  Digital Voucher / Code
                </button>
                <button
                  type="button"
                  onClick={() => setCategory("physical")}
                  className={`py-2.5 px-3 rounded-2xl border text-center transition-all cursor-pointer text-xs font-bold ${
                    category === "physical"
                      ? "bg-emerald-500/15 border-emerald-500 text-emerald-500 font-black"
                      : "bg-card-bg-subtle border-card-border text-brand-textMuted hover:bg-card-bg"
                  }`}
                >
                  Physical Item / Merch
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-brand-text uppercase tracking-wider">
                Total Warehouse Stock
              </label>
              <input
                type="number"
                min={editingTemplate?.allocatedStock ?? 0}
                max="100000"
                value={totalStock}
                onChange={(e) => setTotalStock(Number(e.target.value))}
                className="w-full bg-card-bg-subtle border border-card-border focus:border-emerald-500 rounded-2xl px-4 py-2.5 text-xs sm:text-sm text-brand-text placeholder-brand-textMuted min-h-11 focus:outline-none font-mono font-bold"
              />
            </div>

            <div className="col-span-full flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-brand-text uppercase tracking-wider">
                Redemption Instructions
              </label>
              <textarea
                placeholder="How do players claim this prize? E.g. present coupon code to any partner branch."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-card-bg-subtle border border-card-border focus:border-emerald-500 rounded-2xl p-4 text-xs text-brand-text placeholder-brand-textMuted min-h-20 focus:outline-none"
              />
            </div>

            <div className="col-span-full space-y-3 rounded-2xl bg-card-bg-subtle border border-card-border p-4">
              <ImageUploader
                value={imageUrl}
                onChange={setImageUrl}
                folder="prizes"
                label="Prize template image"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-3 border-t border-brand-border/20">
            <button
              type="button"
              onClick={closeCreator}
              disabled={submitting}
              className="text-xs font-bold text-brand-textMuted hover:text-brand-text cursor-pointer px-5 py-2.5 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !itemValue.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white text-xs sm:text-sm px-6 py-2.5 rounded-2xl font-black cursor-pointer transition-all flex items-center gap-2"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>
                {submitting
                  ? "Saving..."
                  : editingTemplate
                    ? "Update Library Template"
                    : "Save to Library"}
              </span>
            </button>
          </div>
        </motion.form>
      )}

      {/* Filter Search Input */}
      <div className="relative max-w-md">
        <Search className="absolute left-4 w-4 h-4 text-brand-textMuted top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter rewards by title or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className={`w-full rounded-2xl pl-11 pr-5 py-2.5 text-xs sm:text-sm transition-all duration-150 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 shadow-sm border ${
            isDark
              ? "bg-[#151E30] border-slate-800 text-white placeholder-slate-500"
              : "bg-white border-slate-200 text-slate-900 placeholder-slate-400"
          }`}
        />
      </div>

      {/* TICKET CARDS GRID */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6 sm:gap-8 items-start">
        {filteredPrizes.map((prize) => {
          const isDeleteBlocked = (prize.campaignUsageCount ?? 0) > 0;
          const isExpanded = expandedPrizeId === prize.id;

          const linkedCampaigns = campaigns.filter((camp) =>
            camp.prizes?.some((p) => p.templateId === prize.id),
          );

          const usedStock = Math.max(
            0,
            prize.totalStock - prize.availableStock,
          );
          const availablePercent =
            prize.totalStock > 0
              ? (prize.availableStock / prize.totalStock) * 100
              : 0;
          const usedPercent =
            prize.totalStock > 0 ? (usedStock / prize.totalStock) * 100 : 0;

          return (
            <motion.div
              key={prize.id}
              layout
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              onClick={() => handleOpenCodesModal(prize)}
              className={`rounded-2xl shadow-md hover:shadow-xl transition-all duration-200 flex flex-col group border relative overflow-hidden cursor-pointer ${
                isDark
                  ? "bg-[#151E30] border-slate-800 text-white hover:border-emerald-500/50"
                  : "bg-white border-slate-200 text-slate-900 hover:border-emerald-500/50"
              }`}
            >
              {/* TOP BANNER & MAIN TICKET ROW */}
              <div className="flex items-stretch w-full relative">
                {/* 1. LEFT MAIN COLUMN */}
                <div className="flex-1 flex flex-col justify-between">
                  {/* Left Green Header */}
                  <div className="bg-emerald-600 text-white px-5 py-3 select-none border-b border-emerald-700/40">
                    <span className="font-black text-base sm:text-lg tracking-wide block truncate">
                      Reward Library{" "}
                      {prize.category === "voucher" ? "Voucher" : "Item"}
                    </span>
                  </div>

                  {/* Left Card Body */}
                  <div
                    className={`flex-1 p-5 sm:p-6 flex flex-col justify-between space-y-4 ${
                      isDark ? "bg-[#151E30]" : "bg-white"
                    }`}
                  >
                    {/* Category & Value + Action Buttons (Eye, Pencil, Trash2) */}
                    <div className="flex items-start justify-between">
                      <div>
                        <h4
                          className={`font-black text-sm sm:text-base tracking-wider uppercase ${
                            isDark ? "text-slate-200" : "text-slate-800"
                          }`}
                        >
                          {prize.category === "voucher"
                            ? "VOUCHER"
                            : "PHYSICAL"}
                        </h4>
                        <p
                          className={`text-xs sm:text-sm font-bold uppercase mt-0.5 ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          {prize.itemValue || "REWARD VALUE"}
                        </p>
                      </div>

                      {/* Action Buttons Row */}
                      <div
                        className="flex items-center gap-1.5"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {/* Eye Toggle Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedPrizeId(isExpanded ? null : prize.id);
                          }}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 cursor-pointer ${
                            isExpanded
                              ? "bg-emerald-500/20 text-emerald-500 ring-2 ring-emerald-500/40"
                              : isDark
                                ? "text-slate-300 hover:text-emerald-400 hover:bg-slate-800"
                                : "text-slate-600 hover:text-emerald-600 hover:bg-slate-100"
                          }`}
                          title={
                            isExpanded
                              ? "Hide stock & campaign breakdown"
                              : "View stock & campaign breakdown"
                          }
                        >
                          {isExpanded ? (
                            <EyeOff className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />
                          ) : (
                            <Eye className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />
                          )}
                        </button>

                        {/* Edit Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            openCreator(prize);
                          }}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 cursor-pointer ${
                            isDark
                              ? "text-slate-300 hover:text-emerald-400 hover:bg-slate-800"
                              : "text-slate-600 hover:text-emerald-600 hover:bg-slate-100"
                          }`}
                          title="Edit reward template"
                        >
                          <Pencil className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />
                        </button>

                        {/* Delete Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            void handleDelete(prize);
                          }}
                          disabled={isDeleteBlocked}
                          className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full flex items-center justify-center transition-all hover:scale-110 cursor-pointer ${
                            isDeleteBlocked
                              ? "opacity-20 cursor-not-allowed text-slate-400"
                              : isDark
                                ? "text-slate-300 hover:text-red-400 hover:bg-slate-800"
                                : "text-slate-600 hover:text-red-600 hover:bg-slate-100"
                          }`}
                          title={
                            isDeleteBlocked
                              ? "Linked to campaigns"
                              : "Delete reward"
                          }
                        >
                          <Trash2 className="w-5 h-5 sm:w-5.5 sm:h-5.5 stroke-[2.2]" />
                        </button>
                      </div>
                    </div>

                    {/* Reward Name */}
                    <div>
                      <h3
                        className={`font-black text-lg sm:text-xl lg:text-2xl uppercase leading-tight truncate ${
                          isDark ? "text-white" : "text-slate-900"
                        }`}
                      >
                        {prize.name}
                      </h3>
                      <span
                        className={`text-xs font-bold uppercase tracking-wider block mt-0.5 ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        NAME
                      </span>
                    </div>

                    {/* Stock Metrics (Total & Available) */}
                    <div
                      className={`flex items-center justify-between pt-2 border-t ${
                        isDark ? "border-slate-800" : "border-slate-100"
                      }`}
                    >
                      <div>
                        <span
                          className={`text-[11px] sm:text-xs font-black uppercase tracking-widest block ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          TOTAL STOCK
                        </span>
                        <span
                          className={`text-base sm:text-lg font-black mt-0.5 block ${
                            isDark ? "text-white" : "text-slate-900"
                          }`}
                        >
                          {prize.totalStock.toLocaleString()}
                        </span>
                      </div>

                      <div>
                        <span
                          className={`text-[11px] sm:text-xs font-black uppercase tracking-widest block ${
                            isDark ? "text-slate-400" : "text-slate-500"
                          }`}
                        >
                          AVAILABLE
                        </span>
                        <span className="text-base sm:text-lg font-black text-emerald-500 mt-0.5 block">
                          {prize.availableStock.toLocaleString()}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 2. RIGHT STUB COLUMN */}
                <div
                  className={`w-28 sm:w-32 flex flex-col justify-between select-none border-l-2 border-dashed relative ${
                    isDark
                      ? "border-slate-700 bg-slate-900/50"
                      : "border-slate-300 bg-slate-50"
                  }`}
                >
                  {/* Top Notch Cutout */}
                  <div
                    className={`absolute -top-5 -left-5 w-10 h-10 rounded-full z-30 pointer-events-none ${
                      isDark ? "bg-[#0b0e14]" : "bg-[#f4f7fb]"
                    }`}
                  ></div>

                  {/* Bottom Notch Cutout */}
                  <div
                    className={`absolute -bottom-5 -left-5 w-10 h-10 rounded-full z-30 pointer-events-none ${
                      isDark ? "bg-[#0b0e14]" : "bg-[#f4f7fb]"
                    }`}
                  ></div>

                  {/* Right Green Stub Header */}
                  <div className="bg-emerald-700/40 text-white px-3 py-3 flex items-center justify-center gap-1.5 text-xs sm:text-sm font-black uppercase tracking-wider border-b border-emerald-700/40">
                    <div className="w-4 h-4 rounded-full bg-white/20 flex items-center justify-center">
                      <Droplet className="w-3 h-3 fill-white text-white" />
                    </div>
                    <span>Aktera</span>
                  </div>

                  {/* Right Stub Body */}
                  <div className="flex-1 p-4 sm:p-5 flex flex-col items-center justify-between text-center">
                    {/* Big Stock Number */}
                    <div className="my-auto text-center">
                      <h3 className="text-4xl sm:text-5xl font-black text-emerald-500 leading-none">
                        {prize.availableStock > 0 ? prize.availableStock : "0"}
                      </h3>
                      <span
                        className={`text-xs sm:text-sm font-black uppercase tracking-wider block mt-1.5 ${
                          isDark ? "text-slate-400" : "text-slate-500"
                        }`}
                      >
                        STOCK
                      </span>
                    </div>

                    {/* Realistic SVG Barcode */}
                    <div className="w-full mt-2 flex flex-col items-center">
                      <svg
                        viewBox="0 0 80 28"
                        className={`w-full h-8 fill-current ${
                          isDark
                            ? "text-slate-300 opacity-90"
                            : "text-slate-800 opacity-95"
                        }`}
                      >
                        <rect x="0" y="0" width="3" height="28" />
                        <rect x="5" y="0" width="1" height="28" />
                        <rect x="8" y="0" width="4" height="28" />
                        <rect x="14" y="0" width="2" height="28" />
                        <rect x="18" y="0" width="1" height="28" />
                        <rect x="21" y="0" width="3" height="28" />
                        <rect x="26" y="0" width="1" height="28" />
                        <rect x="29" y="0" width="4" height="28" />
                        <rect x="35" y="0" width="2" height="28" />
                        <rect x="39" y="0" width="1" height="28" />
                        <rect x="42" y="0" width="3" height="28" />
                        <rect x="47" y="0" width="2" height="28" />
                        <rect x="51" y="0" width="1" height="28" />
                        <rect x="54" y="0" width="4" height="28" />
                        <rect x="60" y="0" width="1" height="28" />
                        <rect x="63" y="0" width="3" height="28" />
                        <rect x="68" y="0" width="2" height="28" />
                        <rect x="72" y="0" width="4" height="28" />
                        <rect x="78" y="0" width="2" height="28" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              {/* EXPANDED DETAILS ACCORDION SECTION (Eye button toggle) */}
              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    key={`details-${prize.id}`}
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    onClick={(e) => e.stopPropagation()}
                    className={`border-t px-6 py-5 space-y-4 ${
                      isDark
                        ? "border-slate-800 bg-[#121929]"
                        : "border-slate-100 bg-[#FAFCFF]"
                    }`}
                  >
                    {/* Available Stock Progress Bar */}
                    <div className="flex items-center gap-4">
                      <span className="w-24 text-sm font-bold text-brand-text shrink-0">
                        Available
                      </span>
                      <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-3.5 sm:h-4 rounded-full overflow-hidden p-0.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.max(availablePercent, 3)}%`,
                          }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="h-full bg-emerald-500 rounded-full"
                        ></motion.div>
                      </div>
                      <span className="text-xs font-mono font-bold text-emerald-500 shrink-0 w-12 text-right">
                        {prize.availableStock}
                      </span>
                    </div>

                    {/* Used Stock Progress Bar */}
                    <div className="flex items-center gap-4">
                      <span className="w-24 text-sm font-bold text-brand-text shrink-0">
                        Used
                      </span>
                      <div className="flex-1 bg-slate-200 dark:bg-slate-800 h-3.5 sm:h-4 rounded-full overflow-hidden p-0.5">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{
                            width: `${Math.max(usedPercent, usedStock > 0 ? 3 : 0)}%`,
                          }}
                          transition={{ duration: 0.5, ease: "easeOut" }}
                          className="h-full bg-slate-400 dark:bg-slate-600 rounded-full"
                        ></motion.div>
                      </div>
                      <span className="text-xs font-mono font-bold text-brand-textMuted shrink-0 w-12 text-right">
                        {usedStock}
                      </span>
                    </div>

                    {/* Linked Campaigns Section */}
                    <div className="flex items-start gap-4 pt-2">
                      <span className="w-24 text-sm font-bold text-brand-text shrink-0 mt-1">
                        Campaigns
                      </span>
                      <div className="flex-1 flex flex-wrap gap-2.5">
                        {linkedCampaigns.length > 0 ? (
                          linkedCampaigns.map((camp) => (
                            <div
                              key={camp.id}
                              className={`p-3 rounded-2xl border text-center flex-1 min-w-[120px] max-w-[180px] shadow-sm transition-all hover:scale-102 ${
                                isDark
                                  ? "bg-[#152033] border-slate-700 text-white"
                                  : "bg-blue-50/80 border-blue-100 text-slate-900"
                              }`}
                            >
                              <p className="text-xs font-bold truncate">
                                {camp.name}
                              </p>
                              <div className="flex items-center justify-center gap-1 mt-1">
                                <span
                                  className={`w-1.5 h-1.5 rounded-full ${
                                    camp.status === "active"
                                      ? "bg-emerald-500"
                                      : camp.status === "paused"
                                        ? "bg-amber-500"
                                        : "bg-slate-400"
                                  }`}
                                ></span>
                                <span className="text-[10px] text-brand-textMuted uppercase font-mono">
                                  {camp.status}
                                </span>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div
                            className={`p-3 rounded-2xl border text-center flex-1 text-xs font-medium text-brand-textMuted ${
                              isDark
                                ? "bg-slate-900/40 border-slate-800"
                                : "bg-slate-50 border-slate-200"
                            }`}
                          >
                            No active campaigns linked yet
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </motion.div>
          );
        })}

        {/* Empty state */}
        {filteredPrizes.length === 0 && !showCreator && (
          <div className="col-span-full py-16 flex flex-col items-center justify-center text-center bg-card-bg rounded-3xl border border-dashed border-card-border p-8">
            <PackageSearch className="w-10 h-10 text-brand-textMuted/50 mb-3" />
            <h4 className="text-base font-bold text-brand-text">
              No matching reward templates found
            </h4>
            <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
              Try refining your search terms or create a new custom reward
              template.
            </p>
          </div>
        )}
      </div>

      {/* CODES LIST MODAL / DRAWER */}
      <AnimatePresence>
        {activeCodesTemplate && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 sm:p-6">
            <motion.div
              initial={{ opacity: 0, scale: 0.95, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 15 }}
              className={`w-full max-w-4xl rounded-[32px] border shadow-2xl flex flex-col max-h-[90vh] overflow-hidden ${
                isDark
                  ? "bg-[#121929] border-slate-800 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              {/* Modal Header */}
              <div className="p-6 sm:p-7 border-b border-card-border flex items-center justify-between shrink-0">
                <div>
                  <div className="flex items-center gap-2.5">
                    <h3 className="text-xl sm:text-2xl font-black text-brand-text">
                      {activeCodesTemplate.name}
                    </h3>
                    <span className="px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider bg-emerald-500/15 text-emerald-500 border border-emerald-500/30">
                      {activeCodesTemplate.category}
                    </span>
                  </div>
                  <p className="text-xs text-brand-textMuted mt-1">
                    Prepared Codes:{" "}
                    <strong className="text-emerald-500">
                      {preparedCount}
                    </strong>{" "}
                    / {templateItems.length} total units reserved in inventory.
                  </p>
                </div>

                <button
                  onClick={handleCloseCodesModal}
                  className="w-10 h-10 rounded-full bg-card-bg-subtle border border-card-border flex items-center justify-center text-brand-textMuted hover:text-brand-text transition-colors cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Action Toolbar */}
              <div className="p-4 sm:px-7 bg-card-bg-subtle border-b border-card-border flex flex-wrap items-center justify-between gap-3 shrink-0">
                {/* Search in codes */}
                <div className="relative flex-1 min-w-[200px] max-w-xs">
                  <Search className="absolute left-3.5 w-4 h-4 text-brand-textMuted top-1/2 -translate-y-1/2" />
                  <input
                    type="text"
                    placeholder="Search codes..."
                    value={codesSearch}
                    onChange={(e) => setCodesSearch(e.target.value)}
                    className="w-full bg-card-bg border border-card-border rounded-xl pl-9 pr-3 py-2 text-xs text-brand-text placeholder-brand-textMuted focus:outline-none focus:border-emerald-500"
                  />
                </div>

                {/* Toolbar Buttons: Copy All, Import, Export, Bulk Paste */}
                <div className="flex flex-wrap items-center gap-2">
                  {/* Copy All */}
                  <button
                    onClick={handleCopyAllCodes}
                    className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-card-border bg-card-bg hover:bg-card-bg-subtle cursor-pointer transition-all shadow-sm"
                  >
                    {copiedAll ? (
                      <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                    ) : (
                      <Clipboard className="w-4 h-4 text-slate-500" />
                    )}
                    <span>{copiedAll ? "Copied All!" : "Copy All"}</span>
                  </button>

                  {/* Bulk Paste Toggle */}
                  <button
                    onClick={() => setShowBulkPaste(!showBulkPaste)}
                    className={`px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border cursor-pointer transition-all shadow-sm ${
                      showBulkPaste
                        ? "bg-blue-600 text-white border-blue-600"
                        : "border-card-border bg-card-bg hover:bg-card-bg-subtle"
                    }`}
                  >
                    <FileText className="w-4 h-4" />
                    <span>Paste Bulk</span>
                  </button>

                  {/* Export CSV */}
                  <button
                    onClick={() => handleExportCodes("csv")}
                    className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 border border-card-border bg-card-bg hover:bg-card-bg-subtle cursor-pointer transition-all shadow-sm"
                  >
                    <Download className="w-4 h-4 text-slate-500" />
                    <span>Export CSV</span>
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
                    className="px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-all shadow-sm"
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
                        Lines will replace empty slots in order
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
                        {codesSaving ? "Saving..." : "Apply Codes"}
                      </button>
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>

              {/* Codes Table List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-7">
                {codesLoading ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center space-y-3">
                    <Loader2 className="w-8 h-8 animate-spin text-emerald-500" />
                    <p className="text-xs font-semibold text-brand-textMuted">
                      Loading inventory codes from database...
                    </p>
                  </div>
                ) : displayedModalItems.length === 0 ? (
                  <div className="py-16 flex flex-col items-center justify-center text-center text-brand-textMuted text-xs">
                    No codes matching your search query.
                  </div>
                ) : (
                  <div className="border border-card-border rounded-2xl overflow-hidden shadow-sm">
                    <table className="w-full text-left text-xs">
                      <thead className="bg-card-bg-subtle border-b border-card-border text-brand-textMuted uppercase font-black text-[10px]">
                        <tr>
                          <th className="py-3 px-4 w-16">#</th>
                          <th className="py-3 px-4">Voucher / Unique Code</th>
                          <th className="py-3 px-4 w-32 text-center">Status</th>
                          <th className="py-3 px-4 w-24 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-card-border">
                        {displayedModalItems.map((item) => (
                          <tr
                            key={item.id}
                            className="hover:bg-card-bg-subtle/50 transition-colors"
                          >
                            <td className="py-3 px-4 font-mono font-bold text-brand-textMuted">
                              {item.item_index}
                            </td>
                            <td className="py-2 px-4">
                              <input
                                type="text"
                                value={item.item_value ?? ""}
                                placeholder="Click to enter code..."
                                onChange={(e) => {
                                  const newVal = e.target.value;
                                  setTemplateItems((current) =>
                                    current.map((t) =>
                                      t.id === item.id
                                        ? { ...t, item_value: newVal }
                                        : t,
                                    ),
                                  );
                                }}
                                onBlur={(e) => {
                                  void updateSingleItemValue(
                                    item.id,
                                    e.target.value,
                                  );
                                  onRefreshPrizes?.();
                                }}
                                className="w-full bg-transparent border-none font-mono text-xs font-bold text-brand-text focus:outline-none focus:bg-card-bg focus:ring-1 focus:ring-emerald-500 rounded-lg px-2 py-1"
                              />
                            </td>
                            <td className="py-3 px-4 text-center">
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase ${
                                  item.item_value &&
                                  item.item_value.trim().length > 0
                                    ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-400"
                                    : "bg-slate-100 text-slate-500 dark:bg-slate-800 dark:text-slate-400"
                                }`}
                              >
                                {item.item_value &&
                                item.item_value.trim().length > 0
                                  ? "Prepared"
                                  : "Empty"}
                              </span>
                            </td>
                            <td className="py-3 px-4 text-right">
                              {item.item_value && (
                                <button
                                  onClick={async () => {
                                    await updateSingleItemValue(item.id, "");
                                    onRefreshPrizes?.();
                                  }}
                                  className="text-slate-400 hover:text-red-500 transition-colors p-1 cursor-pointer"
                                  title="Clear code"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {/* Modal Footer */}
              <div className="p-4 sm:p-5 bg-card-bg-subtle border-t border-card-border flex items-center justify-between shrink-0">
                <span className="text-xs text-brand-textMuted">
                  Changes save automatically to the database when you click
                  outside an input.
                </span>
                <button
                  onClick={handleCloseCodesModal}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer transition-all"
                >
                  Done
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
