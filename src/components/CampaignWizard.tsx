import React, { Suspense, lazy, useMemo, useState } from "react";
import { Campaign, PrizeTemplate, QuizQuestion } from "../types";
import {
  AlertCircle,
  AlertTriangle,
  ArrowLeft,
  Check,
  Image as ImageIcon,
  Plus,
  ShieldAlert,
  Smartphone,
  Trash2,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { ImageUploader } from "./common/ImageUploader";
import {
  FieldErrors,
  drawSchema,
  fieldErrors,
  foundationSchema,
  prizesSchema,
  quizSchema,
  skillSchema,
} from "./wizard/wizardSchemas";
import {
  EngagementCategory,
  WizardConfig,
  mechanicById,
  mechanicsFor,
  resolveGameType,
  wizardFromCampaign,
} from "./wizard/mechanicsRegistry";

// The Player Experience sandbox, loaded on demand (only the module's index may be imported).
const CampaignSimulator = lazy(() =>
  import("../features/player-experience").then((module) => ({
    default: module.CampaignSimulator,
  })),
);

interface CampaignWizardProps {
  prizes: PrizeTemplate[];
  onSave: (
    newCampaign: Omit<Campaign, "participantsCount" | "rewardsClaimed"> & {
      mode?: "create" | "edit" | "relaunch" | "update";
      submitStatus?: "draft" | "active";
      playerScreenConfig?: any;
    },
  ) => Promise<void> | void;
  onCancel: () => void;
  onOpenPlayerScreenEditor?: (campaignData: any) => void;
  relaunchDraft?: Campaign | null;
  editingCampaign?: Campaign | null;
  initialStep?: 1 | 2 | 3 | 4 | 5;
}

const STEPS = ["Foundation", "Engagement", "Reward", "Prizes", "Review"];

const CATEGORIES: {
  id: EngagementCategory;
  title: string;
  desc: string;
}[] = [
  { id: "skill", title: "Skill-based", desc: "Performance minigames" },
  { id: "knowledge", title: "Knowledge-based", desc: "Trivia and diagnostics" },
  { id: "luck", title: "Luck", desc: "Chance micro-action" },
];

const pad = (n: number) => String(n).padStart(2, "0");
const toInput = (d: Date) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
// Saved campaigns keep a day only: give it a time so the date-time input can show it.
const fromSaved = (value: string, time: string) =>
  value.includes("T") ? value.slice(0, 16) : `${value}T${time}`;
const formatDate = (value: string) =>
  value
    ? new Date(value).toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
      })
    : "—";

const emptyQuestion = (): QuizQuestion => ({
  id: `q_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
  questionText: "",
  options: ["", "", ""],
  correctIndex: 0,
});

const inputCls =
  "w-full rounded-2xl px-4 py-3 text-sm font-semibold focus:outline-none border bg-card-bg-subtle border-card-border text-brand-text focus:border-emerald-500";

// ---- Small presentational helpers -------------------------------------------------------

function Field({
  label,
  hint,
  error,
  children,
}: {
  label: string;
  hint?: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div
      data-error={error ? "true" : undefined}
      className="flex flex-col gap-1.5"
    >
      <label className="text-xs font-black text-brand-text">{label}</label>
      <div
        className={
          error
            ? "[&_input]:border-rose-500 [&_select]:border-rose-500 [&_textarea]:border-rose-500"
            : undefined
        }
      >
        {children}
      </div>
      {error ? (
        <p role="alert" className="text-[11px] font-semibold text-rose-500">
          {error}
        </p>
      ) : (
        hint && <p className="text-[11px] text-brand-textMuted">{hint}</p>
      )}
    </div>
  );
}

function Choice({
  selected,
  disabled,
  onClick,
  title,
  desc,
  badge,
}: {
  selected: boolean;
  disabled?: boolean;
  onClick: () => void;
  title: string;
  desc?: string;
  badge?: string;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className={`relative p-4 rounded-2xl text-left border-2 transition-all ${
        selected
          ? "border-emerald-600 bg-emerald-500/10"
          : "border-card-border bg-card-bg hover:bg-card-bg-subtle"
      } ${disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer"}`}
    >
      <span
        className={`absolute top-3 right-3 w-4 h-4 rounded-full border-2 ${
          selected ? "border-emerald-600 bg-emerald-600" : "border-card-border"
        }`}
      />
      <p className="font-black text-sm text-brand-text pr-6">{title}</p>
      {desc && <p className="text-xs text-brand-textMuted mt-0.5">{desc}</p>}
      {badge && (
        <span className="inline-block mt-1.5 text-[10px] font-bold px-2 py-0.5 rounded-full bg-card-bg-subtle text-brand-textMuted border border-card-border">
          {badge}
        </span>
      )}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
  title,
  desc,
}: {
  checked: boolean;
  onChange: (v: boolean) => void;
  title: string;
  desc: string;
}) {
  return (
    <label className="flex items-start gap-3 cursor-pointer">
      <input
        type="checkbox"
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        className="sr-only peer"
      />
      <div className="w-11 h-6 shrink-0 mt-0.5 rounded-full bg-slate-300 dark:bg-slate-700 peer-checked:bg-emerald-600 relative after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:after:translate-x-5" />
      <div>
        <p className="text-sm font-black text-brand-text">{title}</p>
        <p className="text-xs text-brand-textMuted">{desc}</p>
      </div>
    </label>
  );
}

function Notice({ children }: { children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-indigo-500/30 bg-indigo-500/10 p-4 text-xs text-brand-text leading-relaxed">
      {children}
    </div>
  );
}

function Slider({
  label,
  value,
  min,
  max,
  step = 1,
  unit,
  onChange,
}: {
  label: string;
  value: number;
  min: number;
  max: number;
  step?: number;
  unit: string;
  onChange: (v: number) => void;
}) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs font-black text-brand-text">{label}</span>
        <span className="text-[11px] font-bold px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-600">
          {value}
          {unit}
        </span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full accent-emerald-600 cursor-pointer"
      />
      <div className="flex justify-between text-[11px] text-brand-textMuted">
        <span>
          {min}
          {unit}
        </span>
        <span>
          {max}
          {unit}
        </span>
      </div>
    </div>
  );
}

function Card({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="space-y-6 rounded-[28px] p-6 sm:p-7 shadow-sm border bg-card-bg border-card-border text-brand-text"
    >
      <div>
        <h3 className="font-black text-xl">{title}</h3>
        <p className="text-xs text-brand-textMuted mt-0.5">{subtitle}</p>
      </div>
      {children}
    </motion.div>
  );
}

// ---- The wizard --------------------------------------------------------------------------

