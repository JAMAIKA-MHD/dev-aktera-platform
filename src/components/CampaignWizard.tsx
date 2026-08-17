import React, { useState, useEffect } from "react";
import { Campaign, PrizeTemplate, QuizQuestion } from "../types";
import {
  ArrowLeft,
  ArrowRight,
  Gift,
  Sliders,
  HelpCircle as QuizIcon,
  Check,
  Sparkles,
  Plus,
  Trash2,
  Globe,
} from "lucide-react";
import { motion } from "motion/react";
import { DEFAULT_CAMPAIGN_IMAGE_URL } from "../lib/defaultImages";
import { ImageUploader } from "./common/ImageUploader";
import { useTheme } from "../contexts/ThemeContext";

interface CampaignWizardProps {
  prizes: PrizeTemplate[];
  onSave: (
    newCampaign: Omit<Campaign, "participantsCount" | "rewardsClaimed"> & {
      mode?: "create" | "edit" | "relaunch" | "update";
      submitStatus?: "draft" | "active";
    },
  ) => void;
  onCancel: () => void;
  relaunchDraft?: Campaign | null;
  editingCampaign?: Campaign | null;
  updateDraftSource?: Campaign | null;
}

export const CampaignWizard: React.FC<CampaignWizardProps> = ({
  prizes,
  onSave,
  onCancel,
  relaunchDraft,
  editingCampaign,
  updateDraftSource,
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [step, setStep] = useState(1);
  const baseCampaign =
    editingCampaign ?? updateDraftSource ?? relaunchDraft ?? null;
  const isEditMode = Boolean(editingCampaign);
  const isEditingUpdateDraft = Boolean(editingCampaign?.parentCampaignId);
  const isUpdateDraftMode = Boolean(updateDraftSource) && !editingCampaign;
  const isRelaunchMode = Boolean(relaunchDraft) && !editingCampaign;

  const buildUpdateSlug = (baseSlug: string) =>
    `${baseSlug}-update-${Date.now().toString().slice(-5)}`;

  // Form Fields
  const [name, setName] = useState(
    editingCampaign
      ? editingCampaign.name
      : updateDraftSource
        ? `${updateDraftSource.name} (Update Draft)`
        : relaunchDraft
          ? `${relaunchDraft.name} (Relaunch)`
          : "",
  );
  const [arabicName, setArabicName] = useState(
    baseCampaign ? baseCampaign.arabicName : "",
  );
  const [heroImageUrl, setHeroImageUrl] = useState(
    baseCampaign?.heroImageUrl ?? "",
  );
  const [slug, setSlug] = useState(
    editingCampaign
      ? editingCampaign.slug
      : updateDraftSource
        ? buildUpdateSlug(updateDraftSource.slug)
        : relaunchDraft
          ? `${relaunchDraft.slug}-relaunch`
          : "",
  );
  const [type, setType] = useState<"lucky_wheel" | "quiz">(
    baseCampaign ? baseCampaign.type : "lucky_wheel",
  );
  const [startDate, setStartDate] = useState(
    baseCampaign?.startDate ?? new Date().toISOString().split("T")[0],
  );
  const [endDate, setEndDate] = useState(
    baseCampaign?.endDate ??
      new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)
        .toISOString()
        .split("T")[0],
  );

  // Step 2 Fields
  const [winProbability, setWinProbability] = useState(
    baseCampaign ? baseCampaign.winProbability : 60,
  );
  const [maxEntries, setMaxEntries] = useState<"1" | "2" | "unlimited">(
    baseCampaign?.maxEntries ?? "1",
  );

  // Step 3 Fields (Prize selection & weight)
  const [allocatedPrizes, setAllocatedPrizes] = useState<
    { templateId: string; quantity: number; weight: number }[]
  >(
    baseCampaign
      ? baseCampaign.prizes
      : [{ templateId: prizes[0]?.id || "", quantity: 100, weight: 100 }],
  );

  // Step 4 Fields (Quiz Questions if type is quiz)
  const [quizQuestions, setQuizQuestions] = useState<QuizQuestion[]>(
    baseCampaign?.questions && baseCampaign.questions.length > 0
      ? baseCampaign.questions
      : [
          {
            id: "q_1",
            questionText: "What is the local calling code for Algeria?",
            options: ["+213", "+212", "+216", "+20"],
            correctIndex: 0,
          },
        ],
  );

  // When prizes load after wizard opens, fill any empty templateId slots
  useEffect(() => {
    if (prizes.length > 0 && !baseCampaign) {
      setAllocatedPrizes((prev) =>
        prev.map((ap) =>
          ap.templateId === "" ? { ...ap, templateId: prizes[0].id } : ap,
        ),
      );
    }
  }, [prizes, baseCampaign]);

  // Quick helper for Dialect suggestions
  const handleApplyDarijaSample = () => {
    setArabicName("سجل في المسابقة واربح هدايا فورية قيمة من اختيارك! 🎁");
  };

  // Add prize allocation line
  const handleAddPrizeLine = () => {
    const unallocated = prizes.find(
      (p) => !allocatedPrizes.some((ap) => ap.templateId === p.id),
    );
    setAllocatedPrizes([
      ...allocatedPrizes,
      {
        templateId: unallocated?.id || prizes[0]?.id || "",
        quantity: 50,
        weight: 10,
      },
    ]);
  };

  const handleRemovePrizeLine = (idx: number) => {
    if (allocatedPrizes.length <= 1) return;
    setAllocatedPrizes(allocatedPrizes.filter((_, i) => i !== idx));
  };

  const handleUpdatePrizeLine = (
    idx: number,
    field: "templateId" | "quantity" | "weight",
    value: any,
  ) => {
    const updated = [...allocatedPrizes];
    updated[idx] = {
      ...updated[idx],
      [field]: value,
    };
    setAllocatedPrizes(updated);
  };

  // Quiz helper functions
  const handleAddQuestion = () => {
    setQuizQuestions([
      ...quizQuestions,
      {
        id: `q_${Date.now()}`,
        questionText: "Enter your custom Darija quiz question...",
        options: ["Option A", "Option B", "Option C", "Option D"],
        correctIndex: 0,
      },
    ]);
  };

  const handleRemoveQuestion = (idx: number) => {
    setQuizQuestions(quizQuestions.filter((_, i) => i !== idx));
  };

  const handleUpdateQuestion = (
    qIdx: number,
    field: string,
    value: any,
    optIdx?: number,
  ) => {
    const updated = [...quizQuestions];
    if (field === "questionText") {
      updated[qIdx].questionText = value;
    } else if (field === "correctIndex") {
      updated[qIdx].correctIndex = parseInt(value, 10);
    } else if (field === "option" && optIdx !== undefined) {
      updated[qIdx].options[optIdx] = value;
    }
    setQuizQuestions(updated);
  };

  const handleSave = (submitStatus: "draft" | "active") => {
    const validPrizes = allocatedPrizes.filter((ap) => ap.templateId !== "");
    if (validPrizes.length === 0) return;
    onSave({
      id: editingCampaign?.id ?? "",
      name,
      arabicName,
      heroImageUrl: heroImageUrl || undefined,
      slug,
      type,
      status: submitStatus,
      winProbability,
      maxEntries,
      prizes: validPrizes,
      questions: type === "quiz" ? quizQuestions : [],
      startDate,
      endDate,
      parentCampaignId: isUpdateDraftMode
        ? updateDraftSource?.id
        : isEditingUpdateDraft
          ? editingCampaign?.parentCampaignId
          : undefined,
      mode: isEditMode
        ? "edit"
        : isUpdateDraftMode
          ? "update"
          : isRelaunchMode
            ? "relaunch"
            : "create",
      submitStatus,
    });
  };

  const totalWeightSum = allocatedPrizes.reduce(
    (sum, p) => sum + Number(p.weight),
    0,
  );

  return (
    <div
      id="campaign-wizard-root"
      className="max-w-4xl mx-auto space-y-6 text-brand-text pb-16"
    >
      {/* Header bar */}
      <div className="flex justify-between items-center border-b border-card-border pb-5">
        <div className="flex items-center gap-3">
          <button
            onClick={onCancel}
            className={`p-2.5 rounded-2xl transition-colors cursor-pointer border ${
              isDark
                ? "bg-[#151E30] border-slate-800 text-slate-300 hover:text-white hover:bg-slate-800"
                : "bg-white border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
            }`}
          >
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h2
              className={`text-2xl font-black tracking-tight ${
                isDark ? "text-white" : "text-slate-900"
              }`}
            >
              Campaign Builder Wizard
            </h2>
            <p className="text-xs text-brand-textMuted mt-0.5">
              {isEditMode
                ? "Edit your saved draft before publishing it live."
                : isUpdateDraftMode
                  ? "Prepare a safe update draft derived from a live campaign without interrupting the current live version."
                  : "Launch optimized brand activation campaigns in 4 easy steps"}
            </p>
          </div>
        </div>

        {isUpdateDraftMode && updateDraftSource && (
          <span className="text-xs bg-orange-500/15 border border-orange-500/30 text-orange-500 px-3.5 py-1.5 rounded-2xl font-mono font-bold">
            Update Draft Mode: {updateDraftSource.name}
          </span>
        )}
        {isRelaunchMode && (
          <span className="text-xs bg-blue-500/15 border border-blue-500/30 text-blue-500 px-3.5 py-1.5 rounded-2xl font-mono font-bold">
            Relaunch Mode: {relaunchDraft.name}
          </span>
        )}
        {isEditMode && editingCampaign && (
          <span className="text-xs bg-blue-500/15 border border-blue-500/30 text-blue-500 px-3.5 py-1.5 rounded-2xl font-mono font-bold">
            Draft Edit Mode: {editingCampaign.name}
          </span>
        )}
      </div>

      {/* Progress Multi-Step Indicator */}
      <div
        className={`grid grid-cols-4 gap-2.5 p-2 rounded-2xl shadow-sm select-none border ${
          isDark ? "bg-[#151E30] border-slate-800" : "bg-white border-slate-200"
        }`}
      >
        {[
          { stepNum: 1, label: "Basics & Darija" },
          { stepNum: 2, label: "Game Rules" },
          { stepNum: 3, label: "Reward Weights" },
          { stepNum: 4, label: "Review & Live" },
        ].map((s) => {
          const isCurrent = step === s.stepNum;
          const isPassed = step > s.stepNum;

          return (
            <button
              key={s.stepNum}
              onClick={() => setStep(s.stepNum)}
              className={`py-3 px-2 rounded-2xl text-center flex flex-col items-center justify-center transition-all cursor-pointer border ${
                isCurrent
                  ? isDark
                    ? "bg-blue-600/20 border-blue-500 text-blue-400 font-black shadow-sm"
                    : "bg-blue-50 border-2 border-blue-500 text-blue-700 font-black shadow-sm"
                  : isPassed
                    ? isDark
                      ? "bg-slate-800/60 border-slate-700 text-white font-bold"
                      : "bg-slate-100 border-slate-200 text-slate-800 font-bold"
                    : isDark
                      ? "border-transparent text-slate-500 hover:text-slate-300"
                      : "border-transparent text-slate-400 hover:text-slate-700"
              }`}
            >
              <span className="text-xs font-mono font-black uppercase tracking-wider block">
                Step {s.stepNum}
              </span>
              <span className="text-[11px] font-medium hidden md:inline mt-0.5">
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* STEP 1: BASICS */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`space-y-5 rounded-[28px] p-6 sm:p-7 shadow-sm border ${
            isDark
              ? "bg-[#151E30] border-slate-800 text-white"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <h3 className="font-black text-lg text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <Globe className="w-5 h-5 stroke-[2.5]" />
            <span>Step 1: Campaign Basics & Algerian Translation</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            {/* Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-brand-textMuted uppercase tracking-wider">
                Campaign Display Title (English)
              </label>
              <input
                type="text"
                placeholder="e.g. Djezzy Super Ramadan Wheel"
                value={name}
                onChange={(e) => {
                  setName(e.target.value);
                  setSlug(
                    e.target.value.toLowerCase().replace(/[^a-z0-9]+/g, "-"),
                  );
                }}
                className={`w-full rounded-2xl px-4 text-sm transition-all duration-150 min-h-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                  isDark
                    ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                }`}
              />
            </div>

            {/* Slug */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-brand-textMuted uppercase tracking-wider">
                Campaign Portal Slug (URL)
              </label>
              <input
                type="text"
                placeholder="e.g. djezzy-ramadan"
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                className={`w-full rounded-2xl px-4 text-xs font-mono transition-all duration-150 min-h-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                  isDark
                    ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                }`}
              />
            </div>

            {/* Campaign Type Select */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-brand-textMuted uppercase tracking-wider">
                Portal Mechanics
              </label>
              <div className="grid grid-cols-2 gap-3">
                <button
                  type="button"
                  onClick={() => setType("lucky_wheel")}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer min-h-12 flex items-center justify-center gap-2 ${
                    type === "lucky_wheel"
                      ? isDark
                        ? "bg-blue-600/20 border-blue-500 text-blue-400 font-black"
                        : "bg-blue-50 border-2 border-blue-500 text-blue-700 font-black"
                      : isDark
                        ? "bg-[#0e1422] border-slate-800 text-slate-400 hover:bg-slate-800"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Sliders className="w-4 h-4" />
                  <span className="text-xs font-bold">Lucky Spin Wheel</span>
                </button>
                <button
                  type="button"
                  onClick={() => setType("quiz")}
                  className={`p-3 rounded-2xl border text-center transition-all cursor-pointer min-h-12 flex items-center justify-center gap-2 ${
                    type === "quiz"
                      ? isDark
                        ? "bg-blue-600/20 border-blue-500 text-blue-400 font-black"
                        : "bg-blue-50 border-2 border-blue-500 text-blue-700 font-black"
                      : isDark
                        ? "bg-[#0e1422] border-slate-800 text-slate-400 hover:bg-slate-800"
                        : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <QuizIcon className="w-4 h-4" />
                  <span className="text-xs font-bold">Quiz Challenge</span>
                </button>
              </div>
            </div>

            {/* Arabic / Darija Translation Banner */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-brand-textMuted uppercase tracking-wider">
                Consumer Darija Copy (العربية الدارجة)
              </label>
              <div className="relative">
                <input
                  type="text"
                  dir="auto"
                  placeholder="سجل واربح جوائز قيمة مع جيلنا 🇩🇿"
                  value={arabicName}
                  onChange={(e) => setArabicName(e.target.value)}
                  className={`w-full rounded-2xl pl-4 pr-36 text-sm transition-all duration-150 min-h-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                    isDark
                      ? "bg-[#0e1422] border-slate-800 text-white placeholder-slate-500 focus:border-blue-500"
                      : "bg-slate-50 border-slate-200 text-slate-900 placeholder-slate-400 focus:border-blue-500"
                  }`}
                />
                <button
                  type="button"
                  onClick={handleApplyDarijaSample}
                  className="absolute right-2 top-1/2 -translate-y-1/2 bg-blue-600 hover:bg-blue-700 text-white text-[10px] px-3 py-1.5 rounded-xl cursor-pointer transition-colors font-bold shadow-sm"
                >
                  Darija Preset ✨
                </button>
              </div>
            </div>

            {/* Campaign dates */}
            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-brand-textMuted uppercase tracking-wider">
                Launch Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className={`w-full rounded-2xl px-4 text-xs font-mono transition-all duration-150 min-h-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                  isDark
                    ? "bg-[#0e1422] border-slate-800 text-white focus:border-blue-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
                }`}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-[11px] font-black text-brand-textMuted uppercase tracking-wider">
                Expiration Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className={`w-full rounded-2xl px-4 text-xs font-mono transition-all duration-150 min-h-12 focus:outline-none focus:ring-2 focus:ring-blue-500/20 border ${
                  isDark
                    ? "bg-[#0e1422] border-slate-800 text-white focus:border-blue-500"
                    : "bg-slate-50 border-slate-200 text-slate-900 focus:border-blue-500"
                }`}
              />
            </div>

            <div
              className={`md:col-span-2 space-y-3 rounded-2xl p-4 border ${
                isDark
                  ? "bg-[#0e1422] border-slate-800"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <ImageUploader
                value={heroImageUrl}
                onChange={setHeroImageUrl}
                folder="campaigns"
                label="Campaign image"
              />
              <div className="flex items-center gap-3">
                <img
                  src={heroImageUrl || DEFAULT_CAMPAIGN_IMAGE_URL}
                  alt="Campaign visual preview"
                  className="h-20 w-36 rounded-2xl border border-card-border object-cover shadow-sm"
                  onError={(event) => {
                    event.currentTarget.src = DEFAULT_CAMPAIGN_IMAGE_URL;
                  }}
                />
                <p className="text-xs text-brand-textMuted">
                  This image is shown in campaign cards, workspace, and player
                  landing.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 2: GAME RULES */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`space-y-5 rounded-[28px] p-6 sm:p-7 shadow-sm border ${
            isDark
              ? "bg-[#151E30] border-slate-800 text-white"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <h3 className="font-black text-lg text-blue-600 dark:text-blue-400 flex items-center gap-2">
            <Sliders className="w-5 h-5 stroke-[2.5]" />
            <span>Step 2: Distribution Rules & Legal Safety Limits</span>
          </h3>

          <div className="space-y-6">
            {/* Win rate probability slider */}
            <div
              className={`p-5 rounded-2xl border space-y-3 ${
                isDark
                  ? "bg-[#0e1422] border-slate-800"
                  : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <span
                    className={`text-xs font-black uppercase tracking-wider block ${
                      isDark ? "text-white" : "text-slate-900"
                    }`}
                  >
                    Average Spin Win Probability
                  </span>
                  <span className="text-xs text-brand-textMuted mt-0.5">
                    Determines the ratio of "no prize" outcomes for non-priority
                    spins
                  </span>
                </div>
                <span className="text-3xl font-black text-emerald-500 font-mono">
                  {winProbability}%
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                value={winProbability}
                onChange={(e) => setWinProbability(Number(e.target.value))}
                className="w-full h-2 rounded-full appearance-none cursor-pointer accent-blue-600 bg-slate-200 dark:bg-slate-700"
              />
              <div className="flex justify-between text-[11px] text-brand-textMuted font-mono">
                <span>5% (Strict/Sparing)</span>
                <span>50% (Balanced)</span>
                <span>100% (Instant Gratification)</span>
              </div>
            </div>

            {/* Entry rate constraints */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div className="flex flex-col gap-2">
                <label className="text-[11px] font-black text-brand-textMuted uppercase tracking-wider">
                  Consumer Phone Validation Checks
                </label>
                <div className="bg-emerald-500/15 border border-emerald-500/30 p-4 rounded-2xl flex items-center gap-3">
                  <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse flex-shrink-0" />
                  <span className="text-xs text-emerald-600 dark:text-emerald-400 font-bold leading-normal">
                    Real-time Algerian format checker (
                    <strong>05 / 06 / 07</strong> prefixes) is permanently
                    active.
                  </span>
                </div>
              </div>

              {/* Entries Limit Selection */}
              <div className="flex flex-col gap-1.5">
                <label className="text-[11px] font-black text-brand-textMuted uppercase tracking-wider">
                  Max Entries per Customer Phone
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: "1", label: "1 Spin Limit" },
                    { id: "2", label: "2 Spins" },
                    { id: "unlimited", label: "Unlimited" },
                  ].map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => setMaxEntries(opt.id as any)}
                      className={`py-2 px-1 rounded-2xl text-xs font-bold transition-all cursor-pointer border ${
                        maxEntries === opt.id
                          ? isDark
                            ? "bg-blue-600/20 border-blue-500 text-blue-400 font-black"
                            : "bg-blue-50 border-2 border-blue-500 text-blue-700 font-black"
                          : isDark
                            ? "bg-[#0e1422] border-slate-800 text-slate-400 hover:bg-slate-800"
                            : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100"
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <p className="text-xs text-brand-textMuted mt-1 leading-normal">
                  Recommended: <strong>1 Spin</strong> to guarantee fair reward
                  dispersion across campaigns.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 3: PRIZE ALLOCATION WEIGHTS */}
      {step === 3 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`space-y-5 rounded-[28px] p-6 sm:p-7 shadow-sm border ${
            isDark
              ? "bg-[#151E30] border-slate-800 text-white"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div className="flex justify-between items-center mb-1">
            <div>
              <h3 className="font-black text-lg text-blue-600 dark:text-blue-400 flex items-center gap-2">
                <Gift className="w-5 h-5 stroke-[2.5]" />
                <span>Step 3: Assign Prizes & Sector Weights</span>
              </h3>
              <p className="text-xs text-brand-textMuted mt-0.5">
                Allocate quantities and configure probability weights on the
                wheel.
              </p>
            </div>
            <button
              type="button"
              onClick={handleAddPrizeLine}
              className={`px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm border ${
                isDark
                  ? "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
                  : "bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
              }`}
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Prize Allocation</span>
            </button>
          </div>

          <div className="space-y-3.5">
            {allocatedPrizes.map((ap, idx) => {
              const selectedItem = prizes.find((p) => p.id === ap.templateId);
              return (
                <div
                  key={idx}
                  className={`rounded-2xl p-4 grid grid-cols-1 md:grid-cols-12 gap-3.5 items-center relative border ${
                    isDark
                      ? "bg-[#0e1422] border-slate-800"
                      : "bg-slate-50 border-slate-200"
                  }`}
                >
                  {/* Select template */}
                  <div className="md:col-span-5 flex flex-col gap-1">
                    <span className="text-[10px] font-black text-brand-textMuted uppercase tracking-wider">
                      Select Reward Template
                    </span>
                    <select
                      value={ap.templateId}
                      onChange={(e) =>
                        handleUpdatePrizeLine(idx, "templateId", e.target.value)
                      }
                      className={`w-full rounded-2xl px-3 text-xs font-bold min-h-11 focus:outline-none border ${
                        isDark
                          ? "bg-[#151E30] border-slate-700 text-white"
                          : "bg-white border-slate-200 text-slate-900"
                      }`}
                    >
                      {prizes.length === 0 ? (
                        <option value="">
                          — Create prize templates first —
                        </option>
                      ) : (
                        prizes.map((p) => (
                          <option key={p.id} value={p.id}>
                            {p.name} ({p.itemValue} - Stock: {p.availableStock})
                          </option>
                        ))
                      )}
                    </select>
                  </div>

                  {/* Allocated quantity */}
                  <div className="md:col-span-3 flex flex-col gap-1">
                    <span className="text-[10px] font-black text-brand-textMuted uppercase tracking-wider">
                      Quantity Limit
                    </span>
                    <input
                      type="number"
                      min="1"
                      max={selectedItem ? selectedItem.availableStock : 100}
                      value={ap.quantity}
                      onChange={(e) =>
                        handleUpdatePrizeLine(
                          idx,
                          "quantity",
                          Number(e.target.value),
                        )
                      }
                      className={`w-full rounded-2xl px-3 text-xs font-mono font-bold min-h-11 focus:outline-none border ${
                        isDark
                          ? "bg-[#151E30] border-slate-700 text-white"
                          : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />
                  </div>

                  {/* Weight percentage */}
                  <div className="md:col-span-3 flex flex-col gap-1">
                    <span className="text-[10px] font-black text-brand-textMuted uppercase tracking-wider">
                      Wheel Sector Weight
                    </span>
                    <div className="relative flex items-center">
                      <input
                        type="number"
                        min="1"
                        max="100"
                        value={ap.weight}
                        onChange={(e) =>
                          handleUpdatePrizeLine(
                            idx,
                            "weight",
                            Number(e.target.value),
                          )
                        }
                        className={`w-full rounded-2xl pl-3 pr-8 text-xs font-mono font-bold min-h-11 focus:outline-none border ${
                          isDark
                            ? "bg-[#151E30] border-slate-700 text-white"
                            : "bg-white border-slate-200 text-slate-900"
                        }`}
                      />
                      <span className="absolute right-3 text-brand-textMuted text-xs font-mono font-bold">
                        %
                      </span>
                    </div>
                  </div>

                  {/* Delete button */}
                  <div className="md:col-span-1 flex justify-end md:justify-center pt-2 md:pt-4">
                    <button
                      type="button"
                      disabled={allocatedPrizes.length <= 1}
                      onClick={() => handleRemovePrizeLine(idx)}
                      className={`p-2.5 rounded-2xl transition-colors border ${
                        allocatedPrizes.length <= 1
                          ? "text-slate-400/50 bg-transparent border-transparent cursor-not-allowed"
                          : "text-red-500 bg-red-500/10 border-red-500/20 hover:bg-red-500/20 cursor-pointer"
                      }`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })}

            {/* Total weights summary indicator */}
            <div
              className={`p-4 rounded-2xl border flex justify-between items-center text-xs font-mono ${
                isDark
                  ? "bg-[#0e1422] border-slate-800 text-white"
                  : "bg-slate-50 border-slate-200 text-slate-900"
              }`}
            >
              <span className="text-brand-textMuted font-bold">
                Cumulative Sector Probability Sum:
              </span>
              <span
                className={`font-black text-sm ${
                  totalWeightSum === 100 ? "text-emerald-500" : "text-amber-500"
                }`}
              >
                {totalWeightSum}%{" "}
                {totalWeightSum !== 100 && "(Auto-normalized on compile)"}
              </span>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 4: REVIEW & LIVE */}
      {step === 4 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-6"
        >
          {/* If campaign is quiz type, show quiz builder sub-wizard block first */}
          {type === "quiz" && (
            <div
              className={`space-y-4 rounded-[28px] p-6 sm:p-7 shadow-sm border ${
                isDark
                  ? "bg-[#151E30] border-slate-800 text-white"
                  : "bg-white border-slate-200 text-slate-900"
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <h3 className="font-black text-lg text-blue-600 dark:text-blue-400 flex items-center gap-2">
                    <QuizIcon className="w-5 h-5 stroke-[2.5]" />
                    <span>Challenge Builder (Quiz Questions)</span>
                  </h3>
                  <p className="text-xs text-brand-textMuted mt-0.5">
                    Consumers must answer correctly to unlock the prize outcome.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={handleAddQuestion}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm"
                >
                  <Plus className="w-4 h-4 stroke-[2.5]" />
                  <span>Add Question</span>
                </button>
              </div>

              <div className="space-y-4">
                {quizQuestions.map((q, qIdx) => (
                  <div
                    key={q.id}
                    className={`rounded-2xl p-4 space-y-3 relative border ${
                      isDark
                        ? "bg-[#0e1422] border-slate-800"
                        : "bg-slate-50 border-slate-200"
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <span className="text-xs font-black text-brand-textMuted uppercase tracking-wider">
                        Question {qIdx + 1}
                      </span>
                      <button
                        type="button"
                        onClick={() => handleRemoveQuestion(qIdx)}
                        className="text-red-500 hover:bg-red-500/15 p-1 rounded-xl transition-all cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <input
                      type="text"
                      value={q.questionText}
                      onChange={(e) =>
                        handleUpdateQuestion(
                          qIdx,
                          "questionText",
                          e.target.value,
                        )
                      }
                      className={`w-full rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none border ${
                        isDark
                          ? "bg-[#151E30] border-slate-700 text-white"
                          : "bg-white border-slate-200 text-slate-900"
                      }`}
                    />

                    <div className="grid grid-cols-2 gap-2">
                      {q.options.map((opt, optIdx) => (
                        <div key={optIdx} className="flex flex-col gap-1">
                          <span className="text-[10px] font-bold text-brand-textMuted">
                            Option {optIdx + 1}
                          </span>
                          <input
                            type="text"
                            value={opt}
                            onChange={(e) =>
                              handleUpdateQuestion(
                                qIdx,
                                "option",
                                e.target.value,
                                optIdx,
                              )
                            }
                            className={`rounded-2xl px-3 py-2 text-xs font-bold focus:outline-none border ${
                              isDark
                                ? "bg-[#151E30] border-slate-700 text-white"
                                : "bg-white border-slate-200 text-slate-900"
                            }`}
                          />
                        </div>
                      ))}
                    </div>

                    <div className="flex flex-col gap-1.5 pt-1">
                      <span className="text-[11px] font-black text-brand-textMuted uppercase">
                        Correct Answer
                      </span>
                      <select
                        value={q.correctIndex}
                        onChange={(e) =>
                          handleUpdateQuestion(
                            qIdx,
                            "correctIndex",
                            e.target.value,
                          )
                        }
                        className={`rounded-2xl px-3 py-2 text-xs font-bold focus:outline-none cursor-pointer border ${
                          isDark
                            ? "bg-[#151E30] border-slate-700 text-white"
                            : "bg-white border-slate-200 text-slate-900"
                        }`}
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
          <div
            className={`rounded-[28px] p-6 sm:p-7 shadow-sm space-y-5 border ${
              isDark
                ? "bg-[#151E30] border-slate-800 text-white"
                : "bg-white border-slate-200 text-slate-900"
            }`}
          >
            <h3 className="font-black text-lg text-emerald-500 flex items-center gap-2">
              <Sparkles className="w-5 h-5 stroke-[2.5]" />
              <span>Step 4: Campaign Audit & Review</span>
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs font-sans">
              <div
                className={`space-y-2 rounded-2xl p-4 border ${
                  isDark
                    ? "bg-[#0e1422] border-slate-800 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              >
                <p className="text-[10px] text-brand-textMuted font-black uppercase">
                  Metadata Summary
                </p>
                <p>
                  <strong>Name:</strong> {name}
                </p>
                <p>
                  <strong>Slug Portal URL:</strong> /play/{slug}
                </p>
                <p>
                  <strong>Mechanic:</strong>{" "}
                  <span className="text-blue-500 font-bold capitalize">
                    {type.replace("_", " ")}
                  </span>
                </p>
                <p dir="auto">
                  <strong>Darija Copy:</strong> {arabicName || "—"}
                </p>
              </div>

              <div
                className={`space-y-2 rounded-2xl p-4 border ${
                  isDark
                    ? "bg-[#0e1422] border-slate-800 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              >
                <p className="text-[10px] text-brand-textMuted font-black uppercase">
                  Probability & Quotas
                </p>
                <p>
                  <strong>Win Chance:</strong>{" "}
                  <span className="text-emerald-500 font-black">
                    {winProbability}%
                  </span>
                </p>
                <p>
                  <strong>Rate Limit:</strong> 1 Play per phone number
                </p>
                <p>
                  <strong>Duration:</strong> {startDate} to {endDate}
                </p>
                <p>
                  <strong>Assigned Prizes:</strong> {allocatedPrizes.length}{" "}
                  slots configured
                </p>
              </div>
            </div>

            <div className="bg-emerald-500/15 border border-emerald-500/30 p-4 rounded-2xl flex items-start gap-3">
              <Check className="w-5 h-5 text-emerald-500 mt-0.5 flex-shrink-0" />
              <div>
                <h4 className="text-xs font-black text-emerald-600 dark:text-emerald-400">
                  Zero-Party Compliance Guaranteed
                </h4>
                <p className="text-xs text-brand-textMuted leading-relaxed mt-0.5">
                  This campaign includes native{" "}
                  <strong>Algeria Loi 18-07 privacy guardrails</strong>. Phone
                  numbers are validated via standard telecom lookup models
                  before allowing coupon issuance.
                </p>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Button navigation triggers */}
      <div className="flex justify-between items-center border-t border-card-border pt-6 mt-2">
        <button
          type="button"
          onClick={onCancel}
          className="text-xs font-bold text-brand-textMuted hover:text-brand-text cursor-pointer px-4 py-2"
        >
          Cancel & Exit
        </button>

        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1 cursor-pointer min-h-11 shadow-sm border ${
                isDark
                  ? "bg-[#151E30] border-slate-800 text-white hover:bg-slate-800"
                  : "bg-white border-slate-200 text-slate-800 hover:bg-slate-100"
              }`}
            >
              Back
            </button>
          )}

          {step < 4 ? (
            <button
              type="button"
              onClick={() => setStep(step + 1)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-6 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer min-h-11 shadow-md shadow-blue-500/25 transition-all hover:scale-102"
            >
              <span>Next Step</span>
              <ArrowRight className="w-4 h-4 stroke-[2.5]" />
            </button>
          ) : (
            <>
              {!(!isEditMode && !isUpdateDraftMode && !isRelaunchMode) && (
                <button
                  type="button"
                  onClick={() => handleSave("draft")}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-11 shadow-sm border ${
                    isDark
                      ? "bg-[#151E30] border-slate-800 text-white hover:bg-slate-800"
                      : "bg-white border-slate-200 text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <span>{isEditMode ? "Keep as Draft" : "Save Draft"}</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => handleSave("active")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer min-h-11 shadow-lg shadow-emerald-600/25 transition-all hover:scale-102"
              >
                <span>
                  {isUpdateDraftMode || isEditingUpdateDraft
                    ? "Publish Update Live"
                    : isEditMode
                      ? "Publish Draft Live"
                      : "Publish & Deploy Live"}
                </span>
                <Check className="w-4 h-4 stroke-[2.5]" />
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
