import { useMemo, useRef, useState } from 'react';
import {
  AlertTriangle,
  Check,
  Database,
  Download,
  LayoutGrid,
  List,
  Loader2,
  Lock,
  Package,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Upload,
  X,
} from 'lucide-react';
import { useInventory } from '../../hooks/useInventory';
import { supabase } from '../../lib/supabase';
import { toFriendlyErrorMessage } from '../../lib/errorMessages';
import { adaptInventoryRowToUiCard, Phase2InlineNotice } from '../../features/phase2-ui';
import type { PrizeTemplateItem } from '../../types';
import type { InventoryRow } from '../../hooks/useInventory';

export default function Inventory() {
  const { inventory, loading, error, refetch } = useInventory();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTemplate, setSelectedTemplate] = useState<InventoryRow | null>(null);
  const [templateItems, setTemplateItems] = useState<PrizeTemplateItem[]>([]);
  const [itemsLoading, setItemsLoading] = useState(false);
  const [itemsSaving, setItemsSaving] = useState(false);
  const [itemsError, setItemsError] = useState<string | null>(null);
  const [restockingId, setRestockingId] = useState<string | null>(null);
  const [restockDrafts, setRestockDrafts] = useState<Record<string, string>>({});
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const filteredInventory = useMemo(
    () =>
      inventory.filter((item) => {
        const term = searchQuery.trim().toLowerCase();
        return (
          term.length === 0 ||
          item.prize_template_name.toLowerCase().includes(term) ||
          item.prize_category.toLowerCase().includes(term)
        );
      }),
    [inventory, searchQuery],
  );

  const inventoryCards = filteredInventory.map((item) => ({
    source: item,
    view: adaptInventoryRowToUiCard(item),
  }));

  const parseCsvLine = (line: string, delimiter: string) => line.split(delimiter).map((cell) => cell.trim());

  const loadTemplateItems = async (template: InventoryRow) => {
    setItemsLoading(true);
    setItemsError(null);
    setPageError(null);

    try {
      const { data, error: queryError } = await supabase
        .from('prize_template_items')
        .select('*')
        .eq('prize_template_id', template.id)
        .order('item_index', { ascending: true });
      if (queryError) throw queryError;

      const rows = (data as PrizeTemplateItem[]) ?? [];
      if (rows.length < template.stock_quantity) {
        const missingRows = Array.from({ length: template.stock_quantity - rows.length }, (_, index) => ({
          prize_template_id: template.id,
          organization_id: template.organization_id,
          item_index: rows.length + index + 1,
          item_value: null,
          source_type: 'manual' as const,
        }));

        const { error: insertError } = await supabase.from('prize_template_items').insert(missingRows);
        if (insertError) throw insertError;

        const { data: reloaded, error: reloadError } = await supabase
          .from('prize_template_items')
          .select('*')
          .eq('prize_template_id', template.id)
          .order('item_index', { ascending: true });
        if (reloadError) throw reloadError;

        setTemplateItems((reloaded as PrizeTemplateItem[]) ?? []);
      } else {
        setTemplateItems(rows.slice(0, template.stock_quantity));
      }
    } catch (err: unknown) {
      setItemsError(
        toFriendlyErrorMessage(err, {
          fallback: 'Failed to load template item values. Please try again.',
        }),
      );
    } finally {
      setItemsLoading(false);
    }
  };

  const openValuesModal = async (template: InventoryRow) => {
    setSelectedTemplate(template);
    await loadTemplateItems(template);
  };

  const closeValuesModal = () => {
    setSelectedTemplate(null);
    setTemplateItems([]);
    setItemsError(null);
  };

  const updateSingleItemValue = async (id: string, value: string) => {
    setItemsSaving(true);
    setItemsError(null);
    try {
      const normalized = value.trim();
      const { error: updateError } = await supabase
        .from('prize_template_items')
        .update({
          item_value: normalized.length > 0 ? normalized : null,
          source_type: 'manual',
        })
        .eq('id', id);
      if (updateError) throw updateError;
    } catch (err: unknown) {
      setItemsError(
        toFriendlyErrorMessage(err, {
          fallback: 'Failed to save template value. Please try again.',
        }),
      );
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
    link.download = 'template-values-template.csv';
    link.click();
    URL.revokeObjectURL(url);
  };

  const handleBulkUpload = async (file: File) => {
    if (!selectedTemplate) return;

    setItemsSaving(true);
    setItemsError(null);

    try {
      const text = await file.text();
      const lines = text.split(/\r?\n/).map((line) => line.trim()).filter((line) => line.length > 0);
      if (lines.length < 2) throw new Error('CSV file is empty.');

      const delimiter = lines[0].includes(';') ? ';' : ',';
      const headers = parseCsvLine(lines[0], delimiter).map((header) => header.toLowerCase());
      const indexColumn = headers.indexOf('item_index');
      const valueColumn = headers.indexOf('item_value');
      if (valueColumn === -1) throw new Error('CSV must include an item_value column.');

      const updates = lines.slice(1).map((line, rowIndex) => {
        const columns = parseCsvLine(line, delimiter);
        const parsedIndex = indexColumn >= 0 ? parseInt(columns[indexColumn] ?? '', 10) : rowIndex + 1;
        return {
          item_index: parsedIndex,
          item_value: (columns[valueColumn] ?? '').trim(),
        };
      });

      for (const update of updates) {
        if (!Number.isInteger(update.item_index) || update.item_index <= 0) continue;

        const { error: updateError } = await supabase
          .from('prize_template_items')
          .update({
            item_value: update.item_value.length > 0 ? update.item_value : null,
            source_type: 'bulk',
          })
          .eq('prize_template_id', selectedTemplate.id)
          .eq('item_index', update.item_index);
        if (updateError) throw updateError;
      }

      await loadTemplateItems(selectedTemplate);
      setPageMessage('Template values imported successfully.');
    } catch (err: unknown) {
      setItemsError(
        toFriendlyErrorMessage(err, {
          fallback: 'Failed to import CSV values. Please verify the file format and try again.',
        }),
      );
    } finally {
      setItemsSaving(false);
    }
  };

  const handleRestock = async (item: InventoryRow, isIncrement = true) => {
    const rawAmount = restockDrafts[item.id]?.trim() ?? '';
    const quantity = parseInt(rawAmount, 10);

    if (!rawAmount) {
      setPageError('Enter a quantity before adjusting stock.');
      return;
    }

    if (Number.isNaN(quantity) || quantity <= 0) {
      setPageError('Stock adjustments must be a positive whole number.');
      return;
    }

    const targetQuantity = isIncrement ? item.stock_quantity + quantity : item.stock_quantity - quantity;
    if (targetQuantity < item.reserved_quantity) {
      setPageError(`Stock cannot go below the currently reserved quantity (${item.reserved_quantity}).`);
      return;
    }

    setRestockingId(item.id);
    setPageError(null);
    setPageMessage(null);

    try {
      const { error: updateError } = await supabase
        .from('prize_templates')
        .update({ stock_quantity: targetQuantity })
        .eq('id', item.id);
      if (updateError) throw updateError;

      setRestockDrafts((prev) => ({ ...prev, [item.id]: '' }));
      setPageMessage(
        `${isIncrement ? 'Added' : 'Removed'} ${quantity} units ${isIncrement ? 'to' : 'from'} ${item.prize_template_name}.`,
      );
      refetch();
    } catch (err: unknown) {
      setPageError(
        toFriendlyErrorMessage(err, {
          fallback: 'Failed to update template quantity. Please try again.',
        }),
      );
    } finally {
      setRestockingId(null);
    }
  };

  const totalStock = inventory.reduce((sum, item) => sum + item.stock_quantity, 0);
  const totalAvailable = inventory.reduce((sum, item) => sum + item.available_quantity, 0);
  const totalReserved = inventory.reduce((sum, item) => sum + item.reserved_quantity, 0);
  const lowStockCount = inventory.filter((item) => item.available_quantity > 0 && item.available_quantity < 5).length;

  return (
    <div id="inventory-manager-root" className="space-y-6 text-slate-800">
      <div className="rounded-3xl border border-indigo-950 bg-indigo-900 p-4 text-slate-100 shadow-md">
        <div className="flex flex-col items-start justify-between gap-4 md:flex-row md:items-center">
          <div>
            <span className="rounded-full bg-indigo-800 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-indigo-200">
              GitHub Copilot Readiness
            </span>
            <h2 className="mt-1 text-sm font-extrabold text-white">Platform Database Sync Guides</h2>
            <p className="mt-0.5 max-w-2xl text-xs text-slate-300">
              This component maps directly to the <code className="rounded bg-indigo-950 px-1 py-0.5 text-[10px] text-white">prize_templates</code> table and standardizes stock allocation checks before active campaigns launch.
            </p>
          </div>
          <span className="inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-3 py-1.5 text-[10px] font-bold text-emerald-400">
            <ShieldCheck className="h-3.5 w-3.5" />
            <span>Ready for Integration</span>
          </span>
        </div>
      </div>

      <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Stock Room & Voucher Vault</h2>
          <p className="mt-0.5 text-xs text-slate-500">Control live warehouse metrics, allocate safe limits, and prepare reusable value pools.</p>
        </div>

        <div className="flex items-center gap-3">
          <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode('grid')}
              className={`flex items-center gap-1.5 rounded-lg p-2 text-xs font-bold transition-all ${
                viewMode === 'grid' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="h-4 w-4" />
              <span className="hidden md:inline">Visual Cards</span>
            </button>
            <button
              type="button"
              onClick={() => setViewMode('table')}
              className={`flex items-center gap-1.5 rounded-lg p-2 text-xs font-bold transition-all ${
                viewMode === 'table' ? 'bg-white text-slate-800 shadow-sm' : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <List className="h-4 w-4" />
              <span className="hidden md:inline">Compact Table</span>
            </button>
          </div>
        </div>
      </div>

      {pageMessage ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-xs font-semibold text-emerald-900 shadow-sm">
          <div className="flex items-center gap-2">
            <Check className="h-4 w-4 shrink-0 text-emerald-600" />
            <span>{pageMessage}</span>
          </div>
        </div>
      ) : null}
      {pageError ? <Phase2InlineNotice tone="danger">{pageError}</Phase2InlineNotice> : null}
      {error ? <Phase2InlineNotice tone="danger">{error}</Phase2InlineNotice> : null}

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { title: 'Total Stock Pool', value: totalStock.toLocaleString(), desc: 'Cumulative coupon and physical pool', icon: Package, tone: 'text-indigo-600 bg-indigo-50' },
          { title: 'Reserved in Active Campaigns', value: totalReserved.toLocaleString(), desc: 'Committed to wheels and prize pools', icon: Lock, tone: 'text-amber-600 bg-amber-50' },
          { title: 'Ready & Available', value: totalAvailable.toLocaleString(), desc: 'Unallocated stock ready for use', icon: ShieldCheck, tone: 'text-emerald-600 bg-emerald-50' },
          { title: 'Refill Warnings', value: lowStockCount, desc: 'Items with available stock below threshold', icon: AlertTriangle, tone: `${lowStockCount > 0 ? 'text-rose-600 bg-rose-50' : 'text-slate-400 bg-slate-50'}` },
        ].map((item) => {
          const Icon = item.icon;
          return (
            <div key={item.title} className="rounded-[24px] border border-slate-200 bg-white p-5 shadow-sm transition-shadow hover:shadow-md">
              <div className="flex items-start justify-between">
                <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">{item.title}</span>
                <div className={`rounded-lg p-2 ${item.tone}`}>
                  <Icon className="h-4 w-4" />
                </div>
              </div>
              <h4 className="mt-3 mb-1 text-3xl font-black text-slate-900">{item.value}</h4>
              <p className="text-[11px] text-slate-500">{item.desc}</p>
            </div>
          );
        })}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="flex flex-col items-center justify-between gap-3 sm:flex-row">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="text"
                placeholder="Search templates by name or category..."
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/20"
              />
            </div>
          </div>

          {loading ? (
            <div className="flex h-64 items-center justify-center">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
            </div>
          ) : inventoryCards.length === 0 ? (
            <div className="rounded-[32px] border border-slate-200 bg-white py-12 text-center">
              <Database className="mx-auto mb-2 h-8 w-8 animate-bounce text-slate-300" />
              <h4 className="text-sm font-bold text-slate-800">No matching stocks found</h4>
              <p className="mt-1 text-[11px] text-slate-500">Try refining your search text or clear filters.</p>
            </div>
          ) : viewMode === 'grid' ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {inventoryCards.map(({ source, view }) => {
                const isLow = view.availableStock < 5;
                const reservedPct = view.totalStock > 0 ? (view.reservedStock / view.totalStock) * 100 : 0;
                const availablePct = view.totalStock > 0 ? (view.availableStock / view.totalStock) * 100 : 0;

                return (
                  <div
                    key={view.id}
                    className={`flex flex-col justify-between rounded-3xl border bg-white p-5 shadow-sm transition-all duration-300 hover:shadow-md ${
                      isLow ? 'border-amber-200 ring-2 ring-amber-500/5' : 'border-slate-200 hover:border-slate-400'
                    }`}
                  >
                    <div>
                      <div className="mb-3 flex items-start justify-between gap-2">
                        <span
                          className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                            view.category === 'voucher'
                              ? 'border-indigo-100 bg-indigo-50 text-indigo-700'
                              : 'border-emerald-100 bg-emerald-50 text-emerald-700'
                          }`}
                        >
                          {view.category}
                        </span>
                        <button
                          type="button"
                          onClick={() => void openValuesModal(source)}
                          className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100"
                          title="Open values preparation"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                      </div>

                      <h4 className="text-sm font-extrabold leading-tight text-slate-800">{view.name}</h4>
                      <p className="mt-0.5 text-[10px] text-slate-400">Template ID: {view.id}</p>
                      <p className="mt-2 text-[11px] leading-relaxed text-slate-500">
                        {source.active_campaign_count} campaign{source.active_campaign_count === 1 ? '' : 's'} currently depend on this shared stock pool.
                      </p>
                    </div>

                    <div className="mt-4 space-y-2 border-t border-slate-100 pt-3">
                      <div className="flex justify-between text-[10px]">
                        <span className="text-slate-400">Inventory Distribution:</span>
                        <span className="font-bold text-slate-700">Total: {view.totalStock}</span>
                      </div>
                      <div className="flex h-2.5 w-full overflow-hidden rounded-full bg-slate-100">
                        <div className="h-full bg-amber-500" style={{ width: `${reservedPct}%` }} />
                        <div className="h-full bg-indigo-600" style={{ width: `${availablePct}%` }} />
                      </div>
                      <div className="grid grid-cols-2 gap-1.5 pt-1 text-[10px]">
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-amber-500" />
                          <span className="text-slate-500">Reserved: <strong className="text-slate-700">{view.reservedStock}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="h-1.5 w-1.5 shrink-0 rounded-full bg-indigo-600" />
                          <span className="text-slate-500">Available: <strong className="text-slate-700">{view.availableStock}</strong></span>
                        </div>
                      </div>

                      <div className="flex items-center justify-between pt-2">
                        {isLow ? (
                          <span className="inline-flex items-center gap-1 rounded border border-amber-200 bg-amber-50 px-2 py-0.5 text-[9px] font-bold text-amber-600">
                            <AlertTriangle className="h-3 w-3" />
                            <span>Sparing stocks</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 rounded border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-[9px] font-bold text-emerald-600">
                            <ShieldCheck className="h-3 w-3" />
                            <span>Ready & Loaded</span>
                          </span>
                        )}

                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={restockDrafts[source.id] || ''}
                            onChange={(event) => setRestockDrafts((prev) => ({ ...prev, [source.id]: event.target.value }))}
                            className="w-12 rounded-lg border border-slate-200 py-1 px-1.5 text-center text-[10px] font-mono outline-none transition hover:border-slate-400 focus:border-indigo-500"
                          />
                          <button
                            type="button"
                            onClick={() => handleRestock(source, true)}
                            disabled={restockingId === source.id}
                            className="rounded border border-indigo-200 bg-indigo-50 p-1 text-indigo-700 transition hover:bg-indigo-100"
                            title="Add supply"
                          >
                            <Plus className="h-3.5 w-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRestock(source, false)}
                            disabled={restockingId === source.id}
                            className="rounded border border-slate-200 bg-slate-50 p-1 text-slate-700 transition hover:bg-slate-100"
                            title="Deduct supply"
                          >
                            <X className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="rounded-[32px] border border-slate-200 bg-white p-6 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full border-collapse text-left">
                  <thead>
                    <tr className="border-b border-slate-200 text-[10px] uppercase text-slate-400">
                      <th className="pb-3 pl-1 font-semibold">Reward Title</th>
                      <th className="pb-3 text-center font-semibold">Category</th>
                      <th className="pb-3 text-center font-semibold">Reserved</th>
                      <th className="pb-3 text-center font-semibold">Available Stock</th>
                      <th className="pb-3 text-right font-semibold">Supply Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 text-xs text-slate-600">
                    {inventoryCards.map(({ source, view }) => {
                      const isLow = view.availableStock < 5;
                      return (
                        <tr key={view.id} className="transition-all duration-150 hover:bg-slate-50/60">
                          <td className="py-3.5 pl-1">
                            <p className="font-bold leading-tight text-slate-800">{view.name}</p>
                            <span className="text-[9px] text-slate-400">ID: {view.id}</span>
                          </td>
                          <td className="py-3.5 text-center">
                            <span
                              className={`rounded px-2 py-0.5 text-[9px] font-bold uppercase ${
                                view.category === 'voucher' ? 'bg-indigo-50 text-indigo-700' : 'bg-emerald-50 text-emerald-700'
                              }`}
                            >
                              {view.category}
                            </span>
                          </td>
                          <td className="py-3.5 text-center font-mono text-slate-500">{view.reservedStock} allocated</td>
                          <td className="py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 font-bold ${isLow ? 'text-amber-600' : 'text-slate-700'}`}>
                              {isLow ? <AlertTriangle className="h-3.5 w-3.5 animate-pulse text-amber-500" /> : null}
                              <span>
                                {view.availableStock} / {view.totalStock} items
                              </span>
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1">
                              <input
                                type="number"
                                min="1"
                                placeholder="+/-"
                                value={restockDrafts[source.id] || ''}
                                onChange={(event) => setRestockDrafts((prev) => ({ ...prev, [source.id]: event.target.value }))}
                                className="w-14 rounded-lg border border-slate-200 py-1 text-center text-[11px] outline-none transition hover:border-slate-400 focus:border-indigo-500"
                              />
                              <button
                                type="button"
                                onClick={() => handleRestock(source, true)}
                                className="rounded-lg border border-indigo-200 bg-indigo-50 p-1.5 text-indigo-700 transition hover:bg-indigo-100"
                                title="Restock"
                              >
                                <Plus className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => handleRestock(source, false)}
                                className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 transition hover:bg-slate-100"
                                title="Deduct"
                              >
                                <X className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => void openValuesModal(source)}
                                className="rounded-lg border border-slate-200 bg-slate-50 p-1.5 text-slate-600 transition hover:bg-slate-100"
                                title="Prepare values"
                              >
                                <Pencil className="h-3.5 w-3.5" />
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
          <div className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
            <h3 className="flex items-center gap-2 text-sm font-bold text-slate-800">
              <Database className="h-4 w-4 text-indigo-600" />
              <span>Bulk Restock Engine</span>
            </h3>

            <p className="text-[11px] leading-relaxed text-slate-500">
              Restock thousands of voucher codes or physical rewards via bulk CSV import. Download the standard CSV format first.
            </p>

            <div
              onClick={() => fileInputRef.current?.click()}
              className="cursor-pointer rounded-[24px] border-2 border-dashed border-slate-200 bg-slate-50/50 p-6 text-center transition-all hover:border-slate-400"
            >
              <Upload className="mx-auto mb-2 h-8 w-8 animate-bounce text-slate-400" />
              <p className="text-xs font-bold text-slate-700">Click to browse CSV files</p>
              <p className="mt-1 text-[10px] text-slate-400">Load template-value batches for the selected reward pool</p>
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={(event) => {
                  const file = event.target.files?.[0];
                  if (file && selectedTemplate) {
                    void handleBulkUpload(file);
                  } else if (file && !selectedTemplate) {
                    setPageError('Open a template value room first, then import its CSV.');
                  }
                  event.target.value = '';
                }}
              />
            </div>

            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={downloadBulkTemplate}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-slate-200 bg-slate-100 py-2.5 text-[10px] font-bold text-slate-700 transition hover:bg-slate-200"
              >
                <Download className="h-3.5 w-3.5" />
                <span>Template CSV</span>
              </button>
              <button
                type="button"
                onClick={() => refetch()}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl border border-indigo-200 bg-indigo-50 py-2.5 text-[10px] font-bold text-indigo-700 transition hover:bg-indigo-100"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                <span>Refresh Pool</span>
              </button>
            </div>
          </div>

          <div className="space-y-3 rounded-[28px] border border-slate-150 bg-slate-50 p-5 shadow-sm">
            <span className="flex items-center gap-1.5 text-xs font-extrabold text-slate-800">
              <Database className="h-4 w-4 text-slate-500" />
              <span>Copilot REST API Integration Notes</span>
            </span>
            <p className="text-[11px] leading-relaxed text-slate-500">
              Template-level quantity remains the canonical stock authority. Campaign allocations only reserve from this pool and must never exceed available stock.
            </p>
          </div>
        </div>
      </div>

      {selectedTemplate ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4">
          <div className="max-h-[90vh] w-full max-w-4xl overflow-y-auto rounded-[32px] bg-white">
            <div className="flex flex-col gap-4 border-b border-slate-200/80 px-6 py-5 sm:flex-row sm:items-start sm:justify-between">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Template values — {selectedTemplate.prize_template_name}</h2>
                <p className="mt-1 text-sm text-slate-500">Manage per-unit values independently from campaign allocation.</p>
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
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={downloadBulkTemplate}
                  className="touch-target inline-flex items-center gap-2 rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-semibold text-slate-700 transition hover:border-slate-300 hover:bg-slate-50"
                >
                  <Download className="h-4 w-4" />
                  <span>Download CSV example</span>
                </button>
                <label className="touch-target inline-flex cursor-pointer items-center gap-2 rounded-2xl bg-indigo-600 px-4 py-3 text-sm font-semibold text-white transition hover:bg-indigo-500">
                  <Upload className="h-4 w-4" />
                  <span>Import CSV</span>
                  <input
                    type="file"
                    accept=".csv,text/csv"
                    className="hidden"
                    onChange={(event) => {
                      const file = event.target.files?.[0];
                      if (file) void handleBulkUpload(file);
                      event.target.value = '';
                    }}
                  />
                </label>
              </div>

              {itemsError ? <Phase2InlineNotice tone="danger">{itemsError}</Phase2InlineNotice> : null}

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
                        <th className="px-4 py-3">Value</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {templateItems.map((instance) => (
                        <tr key={instance.id}>
                          <td className="px-4 py-3 text-sm text-slate-600">#{instance.item_index}</td>
                          <td className="px-4 py-3">
                            <input
                              type="text"
                              defaultValue={instance.item_value ?? ''}
                              placeholder="Enter coupon code or physical serial"
                              onBlur={(event) => void updateSingleItemValue(instance.id, event.target.value)}
                              className="touch-target w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-indigo-400 focus:bg-white"
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}

              {itemsSaving ? (
                <p className="inline-flex items-center gap-2 text-sm font-medium text-indigo-600">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Saving changes...</span>
                </p>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