export const CampaignWizard: React.FC<CampaignWizardProps> = ({
  prizes,
  onSave,
  onCancel,
  onOpenPlayerScreenEditor,
  relaunchDraft,
  editingCampaign,
  initialStep = 1,
}) => {
  const [step, setStep] = useState<number>(initialStep);
  const baseCampaign = editingCampaign ?? relaunchDraft ?? null;
  const isEditMode = Boolean(editingCampaign);
  const isLiveCampaign =
    isEditMode &&
    (editingCampaign?.status === "active" ||
      editingCampaign?.status === "paused");
  const isRelaunchMode = Boolean(relaunchDraft) && !editingCampaign;

  // Server errors show in a banner; validation errors show under their own input.
  const [formError, setFormError] = useState<string | null>(null);
  const [showErrors, setShowErrors] = useState(false);
  const [strictMode, setStrictMode] = useState<"draft" | "active">("draft");
  const [showLiveConfirmModal, setShowLiveConfirmModal] = useState<
    "draft" | "active" | null
  >(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSandbox, setShowSandbox] = useState(false);
  const [showRules, setShowRules] = useState(false);

  // Step 1: foundation
  const [name, setName] = useState(
    editingCampaign
      ? editingCampaign.name
      : relaunchDraft
        ? `${relaunchDraft.name} (Relaunch)`
        : "",
  );
  const [brandName, setBrandName] = useState<string>(
    baseCampaign?.gameLogicConfig?.brand_name ?? "",
  );
  // The public link is generated once and never edited; a relaunch gets a new one.
  const [slug] = useState(
    () =>
      editingCampaign?.slug ??
      crypto.randomUUID().replace(/-/g, "").slice(0, 8),
  );
  const [heroImageUrl, setHeroImageUrl] = useState(
    baseCampaign?.heroImageUrl ?? "",
  );
  const [startDate, setStartDate] = useState(
    baseCampaign
      ? fromSaved(baseCampaign.startDate, "00:00")
      : toInput(new Date()),
  );
  const [endDate, setEndDate] = useState(
    baseCampaign
      ? fromSaved(baseCampaign.endDate, "23:59")
      : toInput(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
  );

  // Steps 2 and 3: engagement and reward (one object, saved in game_logic_config.wizard)
  const [w, setW] = useState<WizardConfig>(() =>
    wizardFromCampaign(baseCampaign),
  );
  const patch = (changes: Partial<WizardConfig>) =>
    setW((prev) => ({ ...prev, ...changes }));
  const [winProbability, setWinProbability] = useState(
    baseCampaign && baseCampaign.winProbability < 100
      ? Math.min(99, Math.max(1, baseCampaign.winProbability))
      : 25,
  );
  const [autoPace, setAutoPace] = useState<boolean>(
    baseCampaign?.autoPacePrizes ?? true,
  );
  const [maxEntries, setMaxEntries] = useState<string>(
    baseCampaign?.maxEntries ?? "1",
  );

  // Quiz questions (knowledge)
  const [questions, setQuestions] = useState<QuizQuestion[]>(
    baseCampaign?.questions && baseCampaign.questions.length > 0
      ? baseCampaign.questions
      : [emptyQuestion()],
  );
  const [questionCount, setQuestionCount] = useState(
    Math.min(5, Math.max(1, baseCampaign?.questions?.length || 3)),
  );
  const [activeQuestion, setActiveQuestion] = useState(0);
  const shownQuestions = useMemo(
    () =>
      Array.from(
        { length: questionCount },
        (_, i) => questions[i] ?? emptyQuestion(),
      ),
    [questions, questionCount],
  );
  const updateQuestion = (i: number, changes: Partial<QuizQuestion>) =>
    setQuestions(
      shownQuestions.map((q, idx) => (idx === i ? { ...q, ...changes } : q)),
    );

  // Step 4: prizes
  const [allocatedPrizes, setAllocatedPrizes] = useState<
    { templateId: string; quantity: number; weight: number }[]
  >(
    baseCampaign && baseCampaign.prizes.length > 0
      ? baseCampaign.prizes
      : [{ templateId: prizes[0]?.id || "", quantity: 100, weight: 100 }],
  );
  const updatePrize = (i: number, changes: object) =>
    setAllocatedPrizes((prev) =>
      prev.map((p, idx) => (idx === i ? { ...p, ...changes } : p)),
    );
  const updateConsolation = (i: number, changes: object) =>
    patch({
      consolationPrizes: w.consolationPrizes.map((p, idx) =>
        idx === i ? { ...p, ...changes } : p,
      ),
    });

  const gameType = resolveGameType(w);
  const engagement = mechanicById(w.engagementId);
  const reveal = mechanicById(w.revealId);
  const isDraw = w.method === "draw";
  const guaranteed = !isDraw && w.mode === "guaranteed";

  const engagementLabel =
    w.category === "luck"
      ? "Luck"
      : `${w.category === "skill" ? "Skill" : "Knowledge"} · ${engagement?.label ?? ""}`;
  const engagementSettings =
    w.category === "skill"
      ? `${w.durationSeconds} s · target ${w.targetScore} points`
      : w.category === "knowledge"
        ? `${questionCount} questions · pass ${w.passPercent}%`
        : "No game settings";
  const rewardLabel = isDraw
    ? `Draw · ${formatDate(w.draw.at)} · ${w.draw.winners} winners`
    : `Instant win · ${
        guaranteed
          ? "Guaranteed"
          : autoPace
            ? "Probabilistic · Auto-distribute"
            : `Probabilistic · ${winProbability}%`
      } · ${reveal?.label ?? ""}`;

  const getEffectiveAvailableStock = (template: PrizeTemplate) => {
    const existing = (editingCampaign?.prizes ?? [])
      .filter((p) => p.templateId === template.id)
      .reduce((sum, p) => sum + p.quantity, 0);
    return Math.min(template.totalStock, template.availableStock + existing);
  };

  // Rules of every step, as { "field.path": message }. Sweepstake rules are only required to
  // go live, not for a draft.
  const validateStep = (n: number, status: "draft" | "active"): FieldErrors => {
    if (n === 1) {
      return fieldErrors(
        foundationSchema.safeParse({ name, brandName, startDate, endDate }),
      );
    }
    if (n === 2 && w.category === "skill") {
      return fieldErrors(skillSchema.safeParse({ targetScore: w.targetScore }));
    }
    if (n === 2 && w.category === "knowledge") {
      return fieldErrors(quizSchema.safeParse({ questions: shownQuestions }));
    }
    if (n === 3 && isDraw) {
      return fieldErrors(
        drawSchema(status === "active").safeParse({ draw: w.draw }),
      );
    }
    if (n === 4) {
      const stockOf = (id: string) => {
        const template = prizes.find((p) => p.id === id);
        return template ? getEffectiveAvailableStock(template) : undefined;
      };
      return fieldErrors(
        prizesSchema(
          stockOf,
          !isDraw && !guaranteed && w.consolation,
        ).safeParse({
          prizes: allocatedPrizes,
          consolationPrizes: w.consolationPrizes,
        }),
      );
    }
    return {};
  };

  // Shown live once the user has tried to continue, so a message goes away as the field is fixed.
  const errors: FieldErrors = showErrors ? validateStep(step, strictMode) : {};

  const revealErrors = (found: FieldErrors) => {
    const bad = Object.keys(found)
      .map((key) => /^questions\.(\d+)\./.exec(key)?.[1])
      .find((i) => i !== undefined);
    if (bad !== undefined) setActiveQuestion(Number(bad));
    setShowErrors(true);
    setTimeout(
      () =>
        document
          .querySelector('[data-error="true"]')
          ?.scrollIntoView({ block: "center", behavior: "smooth" }),
      60,
    );
  };

  const goTo = (target: number) => {
    setFormError(null);
    setShowErrors(false);
    setStrictMode("draft");
    setStep(target);
  };
  const next = () => {
    const found = validateStep(step, "draft");
    if (Object.keys(found).length) return revealErrors(found);
    goTo(step + 1);
  };

  const executeSave = async (submitStatus: "draft" | "active") => {
    // The first step with a problem opens, with its messages under the inputs.
    for (const n of [1, 2, 3, 4]) {
      const found = validateStep(n, submitStatus);
      if (Object.keys(found).length) {
        setShowLiveConfirmModal(null);
        setFormError(null);
        setStep(n);
        setStrictMode(submitStatus);
        return revealErrors(found);
      }
    }
    setFormError(null);

    const validPrizes = allocatedPrizes.filter((p) => p.templateId);
    const gameLogicConfig = {
      ...(baseCampaign?.gameLogicConfig ?? {}),
      brand_name: brandName.trim(),
      ...(w.category === "skill" && {
        win_threshold: w.targetScore,
        hit_it_duration_seconds: w.durationSeconds,
      }),
      ...(w.category === "knowledge" && {
        pass_threshold_percentage: w.passPercent,
      }),
      wizard: w,
    };

    setIsSubmitting(true);
    try {
      await onSave({
        id: editingCampaign?.id ?? "",
        name: name.trim(),
        arabicName: baseCampaign?.arabicName ?? "",
        heroImageUrl: heroImageUrl || undefined,
        slug,
        gameType,
        gameLogicConfig,
        status: submitStatus,
        // The server draws the prize: guaranteed = 100 %, draw = no instant win.
        winProbability: isDraw ? 0 : guaranteed ? 100 : winProbability,
        autoPacePrizes: !isDraw && !guaranteed && autoPace,
        maxEntries,
        prizes: validPrizes,
        questions: w.category === "knowledge" ? shownQuestions : [],
        startDate,
        endDate,
        playerScreenConfig: baseCampaign?.playerScreenConfig,
        mode: isEditMode ? "edit" : isRelaunchMode ? "relaunch" : "create",
        submitStatus,
      });
    } catch (err: any) {
      setFormError(
        err?.message ||
          "Failed to save campaign. Please check the fields and retry.",
      );
    } finally {
      setIsSubmitting(false);
      setShowLiveConfirmModal(null);
    }
  };

  const handleSaveTrigger = (submitStatus: "draft" | "active") => {
    if (isLiveCampaign) setShowLiveConfirmModal(submitStatus);
    else executeSave(submitStatus);
  };

  // What the sandbox plays: the campaign as configured now, even before it is saved.
  const draftCampaign: Campaign = {
    id: editingCampaign?.id ?? "wizard-preview",
    organizationId: editingCampaign?.organizationId,
    name,
    arabicName: baseCampaign?.arabicName ?? "",
    heroImageUrl: heroImageUrl || undefined,
    slug,
    gameType,
    gameLogicConfig: {
      win_threshold: w.targetScore,
      hit_it_duration_seconds: w.durationSeconds,
      pass_threshold_percentage: w.passPercent,
    },
    status: "draft",
    winProbability: guaranteed ? 100 : winProbability,
    maxEntries,
    // Unsaved prizes have no id yet; the sandbox ignores prizes without one.
    prizes: allocatedPrizes
      .filter((p) => p.templateId)
      .map((p, i) => ({ ...p, id: `draft-${i}` })),
    questions: w.category === "knowledge" ? shownQuestions : [],
    participantsCount: 0,
    rewardsClaimed: 0,
    startDate,
    endDate,
    playerScreenConfig: baseCampaign?.playerScreenConfig,
  };

  const summaryRows: [string, string | null][] = [
    ["Campaign", name.trim() || null],
    ["Brand", brandName.trim() || null],
    [
      "Dates",
      startDate && endDate
        ? `${formatDate(startDate)} to ${formatDate(endDate)}`
        : null,
    ],
    ["Engagement", step >= 2 ? engagementLabel : null],
    ["Reward", step >= 3 ? rewardLabel : null],
    [
      "Prizes",
      step >= 4
        ? `${allocatedPrizes.filter((p) => p.templateId).length} rewards`
        : null,
    ],
  ];

  return (
    <div
      id="campaign-wizard-root"
      className="max-w-6xl mx-auto space-y-6 text-brand-text pb-16 relative"
    >
      {formError && (
        <div
          role="alert"
          className="bg-rose-500/10 border border-rose-500/30 text-rose-500 rounded-2xl p-4 flex items-start gap-3"
        >
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <p className="text-xs font-medium">{formError}</p>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center gap-3">
        <button
          onClick={onCancel}
          className="p-2.5 rounded-2xl border bg-card-bg border-card-border text-brand-textMuted hover:text-brand-text cursor-pointer"
        >
          <ArrowLeft className="w-5 h-5" />
        </button>
        <div>
          <p className="text-xs text-brand-textMuted">
            Campaigns › {isEditMode ? "Edit campaign" : "New campaign"}
          </p>
          <h2 className="text-2xl font-black tracking-tight">
            {isEditMode ? "Edit campaign" : "Create campaign"}
          </h2>
        </div>
        {isLiveCampaign && (
          <span className="ml-auto text-xs bg-emerald-500/15 border border-emerald-500/30 text-emerald-500 px-3.5 py-1.5 rounded-2xl font-mono font-bold">
            Live in-place edit
          </span>
        )}
        {isRelaunchMode && (
          <span className="ml-auto text-xs bg-purple-500/15 border border-purple-500/30 text-purple-500 px-3.5 py-1.5 rounded-2xl font-mono font-bold">
            Relaunch: {relaunchDraft?.name}
          </span>
        )}
      </div>

      {/* Stepper */}
      <div className="grid grid-cols-5 gap-2 p-2 rounded-2xl border bg-card-bg border-card-border select-none">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const done = step > n;
          const current = step === n;
          return (
            <button
              key={label}
              type="button"
              disabled={!isEditMode && n > step}
              onClick={() => goTo(n)}
              className="flex items-center gap-2 px-2.5 py-2 rounded-xl text-left cursor-pointer disabled:cursor-default"
            >
              <span
                className={`w-6 h-6 rounded-full flex items-center justify-center text-xs shrink-0 font-bold ${
                  current || done
                    ? "bg-emerald-600 text-white"
                    : "bg-card-bg-subtle text-brand-textMuted"
                }`}
              >
                {done ? <Check className="w-3.5 h-3.5 stroke-[3]" /> : n}
              </span>
              <span
                className={`text-xs truncate hidden sm:inline ${
                  current ? "font-black" : "text-brand-textMuted font-semibold"
                }`}
              >
                {label}
              </span>
            </button>
          );
        })}
      </div>

      <div
        className={`grid gap-6 items-start ${step === 5 ? "lg:grid-cols-[1fr_340px]" : "lg:grid-cols-[1fr_320px]"}`}
      >
        <div className="space-y-6 min-w-0">
          {/* STEP 1: FOUNDATION */}
          {step === 1 && (
            <Card
              title="Campaign foundation"
              subtitle="Name your campaign and set when it runs."
            >
              <Field
                label="Campaign name"
                hint="3 to 80 characters"
                error={errors.name}
              >
                <input
                  className={inputCls}
                  value={name}
                  maxLength={80}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ramadan Night Giveaway"
                />
              </Field>
              <Field
                label="Brand name"
                hint="2 to 50 characters"
                error={errors.brandName}
              >
                <input
                  className={inputCls}
                  value={brandName}
                  maxLength={50}
                  onChange={(e) => setBrandName(e.target.value)}
                  placeholder="Sample Brand"
                />
              </Field>
              <Field
                label="Campaign link"
                hint={
                  isLiveCampaign
                    ? "Auto-generated. It cannot be edited, so existing QR codes keep working."
                    : "Auto-generated. It cannot be edited."
                }
              >
                <input
                  className={`${inputCls} opacity-70 font-mono`}
                  value={`play/${slug}`}
                  readOnly
                  disabled
                />
              </Field>
              <div className="grid sm:grid-cols-2 gap-4">
                <Field label="Starts" error={errors.startDate}>
                  <input
                    type="datetime-local"
                    className={inputCls}
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                  />
                </Field>
                <Field label="Ends" error={errors.endDate}>
                  <input
                    type="datetime-local"
                    className={inputCls}
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                  />
                </Field>
              </div>
              <Field label="Campaign image">
                <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-stretch">
                  <ImageUploader
                    value={heroImageUrl}
                    onChange={setHeroImageUrl}
                    folder="campaigns"
                    label="Upload an image"
                  />
                  <div className="flex items-center gap-3 rounded-2xl bg-card-bg-subtle p-4 text-xs text-brand-textMuted">
                    <span className="w-12 h-12 rounded-2xl bg-emerald-600 text-white flex items-center justify-center shrink-0 overflow-hidden">
                      {heroImageUrl ? (
                        <img
                          src={heroImageUrl}
                          alt="Campaign"
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <ImageIcon className="w-6 h-6" />
                      )}
                    </span>
                    {heroImageUrl
                      ? "Image uploaded."
                      : "No image? This generic icon is used."}
                  </div>
                </div>
              </Field>
            </Card>
          )}

          {/* STEP 2: ENGAGEMENT (Layer 1) */}
          {step === 2 && (
            <Card
              title="Engagement"
              subtitle="Choose what the player does. This is separate from how rewards are decided."
            >
              <div className="space-y-2">
                <p className="text-xs font-black">What does the player do?</p>
                <div className="grid sm:grid-cols-3 gap-3">
                  {CATEGORIES.map((c) => (
                    <Choice
                      key={c.id}
                      selected={w.category === c.id}
                      title={c.title}
                      desc={c.desc}
                      onClick={() =>
                        patch({
                          category: c.id,
                          engagementId:
                            mechanicsFor("engagement", c.id).find(
                              (m) => m.gameType,
                            )?.id ?? w.engagementId,
                        })
                      }
                    />
                  ))}
                </div>
              </div>

              {w.category === "luck" ? (
                <Notice>
                  <p className="font-black">No game settings for luck.</p>
                  There is nothing to configure here. You will choose the luck
                  mechanic (Wheel of Fortune, Scratch Card or Mystery Box) in
                  the next step, as the way the reward is revealed.
                </Notice>
              ) : (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-black">
                      {w.category === "skill"
                        ? "Choose a game"
                        : "Choose a format"}
                    </p>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {mechanicsFor("engagement", w.category).map((m) => (
                        <Choice
                          key={m.id}
                          selected={w.engagementId === m.id}
                          disabled={!m.gameType}
                          badge={m.gameType ? undefined : "Soon"}
                          title={m.label}
                          onClick={() => patch({ engagementId: m.id })}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-brand-textMuted">
                      The list comes from the mechanics library. New mechanics
                      appear here automatically.
                    </p>
                  </div>

                  <div className="rounded-2xl border border-card-border bg-card-bg-subtle p-5 space-y-5">
                    <p className="font-black">
                      {w.category === "skill"
                        ? "Game settings"
                        : "Quiz settings"}
                    </p>
                    {w.category === "skill" ? (
                      <>
                        <Slider
                          label="Game duration"
                          value={w.durationSeconds}
                          min={10}
                          max={60}
                          step={5}
                          unit=" s"
                          onChange={(v) => patch({ durationSeconds: v })}
                        />
                        <Field
                          label="Target score to win"
                          error={errors.targetScore}
                        >
                          <input
                            type="number"
                            min={1}
                            className={inputCls}
                            value={w.targetScore}
                            onChange={(e) =>
                              patch({ targetScore: Number(e.target.value) })
                            }
                          />
                        </Field>
                      </>
                    ) : (
                      <>
                        <Field label="Number of questions">
                          <div className="inline-flex rounded-2xl bg-card-bg border border-card-border p-1 w-fit">
                            {[1, 2, 3, 4, 5].map((n) => (
                              <button
                                key={n}
                                type="button"
                                onClick={() => {
                                  setQuestions(shownQuestions);
                                  setQuestionCount(n);
                                  setActiveQuestion((a) => Math.min(a, n - 1));
                                }}
                                className={`w-10 py-2 rounded-xl text-sm font-bold cursor-pointer ${
                                  questionCount === n
                                    ? "bg-emerald-600 text-white"
                                    : "text-brand-textMuted"
                                }`}
                              >
                                {n}
                              </button>
                            ))}
                          </div>
                        </Field>
                        <Slider
                          label="Minimum passing score"
                          value={w.passPercent}
                          min={0}
                          max={100}
                          step={5}
                          unit="%"
                          onChange={(v) => patch({ passPercent: v })}
                        />
                        <div className="flex flex-wrap gap-2">
                          {shownQuestions.map((q, i) => (
                            <button
                              key={q.id}
                              type="button"
                              onClick={() => setActiveQuestion(i)}
                              className={`px-4 py-2 rounded-full text-xs font-black border cursor-pointer ${
                                activeQuestion === i
                                  ? "bg-slate-900 text-white border-slate-900 dark:bg-white dark:text-slate-900"
                                  : "bg-card-bg border-card-border"
                              } ${
                                Object.keys(errors).some((k) =>
                                  k.startsWith(`questions.${i}.`),
                                )
                                  ? "ring-2 ring-rose-500"
                                  : ""
                              }`}
                            >
                              Question {i + 1}
                            </button>
                          ))}
                        </div>
                        {(() => {
                          const q = shownQuestions[activeQuestion];
                          if (!q) return null;
                          return (
                            <div className="space-y-3">
                              <Field
                                label="Question"
                                error={
                                  errors[
                                    `questions.${activeQuestion}.questionText`
                                  ]
                                }
                              >
                                <input
                                  className={inputCls}
                                  value={q.questionText}
                                  onChange={(e) =>
                                    updateQuestion(activeQuestion, {
                                      questionText: e.target.value,
                                    })
                                  }
                                  placeholder="Which year was our first store opened?"
                                />
                              </Field>
                              <p className="text-xs font-black">
                                Answers (2 to 4). Select the correct one.
                              </p>
                              {q.options.map((opt, oi) => (
                                <div
                                  key={oi}
                                  className="flex items-center gap-2"
                                >
                                  <input
                                    type="radio"
                                    name={`correct-${q.id}`}
                                    checked={q.correctIndex === oi}
                                    onChange={() =>
                                      updateQuestion(activeQuestion, {
                                        correctIndex: oi,
                                      })
                                    }
                                    className="accent-emerald-600 w-4 h-4 cursor-pointer"
                                  />
                                  <div
                                    className="flex-1"
                                    data-error={
                                      errors[
                                        `questions.${activeQuestion}.options.${oi}`
                                      ]
                                        ? "true"
                                        : undefined
                                    }
                                  >
                                    <input
                                      className={`${inputCls} ${
                                        errors[
                                          `questions.${activeQuestion}.options.${oi}`
                                        ]
                                          ? "border-rose-500"
                                          : ""
                                      }`}
                                      value={opt}
                                      onChange={(e) =>
                                        updateQuestion(activeQuestion, {
                                          options: q.options.map((o, idx) =>
                                            idx === oi ? e.target.value : o,
                                          ),
                                        })
                                      }
                                    />
                                    {errors[
                                      `questions.${activeQuestion}.options.${oi}`
                                    ] && (
                                      <p
                                        role="alert"
                                        className="mt-1 text-[11px] font-semibold text-rose-500"
                                      >
                                        {
                                          errors[
                                            `questions.${activeQuestion}.options.${oi}`
                                          ]
                                        }
                                      </p>
                                    )}
                                  </div>
                                  {q.correctIndex === oi && (
                                    <span className="text-xs text-brand-textMuted">
                                      Correct
                                    </span>
                                  )}
                                  {q.options.length > 2 && (
                                    <button
                                      type="button"
                                      onClick={() =>
                                        updateQuestion(activeQuestion, {
                                          options: q.options.filter(
                                            (_, idx) => idx !== oi,
                                          ),
                                          correctIndex:
                                            q.correctIndex === oi
                                              ? 0
                                              : q.correctIndex > oi
                                                ? q.correctIndex - 1
                                                : q.correctIndex,
                                        })
                                      }
                                      className="text-rose-500 p-1.5 cursor-pointer"
                                      aria-label="Remove answer"
                                    >
                                      <Trash2 className="w-4 h-4" />
                                    </button>
                                  )}
                                </div>
                              ))}
                              {q.options.length < 4 && (
                                <button
                                  type="button"
                                  onClick={() =>
                                    updateQuestion(activeQuestion, {
                                      options: [...q.options, ""],
                                    })
                                  }
                                  className="px-4 py-2 rounded-2xl border border-card-border bg-card-bg text-xs font-bold flex items-center gap-1 cursor-pointer"
                                >
                                  <Plus className="w-3.5 h-3.5" /> Add answer
                                </button>
                              )}
                            </div>
                          );
                        })()}
                      </>
                    )}
                  </div>
                </>
              )}
            </Card>
          )}

          {/* STEP 3: REWARD (Layer 2) */}
          {step === 3 && (
            <Card
              title="Reward"
              subtitle="Decide how the outcome is determined and revealed."
            >
              <div className="space-y-2">
                <p className="text-xs font-black">How is the reward decided?</p>
                <div className="grid sm:grid-cols-2 gap-3">
                  <Choice
                    selected={!isDraw}
                    title="Instant win"
                    desc="Immediate outcome"
                    onClick={() => patch({ method: "instant" })}
                  />
                  <Choice
                    selected={isDraw}
                    title="Draw"
                    desc="Scheduled grand sweepstake"
                    onClick={() => patch({ method: "draw" })}
                  />
                </div>
              </div>

              {!isDraw ? (
                <>
                  <div className="space-y-2">
                    <p className="text-xs font-black">Instant win mode</p>
                    <p className="text-[11px] text-brand-textMuted">
                      Choose one. They cannot be combined.
                    </p>
                    <div
                      className={`rounded-2xl border-2 p-4 space-y-4 cursor-pointer ${
                        w.mode === "probabilistic"
                          ? "border-emerald-600 bg-emerald-500/10"
                          : "border-card-border"
                      }`}
                      onClick={() => patch({ mode: "probabilistic" })}
                    >
                      <div>
                        <p className="font-black text-sm">Probabilistic odds</p>
                        <p className="text-xs text-brand-textMuted">
                          Players win with a chance, against limited inventory.
                        </p>
                      </div>
                      {w.mode === "probabilistic" && (
                        <div
                          className="space-y-4"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Toggle
                            checked={autoPace}
                            onChange={setAutoPace}
                            title="Auto-distribute prizes over the campaign period"
                            desc="AKTERA calculates the win probability so the rewards you select last for the whole campaign period."
                          />
                          {autoPace ? (
                            <Notice>
                              <strong>
                                Win probability: calculated by AKTERA.
                              </strong>{" "}
                              There is no probability to set.
                            </Notice>
                          ) : (
                            <Slider
                              label="Chance to win"
                              value={winProbability}
                              min={1}
                              max={99}
                              unit="%"
                              onChange={setWinProbability}
                            />
                          )}
                          <Toggle
                            checked={w.consolation}
                            onChange={(v) => patch({ consolation: v })}
                            title="Consolation prize for non-winners (optional)"
                            desc="You choose the consolation prizes in the next step."
                          />
                        </div>
                      )}
                    </div>
                    <Choice
                      selected={w.mode === "guaranteed"}
                      title="Guaranteed winning (100% Gagnant)"
                      desc="Every qualified participant receives a verified reward. Zero losers."
                      onClick={() => patch({ mode: "guaranteed" })}
                    />
                  </div>

                  <div className="space-y-2">
                    <p className="text-xs font-black">
                      How is the reward revealed?
                    </p>
                    <div className="grid sm:grid-cols-3 gap-3">
                      {mechanicsFor("reward", "instant").map((m) => (
                        <Choice
                          key={m.id}
                          selected={w.revealId === m.id}
                          disabled={!m.gameType}
                          badge={m.gameType ? undefined : "Soon"}
                          title={m.label}
                          onClick={() => patch({ revealId: m.id })}
                        />
                      ))}
                    </div>
                    <p className="text-[11px] text-brand-textMuted">
                      The list comes from the mechanics library. New mechanics
                      appear here automatically.
                    </p>
                  </div>

                  <Field label="Plays per phone number">
                    <select
                      className={`${inputCls} max-w-xs cursor-pointer`}
                      value={maxEntries}
                      onChange={(e) => setMaxEntries(e.target.value)}
                    >
                      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                        <option key={n} value={String(n)}>
                          {n} {n === 1 ? "play" : "plays"}
                        </option>
                      ))}
                      <option value="unlimited">Unlimited</option>
                    </select>
                  </Field>
                </>
              ) : (
                <div className="rounded-2xl border border-card-border bg-card-bg-subtle p-5 space-y-4">
                  <div className="grid sm:grid-cols-2 gap-4">
                    <Field label="Draw date and time" error={errors["draw.at"]}>
                      <input
                        type="datetime-local"
                        className={inputCls}
                        value={w.draw.at}
                        onChange={(e) =>
                          patch({ draw: { ...w.draw, at: e.target.value } })
                        }
                      />
                    </Field>
                    <Field
                      label="Number of winners"
                      error={errors["draw.winners"]}
                    >
                      <input
                        type="number"
                        min={1}
                        className={inputCls}
                        value={w.draw.winners}
                        onChange={(e) =>
                          patch({
                            draw: {
                              ...w.draw,
                              winners: Number(e.target.value),
                            },
                          })
                        }
                      />
                    </Field>
                  </div>
                  <Field
                    label="Ticket prefix (optional)"
                    hint="Auto-generated if you leave it empty."
                  >
                    <input
                      className={inputCls}
                      value={w.draw.ticketPrefix}
                      placeholder="#TK-"
                      onChange={(e) =>
                        patch({
                          draw: { ...w.draw, ticketPrefix: e.target.value },
                        })
                      }
                    />
                  </Field>
                  <div
                    data-error={errors["draw.rules"] ? "true" : undefined}
                    className="flex flex-col gap-1.5"
                  >
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-black">
                        Sweepstake rules
                      </label>
                      <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-amber-500/15 text-amber-600">
                        Required before going live
                      </span>
                    </div>
                    <textarea
                      rows={7}
                      className={`${inputCls} ${
                        errors["draw.rules"] ? "border-rose-500" : ""
                      }`}
                      value={w.draw.rules}
                      placeholder="Write the sweepstake rules."
                      onChange={(e) =>
                        patch({ draw: { ...w.draw, rules: e.target.value } })
                      }
                    />
                    {errors["draw.rules"] && (
                      <p
                        role="alert"
                        className="text-[11px] font-semibold text-rose-500"
                      >
                        {errors["draw.rules"]}
                      </p>
                    )}
                    {w.draw.rules.trim() && (
                      <button
                        type="button"
                        onClick={() => setShowRules(true)}
                        className="self-start text-xs font-bold text-emerald-600 hover:underline cursor-pointer"
                      >
                        Read as a player would
                      </button>
                    )}
                  </div>
                </div>
              )}
            </Card>
          )}

          {/* STEP 4: PRIZES */}
          {step === 4 && (
            <Card
              title="Prizes"
              subtitle={
                isDraw
                  ? "The rewards the draw winners receive."
                  : "Allocate stock from your reward library and set the weights."
              }
            >
              <div className="space-y-3">
                {allocatedPrizes.map((ap, idx) => {
                  const selected = prizes.find((p) => p.id === ap.templateId);
                  const won =
                    editingCampaign?.prizes?.find(
                      (p) => p.templateId === ap.templateId,
                    )?.quantity_won ?? 0;
                  const locked = isLiveCampaign && won > 0;
                  return (
                    <div
                      key={idx}
                      className="rounded-2xl p-4 grid md:grid-cols-12 gap-3 items-end border bg-card-bg-subtle border-card-border"
                    >
                      <div className="md:col-span-5">
                        <Field
                          label="Reward"
                          error={errors[`prizes.${idx}.templateId`]}
                        >
                          <select
                            className={inputCls}
                            value={ap.templateId}
                            onChange={(e) =>
                              updatePrize(idx, { templateId: e.target.value })
                            }
                          >
                            {prizes.length === 0 && (
                              <option value="">Create rewards first</option>
                            )}
                            {prizes.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name} (stock {getEffectiveAvailableStock(p)})
                              </option>
                            ))}
                          </select>
                        </Field>
                        {selected?.category === "voucher" &&
                          (selected.filledValuesCount ?? 0) < ap.quantity && (
                            <p className="text-[10px] text-amber-500 font-bold flex items-center gap-1 mt-1">
                              <AlertTriangle className="w-3 h-3 shrink-0" />
                              {selected.filledValuesCount ?? 0} codes ready,
                              need {ap.quantity}.
                            </p>
                          )}
                      </div>
                      <div className="md:col-span-3">
                        <Field
                          label={locked ? `Quantity (min ${won})` : "Quantity"}
                          error={errors[`prizes.${idx}.quantity`]}
                        >
                          <input
                            type="number"
                            className={inputCls}
                            min={locked ? won : 1}
                            max={
                              selected
                                ? getEffectiveAvailableStock(selected)
                                : undefined
                            }
                            value={ap.quantity}
                            onChange={(e) =>
                              updatePrize(idx, {
                                quantity: Number(e.target.value),
                              })
                            }
                          />
                        </Field>
                      </div>
                      <div className="md:col-span-3">
                        <Field
                          label="Weight %"
                          error={errors[`prizes.${idx}.weight`]}
                        >
                          <input
                            type="number"
                            className={inputCls}
                            min={1}
                            max={100}
                            value={ap.weight}
                            onChange={(e) =>
                              updatePrize(idx, {
                                weight: Number(e.target.value),
                              })
                            }
                          />
                        </Field>
                      </div>
                      <button
                        type="button"
                        disabled={allocatedPrizes.length <= 1 || won > 0}
                        onClick={() =>
                          setAllocatedPrizes((prev) =>
                            prev.filter((_, i) => i !== idx),
                          )
                        }
                        title={
                          won > 0
                            ? `${won} already won: set the weight to 0 to stop wins.`
                            : "Remove"
                        }
                        className="md:col-span-1 p-3 rounded-2xl text-rose-500 bg-rose-500/10 disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer justify-self-end"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  );
                })}
                <button
                  type="button"
                  onClick={() =>
                    setAllocatedPrizes((prev) => [
                      ...prev,
                      {
                        templateId: prizes[0]?.id || "",
                        quantity: 50,
                        weight: 50,
                      },
                    ])
                  }
                  className="px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 bg-emerald-600 text-white cursor-pointer"
                >
                  <Plus className="w-4 h-4" /> Add reward
                </button>
                {errors.prizes && (
                  <p
                    role="alert"
                    data-error="true"
                    className="text-[11px] font-semibold text-rose-500"
                  >
                    {errors.prizes}
                  </p>
                )}
              </div>

              {!isDraw && !guaranteed && w.consolation && (
                <div className="space-y-3 pt-2 border-t border-card-border">
                  <div>
                    <p className="font-black">Consolation prizes</p>
                    <p className="text-xs text-brand-textMuted">
                      Given to players who do not win.
                    </p>
                  </div>
                  {w.consolationPrizes.map((cp, idx) => (
                    <div key={idx} className="flex items-end gap-3">
                      <div className="flex-1">
                        <Field
                          label="Reward"
                          error={errors[`consolationPrizes.${idx}.templateId`]}
                        >
                          <select
                            className={inputCls}
                            value={cp.templateId}
                            onChange={(e) =>
                              updateConsolation(idx, {
                                templateId: e.target.value,
                              })
                            }
                          >
                            <option value="">Select a reward</option>
                            {prizes.map((p) => (
                              <option key={p.id} value={p.id}>
                                {p.name}
                              </option>
                            ))}
                          </select>
                        </Field>
                      </div>
                      <div className="w-32">
                        <Field
                          label="Quantity"
                          error={errors[`consolationPrizes.${idx}.quantity`]}
                        >
                          <input
                            type="number"
                            min={1}
                            className={inputCls}
                            value={cp.quantity}
                            onChange={(e) =>
                              updateConsolation(idx, {
                                quantity: Number(e.target.value),
                              })
                            }
                          />
                        </Field>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          patch({
                            consolationPrizes: w.consolationPrizes.filter(
                              (_, i) => i !== idx,
                            ),
                          })
                        }
                        className="p-3 rounded-2xl text-rose-500 bg-rose-500/10 cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  <button
                    type="button"
                    onClick={() =>
                      patch({
                        consolationPrizes: [
                          ...w.consolationPrizes,
                          { templateId: prizes[0]?.id || "", quantity: 100 },
                        ],
                      })
                    }
                    className="px-4 py-2 rounded-2xl text-xs font-black flex items-center gap-1.5 border border-card-border bg-card-bg cursor-pointer"
                  >
                    <Plus className="w-4 h-4" /> Add consolation prize
                  </button>
                  {errors.consolationPrizes && (
                    <p
                      role="alert"
                      data-error="true"
                      className="text-[11px] font-semibold text-rose-500"
                    >
                      {errors.consolationPrizes}
                    </p>
                  )}
                </div>
              )}
            </Card>
          )}

          {/* STEP 5: REVIEW */}
          {step === 5 && (
            <Card
              title="Review and publish"
              subtitle="Check everything, test it, then go live."
            >
              {(
                [
                  [
                    "Foundation",
                    1,
                    [
                      ["Campaign", name],
                      ["Brand", brandName],
                      [
                        "Dates",
                        `${formatDate(startDate)} to ${formatDate(endDate)}`,
                      ],
                    ],
                  ],
                  [
                    "Engagement",
                    2,
                    [
                      ["Type", engagementLabel],
                      ["Settings", engagementSettings],
                    ],
                  ],
                  [
                    "Reward",
                    3,
                    isDraw
                      ? [
                          ["Method", "Draw"],
                          ["Date", formatDate(w.draw.at)],
                          ["Winners", String(w.draw.winners)],
                          [
                            "Rules",
                            w.draw.rules.trim() ? "Written" : "Missing",
                          ],
                        ]
                      : [
                          ["Method", "Instant win"],
                          [
                            "Mode",
                            guaranteed
                              ? "Guaranteed (100% Gagnant)"
                              : autoPace
                                ? "Probabilistic odds · Auto-distribute (win probability calculated by AKTERA)"
                                : `Probabilistic odds · ${winProbability}%`,
                          ],
                          ["Reveal", reveal?.label ?? "—"],
                          ...(guaranteed
                            ? []
                            : [
                                [
                                  "Consolation",
                                  w.consolation ? "Enabled" : "Off",
                                ] as [string, string],
                              ]),
                        ],
                  ],
                  [
                    "Prizes",
                    4,
                    [
                      [
                        "For winners",
                        `${allocatedPrizes.filter((p) => p.templateId).length} rewards`,
                      ],
                      ...(w.consolation && !isDraw && !guaranteed
                        ? [
                            [
                              "Consolation",
                              `${w.consolationPrizes.length} reward${w.consolationPrizes.length === 1 ? "" : "s"}`,
                            ] as [string, string],
                          ]
                        : []),
                    ],
                  ],
                ] as [string, number, [string, string][]][]
              ).map(([title, target, rows]) => (
                <div
                  key={title}
                  className="rounded-2xl border border-card-border p-5 space-y-2"
                >
                  <div className="flex justify-between items-center">
                    <p className="font-black">{title}</p>
                    <button
                      type="button"
                      onClick={() => goTo(target)}
                      className="text-xs font-black text-emerald-600 cursor-pointer"
                    >
                      Edit
                    </button>
                  </div>
                  {rows.map(([k, v]) => (
                    <div key={k} className="flex justify-between gap-4 text-xs">
                      <span className="text-brand-textMuted">{k}</span>
                      <span className="text-right">{v || "—"}</span>
                    </div>
                  ))}
                </div>
              ))}
            </Card>
          )}

          {/* Navigation */}
          <div className="flex justify-between items-center border-t border-card-border pt-5">
            <div className="flex items-center gap-3">
              {step > 1 ? (
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => goTo(step - 1)}
                  className="px-5 py-2.5 rounded-2xl text-xs font-bold min-h-11 border bg-card-bg border-card-border cursor-pointer"
                >
                  Back
                </button>
              ) : (
                <button
                  type="button"
                  onClick={onCancel}
                  className="text-xs font-bold text-brand-textMuted px-4 py-2 cursor-pointer"
                >
                  Cancel
                </button>
              )}
            </div>
            <div className="flex items-center gap-3">
              {step < 5 ? (
                <button
                  type="button"
                  onClick={next}
                  className="bg-emerald-700 hover:bg-emerald-800 text-white px-7 py-2.5 rounded-2xl text-xs font-black min-h-11 cursor-pointer"
                >
                  Continue
                </button>
              ) : (
                <>
                  {(!isLiveCampaign || editingCampaign?.status === "draft") && (
                    <button
                      type="button"
                      disabled={isSubmitting}
                      onClick={() => handleSaveTrigger("draft")}
                      className="px-5 py-2.5 rounded-2xl text-xs font-bold min-h-11 border bg-card-bg border-card-border cursor-pointer"
                    >
                      {isEditMode ? "Save as Draft" : "Save Draft"}
                    </button>
                  )}
                  <button
                    type="button"
                    disabled={isSubmitting}
                    onClick={() => handleSaveTrigger("active")}
                    className="bg-emerald-700 hover:bg-emerald-800 text-white px-7 py-2.5 rounded-2xl text-xs font-black flex items-center gap-1.5 min-h-11 cursor-pointer"
                  >
                    {isSubmitting
                      ? "Saving..."
                      : isLiveCampaign
                        ? "Apply & Save Changes"
                        : isEditMode
                          ? "Publish Live"
                          : "Publish & Deploy Live"}
                    <Check className="w-4 h-4 stroke-[2.5]" />
                  </button>
                </>
              )}
            </div>
          </div>
        </div>

        {/* Side panel: summary, or the mobile preview on the review step */}
        {step < 5 ? (
          <aside className="rounded-[28px] p-6 border bg-card-bg border-card-border lg:sticky lg:top-2">
            <h4 className="font-black text-lg mb-3">Campaign summary</h4>
            {summaryRows.map(([k, v]) => (
              <div
                key={k}
                className="flex justify-between gap-3 py-2.5 border-t border-card-border text-xs"
              >
                <span className="text-brand-textMuted">{k}</span>
                <span
                  className={`text-right ${v ? "font-black" : "text-brand-textMuted"}`}
                >
                  {v ?? "Not set"}
                </span>
              </div>
            ))}
          </aside>
        ) : (
          <aside className="rounded-[28px] p-6 border bg-card-bg border-card-border lg:sticky lg:top-2 text-center space-y-4">
            <div>
              <h4 className="font-black text-lg">Try it before you publish</h4>
              <p className="text-xs text-brand-textMuted">
                Test the campaign as a player would.
              </p>
            </div>
            <div className="mx-auto w-44 rounded-[32px] border-[6px] border-slate-900 bg-gradient-to-b from-emerald-600 to-emerald-900 p-4 aspect-[9/16] flex flex-col items-center justify-center gap-3 text-white">
              <span className="w-12 h-12 rounded-2xl bg-white/20 flex items-center justify-center overflow-hidden">
                {heroImageUrl ? (
                  <img
                    src={heroImageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <ImageIcon className="w-6 h-6" />
                )}
              </span>
              <p className="font-black text-sm leading-tight">{name}</p>
              <p className="text-[11px] opacity-80">{brandName}</p>
              <span className="bg-white text-emerald-800 text-xs font-black rounded-xl px-5 py-2">
                Play now
              </span>
            </div>
            <button
              type="button"
              onClick={() => setShowSandbox(true)}
              className="w-full bg-emerald-700 hover:bg-emerald-800 text-white rounded-2xl px-4 py-3 text-xs font-black flex items-center justify-center gap-2 cursor-pointer"
            >
              <Smartphone className="w-4 h-4" />
              Open interactive player sandbox
            </button>
            {onOpenPlayerScreenEditor && isEditMode && (
              <button
                type="button"
                onClick={() =>
                  onOpenPlayerScreenEditor({
                    id: editingCampaign?.id || "",
                    name,
                    gameType,
                    playerScreenConfig: baseCampaign?.playerScreenConfig,
                  })
                }
                className="w-full border border-card-border rounded-2xl px-4 py-2.5 text-xs font-bold cursor-pointer"
              >
                Customize in Player Studio
              </button>
            )}
          </aside>
        )}
      </div>

      {/* Interactive player sandbox */}
      <AnimatePresence>
        {showSandbox && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm">
            <div
              role="dialog"
              aria-label="Player sandbox"
              className="w-full max-w-[410px] h-[min(92vh,900px)] flex flex-col overflow-hidden rounded-3xl border bg-card-bg border-card-border shadow-2xl"
            >
              <div className="flex items-center justify-between p-3 border-b border-card-border">
                <span className="text-xs font-black flex items-center gap-2">
                  <Smartphone className="w-4 h-4" /> Player sandbox: {name}
                </span>
                <button
                  type="button"
                  onClick={() => setShowSandbox(false)}
                  aria-label="Close sandbox"
                  className="p-2 border border-card-border rounded-xl cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
              <Suspense fallback={<div className="flex-1" />}>
                <CampaignSimulator
                  campaigns={[draftCampaign]}
                  prizeTemplates={prizes}
                  campaignId={draftCampaign.id}
                />
              </Suspense>
            </div>
          </div>
        )}
      </AnimatePresence>

      {/* Sweepstake rules popup */}
      {showRules && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70">
          <div className="w-full max-w-lg max-h-[80vh] overflow-y-auto rounded-3xl bg-card-bg border border-card-border p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="font-black text-lg">Sweepstake rules</h3>
              <button
                type="button"
                onClick={() => setShowRules(false)}
                aria-label="Close"
                className="p-2 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <p className="text-sm whitespace-pre-wrap" dir="auto">
              {w.draw.rules}
            </p>
          </div>
        </div>
      )}

      {/* Live campaign confirmation */}
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
                {editingCampaign.gameType !== gameType && (
                  <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-500 font-bold flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                    <span>
                      Notice: Changing game type from{" "}
                      <strong>{editingCampaign.gameType}</strong> to{" "}
                      <strong>{gameType}</strong> may alter in-progress customer
                      game sessions.
                    </span>
                  </div>
                )}
                <p className="text-brand-textMuted">
                  Existing won rewards and completed player entries will be
                  fully preserved in history.
                </p>
              </div>
              <div className="flex justify-end items-center gap-3 pt-2">
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => setShowLiveConfirmModal(null)}
                  className="px-4 py-2.5 rounded-xl border border-card-border text-xs font-bold cursor-pointer"
                >
                  Go Back
                </button>
                <button
                  type="button"
                  disabled={isSubmitting}
                  onClick={() => executeSave(showLiveConfirmModal)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-black cursor-pointer"
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
