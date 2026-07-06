import React, { useState } from 'react';
import { PrizeTemplate } from '../types';
import { Plus, Gift, Check, Trash2, Search, Sliders, HardDrive, Sparkles } from 'lucide-react';
import { motion } from 'motion/react';

interface PrizesManagerProps {
  prizes: PrizeTemplate[];
  onAddPrize: (newPrize: Omit<PrizeTemplate, 'id' | 'allocatedStock' | 'availableStock'>) => Promise<void>;
}

export const PrizesManager: React.FC<PrizesManagerProps> = ({ prizes, onAddPrize }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreator, setShowCreator] = useState(false);

  // Form Fields
  const [name, setName] = useState('');
  const [category, setCategory] = useState<'voucher' | 'physical'>('voucher');
  const [description, setDescription] = useState('');
  const [itemValue, setItemValue] = useState('');
  const [totalStock, setTotalStock] = useState(100);

  // Async form state
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !itemValue.trim()) return;

    setSubmitting(true);
    setFormError(null);
    try {
      await onAddPrize({
        name: name.trim(),
        category,
        description: description.trim(),
        itemValue: itemValue.trim(),
        totalStock,
      });
      // Only reset + close on success
      setName('');
      setDescription('');
      setItemValue('');
      setTotalStock(100);
      setShowCreator(false);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Failed to create prize. Please try again.';
      setFormError(msg);
    } finally {
      setSubmitting(false);
    }
  };

  const filteredPrizes = prizes.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="prizes-manager-root" className="space-y-6 text-slate-800">
      
      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Prize Template Library</h2>
          <p className="text-slate-500 text-xs mt-0.5">Define reusable vouchers, data passes, and branded physical rewards.</p>
        </div>
        <button
          onClick={() => setShowCreator(!showCreator)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-3 rounded-xl font-bold flex items-center gap-2 transition-all shadow-sm cursor-pointer min-h-12 text-xs"
        >
          <Plus className="w-5 h-5" />
          <span>Add Custom Reward</span>
        </button>
      </div>

      {/* Prize Creator Form */}
      {showCreator && (
        <motion.form 
          initial={{ opacity: 0, height: 0 }} 
          animate={{ opacity: 1, height: 'auto' }}
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-3xl p-6 space-y-4 shadow-sm"
        >
          <h3 className="font-bold text-sm text-indigo-700 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-indigo-600" />
            <span>Create Reusable Reward Template</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Reward Name</label>
              <input
                type="text"
                placeholder="e.g. Ruiba Juice Bottle - Slim Lemon"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 rounded-xl px-4 text-xs text-slate-800 min-h-11 focus:outline-none"
                required
              />
            </div>

            {/* Value */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Display Value / Face Value</label>
              <input
                type="text"
                placeholder="e.g. 1500 DA, 5 GB Pass, Juice Bottle"
                value={itemValue}
                onChange={(e) => setItemValue(e.target.value)}
                className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 rounded-xl px-4 text-xs text-slate-800 min-h-11 focus:outline-none"
                required
              />
              <p className="text-[10px] text-slate-400">
                Individual voucher codes or physical item references are prepared later inside Stock Room for each template.
              </p>
            </div>

            {/* Category Select */}
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

            {/* Initial Stock */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Total Warehouse Stock</label>
              <input
                type="number"
                min="10"
                max="100000"
                value={totalStock}
                onChange={(e) => setTotalStock(Number(e.target.value))}
                className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 rounded-xl px-4 text-xs text-slate-800 min-h-11 focus:outline-none font-mono"
              />
            </div>

            {/* Description */}
            <div className="col-span-full flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Redemption Instructions for Consumers</label>
              <textarea
                placeholder="How do players claim this prize? E.g. present coupon code to any partner agent branch."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 rounded-xl p-4 text-xs text-slate-800 min-h-20 focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-col gap-3 pt-2">
            {formError && (
              <div className="p-3 bg-red-50 border border-red-200 text-red-700 rounded-xl text-xs font-semibold flex items-center gap-2">
                <span>⚠️ {formError}</span>
              </div>
            )}
            <div className="flex justify-end gap-2.5">
              <button
                type="button"
                onClick={() => { setShowCreator(false); setFormError(null); }}
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
                {submitting && <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />}
                <span>{submitting ? 'Saving...' : 'Save to Library'}</span>
              </button>
            </div>
          </div>
        </motion.form>
      )}

      {/* Search Filter */}
      <div className="relative max-w-md">
        <Search className="absolute left-3.5 w-4 h-4 text-slate-400 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Filter rewards by title or category..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full bg-white border border-slate-200 hover:border-slate-450 focus:border-indigo-500 rounded-xl pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 transition-all duration-200 min-h-[44px] focus:outline-none"
        />
      </div>

      {/* Prize Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
        {filteredPrizes.map((prize) => (
          <div
            key={prize.id}
            className="bg-white border border-slate-200 rounded-3xl p-5 shadow-sm hover:shadow hover:border-slate-400 transition-all duration-300 flex flex-col justify-between"
          >
            <div>
              <div className="flex justify-between items-start mb-3">
                <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                  prize.category === 'voucher' 
                    ? 'bg-indigo-50 border-indigo-100 text-indigo-700' 
                    : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                }`}>
                  {prize.category}
                </span>
                <span className="text-xs font-extrabold text-indigo-600 font-mono">
                  {prize.itemValue}
                </span>
              </div>

              <h4 className="font-extrabold text-sm text-slate-800">{prize.name}</h4>
              <p className="text-[11px] text-slate-500 mt-1.5 leading-relaxed">
                {prize.description}
              </p>
            </div>

            {/* Mini Stock Status Indicator */}
            <div className="border-t border-slate-100 pt-4 mt-4 space-y-2">
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400">Prepared item values:</span>
                <span className="text-slate-700 font-bold">{prize.filledValuesCount ?? 0} / {prize.totalStock}</span>
              </div>
              <div className="flex justify-between text-[10px] font-mono">
                <span className="text-slate-400">Warehouse Stocks:</span>
                <span className="text-slate-700 font-bold">{prize.availableStock} / {prize.totalStock} available</span>
              </div>
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div 
                  className={`h-full ${prize.availableStock < 50 ? 'bg-amber-500' : 'bg-indigo-600'}`}
                  style={{ width: `${(prize.availableStock / prize.totalStock) * 100}%` }}
                />
              </div>
            </div>

          </div>
        ))}

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
