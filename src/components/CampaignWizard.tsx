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
  AlertTriangle,
  AlertCircle,
  ShieldAlert,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageUploader } from "./common/ImageUploader";
import { useTheme } from "../contexts/ThemeContext";

interface CampaignWizardProps {
  prizes: PrizeTemplate[];
  onSave: (
    newCampaign: Omit<Campaign, "participantsCount" | "rewardsClaimed"> & {
      mode?: "create" | "edit" | "relaunch" | "update";
      submitStatus?: "draft" | "active";
    },
  ) => Promise<void> | void;
  onCancel: () => void;
  relaunchDraft?: Campaign | null;
  editingCampaign?: Campaign | null;
}

export const CampaignWizard: React.FC<CampaignWizardProps> = ({
  prizes,
  onSave,
  onCancel,
  relaunchDraft,
  editingCampaign,
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const [step, setStep] = useState(1);
  const baseCampaign = editingCampaign ?? relaunchDraft ?? null;
  const isEditMode = Boolean(editingCampaign);
  const isLiveCampaign =
    isEditMode &&
    (editingCampaign?.status === "active" ||
      editingCampaign?.status === "paused");
  const isRelaunchMode = Boolean(relaunchDraft) && !editingCampaign;

  const [validationErrors, setValidationErrors] = useState<
    { field: string; message: string }[]
  >([]);
  const [showLiveConfirmModal, setShowLiveConfirmModal] = useState<
    "draft" | "active" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Form Fields
  const [name, setName] = useState(
    editingCampaign
      ? editingCampaign.name
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
      : relaunchDraft
        ? `${relaunchDraft.slug}-relaunch`
        : "",
  );
  const [type, setType] = useState<
    "lucky_wheel" | "quiz" | "scratch_card" | "mystery_box" | "hit_it"
  >(baseCampaign ? baseCampaign.gameType : "lucky_wheel");
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
  const [autoPacePrizes, setAutoPacePrizes] = useState<boolean>(
    baseCampaign?.autoPacePrizes ?? false,
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

  const handleAddPrizeLine = () => {
    const defaultTemplateId = prizes[0]?.id || "";
    setAllocatedPrizes((prev) => [
      ...prev,
      { templateId: defaultTemplateId, quantity: 50, weight: 50 },
    ]);
  };

  const handleRemovePrizeLine = (index: number) => {
    setAllocatedPrizes((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdatePrizeLine = (
    index: number,
    field: "templateId" | "quantity" | "weight",
    value: string | number,
  ) => {
    setAllocatedPrizes((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], [field]: value };
      return copy;
    });
  };

  const handleAddQuestion = () => {
    setQuizQuestions((prev) => [
      ...prev,
      {
        id: `q_${Date.now()}`,
        questionText: "",
        options: ["", "", "", ""],
        correctIndex: 0,
      },
    ]);
  };

  const handleRemoveQuestion = (qIdx: number) => {
    setQuizQuestions((prev) => prev.filter((_, i) => i !== qIdx));
  };

  const handleUpdateQuestion = (
    qIdx: number,
    field: "questionText" | "correctIndex" | "option",
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

  const executeSave = async (submitStatus: "draft" | "active") => {
    setValidationErrors([]);
    const validPrizes = allocatedPrizes.filter((ap) => ap.templateId !== "");
    if (validPrizes.length === 0) {
      setValidationErrors([
        {
          field: "prizes",
          message: "At least one prize allocation is required.",
        },
      ]);
      return;
    }

    const totalWeight = validPrizes.reduce(
      (sum, p) => sum + Number(p.weight || 0),
      0,
    );
    if (totalWeight <= 0) {
      setValidationErrors([
        {
          field: "weights",
          message: "Total wheel sector weight must be greater than 0.",
        },
      ]);
      return;
    }

    setIsSubmitting(true);
    try {
      await onSave({
        id: editingCampaign?.id ?? "",
        name,
        arabicName,
        heroImageUrl: heroImageUrl || undefined,
        slug,
        gameType: type,
        status: submitStatus,
        winProbability,
        autoPacePrizes,
        maxEntries,
        prizes: validPrizes,
        questions: type === "quiz" ? quizQuestions : [],
        startDate,
        endDate,
        mode: isEditMode ? "edit" : isRelaunchMode ? "relaunch" : "create",
        submitStatus,
      });
    } catch (err: any) {
      setValidationErrors([
        {
          field: "general",
          message:
            err?.message ||
            "Failed to save campaign. Please check the fields and retry.",
        },
      ]);
    } finally {
      setIsSubmitting(false);
      setShowLiveConfirmModal(null);
    }
  };

  const handleSaveTrigger = (submitStatus: "draft" | "active") => {
    if (isLiveCampaign) {
      setShowLiveConfirmModal(submitStatus);
    } else {
      executeSave(submitStatus);
    }
  };

  const getEffectiveAvailableStock = (template: PrizeTemplate) => {
    let existingAllocated = 0;
    if (isEditMode && editingCampaign) {
      existingAllocated = editingCampaign.prizes
        .filter((p) => p.templateId === template.id)
        .reduce((sum, p) => sum + p.quantity, 0);
    }
    return Math.min(
      template.totalStock,
      template.availableStock + existingAllocated,
    );
  };

  const totalWeightSum = allocatedPrizes.reduce(
    (sum, p) => sum + Number(p.weight || 0),
    0,
  );

  return (
    <div
      id="campaign-wizard-root"
      className="max-w-4xl mx-auto space-y-6 text-brand-text pb-16 relative"
    >
      {/* Validation Errors Banner */}
      {validationErrors.length > 0 && (
        <div className="bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div className="space-y-1 text-xs">
            <p className="font-bold">Please fix the following before saving:</p>
            <ul className="list-disc list-inside space-y-0.5 font-medium">
              {validationErrors.map((err, idx) => (
                <li key={idx}>{err.message}</li>
              ))}
            </ul>
          </div>
        </div>
      )}

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
              {isEditMode ? "Edit Campaign" : "Campaign Builder Wizard"}
            </h2>
            <p className="text-xs text-brand-textMuted mt-0.5">
              {isLiveCampaign
                ? "Direct in-place edit for live campaign. Changes take effect immediately."
                : isEditMode
                  ? "Edit campaign details and configuration."
                  : "Launch optimized brand activation campaigns in 4 easy steps"}
            </p>
          </div>
        </div>

        {isLiveCampaign && editingCampaign && (
          <span className="text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 px-3.5 py-1.5 rounded-2xl font-mono font-bold flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live In-Place Edit: {editingCampaign.name}
          </span>
        )}
        {isEditMode && !isLiveCampaign && editingCampaign && (
          <span className="text-xs bg-blue-500/15 border border-blue-500/30 text-blue-500 px-3.5 py-1.5 rounded-2xl font-mono font-bold">
            Draft Edit: {editingCampaign.name}
          </span>
        )}
        {isRelaunchMode && (
          <span className="text-xs bg-purple-500/15 border border-purple-500/30 text-purple-500 px-3.5 py-1.5 rounded-2xl font-mono font-bold">
            Relaunch: {relaunchDraft.name}
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
              type="button"
              onClick={() => setStep(s.stepNum)}
              className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl text-left transition-all cursor-pointer ${
                isCurrent
                  ? isDark
                    ? "bg-blue-600/20 text-blue-400 font-black border border-blue-500/30"
                    : "bg-blue-50 text-blue-700 font-black border border-blue-200"
                  : isPassed
                    ? isDark
                      ? "text-slate-300 font-bold"
                      : "text-slate-700 font-bold"
                    : "text-brand-textMuted font-medium"
              }`}
            >
              <div
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 font-mono ${
                  isCurrent
                    ? "bg-blue-600 text-white font-black"
                    : isPassed
                      ? "bg-emerald-500 text-white font-bold"
                      : isDark
                        ? "bg-slate-800 text-slate-400"
                        : "bg-slate-200 text-slate-600"
                }`}
              >
                {isPassed ? (
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                ) : (
                  s.stepNum
                )}
              </div>
              <span className="text-xs truncate hidden sm:inline">
                {s.label}
              </span>
            </button>
          );
        })}
      </div>

      {/* STEP 1: BASICS & DARIJA LOCALIZATION */}
      {step === 1 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`space-y-6 rounded-[28px] p-6 sm:p-7 shadow-sm border ${
            isDark
              ? "bg-[#151E30] border-slate-800 text-white"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div>
            <h3 className="font-black text-lg text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <Globe className="w-5 h-5 stroke-[2.5]" />
              <span>Step 1: Campaign Identity & Localization</span>
            </h3>
            <p className="text-xs text-brand-textMuted mt-0.5">
              Set campaign name, unique portal slug, visual identity and
              Algerian Darija translations.
            </p>
          </div>

          <div className="space-y-5">
            {/* Campaign Name */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-brand-textMuted uppercase tracking-wider">
                Internal Campaign Name *
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramadan Super Spin 2026"
                className={`w-full rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none border ${
                  isDark
                    ? "bg-[#0e1422] border-slate-800 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              />
            </div>

            {/* Campaign Portal Slug */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-brand-textMuted uppercase tracking-wider">
                  Public Portal Slug *
                </label>
                {isLiveCampaign && (
                  <span className="text-[10px] text-amber-500 font-mono font-bold">
                    Preserving slug keeps active QR codes and links working
                  </span>
                )}
              </div>
              <div className="relative flex items-center">
                <span className="absolute left-4 text-xs font-mono text-brand-textMuted select-none">
                  /play/
                </span>
                <input
                  type="text"
                  value={slug}
                  onChange={(e) => setSlug(e.target.value)}
                  placeholder="ramadan-spin"
                  className={`w-full rounded-2xl pl-16 pr-4 py-3 text-sm font-mono font-bold focus:outline-none border ${
                    isDark
                      ? "bg-[#0e1422] border-slate-800 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>
            </div>

            {/* Arabic / Darija Display Name */}
            <div className="flex flex-col gap-1.5">
              <div className="flex justify-between items-center">
                <label className="text-xs font-black text-brand-textMuted uppercase tracking-wider">
                  Arabic / Darija Promotional Copy
                </label>
                <button
                  type="button"
                  onClick={handleApplyDarijaSample}
                  className="text-xs text-blue-500 font-bold hover:underline cursor-pointer"
                >
                  Insert Sample Darija
                </button>
              </div>
              <input
                type="text"
                dir="rtl"
                value={arabicName}
                onChange={(e) => setArabicName(e.target.value)}
                placeholder="اربح هدايا وقسائم فورية مع كل مشاركة!"
                className={`w-full rounded-2xl px-4 py-3 text-sm font-bold focus:outline-none border ${
                  isDark
                    ? "bg-[#0e1422] border-slate-800 text-white"
                    : "bg-slate-50 border-slate-200 text-slate-900"
                }`}
              />
            </div>

            {/* Hero Image */}
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-black text-brand-textMuted uppercase tracking-wider">
                Hero Branding Image
              </label>
              <ImageUploader
                value={heroImageUrl}
                onChange={setHeroImageUrl}
                folder="campaigns"
                label="Upload Hero Banner"
              />
            </div>

            {/* Game Mechanic Choice */}
            <div className="flex flex-col gap-2">
              <label className="text-xs font-black text-brand-textMuted uppercase tracking-wider">
                Engagement Mechanic
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {[
                  {
                    id: "lucky_wheel",
                    title: "Lucky Spin Wheel",
                    desc: "Instant gratification gamification with visual prize wedges",
                  },
                  {
                    id: "scratch_card",
                    title: "Scratch Card",
                    desc: "Digital scratch-to-win card for surprise reveals",
                  },
                  {
                    id: "mystery_box",
                    title: "Mystery Box",
                    desc: "Let users choose one of three boxes to reveal their prize",
                  },
                  {
                    id: "hit_it",
                    title: "Hit It Before It Leaves",
                    desc: "Fast-paced tapping game to win a prize",
                  },
                  {
                    id: "quiz",
                    title: "Trivia Quiz Challenge",
                    desc: "Skill & knowledge based entry before claiming rewards",
                  },
                ].map((m) => (
                  <button
                    key={m.id}
                    type="button"
                    onClick={() => setType(m.id as any)}
                    className={`p-4 rounded-2xl text-left border transition-all cursor-pointer ${
                      type === m.id
                        ? isDark
                          ? "bg-blue-600/20 border-blue-500 text-blue-400"
                          : "bg-blue-50 border-2 border-blue-500 text-blue-700 font-bold"
                        : isDark
                          ? "bg-[#0e1422] border-slate-800 text-slate-300 hover:bg-slate-800"
                          : "bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100"
                    }`}
                  >
                    <p className="font-black text-sm">{m.title}</p>
                    <p className="text-xs text-brand-textMuted mt-1">
                      {m.desc}
                    </p>
                  </button>
                ))}
              </div>
            </div>

            {/* Date Range */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-brand-textMuted uppercase tracking-wider">
                  Start Date
                </label>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className={`w-full rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none border ${
                    isDark
                      ? "bg-[#0e1422] border-slate-800 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-black text-brand-textMuted uppercase tracking-wider">
                  End Date
                </label>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className={`w-full rounded-2xl px-4 py-2.5 text-xs font-bold focus:outline-none border ${
                    isDark
                      ? "bg-[#0e1422] border-slate-800 text-white"
                      : "bg-slate-50 border-slate-200 text-slate-900"
                  }`}
                />
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* STEP 2: GAME RULES & WIN PROBABILITY */}
      {step === 2 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className={`space-y-6 rounded-[28px] p-6 sm:p-7 shadow-sm border ${
            isDark
              ? "bg-[#151E30] border-slate-800 text-white"
              : "bg-white border-slate-200 text-slate-900"
          }`}
        >
          <div>
            <h3 className="font-black text-lg text-blue-600 dark:text-blue-400 flex items-center gap-2">
              <Sliders className="w-5 h-5 stroke-[2.5]" />
              <span>Step 2: Probability & Anti-Fraud Rate Limits</span>
            </h3>
            <p className="text-xs text-brand-textMuted mt-0.5">
              Control average win rates, customer repeat-spin restrictions and
              Algerian phone validation.
            </p>
          </div>

          <div className="space-y-6">
            {/* Auto-Paced Daily Voucher Distribution Card */}
            {(() => {
              const startMs = new Date(startDate + "T00:00:00Z").getTime();
              const endMs = new Date(endDate + "T23:59:59Z").getTime();
              const calculatedDays = Math.max(
                1,
                Math.ceil((endMs - startMs) / (1000 * 60 * 60 * 24)),
              );
              const totalAllocatedQty = allocatedPrizes.reduce(
                (sum, p) => sum + (Number(p.quantity) || 0),
                0,
              );
              const dailyVouchersEst = (
                totalAllocatedQty / calculatedDays
              ).toFixed(1);

              return (
                <div
                  className={`p-5 rounded-2xl border transition-all ${
                    autoPacePrizes
                      ? isDark
                        ? "bg-blue-950/20 border-blue-500/50 shadow-lg shadow-blue-950/20"
                        : "bg-blue-50/70 border-blue-300 shadow-sm"
                      : isDark
                        ? "bg-[#0e1422] border-slate-800"
                        : "bg-slate-50 border-slate-200"
                  }`}
                >
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3.5">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 mt-0.5 ${
                          autoPacePrizes
                            ? "bg-blue-600 text-white shadow-md shadow-blue-500/30"
                            : isDark
                              ? "bg-slate-800 text-slate-400"
                              : "bg-slate-200 text-slate-500"
                        }`}
                      >
                        <Sparkles className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="flex items-center gap-2.5">
                          <span
                            className={`text-sm font-black tracking-tight ${
                              isDark ? "text-white" : "text-slate-900"
                            }`}
                          >
                            Auto-Paced Daily Voucher Distribution
                          </span>
                          {autoPacePrizes && (
                            <span className="text-[10px] uppercase font-black px-2 py-0.5 rounded-full bg-blue-500/20 text-blue-400 border border-blue-500/30">
                              Active Pacer
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-brand-textMuted mt-1 leading-relaxed max-w-xl">
                          Evenly distribute your allocated vouchers across the
                          campaign duration ({calculatedDays} days). When
                          enabled, the server dynamically controls daily winning
                          limits, and manual win percentage is locked.
                        </p>
                      </div>
                    </div>

                    <label className="relative inline-flex items-center cursor-pointer flex-shrink-0 mt-1">
                      <input
                        type="checkbox"
                        checked={autoPacePrizes}
                        onChange={(e) => setAutoPacePrizes(e.target.checked)}
                        className="sr-only peer"
                      />
                      <div className="w-11 h-6 bg-slate-300 dark:bg-slate-700 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                    </label>
                  </div>

                  {autoPacePrizes && (
                    <div className="mt-4 pt-4 border-t border-blue-500/20 flex flex-col sm:flex-row sm:items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-bold">
                        <span className="w-2 h-2 rounded-full bg-blue-500 animate-ping" />
                        <span>
                          Estimated Daily Budget: ~{dailyVouchersEst}{" "}
                          vouchers/day
                        </span>
                      </div>
                      <span className="text-brand-textMuted font-mono text-[11px]">
                        Total: {totalAllocatedQty} vouchers ÷ {calculatedDays}{" "}
                        days
                      </span>
                    </div>
                  )}

                  {isLiveCampaign &&
                    !baseCampaign?.autoPacePrizes &&
                    autoPacePrizes && (
                      <div className="mt-3 bg-amber-500/10 border border-amber-500/20 p-3 rounded-xl flex items-center gap-2 text-xs text-amber-500">
                        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
                        <span>
                          Enabling pacing mid-campaign calculates daily limits
                          from today forward using remaining un-won stock.
                        </span>
                      </div>
                    )}
                </div>
              );
            })()}

            {/* Win probability slider */}
            <div
              className={`p-5 rounded-2xl space-y-3 border transition-all ${
                autoPacePrizes
                  ? "opacity-60 bg-slate-100/50 dark:bg-slate-900/40 border-dashed border-slate-300 dark:border-slate-800"
                  : isDark
                    ? "bg-[#0e1422] border-slate-800"
                    : "bg-slate-50 border-slate-200"
              }`}
            >
              <div className="flex justify-between items-center">
                <div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-xs font-black uppercase tracking-wider block ${
                        isDark ? "text-white" : "text-slate-900"
                      }`}
                    >
                      Average Spin Win Probability
                    </span>
                    {autoPacePrizes && (
                      <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-400 border border-amber-500/30">
                        Locked by Auto-Pacer
                      </span>
                    )}
                  </div>
                  <span className="text-xs text-brand-textMuted mt-0.5 block">
                    {autoPacePrizes
                      ? "Win rate is dynamically determined by daily prize quota pacing."
                      : 'Determines the ratio of "no prize" outcomes for non-priority spins'}
                  </span>
                </div>
                <span
                  className={`text-3xl font-black font-mono ${
                    autoPacePrizes
                      ? "text-slate-400 dark:text-slate-600 line-through text-2xl"
                      : "text-emerald-500"
                  }`}
                >
                  {autoPacePrizes ? "AUTO" : `${winProbability}%`}
                </span>
              </div>
              <input
                type="range"
                min="5"
                max="100"
                step="5"
                disabled={autoPacePrizes}
                value={winProbability}
                onChange={(e) => setWinProbability(Number(e.target.value))}
                className={`w-full h-2 rounded-full appearance-none ${
                  autoPacePrizes
                    ? "cursor-not-allowed bg-slate-300 dark:bg-slate-800"
                    : "cursor-pointer accent-blue-600 bg-slate-200 dark:bg-slate-700"
                }`}
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
              className="px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-sm border bg-blue-600 hover:bg-blue-700 text-white border-blue-600"
            >
              <Plus className="w-4 h-4 stroke-[2.5]" />
              <span>Add Prize Allocation</span>
            </button>
          </div>

          <div className="space-y-3.5">
            {allocatedPrizes.map((ap, idx) => {
              const selectedItem = prizes.find((p) => p.id === ap.templateId);
              const existingCampaignPrize = editingCampaign?.prizes?.find(
                (p) => p.templateId === ap.templateId,
              );
              const quantityWon = existingCampaignPrize?.quantity_won ?? 0;
              const minAllowedQty =
                isLiveCampaign && quantityWon > 0 ? quantityWon : 1;

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
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-brand-textMuted uppercase tracking-wider">
                        Select Reward Template
                      </span>
                      {isLiveCampaign && quantityWon > 0 && (
                        <span className="text-[10px] font-mono font-bold text-emerald-500">
                          Won: {quantityWon} / {ap.quantity}
                        </span>
                      )}
                    </div>
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
                        prizes.map((p) => {
                          const effStock = getEffectiveAvailableStock(p);
                          return (
                            <option key={p.id} value={p.id}>
                              {p.name} ({p.itemValue} - Stock: {effStock})
                            </option>
                          );
                        })
                      )}
                    </select>

                    {/* Voucher Codes Warning */}
                    {selectedItem?.category === "voucher" &&
                      (selectedItem.filledValuesCount ?? 0) < ap.quantity && (
                        <p className="text-[10px] text-amber-500 font-bold flex items-center gap-1 mt-0.5">
                          <AlertTriangle className="w-3 h-3 shrink-0" />
                          <span>
                            Inventory has {selectedItem.filledValuesCount ?? 0}{" "}
                            prepared codes (need {ap.quantity}).
                          </span>
                        </p>
                      )}
                  </div>

                  {/* Allocated quantity */}
                  <div className="md:col-span-3 flex flex-col gap-1">
                    <div className="flex justify-between items-center">
                      <span className="text-[10px] font-black text-brand-textMuted uppercase tracking-wider">
                        Quantity Limit
                      </span>
                      {quantityWon > 0 && (
                        <span className="text-[9px] text-brand-textMuted font-mono">
                          Min: {quantityWon}
                        </span>
                      )}
                    </div>
                    <input
                      type="number"
                      min={minAllowedQty}
                      max={
                        selectedItem
                          ? getEffectiveAvailableStock(selectedItem)
                          : 100
                      }
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
                      disabled={allocatedPrizes.length <= 1 || quantityWon > 0}
                      onClick={() => handleRemovePrizeLine(idx)}
                      title={
                        quantityWon > 0
                          ? `Cannot remove: ${quantityWon} already won. Set weight to 0 to stop wins.`
                          : "Remove prize"
                      }
                      className={`p-2.5 rounded-2xl transition-colors border ${
                        allocatedPrizes.length <= 1 || quantityWon > 0
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
                {totalWeightSum !== 100 && "(Auto-normalized on write)"}
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
                  {autoPacePrizes ? (
                    <span className="text-blue-500 dark:text-blue-400 font-black">
                      Auto-Paced Daily Distribution
                    </span>
                  ) : (
                    <span className="text-emerald-500 font-black">
                      {winProbability}%
                    </span>
                  )}
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
          disabled={isSubmitting}
          className="text-xs font-bold text-brand-textMuted hover:text-brand-text cursor-pointer px-4 py-2"
        >
          Cancel & Exit
        </button>

        <div className="flex items-center gap-3">
          {step > 1 && (
            <button
              type="button"
              disabled={isSubmitting}
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
              {(!isLiveCampaign || editingCampaign?.status === "draft") && (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => handleSaveTrigger("draft")}
                  className={`px-5 py-2.5 rounded-2xl text-xs font-bold flex items-center gap-1.5 cursor-pointer min-h-11 shadow-sm border ${
                    isDark
                      ? "bg-[#151E30] border-slate-800 text-white hover:bg-slate-800"
                      : "bg-white border-slate-200 text-slate-800 hover:bg-slate-100"
                  }`}
                >
                  <span>{isEditMode ? "Save as Draft" : "Save Draft"}</span>
                </button>
              )}
              <button
                type="button"
                disabled={isSubmitting}
                onClick={() => handleSaveTrigger("active")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-7 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 cursor-pointer min-h-11 shadow-lg shadow-emerald-600/25 transition-all hover:scale-102"
              >
                <span>
                  {isSubmitting
                    ? "Saving..."
                    : isLiveCampaign
                      ? "Apply & Save Changes"
                      : isEditMode
                        ? "Publish Live"
                        : "Publish & Deploy Live"}
                </span>
                <Check className="w-4 h-4 stroke-[2.5]" />
              </button>
            </>
          )}
        </div>
      </div>

      {/* LIVE CAMPAIGN CONFIRMATION MODAL */}
      <AnimatePresence>
        {showLiveConfirmModal && editingCampaign && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="bg-card-bg border border-card-border rounded-3xl w-full max-w-lg shadow-2xl p-6 space-y-5"
            >
              <div className="flex items-center gap-3 text-amber-500">
                <ShieldAlert className="w-6 h-6" />
                <h3 className="text-lg font-black text-brand-text">
                  Confirm Live Campaign Update
                </h3>
              </div>

              <div className="space-y-3 text-xs text-brand-text leading-relaxed">
                <p>
                  You are editing an active campaign (
                  <strong>{editingCampaign.name}</strong>). These changes will
                  take effect <strong>immediately</strong> for active player
                  traffic.
                </p>

                {editingCampaign.gameType !== type && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 font-bold flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Notice: Changing game type from{" "}
                      <strong>{editingCampaign.gameType}</strong> to{" "}
                      <strong>{type}</strong> may alter in-progress customer
                      game sessions.
                    </span>
                  </div>
                )}

                <p className="text-brand-textMuted">
                  Existing won vouchers and completed player entries will be
                  fully preserved in history.
                </p>
              </div>

              <div className="flex justify-end items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowLiveConfirmModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-card-border text-xs font-bold text-brand-text hover:bg-card-bg-subtle cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => executeSave(showLiveConfirmModal)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-black flex items-center gap-1.5 cursor-pointer shadow-md"
                >
                  {isSubmitting ? "Applying..." : "Confirm & Save Changes"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};
