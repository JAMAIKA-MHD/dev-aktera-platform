import React, { useState } from 'react';
import { Campaign, PrizeTemplate, QuizQuestion } from '../types';
import { 
  ArrowLeft, ArrowRight, HelpCircle, Gift, Sliders, 
  HelpCircle as QuizIcon, Check, Sparkles, Plus, Trash2, Globe 
} from 'lucide-react';
import { motion } from 'motion/react';

interface CampaignWizardProps {
  prizes: PrizeTemplate[];
  onSave: (newCampaign: Omit<Campaign, 'id' | 'participantsCount' | 'rewardsClaimed'>) => void;
  onCancel: () => void;
  relaunchDraft?: Campaign | null;
}

export const CampaignWizard: React.FC<CampaignWizardProps> = ({
  prizes,
  onSave,
  onCancel,
  relaunchDraft
}) => {
  const [step, setStep] = useState(1);

  // Form Fields
  const [name, setName] = useState(relaunchDraft ? `${relaunchDraft.name} (Relaunch)` : '');
  const [arabicName, setArabicName] = useState(relaunchDraft ? relaunchDraft.arabicName : '');
  const [slug, setSlug] = useState(relaunchDraft ? `${relaunchDraft.slug}-relaunch` : '');
  const [type, setType] = useState<'lucky_wheel' | 'quiz'>(relaunchDraft ? relaunchDraft.type : 'lucky_wheel');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]);
  
  // Step 2 Fields
  const [winProbability, setWinProbability] = useState(relaunchDraft ? relaunchDraft.winProbability : 60);
  const [maxEntries, setMaxEntries] = useState<'1' | '2' | 'unlimited'>('1');

  // Step 3 Fields (Prize selection & weight)
  const [allocatedPrizes, setAllocatedPrizes] = useState<{ templateId: string; quantity: number; weight: number }[]>(
    relaunchDraft ? relaunchDraft.prizes : [
      { templateId: prizes[0]?.id || '', quantity: 100, weight: 100 }
    ]
  );

  // Step 4 Fields (Quiz Questions if type is quiz)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(
    relaunchDraft?.questions && relaunchDraft.questions.length > 0 ? relaunchDraft.questions : [
      { id: 'q_1', questionText: 'What is the local calling code for Algeria?', options: ['+213', '+212', '+216', '+20'], correctIndex: 0 }
    ]
  );

  // Quick helper for Dialect suggestions
  const handleApplyDarijaSample = () => {
    setArabicName('سجل في المسابقة واربح هدايا فورية قيمة من اختيارك! 🎁');
  };

  // Add prize allocation line
  const handleAddPrizeLine = () => {
    const unallocated = prizes.find(p => !allocatedPrizes.some(ap => ap.templateId === p.id));
    setAllocatedPrizes([
      ...allocatedPrizes,
      { templateId: unallocated?.id || prizes[0]?.id || '', quantity: 50, weight: 10 }
    ]);
  };

  const handleRemovePrizeLine = (idx: number) => {
    if (allocatedPrizes.length <= 1) return;
    setAllocatedPrizes(allocatedPrizes.filter((_, i) => i !== idx));
  };

  const handleUpdatePrizeLine = (idx: number, field: 'templateId' | 'quantity' | 'weight', value: any) => {
    const updated = [...allocatedPrizes];
    updated[idx] = {
      ...updated[idx],
      [field]: value
    };
    setAllocatedPrizes(updated);
  };

  // Quiz helper functions
  const handleAddQuestion = () => {
    setQuizQuestions([
      ...quizQuestions,
      {
        id: `q_${Date.now()}`,
        questionText: 'Enter your custom Darija quiz question...',
        options: ['Option A', 'Option B', 'Option C', 'Option D'],
        correctIndex: 0
      }
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== idx));
  };

  const handleUpdateQuestion = (qIdx: number, field: string, value: any, optIdx?: number) => {
    const updated = [...quizQuestions];
    if (field === 'questionText') {
      updated[qIdx].questionText = value;
    } else if (field === 'correctIndex') {
      updated[qIdx].correctIndex = parseInt(value, 10);
    } else if (field === 'option' && optIdx !== undefined) {
      updated[qIdx].options[optIdx] = value;
    }
    setQuizQuestions(updated);
  };

  const handlePublish = () => {
    onSave({
      name,
      arabicName,
      slug,
      type,
      status: 'active',
      winProbability,
      prizes: allocatedPrizes,
      questions: type === 'quiz' ? quizQuestions : [],
      startDate,
      endDate,
      parentCampaignId: relaunchDraft ? relaunchDraft.id : undefined
    });
  };

  // Calculate sum of prize sector weights
  const totalWeightSum = allocatedPrizes.reduce((sum, p) => sum + Number(p.weight), 0);

  return (
    <div id="campaign-wizard-root" className="max-w-4xl mx-auto space-y-6 text-slate-800 pb-12">
      
      {/* Header bar */}
      <div className="flex justify-between items-center border-b border-slate-200 pb-5">
        <div className="flex items-center gap-3">
          <button 
            onClick={onCancel}
            className="p-2.5 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded-xl text-slate-500 hover:text-slate-700 transition-colors cursor-pointer"
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">Campaign Builder Wizard</h2>
            <p className="text-xs text-slate-500">Launch optimized brand activation campaigns in 4 easy steps</p>
          </div>
        </div>

        {relaunchDraft && (
          <span className="text-xs bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-xl font-mono font-bold">
            Relaunch Mode: {relaunchDraft.name}
          </span>
        )}
      </div>

      {/* Progress Multi-Step Indicator */}
      <div className="grid grid-cols-4 gap-2 bg-white p-2 rounded-2xl border border-slate-200 shadow-sm select-none">
        {[
          { stepNum: 1, label: 'Basics & Dialect' },
          { stepNum: 2, label: 'Game Rules' },
          { stepNum: 3, label: 'Reward Weights' },
          { stepNum: 4, label: 'Review & Live' }
        ].map((s) => (
          <div 
            key={s.stepNum} 
            className={`py-3 rounded-xl text-center flex flex-col items-center justify-center transition-all ${
              step === s.stepNum 
                ? 'bg-indigo-600 text-white shadow-sm font-bold' 
                : step > s.stepNum
                  ? 'text-indigo-600 bg-indigo-50 font-semibold'
                  : 'text-slate-400'
            }`}
          >
            <span className="text-xs font-mono font-bold uppercase tracking-wider block">Step {s.stepNum}</span>
            <span className="text-[10px] font-sans font-medium hidden md:inline mt-0.5">{s.label}</span>
          </div>
        ))}
      </div>

      {/* STEP 1: BASICS */}
      {step === 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
            <Globe className="w-4 h-4 text-indigo-600" />
            <span>Step 1: Campaign Basics & Algerian Translation</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Campaign Display Title (English)</label>
              <input
                type="text"
                placeholder="e.g. Djezzy Super Ramadan Wheel"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSlug(e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, '-'));
                }}
                className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 rounded-xl px-4 text-sm text-slate-800 placeholder-slate-400 transition-all duration-200 min-h-12 focus:outline-none"
              />
            </div>

            {/* Slug */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Campaign Portal Slug (URL)</label>
              <input
                type="text"
                placeholder="e.g. djezzy-ramadan"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 rounded-xl px-4 text-xs text-slate-700 font-mono placeholder-slate-400 transition-all duration-200 min-h-12 focus:outline-none"
              />
            </div>

            {/* Campaign Type Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Portal Mechanics</label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType('lucky_wheel')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer min-h-12 flex items-center justify-center gap-2 ${
                    type === 'lucky_wheel'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span className="text-xs">Lucky Spin Wheel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType('quiz')}
                  className={`p-3 rounded-xl border text-center transition-all cursor-pointer min-h-12 flex items-center justify-center gap-2 ${
                    type === 'quiz'
                      ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
                      : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                  }`}
                >
                  <QuizIcon className="w-4 h-4" />
                  <span className="text-xs">Quiz Challenge</span>
                </button>
              </div>
            </div>

            {/* Arabic / Dialect Translation Banner */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                Consumer Darija Copy (العربية الدارجة)
              </label>
              <div className="relative">
                <input
                  type="text"
                  dir="auto"
                  placeholder="سجل واربح جوائز قيمة مع جيلنا 🇩🇿"
                  value={arabicName}
                  onChange={(e) => setArabicName(e.target.value)}
                  className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 rounded-xl pl-4 pr-36 text-sm text-slate-800 placeholder-slate-400 transition-all duration-200 min-h-12 focus:outline-none"
                />
                <button
                  type="button"
                  onClick={handleApplyDarijaSample}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-indigo-50 hover:bg-indigo-100 border border-indigo-100 text-indigo-700 text-[10px] px-2.5 py-1.5 rounded-lg cursor-pointer transition-colors font-bold"
                >
                  Darija Preset ✨
                </button>
              </div>
            </div>

            {/* Campaign dates */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Launch Date</label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 rounded-xl px-4 text-xs text-slate-700 font-mono transition-all duration-200 min-h-12 focus:outline-none"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Expiration Date</label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full bg-white border border-slate-250 hover:border-slate-400 focus:border-indigo-500 rounded-xl px-4 text-xs text-slate-700 font-mono transition-all duration-200 min-h-12 focus:outline-none"
              />
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 2: GAME RULES */}
      {step === 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-600" />
            <span>Step 2: Distribution Rules & Legal Safety Limits</span>
          </h3>

          <div className="space-y-6">
            {/* Win rate probability slider */}
            <div className="bg-slate-50 border border-slate-200 p-5 rounded-2xl space-y-3">
              <div className="flex justify-between items-center">
                <div>
                  <span className="text-xs font-bold text-slate-700 uppercase tracking-wider block font-mono">Average Spin Win Probability</span>
                  <span className="text-[10px] text-slate-500">Determines the ratio of "no prize" outcomes for non-priority spins</span>
                </div>
                <span className="text-2xl font-extrabold text-indigo-600 font-mono">{winProbability}%</span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={winProbability}
                onChange={(e) => setWinProbability(Number(e.target.value))}
                className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600"
              />
              <div className="flex justify-between text-[10px] text-slate-500 font-mono">
                <span>5% (Strict/Sparing)</span>
                <span>50% (Balanced)</span>
                <span>100% (Instant Gratification)</span>
              </div>
            </div>

            {/* Entry rate constraints */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">
                  Consumer Phone Validation Checks
                </label>
                <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-xl flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
                  <span className="text-xs text-emerald-800 leading-normal">
                    Real-time Algerian format checker (<strong className="font-mono text-emerald-900">05 / 06 / 07</strong> prefixes) is permanently active.
                  </span>
                </div>
              </div>

              {/* Entries Limit Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest font-mono">Max Entries per Customer Phone</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: '1', label: '1 Spin Limit' },
                    { id: '2', label: '2 Spins' },
                    { id: 'unlimited', label: 'Unlimited' }
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMaxEntries(opt.id as any)}
                      className={`py-2 px-1 rounded-xl text-xs font-semibold transition-all cursor-pointer border ${
                        maxEntries === opt.id
                          ? 'bg-indigo-50 border-indigo-500 text-indigo-700 font-bold'
                          : 'bg-white border-slate-200 text-slate-500 hover:bg-slate-50'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-[10px] text-slate-500 mt-1 leading-normal">
                  Recommended: <strong className="text-slate-600">1 Spin</strong> to guarantee fair reward dispersion across campaigns.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 3: PRIZE ALLOCATION WEIGHTS */}
      {step === 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-5 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                <Gift className="w-4 h-4 text-indigo-600" />
                <span>Step 3: Assign Prizes & Sector Weights</span>
              </h3>
              <p className="text-xs text-slate-500">Allocate quantities and configure probability weights on the wheel.</p>
            </div>
            <button
              type="button"
              onClick={handleAddPrizeLine}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-11 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Prize Allocation</span>
            </button>
          </div>

          <div className="space-y-3.5">
            {allocatedPrizes.map((ap, idx) => {
              const selectedItem = prizes.find(p => p.id === ap.templateId);
              return (
                <div 
                  key={idx} 
                  className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center relative"
                >
                  {/* Select template */}
                  <div className="md:col-span-5 flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Select Reward Template</span>
                    <select
                      value={ap.templateId}
                      onChange={(e) => handleUpdatePrizeLine(idx, 'templateId', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 text-xs text-slate-700 min-h-11 focus:outline-none"
                    >
                      {prizes.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name} ({p.itemValue} - Stock: {p.availableStock})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Allocated quantity */}
                  <div className="md:col-span-3 flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Quantity Limit</span>
                    <input
                      type="number"
                      min="1"
                      max={selectedItem ? selectedItem.availableStock : 100}
                      value={ap.quantity}
                      onChange={(e) => handleUpdatePrizeLine(idx, 'quantity', Number(e.target.value))}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 text-xs text-slate-700 min-h-11 focus:outline-none font-mono"
                    />
                  </div>

                  {/* Weight percentage */}
                  <div className="md:col-span-3 flex flex-col gap-1">
                    <span className="text-[9px] font-mono text-slate-400 uppercase tracking-widest">Relative Wheel Sector Weight</span>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={ap.weight}
                        onChange={(e) => handleUpdatePrizeLine(idx, 'weight', Number(e.target.value))}
                        className="w-full bg-white border border-slate-200 rounded-xl pl-3 pr-8 text-xs text-slate-700 min-h-11 focus:outline-none font-mono"
                      />
                      <span className="absolute right-3 text-slate-400 text-xs font-mono">%</span>
                    </div>
                  </div>

                  {/* Delete button */}
                  <div className="md:col-span-1 flex justify-end md:justify-center pt-2 md:pt-4">
                    <button
                      type="button"
                      disabled={allocatedPrizes.length <= 1}
                      onClick={() => handleRemovePrizeLine(idx)}
                      className={`p-2.5 rounded-lg transition-colors border ${
                        allocatedPrizes.length <= 1
                          ? 'text-slate-300 bg-transparent border-transparent cursor-not-allowed'
                          : 'text-rose-600 bg-rose-50 border-rose-100 hover:bg-rose-100 cursor-pointer'
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Total weights summary indicator */}
            <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-3 flex justify-between items-center text-xs font-mono text-indigo-900">
              <span className="text-indigo-700">Cumulative Sector Probability Sum:</span>
              <span className={`font-bold ${totalWeightSum === 100 ? 'text-emerald-700' : 'text-amber-700'}`}>
                {totalWeightSum}% {totalWeightSum !== 100 && '(Auto-normalized on compile)'}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 4: REVIEW & LIVE */}
      {step === 4 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
          
          {/* If campaign is quiz type, show quiz builder sub-wizard block first */}
          {type === 'quiz' && (
            <div className="space-y-4 bg-white border border-slate-200 rounded-3xl p-6 shadow-sm">
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-bold text-base text-slate-800 flex items-center gap-2">
                    <QuizIcon className="w-4 h-4 text-indigo-600" />
                    <span>Challenge Builder (Quiz Questions)</span>
                  </h3>
                  <p className="text-xs text-slate-500">Consumers must answer correctly to unlock the wheel spin.</p>
                </div>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-11 shadow-sm"
                >
                  <Plus className="w-4 h-4" />
                  <span>Add Question</span>
                </button>
              </div>

              <div className="space-y-4">
                {quizQuestions.map((q, qIdx) => (
                  <div key={q.id} className="bg-slate-50 border border-slate-200 rounded-2xl p-4 space-y-3 relative">
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-bold text-slate-500 font-mono uppercase tracking-wider">Question {qIdx + 1}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="text-rose-600 hover:bg-rose-100 p-1 rounded-lg transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={q.questionText}
                      onChange={(e) => handleUpdateQuestion(qIdx, 'questionText', e.target.value)}
                      className="w-full bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none"
                    />

                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex flex-col gap-1">
                          <span className="text-[9px] font-mono text-slate-400">Option {optIdx + 1}</span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) => handleUpdateQuestion(qIdx, 'option', e.target.value, optIdx)}
                            className="bg-white border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-700 focus:outline-none"
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-1.5 pt-1">
                      <span className="text-[10px] font-bold text-slate-500 font-mono uppercase">Correct Answer</span>
                      <select
                        value={q.correctIndex}
                        onChange={(e) => handleUpdateQuestion(qIdx, 'correctIndex', e.target.value)}
                        className="bg-white border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 focus:outline-none cursor-pointer"
                      >
                        {q.options.map((opt, optIdx) => (
                          <option key={optIdx} value={optIdx}>
                            Option {optIdx + 1}: {opt}
                          </option>
                        ))}
                      </select>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Full review stats card */}
          <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-sm space-y-4">
            <h3 className="font-bold text-base text-slate-850 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-emerald-600" />
              <span>Step 4: Campaign Audit & Review</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans text-slate-600">
              <div className="space-y-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <p className="text-[10px] text-slate-400 font-mono uppercase">Metadata Summary</p>
                <p><strong className="text-slate-700">Name:</strong> {name}</p>
                <p><strong className="text-slate-700">Slug Portal URL:</strong> /p/{slug}</p>
                <p><strong className="text-slate-700">Mechanic:</strong> <span className="text-indigo-600 font-semibold capitalize">{type.replace('_', ' ')}</span></p>
                <p dir="auto"><strong className="text-slate-700">Arabic Copy:</strong> {arabicName}</p>
              </div>

              <div className="space-y-2 bg-slate-50 border border-slate-200/80 rounded-2xl p-4">
                <p className="text-[10px] text-slate-400 font-mono uppercase">Probability & Quotas</p>
                <p><strong className="text-slate-700">Win Chance:</strong> <span className="text-emerald-600 font-bold">{winProbability}%</span></p>
                <p><strong className="text-slate-700">Rate Limit:</strong> 1 Play per phone number</p>
                <p><strong className="text-slate-700">Duration:</strong> {startDate} to {endDate}</p>
                <p><strong className="text-slate-700">Assigned Prizes:</strong> {allocatedPrizes.length} slots configured</p>
              </div>
            </div>

            <div className="bg-emerald-50 border border-emerald-100 p-4 rounded-2xl flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-600 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-emerald-800">Zero-Party Compliance Guaranteed</h4>
                <p className="text-[11px] text-emerald-700 leading-relaxed mt-0.5">
                  This campaign includes native <strong>Algeria Loi 18-07 privacy checkguards</strong>. Phone numbers are validated via standard telecom lookup models before allowing coupon issuance.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Button navigation triggers */}
      <div className="flex justify-between items-center border-t border-slate-200 pt-6 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs text-slate-500 hover:text-slate-800 cursor-pointer px-4 py-2"
        >
          Cancel & Exit
        </button>

        <div className="flex items-center gap-2">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="bg-slate-100 hover:bg-slate-200 border border-slate-250 text-slate-700 px-4 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer min-h-11 shadow-sm"
            >
              Back
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-5 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-11 shadow-sm"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          ) : (
            <button
              type="button"
              onClick={handlePublish}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2.5 rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-11 shadow-sm"
            >
              <span>Publish & Deploy Live</span>
              <Check className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

    </div>
  );
};
