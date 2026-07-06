import React, { useMemo, useRef, useState } from 'react';
import { PrizeTemplate } from '../types';
import {
  AlertTriangle,
  Check,
  Database,
  Download,
  LayoutGrid,
  List,
  Loader2,
  Minus,
  Pencil,
  Plus,
  Search,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { motion } from 'motion/react';
import { supabase } from '../lib/supabase';
import { toFriendlyErrorMessage } from '../lib/errorMessages';
import { DEFAULT_PRIZE_IMAGE_URL } from '../lib/defaultImages';

interface InventoryManagerProps {
  prizes: PrizeTemplate[];
  organizationId: string | null;
  onUpdateStock: (id: string, amount: number) => Promise<void>;
}

interface TemplateItemRow {
  id: string;
  prize_template_id: string;
  item_index: number;
  item_value: string | null;
  source_type: 'manual' | 'bulk';
}

const parseCsvLine = (line: string, delimiter: string) =>
  line.split(delimiter).map((cell) => cell.trim());

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  prizes,
  organizationId,
  onUpdateStock,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const [selectedTemplate, setSelectedTemplate] = useState<PrizeTemplate | null>(null);
  const [templateItems, setTemplateItems] = useState<TemplateItemRow[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsSaving, setItemsSaving] = useState(false);
  const modalFileInputRef = useRef<HTMLInputElement>(null);

  const totalStockInPool = prizes.reduce((acc, p) => acc + p.totalStock, 0);
  const totalAllocated = prizes.reduce((acc, p) => acc + p.allocatedStock, 0);
  const totalAvailable = prizes.reduce((acc, p) => acc + p.availableStock, 0);
  const totalPreparedValues = prizes.reduce((acc, p) => acc + (p.filledValuesCount ?? 0), 0);
  const totalDistributed = prizes.reduce((acc, p) => acc + (p.quantityWonCount ?? 0), 0);
  const totalCampaignBindings = prizes.reduce((acc, p) => acc + (p.campaignUsageCount ?? 0), 0);
  const lowStockCount = prizes.filter((p) => p.availableStock < 50).length;

  const filteredPrizes = useMemo(
    () =>
      prizes.filter((p) =>
        [p.name, p.category, p.itemValue, p.description]
          .join(' ')
          .toLowerCase()
          .includes(searchTerm.toLowerCase()),
      ),
    [prizes, searchTerm],
  );

  const showSuccess = (message: string) => {
    setSuccessMsg(message);
    window.setTimeout(() => setSuccessMsg(''), 3500);
  };

  const activeTemplateItems = useMemo(
    () =>
      selectedTemplate
        ? templateItems.filter((item) => item.item_index <= selectedTemplate.totalStock)
        : templateItems,
    [selectedTemplate, templateItems],
  );

  const overflowTemplateItems = useMemo(
    () =>
      selectedTemplate
        ? templateItems.filter((item) => item.item_index > selectedTemplate.totalStock)
        : [],
    [selectedTemplate, templateItems],
  );

  const loadTemplateItems = async (template: PrizeTemplate) => {
    if (!organizationId) {
      setErrorMsg('Organization not loaded. Please refresh the page and try again.');
      return;
    }

    setItemsLoading(true);
    setErrorMsg(null);

    try {
      const { data, error } = await supabase
        .from('prize_template_items')
        .select('id, prize_template_id, item_index, item_value, source_type')
        .eq('prize_template_id', template.id)
        .order('item_index', { ascending: true });

      if (error) throw error;

      const rows = ((data ?? []) as TemplateItemRow[]).sort((a, b) => a.item_index - b.item_index);

      if (rows.length < template.totalStock) {
        const missingRows = Array.from({ length: template.totalStock - rows.length }, (_, index) => ({
          prize_template_id: template.id,
          organization_id: organizationId,
          item_index: rows.length + index + 1,
          item_value: null,
          source_type: 'manual' as const,
        }));

        const { error: insertError } = await supabase.from('prize_template_items').insert(missingRows);
        if (insertError) throw insertError;

        const { data: reloaded, error: reloadError } = await supabase
          .from('prize_template_items')
          .select('id, prize_template_id, item_index, item_value, source_type')
          .eq('prize_template_id', template.id)
          .order('item_index', { ascending: true });

        if (reloadError) throw reloadError;
        setTemplateItems((reloaded ?? []) as TemplateItemRow[]);
      } else {
        setTemplateItems(rows);
      }
    } catch (err) {
      setErrorMsg(toFriendlyErrorMessage(err, 'Failed to load per-item values for this reward.'));
    } finally {
      setItemsLoading(false);
    }
  };

  const openValuesModal = async (template: PrizeTemplate) => {
    setSelectedTemplate(template);
    await loadTemplateItems(template);
  };

  const closeValuesModal = () => {
    setSelectedTemplate(null);
    setTemplateItems([]);
    setErrorMsg(null);
  };

  const updateSingleItemValue = async (id: string, value: string) => {
    setItemsSaving(true);
    setErrorMsg(null);

    try {
      const normalized = value.trim();
      const { error } = await supabase
        .from('prize_template_items')
        .update({
          item_value: normalized.length > 0 ? normalized : null,
          source_type: 'manual',
        })
        .eq('id', id);

      if (error) throw error;

      setTemplateItems((current) =>
        current.map((item) =>
          item.id === id
            ? { ...item, item_value: normalized.length > 0 ? normalized : null, source_type: 'manual' }
            : item,
        ),
      );
    } catch (err) {
      setErrorMsg(toFriendlyErrorMessage(err, 'Failed to save this item value.'));
    } finally {
      setItemsSaving(false);
    }
  };

  const downloadBulkTemplate = () => {
    const csv = ['item_index,item_value', '1,COUPON-001', '2,COUPON-002'].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'youengage-prize-values-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async (file: File) => {
    if (!selectedTemplate) return;

    setItemsSaving(true);
    setErrorMsg(null);

    try {
      const text = await file.text();
      const lines = text
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);

      if (lines.length < 2) {
        throw new Error('CSV file is empty.');
      }

      const delimiter = lines[0].includes(';') ? ';' : ',';
      const headers = parseCsvLine(lines[0], delimiter).map((header) => header.toLowerCase());
      const indexColumn = headers.indexOf('item_index');
      const valueColumn = headers.indexOf('item_value');

      if (valueColumn === -1) {
        throw new Error('CSV must include an item_value column.');
      }

      const updates = lines.slice(1).map((line, rowIndex) => {
        const columns = parseCsvLine(line, delimiter);
        const parsedIndex = indexColumn >= 0 ? Number.parseInt(columns[indexColumn] ?? '', 10) : rowIndex + 1;
        return {
          item_index: parsedIndex,
          item_value: (columns[valueColumn] ?? '').trim(),
        };
      });

      for (const update of updates) {
        if (!Number.isInteger(update.item_index) || update.item_index <= 0 || update.item_index > selectedTemplate.totalStock) {
          continue;
        }

        const { error } = await supabase
          .from('prize_template_items')
          .update({
            item_value: update.item_value.length > 0 ? update.item_value : null,
            source_type: 'bulk',
          })
          .eq('prize_template_id', selectedTemplate.id)
          .eq('item_index', update.item_index);

        if (error) throw error;
      }

      await loadTemplateItems(selectedTemplate);
      showSuccess(`Imported values for ${selectedTemplate.name}.`);
    } catch (err) {
      setErrorMsg(toFriendlyErrorMessage(err, 'Failed to import CSV values. Please verify the file format and try again.'));
    } finally {
      setItemsSaving(false);
    }
  };

  const handleAdjustStock = async (id: string, isIncrement = true) => {
    const rawValue = adjustments[id];
    const amount = Number.parseInt(rawValue, 10);

    if (Number.isNaN(amount) || amount <= 0) {
      setErrorMsg('Stock adjustments must be a positive whole number.');
      return;
    }

    setErrorMsg(null);
    try {
      await onUpdateStock(id, isIncrement ? amount : -amount);
      setAdjustments((current) => ({ ...current, [id]: '' }));
      showSuccess(`Stock adjusted by ${isIncrement ? '+' : '-'}${amount} units.`);
    } catch (err) {
      setErrorMsg(toFriendlyErrorMessage(err, 'Failed to update stock.'));
    }
  };

  return (
    <div id="inventory-manager-root" className="space-y-6 text-slate-800">
      <div className="bg-indigo-900 text-slate-100 p-4 rounded-3xl shadow-md border border-indigo-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold bg-indigo-800 text-indigo-200 px-2 py-0.5 rounded-full uppercase tracking-widest">
            Stock Room Logic
          </span>
          <h2 className="text-sm font-extrabold mt-1 text-white">Template stock + per-item value preparation</h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
            Open a specific reward to prepare voucher codes or optional physical-item references. Bulk CSV import now lives inside each reward room.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <span className="text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Prize-specific values enabled</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Stock Room & Voucher Vault</h2>
          <p className="text-slate-500 text-xs mt-0.5">Manage stock, then open a reward room to enter manual values or import CSV values for that exact template.</p>
        </div>

        <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
          <button
            onClick={() => setViewMode('grid')}
            className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Grid View"
          >
            <LayoutGrid className="w-4 h-4" />
            <span className="hidden md:inline">Visual Cards</span>
          </button>
          <button
            onClick={() => setViewMode('table')}
            className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
            }`}
            title="Table View"
          >
            <List className="w-4 h-4" />
            <span className="hidden md:inline">Compact Table</span>
          </button>
        </div>
      </div>

      {successMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm"
        >
          <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {errorMsg && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm"
        >
          <AlertTriangle className="w-4.5 h-4.5 text-red-600 shrink-0" />
          <span>{errorMsg}</span>
        </motion.div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest">Total Stock Pool</span>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Database className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-3xl font-black mt-3 mb-1 text-slate-900">{totalStockInPool.toLocaleString()}</h4>
          <p className="text-[11px] text-slate-500">All units across reward templates</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest">Reserved in Campaigns</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-3xl font-black mt-3 mb-1 text-amber-700">{totalAllocated.toLocaleString()}</h4>
          <p className="text-[11px] text-slate-500">Committed to active/draft prize pools</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest">Prepared Values</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <Pencil className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-3xl font-black mt-3 mb-1 text-emerald-700">{totalPreparedValues.toLocaleString()}</h4>
          <p className="text-[11px] text-slate-500">Voucher codes / references entered</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest">Ready & Available</span>
            <div className={`p-2 rounded-lg ${lowStockCount > 0 ? 'bg-rose-50 text-rose-600' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-3xl font-black mt-3 mb-1 text-slate-900">{totalAvailable.toLocaleString()}</h4>
          <p className="text-[11px] text-slate-500">{lowStockCount} templates below 50 available units</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest">Distributed / Won</span>
            <div className="p-2 bg-sky-50 rounded-lg text-sky-600">
              <Check className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-3xl font-black mt-3 mb-1 text-sky-700">{totalDistributed.toLocaleString()}</h4>
          <p className="text-[11px] text-slate-500">{totalCampaignBindings.toLocaleString()} live/draft campaign bindings across templates</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-4">
          <div className="relative w-full">
            <Search className="absolute left-3.5 w-4 h-4 text-slate-400 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search templates by name, value, or category..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-white border border-slate-200 hover:border-slate-400 focus:border-indigo-500 rounded-xl pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 min-h-[44px] focus:outline-none"
            />
          </div>

          {viewMode === 'grid' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPrizes.map((p) => {
                const isLow = p.availableStock < 50;
                const reservedPct = p.totalStock > 0 ? (p.allocatedStock / p.totalStock) * 100 : 0;
                const availablePct = p.totalStock > 0 ? (p.availableStock / p.totalStock) * 100 : 0;
                const preparedPct = p.totalStock > 0 ? ((p.filledValuesCount ?? 0) / p.totalStock) * 100 : 0;
                const distributedPct = p.totalStock > 0 ? (Math.min(p.quantityWonCount ?? 0, p.totalStock) / p.totalStock) * 100 : 0;

                return (
                  <div
                    key={p.id}
                    className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col justify-between ${
                      isLow ? 'border-amber-200 ring-2 ring-amber-500/5' : 'border-slate-200'
                    }`}
                  >
                    <div>
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span
                          className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                            p.category === 'voucher'
                              ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                              : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                          }`}
                        >
                          {p.category}
                        </span>
                        <span className="text-xs font-black text-indigo-700 font-mono">{p.itemValue}</span>
                      </div>

                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3">
                          <img
                            src={p.image || DEFAULT_PRIZE_IMAGE_URL}
                            alt={`${p.name} visual`}
                            className="h-14 w-14 rounded-xl border border-slate-200 object-cover"
                            onError={(event) => {
                              event.currentTarget.src = DEFAULT_PRIZE_IMAGE_URL;
                            }}
                          />
                          <div>
                          <h4 className="font-extrabold text-sm text-slate-800 leading-tight">{p.name}</h4>
                          <p className="text-[10px] text-slate-400 font-mono mt-0.5">Template ID: {p.id}</p>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => void openValuesModal(p)}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100"
                          title="Open value room"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>

                      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed line-clamp-2">{p.description}</p>
                    </div>

                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Prepared values:</span>
                        <span className="text-slate-700 font-bold">{p.filledValuesCount ?? 0} / {p.totalStock}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                        <div className="bg-emerald-500 h-full" style={{ width: `${preparedPct}%` }} />
                      </div>

                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Inventory distribution:</span>
                        <span className="text-slate-700 font-bold">Total: {p.totalStock}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                        <div className="bg-amber-500 h-full" style={{ width: `${reservedPct}%` }} />
                        <div className="bg-indigo-600 h-full" style={{ width: `${availablePct}%` }} />
                      </div>

                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Historically won:</span>
                        <span className="text-slate-700 font-bold">{p.quantityWonCount ?? 0}</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                        <div className="bg-sky-500 h-full" style={{ width: `${distributedPct}%` }} />
                      </div>

                      <div className="flex justify-between items-center pt-1">
                        <span className={`text-[9px] font-bold px-2 py-0.5 rounded border ${
                          isLow
                            ? 'text-amber-600 bg-amber-50 border-amber-200'
                            : 'text-emerald-600 bg-emerald-50 border-emerald-100'
                        }`}>
                          {isLow ? 'Low stock warning' : 'Ready & loaded'}
                        </span>

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={adjustments[p.id] || ''}
                            onChange={(e) => setAdjustments((current) => ({ ...current, [p.id]: e.target.value }))}
                            className="w-12 bg-white border border-slate-200 rounded-lg py-1 px-1.5 text-center text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
                          />
                          <button
                            onClick={() => handleAdjustStock(p.id, true)}
                            title="Add supply"
                            className="p-1 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded text-indigo-700 cursor-pointer"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={() => handleAdjustStock(p.id, false)}
                            title="Deduct supply"
                            className="p-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-slate-700 cursor-pointer"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[10px]">
                        <div>
                          <p className="text-slate-400">Campaigns</p>
                          <p className="mt-1 font-bold text-slate-800">{p.campaignUsageCount ?? 0}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Reserved</p>
                          <p className="mt-1 font-bold text-slate-800">{p.allocatedStock}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}

              {filteredPrizes.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white border border-slate-200 rounded-[32px]">
                  <Database className="w-8 h-8 text-slate-300 mx-auto mb-2" />
                  <h4 className="text-sm font-bold text-slate-800">No matching stocks found</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Try refining your search text or clear filters.</p>
                </div>
              )}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 text-[10px] font-mono text-slate-400 uppercase">
                      <th className="pb-3 pl-1 font-semibold">Reward Title</th>
                      <th className="pb-3 font-semibold text-center">Category</th>
                      <th className="pb-3 font-semibold text-center">Prepared</th>
                      <th className="pb-3 font-semibold text-center">Reserved</th>
                      <th className="pb-3 font-semibold text-center">Won</th>
                      <th className="pb-3 font-semibold text-center">Campaigns</th>
                      <th className="pb-3 font-semibold text-center">Available</th>
                      <th className="pb-3 font-semibold text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {filteredPrizes.map((p) => {
                      const isLow = p.availableStock < 50;
                      return (
                        <tr key={p.id} className="hover:bg-slate-50/60 transition-all duration-150">
                          <td className="py-3.5 pl-1">
                            <p className="font-bold text-slate-800 leading-tight">{p.name}</p>
                            <span className="text-[9px] text-slate-400 font-mono">ID: {p.id}</span>
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-bold uppercase ${
                              p.category === 'voucher' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                            }`}>
                              {p.category}
                            </span>
                          </td>
                          <td className="py-3.5 text-center font-mono text-slate-700">
                            {p.filledValuesCount ?? 0} / {p.totalStock}
                          </td>
                          <td className="py-3.5 text-center font-mono text-slate-700">
                            {p.allocatedStock}
                          </td>
                          <td className="py-3.5 text-center font-mono text-sky-700">
                            {p.quantityWonCount ?? 0}
                          </td>
                          <td className="py-3.5 text-center font-mono text-slate-700">
                            {p.campaignUsageCount ?? 0}
                          </td>
                          <td className="py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 font-bold font-mono ${isLow ? 'text-amber-600' : 'text-slate-700'}`}>
                              {isLow ? <AlertTriangle className="w-3.5 h-3.5 text-amber-500" /> : null}
                              <span>{p.availableStock} / {p.totalStock}</span>
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <input
                                type="number"
                                min="1"
                                placeholder="+/-"
                                value={adjustments[p.id] || ''}
                                onChange={(e) => setAdjustments((current) => ({ ...current, [p.id]: e.target.value }))}
                                className="w-14 bg-white border border-slate-200 rounded-lg py-1 text-center text-[11px] focus:outline-none"
                              />
                              <button
                                onClick={() => handleAdjustStock(p.id, true)}
                                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 p-1.5 rounded-lg cursor-pointer"
                                title="Restock"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleAdjustStock(p.id, false)}
                                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 p-1.5 rounded-lg cursor-pointer"
                                title="Deduct"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => void openValuesModal(p)}
                                className="bg-slate-50 hover:bg-slate-100 border border-slate-200 text-slate-600 p-1.5 rounded-lg cursor-pointer"
                                title="Prepare values"
                              >
                                <Pencil className="w-3.5 h-3.5" />
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

        <div className="space-y-6">
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-700" />
              <span>Per-Reward Value Room</span>
            </h3>
            <p className="text-[11px] text-slate-500 leading-relaxed">
              Bulk CSV import is no longer global. Open a specific reward template first, then add values manually or import CSV inside that reward room.
            </p>
            <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4 text-[11px] text-slate-600 space-y-2">
              <p><strong className="text-slate-800">Voucher templates:</strong> enter the real coupon / pin / code for each unit.</p>
              <p><strong className="text-slate-800">Physical templates:</strong> reference / serial / warehouse ID is optional for each unit.</p>
              <p><strong className="text-slate-800">CSV format:</strong> <code className="px-1 py-0.5 rounded bg-white border border-slate-200">item_index,item_value</code></p>
              <p><strong className="text-slate-800">Historical rows:</strong> if stock was reduced later, older item rows stay preserved for audit and past coupon history.</p>
            </div>
            {selectedTemplate ? (
              <button
                type="button"
                onClick={() => void openValuesModal(selectedTemplate)}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-white py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer min-h-12"
              >
                <Pencil className="w-4 h-4" />
                <span>Continue editing {selectedTemplate.name}</span>
              </button>
            ) : (
              <div className="rounded-2xl border border-dashed border-slate-250 bg-slate-50 p-4 text-center text-[11px] text-slate-500">
                Choose any reward card or table row to open its value room.
              </div>
            )}
          </div>
        </div>
      </div>

      {selectedTemplate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] bg-white">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <img
                  src={selectedTemplate.image || DEFAULT_PRIZE_IMAGE_URL}
                  alt={`${selectedTemplate.name} preview`}
                  className="mb-3 h-20 w-28 rounded-xl border border-slate-200 object-cover"
                  onError={(event) => {
                    event.currentTarget.src = DEFAULT_PRIZE_IMAGE_URL;
                  }}
                />
                <h2 className="text-lg font-bold text-slate-900">Reward room — {selectedTemplate.name}</h2>
                <p className="mt-1 text-sm text-slate-500">
                  {selectedTemplate.category === 'voucher'
                    ? 'Enter the real voucher / coupon code for each unit.'
                    : 'Enter an optional serial, reference, or warehouse ID for each physical unit.'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeValuesModal}
                className="rounded-2xl border border-slate-200 bg-slate-50 p-2.5 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
                aria-label="Close values modal"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="space-y-4 p-6">
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-mono uppercase text-slate-400">Category</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{selectedTemplate.category}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-mono uppercase text-slate-400">Prepared</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{activeTemplateItems.filter((item) => item.item_value?.trim()).length} / {selectedTemplate.totalStock}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-mono uppercase text-slate-400">Face value</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">{selectedTemplate.itemValue}</p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                  <p className="text-[10px] font-mono uppercase text-slate-400">Reserved / Won</p>
                  <p className="mt-1 text-sm font-bold text-slate-800">
                    {selectedTemplate.allocatedStock} reserved • {selectedTemplate.quantityWonCount ?? 0} won
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-600">
                <p>
                  Active campaign usage: <strong className="text-slate-800">{selectedTemplate.campaignUsageCount ?? 0}</strong>
                  {' '}campaign(s). Available stock shown in this room excludes reserved units but does not remove historical rows used for audit.
                </p>
              </div>

              {overflowTemplateItems.length > 0 && (
                <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-[11px] text-amber-800">
                  Stock was reduced after this template had more item rows. The extra historical rows are preserved below for audit and past coupon tracing, but they are no longer part of the active stock pool.
                </div>
              )}

              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={downloadBulkTemplate}
                  className="inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  <span>Download CSV example</span>
                </button>
                <button
                  type="button"
                  onClick={() => modalFileInputRef.current?.click()}
                  className="inline-flex items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500"
                >
                  <Upload className="h-4 w-4" />
                  <span>Import CSV values</span>
                </button>
                <input
                  ref={modalFileInputRef}
                  type="file"
                  accept=".csv,text/csv"
                  className="hidden"
                  onChange={(event) => {
                    const file = event.target.files?.[0];
                    if (file) void handleBulkUpload(file);
                    event.target.value = '';
                  }}
                />
              </div>

              {itemsLoading ? (
                <div className="flex h-40 items-center justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-indigo-600" />
                </div>
              ) : (
                <div className="overflow-hidden rounded-[24px] border border-slate-200">
                  <table className="min-w-full">
                    <thead className="border-b border-slate-200 bg-slate-50 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-400">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Value / Reference</th>
                        <th className="px-4 py-3">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {activeTemplateItems.map((instance) => (
                        <tr key={instance.id}>
                          <td className="px-4 py-3 text-sm text-slate-600">#{instance.item_index}</td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              defaultValue={instance.item_value ?? ''}
                              placeholder={
                                selectedTemplate.category === 'voucher'
                                  ? 'Enter coupon code / voucher value'
                                  : 'Optional serial / reference / warehouse ID'
                              }
                              onBlur={(event) => void updateSingleItemValue(instance.id, event.target.value)}
                              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white min-h-12"
                            />
                          </td>
                          <td className="px-4 py-3 text-sm text-slate-500 capitalize">{instance.source_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {overflowTemplateItems.length > 0 && (
                <div className="overflow-hidden rounded-[24px] border border-amber-200">
                  <div className="border-b border-amber-200 bg-amber-50 px-4 py-3">
                    <h3 className="text-sm font-bold text-amber-900">Historical rows outside current stock</h3>
                    <p className="mt-1 text-[11px] text-amber-800">
                      These rows remain read-only because the template stock was reduced after they were created.
                    </p>
                  </div>
                  <table className="min-w-full">
                    <thead className="border-b border-amber-200 bg-amber-50/60 text-left text-[11px] font-semibold uppercase tracking-[0.2em] text-amber-700">
                      <tr>
                        <th className="px-4 py-3">Item</th>
                        <th className="px-4 py-3">Stored value / reference</th>
                        <th className="px-4 py-3">Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-amber-100 bg-white">
                      {overflowTemplateItems.map((instance) => (
                        <tr key={instance.id}>
                          <td className="px-4 py-3 text-sm text-slate-600">#{instance.item_index}</td>
                          <td className="px-4 py-3 text-sm text-slate-800">{instance.item_value?.trim() || '—'}</td>
                          <td className="px-4 py-3 text-sm text-slate-500 capitalize">{instance.source_type}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {itemsSaving && (
                <p className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600">
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
