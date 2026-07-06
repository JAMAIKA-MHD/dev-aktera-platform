import { useMemo, useState } from 'react';
import { Edit, Gift, Loader2, Plus, Search, Sparkles, Trash2, X } from 'lucide-react';
import { usePrizeTemplates, type PrizeTemplateInventorySummary } from '../../hooks/usePrizeTemplates';
import { useAuth } from '../../context/AuthContext';
import { supabase } from '../../lib/supabase';
import { ImageUploader } from '../../components/common/ImageUploader';
import { toFriendlyErrorMessage } from '../../lib/errorMessages';
import { adaptPrizeTemplateToUiRewardCard, Phase2InlineNotice } from '../../features/phase2-ui';

type PrizeCategory = 'voucher' | 'physical';

interface PrizeFormData {
  name: string;
  description: string;
  category: PrizeCategory;
  stock_quantity: number;
  image_url: string;
}

const defaultFormData: PrizeFormData = {
  name: '',
  description: '',
  category: 'voucher',
  stock_quantity: 100,
  image_url: '',
};

export default function PrizeTemplates() {
  const { organization } = useAuth();
  const { templates, loading, error, refetch } = usePrizeTemplates();
  const [searchQuery, setSearchQuery] = useState('');
  const [showCreator, setShowCreator] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState<PrizeTemplateInventorySummary | null>(null);
  const [formData, setFormData] = useState<PrizeFormData>(defaultFormData);
  const [submitting, setSubmitting] = useState(false);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pageMessage, setPageMessage] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);

  const filteredTemplates = useMemo(
    () =>
      templates.filter((template) => {
        const term = searchQuery.trim().toLowerCase();
        return (
          term.length === 0 ||
          template.name.toLowerCase().includes(term) ||
          (template.description ?? '').toLowerCase().includes(term) ||
          template.category.toLowerCase().includes(term)
        );
      }),
    [templates, searchQuery],
  );

  const rewardCards = filteredTemplates.map((template) => adaptPrizeTemplateToUiRewardCard(template));

  const openCreator = (template?: PrizeTemplateInventorySummary) => {
    setPageError(null);
    setPageMessage(null);
    setFormError(null);

    if (template) {
      setEditingTemplate(template);
      setFormData({
        name: template.name,
        description: template.description || '',
        category: template.category,
        stock_quantity: template.stock_quantity,
        image_url: template.image_url || '',
      });
    } else {
      setEditingTemplate(null);
      setFormData(defaultFormData);
    }

    setShowCreator(true);
  };

  const closeCreator = () => {
    setShowCreator(false);
    setEditingTemplate(null);
    setFormData(defaultFormData);
    setFormError(null);
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();

    if (!organization) {
      setFormError('Your organization session is missing. Please sign in again.');
      return;
    }

    setSubmitting(true);
    setFormError(null);
    setPageError(null);
    setPageMessage(null);

    try {
      if (editingTemplate) {
        if (formData.stock_quantity < editingTemplate.reserved_quantity) {
          setFormError(
            `Template quantity cannot go below the reserved quantity (${editingTemplate.reserved_quantity}) already allocated to campaigns.`,
          );
          setSubmitting(false);
          return;
        }

        const { error: updateError } = await supabase
          .from('prize_templates')
          .update({
            name: formData.name.trim(),
            description: formData.description.trim() || null,
            category: formData.category,
            value: 0,
            stock_quantity: formData.stock_quantity,
            image_url: formData.image_url.trim() || null,
          })
          .eq('id', editingTemplate.id);
        if (updateError) throw updateError;

        const { error: trimItemsError } = await supabase
          .from('prize_template_items')
          .delete()
          .eq('prize_template_id', editingTemplate.id)
          .gt('item_index', formData.stock_quantity);
        if (trimItemsError) throw trimItemsError;

        setPageMessage('Prize template updated successfully.');
      } else {
        const { error: insertError } = await supabase.from('prize_templates').insert({
          organization_id: organization.id,
          name: formData.name.trim(),
          description: formData.description.trim() || null,
          category: formData.category,
          value: 0,
          stock_quantity: formData.stock_quantity,
          image_url: formData.image_url.trim() || null,
        });
        if (insertError) throw insertError;

        setPageMessage('Prize template created successfully.');
      }

      closeCreator();
      refetch();
    } catch (err: unknown) {
      setFormError(
        toFriendlyErrorMessage(err, {
          fallback: 'Failed to save the prize template. Please try again.',
        }),
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (template: PrizeTemplateInventorySummary) => {
    if (!window.confirm(`Delete "${template.name}"?`)) return;

    setPageError(null);
    setPageMessage(null);

    try {
      const { error: deleteError } = await supabase.from('prize_templates').delete().eq('id', template.id);
      if (deleteError) throw deleteError;
      setPageMessage('Prize template deleted successfully.');
      refetch();
    } catch (err: unknown) {
      setPageError(
        toFriendlyErrorMessage(err, {
          fallback: 'Failed to delete the prize template. Please try again.',
        }),
      );
    }
  };

  return (
    <div id="prizes-manager-root" className="space-y-6 text-slate-800">
      <div className="flex flex-col items-start justify-between gap-4 border-b border-slate-200 pb-6 sm:flex-row sm:items-center">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Prize Template Library</h2>
          <p className="mt-0.5 text-xs text-slate-500">Define reusable vouchers, data passes, and branded physical rewards.</p>
        </div>
        <button
          type="button"
          onClick={() => (showCreator && !editingTemplate ? setShowCreator(false) : openCreator())}
          className="touch-target inline-flex min-h-12 items-center gap-2 rounded-xl bg-indigo-600 px-5 py-3 text-xs font-bold text-white shadow-sm transition-all hover:bg-indigo-700"
        >
          <Plus className="h-5 w-5" />
          <span>{showCreator && !editingTemplate ? 'Hide Creator' : 'Add Custom Reward'}</span>
        </button>
      </div>

      {pageMessage ? <Phase2InlineNotice tone="success">{pageMessage}</Phase2InlineNotice> : null}
      {pageError ? <Phase2InlineNotice tone="danger">{pageError}</Phase2InlineNotice> : null}
      {error ? <Phase2InlineNotice tone="danger">{error}</Phase2InlineNotice> : null}

      {showCreator ? (
        <form onSubmit={handleSubmit} className="space-y-4 rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <h3 className="flex items-center gap-2 text-sm font-bold text-indigo-700">
              <Sparkles className="h-4 w-4 text-indigo-600" />
              <span>{editingTemplate ? 'Edit Reusable Reward Template' : 'Create Reusable Reward Template'}</span>
            </h3>
            <button
              type="button"
              onClick={closeCreator}
              className="rounded-xl border border-slate-200 bg-slate-50 p-2 text-slate-500 transition hover:border-slate-300 hover:text-slate-900"
              aria-label="Close reward creator"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          {formError ? <Phase2InlineNotice tone="danger">{formError}</Phase2InlineNotice> : null}

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Reward Name</label>
              <input
                type="text"
                placeholder="e.g. Ruiba Juice Bottle - Slim Lemon"
                value={formData.name}
                onChange={(event) => setFormData((prev) => ({ ...prev, name: event.target.value }))}
                className="touch-target min-h-11 rounded-xl border border-slate-200 px-4 text-xs text-slate-800 outline-none transition hover:border-slate-400 focus:border-indigo-500"
                required
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Category</label>
              <div className="grid grid-cols-2 gap-3">
                {(['voucher', 'physical'] as const).map((category) => (
                  <button
                    key={category}
                    type="button"
                    onClick={() => setFormData((prev) => ({ ...prev, category }))}
                    className={`min-h-11 rounded-xl border px-1 py-2 text-center text-xs transition-all ${
                      formData.category === category
                        ? 'border-indigo-500 bg-indigo-50 font-bold text-indigo-700'
                        : 'border-slate-200 bg-white text-slate-500 hover:bg-slate-50'
                    }`}
                  >
                    {category === 'voucher' ? 'Digital Voucher / Code' : 'Physical Item / Merch'}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Total Warehouse Stock</label>
              <input
                type="number"
                min={editingTemplate?.reserved_quantity ?? 0}
                value={formData.stock_quantity}
                onChange={(event) => setFormData((prev) => ({ ...prev, stock_quantity: Number(event.target.value || 0) }))}
                className="touch-target min-h-11 rounded-xl border border-slate-200 px-4 text-xs text-slate-800 outline-none transition hover:border-slate-400 focus:border-indigo-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Template Preview Status</label>
              <div className="min-h-11 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-xs text-slate-500">
                {editingTemplate ? `Reserved already: ${editingTemplate.reserved_quantity}` : 'New reusable template'}
              </div>
            </div>

            <div className="col-span-full flex flex-col gap-1.5">
              <label className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Redemption Instructions for Consumers</label>
              <textarea
                placeholder="How do players claim this prize? E.g. present coupon code to any partner branch."
                value={formData.description}
                onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
                className="min-h-20 rounded-xl border border-slate-200 p-4 text-xs text-slate-800 outline-none transition hover:border-slate-400 focus:border-indigo-500"
              />
            </div>
          </div>

          <ImageUploader
            value={formData.image_url}
            onChange={(url) => setFormData((prev) => ({ ...prev, image_url: url }))}
            folder="prizes"
            label="Prize image"
          />

          <div className="flex justify-end gap-2.5 pt-2">
            <button type="button" onClick={closeCreator} className="px-4 text-xs text-slate-500 transition hover:text-slate-800">
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting || !formData.name.trim() || formData.stock_quantity < 0}
              className="rounded-xl bg-indigo-600 px-5 py-2.5 text-xs font-bold text-white transition-all hover:bg-indigo-700 disabled:cursor-not-allowed disabled:bg-slate-300"
            >
              {submitting ? (
                <span className="inline-flex items-center gap-2">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Saving...
                </span>
              ) : editingTemplate ? (
                'Update Library Template'
              ) : (
                'Save to Library'
              )}
            </button>
          </div>
        </form>
      ) : null}

      <div className="relative max-w-md">
        <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Filter rewards by title or category..."
          value={searchQuery}
          onChange={(event) => setSearchQuery(event.target.value)}
          className="min-h-[44px] w-full rounded-xl border border-slate-200 bg-white pl-10 pr-4 text-xs text-slate-800 outline-none transition-all duration-200 placeholder:text-slate-400 hover:border-slate-400 focus:border-indigo-500"
        />
      </div>

      {loading ? (
        <div className="flex h-64 items-center justify-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-indigo-600 border-t-transparent" />
        </div>
      ) : rewardCards.length === 0 ? (
        <div className="col-span-full rounded-3xl border border-slate-200 bg-white py-12 text-center">
          <Gift className="mx-auto mb-2 h-8 w-8 text-slate-400" />
          <h4 className="text-sm font-bold text-slate-700">No matching templates found</h4>
          <p className="mt-1 text-[11px] text-slate-500">Try refining your search terms or create a custom reward.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {rewardCards.map((card) => {
            const template = filteredTemplates.find((item) => item.id === card.id);
            if (!template) return null;

            return (
              <div
                key={card.id}
                className="flex flex-col justify-between rounded-3xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-slate-400 hover:shadow"
              >
                <div>
                  <div className="mb-3 flex items-start justify-between">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[9px] font-bold uppercase ${
                        card.category === 'voucher'
                          ? 'border-indigo-100 bg-indigo-50 text-indigo-700'
                          : 'border-emerald-100 bg-emerald-50 text-emerald-700'
                      }`}
                    >
                      {card.category}
                    </span>
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        onClick={() => openCreator(template)}
                        className="rounded-lg border border-slate-200 bg-slate-50 p-2 text-slate-600 transition hover:bg-slate-100"
                        aria-label={`Edit ${card.name}`}
                      >
                        <Edit className="h-4 w-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => void handleDelete(template)}
                        className="rounded-lg border border-rose-200 bg-rose-50 p-2 text-rose-600 transition hover:bg-rose-100"
                        aria-label={`Delete ${card.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </div>

                  <h4 className="text-sm font-extrabold text-slate-800">{card.name}</h4>
                  <p className="mt-1.5 text-[11px] leading-relaxed text-slate-500">{card.description || 'No description yet.'}</p>
                </div>

                <div className="mt-4 border-t border-slate-100 pt-4 space-y-2">
                  <div className="flex justify-between text-[10px]">
                    <span className="text-slate-400">Warehouse Stocks:</span>
                    <span className="font-bold text-slate-700">
                      {card.availableStock} / {card.totalStock} available
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
                    <div
                      className={`${card.availableStock < 5 ? 'bg-amber-500' : 'bg-indigo-600'} h-full`}
                      style={{ width: `${Math.max(0, Math.min(100, (card.availableStock / Math.max(card.totalStock, 1)) * 100))}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-between text-[10px] pt-1">
                    <span className="text-slate-500">Reserved: <strong className="text-slate-700">{card.reservedStock}</strong></span>
                    <span className="text-slate-500">Status: <strong className="text-slate-700">{card.stockHealthLabel}</strong></span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
