import React, { useState, useRef } from 'react';
import { PrizeTemplate } from '../types';
import { 
  Database, Upload, Download, Search, AlertTriangle, 
  Check, RefreshCw, Plus, Minus, Layers, Box, Calendar, Lock, ShieldCheck, 
  Settings, HelpCircle, LayoutGrid, List
} from 'lucide-react';
import { motion } from 'motion/react';

interface InventoryManagerProps {
  prizes: PrizeTemplate[];
  onUpdateStock: (id: string, amount: number) => void;
  onBulkUpload: (parsedPrizes: { id: string; additionalStock: number }[]) => void;
}

export const InventoryManager: React.FC<InventoryManagerProps> = ({
  prizes,
  onUpdateStock,
  onBulkUpload
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [adjustments, setAdjustments] = useState<Record<string, string>>({});
  const [dragActive, setDragActive] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [viewMode, setViewMode] = useState<'grid' | 'table'>('grid');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Calculate high-level metrics for operators
  const totalStockInPool = prizes.reduce((acc, p) => acc + p.totalStock, 0);
  const totalAllocated = prizes.reduce((acc, p) => acc + p.allocatedStock, 0);
  const totalAvailable = prizes.reduce((acc, p) => acc + p.availableStock, 0);
  const lowStockCount = prizes.filter(p => p.availableStock < 50).length;

  const handleAdjustStock = (id: string, isIncrement: boolean = true) => {
    const rawValue = adjustments[id];
    const amount = parseInt(rawValue, 10);
    if (isNaN(amount) || amount <= 0) return;

    // Call upstream state modifier
    const finalAmount = isIncrement ? amount : -amount;
    onUpdateStock(id, finalAmount);
    
    setAdjustments({
      ...adjustments,
      [id]: ''
    });

    setSuccessMsg(`Successfully adjusted stock by ${finalAmount > 0 ? '+' : ''}${finalAmount} units!`);
    setTimeout(() => setSuccessMsg(''), 3500);
  };

  // Mock CSV File download for easy template creation
  const handleDownloadTemplate = () => {
    const csvContent = "data:text/csv;charset=utf-8,Prize_ID,Prize_Name,Additional_Stock\n" + 
      prizes.map(p => `${p.id},"${p.name}",100`).join("\n");
    const encodedUri = encodeURI(csvContent);
    const link = document.createElement("a");
    link.setAttribute("href", encodedUri);
    link.setAttribute("download", "dzengage_inventory_template.csv");
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Drag and drop handler
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      triggerBulkMockUpload();
    }
  };

  const triggerBulkMockUpload = () => {
    // Generate simulated stock addition for all items
    const parsed = prizes.map(p => ({
      id: p.id,
      additionalStock: 250
    }));
    onBulkUpload(parsed);
    setSuccessMsg('Bulk CSV parsed successfully! Loaded +250 items to all rewards.');
    setTimeout(() => setSuccessMsg(''), 4000);
  };

  const filteredPrizes = prizes.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.category.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.itemValue.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div id="inventory-manager-root" className="space-y-6 text-slate-800">
      
      {/* COPILOT INTEGRATION ADVISORY DECK */}
      <div className="bg-indigo-900 text-slate-100 p-4 rounded-3xl shadow-md border border-indigo-950 flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <span className="text-[10px] font-mono font-bold bg-indigo-800 text-indigo-200 px-2 py-0.5 rounded-full uppercase tracking-widest">GitHub Copilot Readiness</span>
          <h2 className="text-sm font-extrabold mt-1 text-white">Platform Database Sync Guides</h2>
          <p className="text-xs text-slate-300 max-w-2xl mt-0.5">
            This component maps directly to the <code className="text-white font-mono bg-indigo-950 px-1 py-0.5 rounded text-[10px]">prize_templates</code> table and standardizes stock allocation checks before active campaigns launch.
          </p>
        </div>
        <div className="flex gap-2 shrink-0">
          <span className="text-[10px] font-mono font-bold bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 px-3 py-1.5 rounded-xl flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5" />
            <span>Ready for Integration</span>
          </span>
        </div>
      </div>

      {/* Header section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 border-b border-slate-200 pb-6">
        <div>
          <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Stock Room & Voucher Vault</h2>
          <p className="text-slate-500 text-xs mt-0.5">Control live warehouse metrics, allocate safe limits, and parse bulk restocks.</p>
        </div>

        {/* View Mode & Actions Group */}
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setViewMode('grid')}
              className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'grid' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Grid View"
            >
              <LayoutGrid className="w-4 h-4" />
              <span className="hidden md:inline">Visual Cards</span>
            </button>
            <button
              onClick={() => setViewMode('table')}
              className={`p-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                viewMode === 'table' 
                  ? 'bg-white text-slate-800 shadow-sm' 
                  : 'text-slate-500 hover:text-slate-800'
              }`}
              title="Table View"
            >
              <List className="w-4 h-4" />
              <span className="hidden md:inline">Compact Table</span>
            </button>
          </div>
        </div>
      </div>

      {/* Success notifier banner */}
      {successMsg && (
        <motion.div 
          initial={{ opacity: 0, y: -10 }} 
          animate={{ opacity: 1, y: 0 }} 
          className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-850 rounded-2xl text-xs font-semibold flex items-center gap-2 shadow-sm"
        >
          <Check className="w-4.5 h-4.5 text-emerald-600 shrink-0 animate-bounce" />
          <span>{successMsg}</span>
        </motion.div>
      )}

      {/* STUNNING BENTO GRID METRICS BLOCK */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        
        {/* Total Stock pool */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest">Total Stock Pool</span>
            <div className="p-2 bg-indigo-50 rounded-lg text-indigo-600">
              <Box className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-3xl font-black mt-3 mb-1 text-slate-900">{totalStockInPool.toLocaleString()}</h4>
          <p className="text-[11px] text-slate-500">Cumulative coupon/physical pool</p>
        </div>

        {/* Reserved Stock */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest">Reserved in Active Campaigns</span>
            <div className="p-2 bg-amber-50 rounded-lg text-amber-600">
              <Lock className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-3xl font-black mt-3 mb-1 text-amber-700">{totalAllocated.toLocaleString()}</h4>
          <p className="text-[11px] text-slate-500">Committed to wheels & prize pools</p>
        </div>

        {/* Ready & Available */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest">Ready & Available</span>
            <div className="p-2 bg-emerald-50 rounded-lg text-emerald-600">
              <ShieldCheck className="w-4 h-4" />
            </div>
          </div>
          <h4 className="text-3xl font-black mt-3 mb-1 text-emerald-700">{totalAvailable.toLocaleString()}</h4>
          <p className="text-[11px] text-slate-500">Unallocated stock ready for use</p>
        </div>

        {/* Low Stock Indicators */}
        <div className="bg-white border border-slate-200 rounded-[24px] p-5 shadow-sm hover:shadow-md transition-shadow">
          <div className="flex justify-between items-start">
            <span className="text-[9px] font-bold font-mono text-slate-400 uppercase tracking-widest">Refill Warnings</span>
            <div className={`p-2 rounded-lg ${lowStockCount > 0 ? 'bg-rose-50 text-rose-600 animate-pulse' : 'bg-slate-50 text-slate-400'}`}>
              <AlertTriangle className="w-4 h-4" />
            </div>
          </div>
          <h4 className={`text-3xl font-black mt-3 mb-1 ${lowStockCount > 0 ? 'text-rose-600' : 'text-slate-900'}`}>
            {lowStockCount}
          </h4>
          <p className="text-[11px] text-slate-500">Items with available stock &lt; 50</p>
        </div>

      </div>

      {/* Main Stock layout & restock engine split */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left 2 Cols: Items & Actions */}
        <div className="lg:col-span-2 space-y-4">
          
          {/* Controls Bar */}
          <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="relative w-full">
              <Search className="absolute left-3.5 w-4 h-4 text-slate-400 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search templates by name, value, category..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full bg-white border border-slate-200 hover:border-slate-400 focus:border-indigo-500 rounded-xl pl-10 pr-4 text-xs text-slate-800 placeholder-slate-400 transition-all duration-200 min-h-[44px] focus:outline-none focus:ring-1 focus:ring-indigo-550/20"
              />
            </div>
          </div>

          {/* GRID CARDS VIEW */}
          {viewMode === 'grid' && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {filteredPrizes.map((p) => {
                const isLow = p.availableStock < 50;
                const reservedPct = p.totalStock > 0 ? (p.allocatedStock / p.totalStock) * 100 : 0;
                const availablePct = p.totalStock > 0 ? (p.availableStock / p.totalStock) * 100 : 0;
                
                return (
                  <div 
                    key={p.id}
                    className={`bg-white border rounded-3xl p-5 shadow-sm flex flex-col justify-between transition-all duration-300 hover:shadow-md ${
                      isLow ? 'border-amber-250 ring-2 ring-amber-500/5' : 'border-slate-200 hover:border-slate-350'
                    }`}
                  >
                    <div>
                      {/* Badge and title */}
                      <div className="flex justify-between items-start gap-2 mb-3">
                        <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-mono font-bold uppercase border ${
                          p.category === 'voucher' 
                            ? 'bg-indigo-50 border-indigo-100 text-indigo-700' 
                            : 'bg-emerald-50 border-emerald-100 text-emerald-700'
                        }`}>
                          {p.category}
                        </span>
                        <span className="text-xs font-black text-indigo-650 font-mono">
                          {p.itemValue}
                        </span>
                      </div>

                      <h4 className="font-extrabold text-sm text-slate-800 leading-tight">{p.name}</h4>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">Template ID: {p.id}</p>
                      
                      <p className="text-[11px] text-slate-500 mt-2 leading-relaxed line-clamp-2">
                        {p.description}
                      </p>
                    </div>

                    {/* Stock Split Visual Bar */}
                    <div className="mt-4 pt-3 border-t border-slate-100 space-y-2">
                      <div className="flex justify-between text-[10px] font-mono">
                        <span className="text-slate-400">Inventory Distribution:</span>
                        <span className="text-slate-700 font-bold">Total: {p.totalStock}</span>
                      </div>
                      
                      {/* Segmented bar */}
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden flex">
                        <div 
                          title={`Reserved in campaigns: ${p.allocatedStock}`}
                          className="bg-amber-500 h-full"
                          style={{ width: `${reservedPct}%` }}
                        />
                        <div 
                          title={`Available for new spin allocation: ${p.availableStock}`}
                          className="bg-indigo-600 h-full"
                          style={{ width: `${availablePct}%` }}
                        />
                      </div>

                      {/* Legend and micro-counters */}
                      <div className="grid grid-cols-2 gap-1.5 text-[10px] pt-1">
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-500 shrink-0" />
                          <span className="text-slate-500 font-mono">Reserved: <strong className="text-slate-700 font-semibold">{p.allocatedStock}</strong></span>
                        </div>
                        <div className="flex items-center gap-1">
                          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 shrink-0" />
                          <span className="text-slate-500 font-mono">Available: <strong className="text-slate-700 font-semibold">{p.availableStock}</strong></span>
                        </div>
                      </div>

                      {/* Status Warnings */}
                      <div className="pt-2 flex justify-between items-center">
                        {isLow ? (
                          <span className="text-[9px] font-bold text-amber-600 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded flex items-center gap-1 animate-pulse">
                            <AlertTriangle className="w-3 h-3" />
                            <span>Sparing stocks</span>
                          </span>
                        ) : (
                          <span className="text-[9px] font-bold text-emerald-600 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded flex items-center gap-1">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Ready &amp; Loaded</span>
                          </span>
                        )}

                        {/* Adjust Stocks widget inline */}
                        <div className="flex items-center gap-1">
                          <input
                            type="number"
                            min="1"
                            placeholder="Qty"
                            value={adjustments[p.id] || ''}
                            onChange={(e) => setAdjustments({
                              ...adjustments,
                              [p.id]: e.target.value
                            })}
                            className="w-12 bg-white border border-slate-250 hover:border-slate-400 rounded-lg py-1 px-1.5 text-center text-[10px] font-mono focus:outline-none focus:ring-1 focus:ring-indigo-500"
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

                    </div>
                  </div>
                );
              })}

              {filteredPrizes.length === 0 && (
                <div className="col-span-full text-center py-12 bg-white border border-slate-200 rounded-[32px]">
                  <Database className="w-8 h-8 text-slate-300 mx-auto mb-2 animate-bounce" />
                  <h4 className="text-sm font-bold text-slate-800">No matching stocks found</h4>
                  <p className="text-[11px] text-slate-500 mt-1">Try refining your search text or clear filters.</p>
                </div>
              )}
            </div>
          )}

          {/* COMPACT TABLE VIEW */}
          {viewMode === 'table' && (
            <div className="bg-white border border-slate-200 rounded-[32px] p-6 shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-slate-150 text-[10px] font-mono text-slate-400 uppercase pb-3">
                      <th className="pb-3 pl-1 font-semibold">Reward Title</th>
                      <th className="pb-3 font-semibold text-center">Category</th>
                      <th className="pb-3 font-semibold text-center">Value</th>
                      <th className="pb-3 font-semibold text-center">Reserved</th>
                      <th className="pb-3 font-semibold text-center">Available Stock</th>
                      <th className="pb-3 font-semibold text-right">Supply Actions</th>
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
                          <td className="py-3.5 font-mono text-center text-slate-800 font-bold">{p.itemValue}</td>
                          <td className="py-3.5 font-mono text-center text-slate-500">{p.allocatedStock} allocated</td>
                          <td className="py-3.5 text-center">
                            <span className={`inline-flex items-center gap-1.5 font-bold font-mono ${isLow ? 'text-amber-600' : 'text-slate-700'}`}>
                              {isLow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 animate-pulse" />}
                              <span>{p.availableStock} / {p.totalStock} items</span>
                            </span>
                          </td>
                          <td className="py-3.5 text-right">
                            <div className="flex items-center gap-1 justify-end">
                              <input
                                type="number"
                                min="1"
                                placeholder="+/-"
                                value={adjustments[p.id] || ''}
                                onChange={(e) => setAdjustments({
                                  ...adjustments,
                                  [p.id]: e.target.value
                                })}
                                className="w-14 bg-white border border-slate-250 hover:border-slate-400 rounded-lg py-1 text-center text-[11px] focus:outline-none"
                              />
                              <button
                                onClick={() => handleAdjustStock(p.id, true)}
                                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-700 p-1.5 rounded-lg transition-colors cursor-pointer"
                                title="Restock"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => handleAdjustStock(p.id, false)}
                                className="bg-slate-50 hover:bg-slate-100 border border-slate-250 text-slate-600 p-1.5 rounded-lg transition-colors cursor-pointer"
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

        {/* Right 1 Col: Drag-n-drop Bulk Simulator */}
        <div className="space-y-6">
          
          {/* File Upload card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-sm text-slate-800 flex items-center gap-2">
              <Database className="w-4 h-4 text-indigo-650" />
              <span>Bulk Restock Engine</span>
            </h3>

            <p className="text-[11px] text-slate-500 leading-relaxed">
              Restock thousands of Flexy passes or Yassir discount coupons via bulk CSV upload. Download the standard CSV format template first.
            </p>

            {/* Drag & Drop Box */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-[24px] p-6 text-center cursor-pointer transition-all ${
                dragActive 
                  ? 'border-indigo-500 bg-indigo-50' 
                  : 'border-slate-200 hover:border-slate-400 bg-slate-50/50'
              }`}
            >
              <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2 animate-bounce" />
              <p className="text-xs font-bold text-slate-700">Drag & Drop CSV File here</p>
              <p className="text-[10px] text-slate-400 mt-1">or click to browse local folders</p>
              
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={triggerBulkMockUpload}
              />
            </div>

            {/* Template Buttons */}
            <div className="grid grid-cols-2 gap-2">
              <button
                onClick={handleDownloadTemplate}
                className="bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Template CSV</span>
              </button>
              <button
                onClick={triggerBulkMockUpload}
                className="bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 text-indigo-750 py-2.5 rounded-xl text-[10px] font-bold flex items-center justify-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5 animate-spin-slow" />
                <span>Simulate Restock</span>
              </button>
            </div>
          </div>

          {/* Database & Copilot Integration Tips Box */}
          <div className="bg-slate-50 border border-slate-150 rounded-[28px] p-5 shadow-sm space-y-3">
            <span className="font-extrabold text-xs text-slate-800 flex items-center gap-1.5">
              <Settings className="w-4 h-4 text-slate-500" />
              <span>Copilot REST API Integration Notes</span>
            </span>
            <div className="text-[11px] text-slate-500 leading-normal space-y-2">
              <p>
                When connecting your database logic, utilize these schemas in Copilot:
              </p>
              <ul className="space-y-1.5 list-disc pl-4 font-sans">
                <li>
                  <strong className="text-slate-700">prize_templates</strong>: Core attributes (<code className="font-mono bg-slate-200 px-1 py-0.2 rounded text-[10px]">id</code>, <code className="font-mono bg-slate-200 px-1 py-0.2 rounded text-[10px]">name</code>, <code className="font-mono bg-slate-200 px-1 py-0.2 rounded text-[10px]">category</code>).
                </li>
                <li>
                  <strong className="text-slate-700">prize_template_items</strong>: Contains actual unique pre-generated voucher strings (e.g. coupon keys, Flexy pins). Available stock can be computed as:
                  <pre className="bg-slate-900 text-slate-100 p-1.5 rounded font-mono text-[9px] mt-1 overflow-x-auto">
{`SELECT COUNT(*) FROM prize_template_items 
WHERE template_id = ? AND is_redeemed = FALSE`}
                  </pre>
                </li>
                <li>
                  <strong className="text-slate-700">prize_inventory</strong>: Tracks total committed quotas to specific active campaigns to avoid overdrawing live funds.
                </li>
              </ul>
              <div className="p-2.5 bg-indigo-50 border border-indigo-100 rounded-xl text-indigo-850 mt-2">
                <strong>Algorihmic Safe Guard:</strong> Phone number validations and duplicate filters ensure over-distribution never triggers, respecting local Loi 18-07 privacy checkguards.
              </div>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
};
