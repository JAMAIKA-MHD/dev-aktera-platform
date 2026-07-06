import React, { useMemo, useState } from 'react';
import { AlertTriangle, Check, Gift, Loader2, Pencil, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { motion } from 'motion/react';
import { PrizeTemplate } from '../types';
import { DEFAULT_PRIZE_IMAGE_URL } from '../lib/defaultImages';
import { ImageUploader } from './common/ImageUploader';

type PrizeTemplatePayload = Omit<PrizeTemplate, 'id' | 'allocatedStock' | 'availableStock'>;

interface PrizesManagerProps {
  prizes: PrizeTemplate[];
  onAddPrize: (newPrize: PrizeTemplatePayload) => Promise<void>;
  onUpdatePrize: (id: string, updates: PrizeTemplatePayload) => Promise<void>;
  onDeletePrize: (id: string) => Promise<void>;
}

const defaultForm = {
  name: '',
  category: 'voucher' as const,
  description: '',
  itemValue: '',
  totalStock: 100,
  image: '',
};

export const PrizesManager: React.FC<PrizesManagerProps> = ({
  prizes,
  onAddPrize,
  onUpdatePrize,
  onDeletePrize,
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreator, setShowCreator] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PrizeTemplate | null>(null);
  const [name, setName] = useState(defaultForm.name);
  const [category, setCategory] = useState<'voucher' | 'physical'>(defaultForm.category);
  const [description, setDescription] = useState(defaultForm.description);
  const [itemValue, setItemValue] = useState(defaultForm.itemValue);
  const [totalStock, setTotalStock] = useState(defaultForm.totalStock);
  const [imageUrl, setImageUrl] = useState(defaultForm.image);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredPrizes = useMemo(
    () =>
      prizes.filter((prize) =>
        [prize.name, prize.description, prize.category]
          .join(' ')
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
      setImageUrl(template.image ?? '');
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
        showSuccess('Reward template updated successfully.');
      } else {
        await onAddPrize(payload);
        showSuccess('Reward template created successfully.');
      }

      closeCreator();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to save reward template. Please try again.';
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
        `Cannot delete "${template.name}" because it is already linked to ${template.campaignUsageCount} campaign record(s).`
      );
      return;
    }

    if (!window.confirm(`Delete "${template.name}" from the reward library?`)) return;

    try {
      await onDeletePrize(template.id);
      showSuccess('Reward template deleted successfully.');
      if (editingTemplate?.id === template.id) closeCreator();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to delete reward template. Please try again.';
      setPageError(msg);
    }
  };

  return (
    <div id="prizes-manager-root" className="space-y-6 text-slate-800">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Prize Template Library</h2>
          <p className="text-slate-500 text-xs mt-0.5">Define reusable vouchers, data passes, and branded physical rewards.</p>
        </div>
        <button
          type="button"
          onClick={() => (showCreator && !editingTemplate ? closeCreator() : openCreator())}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer min-h-12 text-xs"
        >
          <Plus className="w-5 h-5" />
          <span>{showCreator && !editingTemplate ? 'Hide Creator' : 'Add Custom Reward'}</span>
        </button>
      </div>

      {pageMessage && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm"
        >
          <Check className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>{pageMessage}</span>
        </motion.div>
      )}

      {pageError && (
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm"
        >
          <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
          <span>{pageError}</span>
        </motion.div>
      )}

      {showCreator && (
        <motion.form
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm"
        >
          <div className="flex items-center justify-between gap-3">
            <h3 className="font-bold text-sm text-indigo-700 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-indigo-600" />
              <span>{editingTemplate ? 'Edit Reusable Reward Template' : 'Create Reusable Reward Template'}</span>
            </h3>
            <button
              type="button"
              onClick={closeCreator}
              className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
              aria-label="Close reward creator"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {formError && (
            <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Reward Name</label>
              <input
                type="text"
                placeholder="e.g. Djezzy 1500 DA Voucher"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-slate-200 hover:border-slate-400 focus:border-indigo-500 rounded-xl px-4 text-xs text-slate-800 min-h-11 focus:outline-none"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Display Value / Face Value</label>
              <input
                type="text"
                placeholder="e.g. 1500 DA"
                value={itemValue}
                onChange={(e) => setItemValue(e.target.value)}
                className="w-full bg-white border border-slate-200 hover:border-slate-400 focus:border-indigo-500 rounded-xl px-4 text-xs text-slate-800 min-h-11 focus:outline-none"
                required
              />
              <p className="text-[10px] text-slate-400">
                Individual voucher codes or physical references are still prepared later inside Stock Room.
              </p>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Category</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setCategory('voucher')}
                  className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer min-h-11 text-xs ${
                    category === 'voucher'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Digital Voucher / Code
                </button>
                <button
                  type="button"
                  onClick={() => setCategory('physical')}
                  className={`py-2 px-1 rounded-xl border text-center transition-all cursor-pointer min-h-11 text-xs ${
                    category === 'physical'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  Physical Item / Merch
                </button>
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Total Warehouse Stock</label>
              <input
                type="number"
                min={editingTemplate?.allocatedStock ?? 0}
                max="100000"
                value={totalStock}
                onChange={(e) => setTotalStock(Number(e.target.value))}
                className="w-full bg-white border border-slate-200 hover:border-slate-400 focus:border-indigo-500 rounded-xl px-4 text-xs text-slate-800 min-h-11 focus:outline-none font-mono"
              />
              <p className="text-[10px] text-slate-400">
                {editingTemplate
                  ? `Reserved right now: ${editingTemplate.allocatedStock}. Stock cannot be reduced below that quantity.`
                  : 'Initial stock can be adjusted later in Stock Room.'}
              </p>
            </div>

            <div className="col-span-full flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Redemption Instructions for Consumers</label>
              <textarea
                placeholder="How do players claim this prize? E.g. present coupon code to any partner branch."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-slate-200 hover:border-slate-400 focus:border-indigo-500 rounded-xl p-4 text-xs text-slate-800 min-h-20 focus:outline-none"
              />
            </div>

            <div className="col-span-full space-y-3 rounded-2xl border border-slate-200 bg-slate-50 p-4">
              <ImageUploader
                value={imageUrl}
                onChange={setImageUrl}
                folder="prizes"
                label="Prize template image"
              />
              <div className="flex items-center gap-3">
                <img
                  src={imageUrl || DEFAULT_PRIZE_IMAGE_URL}
                  alt="Prize visual preview"
                  className="h-20 w-20 rounded-xl border border-slate-200 object-cover"
                  onError={(event) => {
                    event.currentTarget.src = DEFAULT_PRIZE_IMAGE_URL;
                  }}
                />
                <p className="text-[11px] text-slate-500">
                  Used in rewards library cards and Stock Room views.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-[11px] text-slate-600">
            {editingTemplate ? (
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
                <p>Reserved now: <strong className="text-slate-800">{editingTemplate.allocatedStock}</strong></p>
                <p>Used in campaigns: <strong className="text-slate-800">{editingTemplate.campaignUsageCount ?? 0}</strong></p>
                <p>Historically won: <strong className="text-slate-800">{editingTemplate.quantityWonCount ?? 0}</strong></p>
              </div>
            ) : (
              <p>New templates become available in both the library and Stock Room immediately after save.</p>
            )}
          </div>

          <div className="flex justify-end gap-2.5 pt-2">
            <button
              type="button"
              onClick={closeCreator}
              disabled={submitting}
              className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer px-4 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !name.trim() || !itemValue.trim()}
              className="bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-xs px-5 py-2.5 rounded-xl font-bold cursor-pointer transition-all flex items-center gap-2 min-h-11"
            >
              {submitting && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{submitting ? 'Saving...' : editingTemplate ? 'Update Library Template' : 'Save to Library'}</span>
            </button>
          </div>
        </motion.form>
      )}

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 w-4 h-4 text-slate-400 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter rewards by title or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200 hover:border-slate-400 focus:border-indigo-500 rounded-xl pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 transition-all duration-200 min-h-[44px] focus:outline-none"
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPrizes.map((prize) => {
          const isDeleteBlocked = (prize.campaignUsageCount ?? 0) > 0;
          const stockPercent = prize.totalStock > 0 ? (prize.availableStock / prize.totalStock) * 100 : 0;

          return (
            <div
              key={prize.id}
              className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow hover:border-slate-400 transition-all duration-300 flex flex-col justify-between"
            >
              <div>
                <div className="flex justify-between items-start mb-3 gap-3">
                  <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                    prize.category === 'voucher'
                      ? 'bg-indigo-50 border-indigo-100 text-indigo-700'
                      : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                  }`}>
                    {prize.category}
                  </span>
                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => openCreator(prize)}
                      className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100"
                      aria-label={`Edit ${prize.name}`}
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => void handleDelete(prize)}
                      disabled={isDeleteBlocked}
                      title={isDeleteBlocked ? 'This reward is already used in campaigns and cannot be deleted.' : 'Delete reward template'}
                      className={`rounded-lg p-2 transition ${
                        isDeleteBlocked
                          ? 'border border-slate-200 bg-slate-100 text-slate-300 cursor-not-allowed'
                          : 'border border-rose-200 bg-rose-50 text-rose-600 hover:bg-rose-100'
                      }`}
                      aria-label={`Delete ${prize.name}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <img
                      src={prize.image || DEFAULT_PRIZE_IMAGE_URL}
                      alt={`${prize.name} visual`}
                      className="h-14 w-14 rounded-xl border border-slate-200 object-cover"
                      onError={(event) => {
                        event.currentTarget.src = DEFAULT_PRIZE_IMAGE_URL;
                      }}
                    />
                    <div>
                    <h4 className="font-extrabold text-sm text-slate-800">{prize.name}</h4>
                    <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                      {prize.description || 'No redemption instructions added yet.'}
                    </p>
                    </div>
                  </div>
                  <span className="text-xs font-extrabold text-indigo-600 font-mono whitespace-nowrap">
                    {prize.itemValue || 'Configured'}
                  </span>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-4 mt-4 space-y-2.5">
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Prepared item values:</span>
                  <span className="text-slate-700 font-bold">{prize.filledValuesCount ?? 0} / {prize.totalStock}</span>
                </div>
                <div className="flex justify-between text-[10px] font-mono">
                  <span className="text-slate-400">Warehouse stock:</span>
                  <span className="text-slate-700 font-bold">{prize.availableStock} / {prize.totalStock} available</span>
                </div>
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={`${prize.availableStock < 50 ? 'bg-amber-500' : 'bg-indigo-600'} h-full`}
                    style={{ width: `${stockPercent}%` }}
                  />
                </div>
                <div className="grid grid-cols-3 gap-2 rounded-2xl border border-slate-200 bg-slate-50 px-3 py-2 text-center text-[10px]">
                  <div>
                    <p className="text-slate-400">Reserved</p>
                    <p className="mt-1 font-bold text-slate-800">{prize.allocatedStock}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Campaigns</p>
                    <p className="mt-1 font-bold text-slate-800">{prize.campaignUsageCount ?? 0}</p>
                  </div>
                  <div>
                    <p className="text-slate-400">Won</p>
                    <p className="mt-1 font-bold text-slate-800">{prize.quantityWonCount ?? 0}</p>
                  </div>
                </div>
                {isDeleteBlocked ? (
                  <p className="text-[10px] text-amber-700 bg-amber-50 border border-amber-200 rounded-xl px-3 py-2">
                    This template stays locked because it is already linked to campaign prize history.
                  </p>
                ) : null}
              </div>
            </div>
          );
        })}

        {filteredPrizes.length === 0 && (
          <div className="col-span-full text-center py-12 bg-white border border-slate-200 rounded-3xl">
            <Gift className="w-8 h-8 text-slate-400 mx-auto mb-2" />
            <h4 className="text-sm font-bold text-slate-700">No matching templates found</h4>
            <p className="text-[11px] text-slate-500 mt-1">Try refining your search terms or create a custom reward.</p>
          </div>
        )}
      </div>
    </div>
  );
};
