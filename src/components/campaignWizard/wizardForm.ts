// The campaign wizard's form: its shape, its starting values, the rules of each step and
// what is saved. Kept free of React so the rules can be tested on their own.
//
// The campaign has two decoupled layers (ai-assistance-prompts-reports/wizard/issue.md):
// what the player does (engagement: skill, knowledge or luck) and how the outcome is decided
// (reward: an instant win, probabilistic or guaranteed, or a scheduled draw). Both are read
// from the mechanics library (../wizard/mechanicsRegistry) and saved in
// game_logic_config.wizard; each step's rules are the zod schemas of ../wizard/wizardSchemas.
import type { Campaign, PrizeTemplate, QuizQuestion } from "../../types";
import type { GameType } from "../campaigns/campaignMeta";
import {
  CHOICE_MODE_INFO,
  MECHANICS_REGISTRY,
  choicePicks,
  engagementDefaults,
  forcesGuaranteed,
  isQuizEngagement,
  mechanicById,
  resolveGameType,
  wizardFromCampaign,
  type WizardConfig,
} from "../wizard/mechanicsRegistry";
import {
  drawSchema,
  fieldErrors,
  foundationSchema,
  prizesSchema,
  quizSchema,
  skillSchemaFor,
  type FieldErrors,
} from "../wizard/wizardSchemas";

// A prize row of the campaign; rows loaded from an existing campaign keep their id and
// their won count, which the save needs.
export type PrizeLine = Campaign["prizes"][number];

export interface WizardForm {
  name: string;
  brandName: string;
  /** The public link: generated once, never edited (a relaunch gets a new one). */
  slug: string;
  heroImageUrl: string;
  /** "YYYY-MM-DDTHH:mm", as the date-time inputs read and write it. */
  startDate: string;
  endDate: string;
  /** Plays per phone number: "1" to "10", or "unlimited". */
  maxEntries: string;
  /** Not edited in the wizard: kept as it was. */
  arabicName: string;
  /** Both layers: engagement and reward. */
  w: WizardConfig;
  /** Instant win, probabilistic odds without auto-distribution: 1 to 99. */
  winProbability: number;
  /** Instant win, probabilistic odds: the win chance is calculated by AKTERA. */
  autoPace: boolean;
  /** Quiz: every question written so far; the first `questionCount` are played. */
  questions: QuizQuestion[];
  questionCount: number;
  prizes: PrizeLine[];
}

/** What a send to the server is checked against: a draft, or going live. */
export type SaveStatus = "draft" | "active";

export type StepId = 1 | 2 | 3 | 4 | 5;
/** The steps that hold settings, checked before saving. */
export const SETTING_STEPS = [1, 2, 3, 4] as const;

export const WIZARD_STEPS: { id: StepId; label: string; caption: string }[] = [
  { id: 1, label: "Foundation", caption: "Name, brand and dates" },
  { id: 2, label: "Engagement", caption: "What the player does" },
  { id: 3, label: "Reward", caption: "How the outcome is decided" },
  { id: 4, label: "Prizes", caption: "What players win" },
  { id: 5, label: "Review", caption: "Test and launch" },
];

/** What the rules of a step need to know besides the form. */
export interface WizardContext {
  templates: PrizeTemplate[];
  editingCampaign: Campaign | null;
  /** Names of the organization's other campaigns: a new one cannot reuse one. */
  existingNames: string[];
}

const DAY_MS = 24 * 60 * 60 * 1000;
const DEFAULT_RUN_MS = 30 * DAY_MS;
const pad = (n: number) => String(n).padStart(2, "0");
/** A date as the date-time input reads it, in local time. */
export const toDateTimeInput = (date: Date) =>
  `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
// Saved campaigns keep a day only: give it a time so the date-time input can show it.
const fromSaved = (value: string, time: string) =>
  value.includes("T") ? value.slice(0, 16) : `${value}T${time}`;

export const emptyQuestion = (id: string): QuizQuestion => ({
  id,
  questionText: "",
  options: ["", "", ""],
  correctIndex: 0,
});

/** The questions list, grown to `count` with empty questions. */
function withQuestions(questions: QuizQuestion[], count: number) {
  const grown = [...questions];
  while (grown.length < count)
    grown.push(emptyQuestion(`q_${grown.length + 1}`));
  return grown;
}

export function initialWizardForm(
  editingCampaign: Campaign | null | undefined,
  relaunchDraft: Campaign | null | undefined,
  prizes: PrizeTemplate[],
  now: Date = new Date(),
): WizardForm {
  const base = editingCampaign ?? relaunchDraft ?? null;
  const savedQuestions = (base?.questions ?? []).map((question) => ({
    ...question,
    options: [...question.options],
  }));
  const questionCount = Math.min(5, Math.max(1, savedQuestions.length || 3));
  return {
    name: editingCampaign
      ? editingCampaign.name
      : relaunchDraft
        ? `${relaunchDraft.name} (Relaunch)`
        : "",
    brandName: base?.gameLogicConfig?.brand_name ?? "",
    slug:
      editingCampaign?.slug ??
      crypto.randomUUID().replace(/-/g, "").slice(0, 8),
    heroImageUrl: base?.heroImageUrl ?? "",
    startDate: base ? fromSaved(base.startDate, "00:00") : toDateTimeInput(now),
    endDate: base
      ? fromSaved(base.endDate, "23:59")
      : toDateTimeInput(new Date(now.getTime() + DEFAULT_RUN_MS)),
    maxEntries: base?.maxEntries ?? "1",
    arabicName: base?.arabicName ?? "",
    w: wizardFromCampaign(base),
    winProbability:
      base && base.winProbability < 100
        ? Math.min(99, Math.max(1, base.winProbability))
        : 25,
    autoPace: base?.autoPacePrizes ?? true,
    questions: withQuestions(savedQuestions, questionCount),
    questionCount,
    prizes:
      base && base.prizes.length > 0
        ? base.prizes.map((prize) => ({ ...prize }))
        : [{ templateId: prizes[0]?.id || "", quantity: 100, weight: 100 }],
  };
}

/**
 * A new campaign opened on a day picked on the Overview ("YYYY-MM-DD"): it starts that day
 * (now, when it is today) and keeps the usual length.
 */
export function startingOn(
  form: WizardForm,
  day: string,
  now: Date = new Date(),
): WizardForm {
  const [year, month, date] = day.split("-").map(Number);
  if (!year || !month || !date) return form;
  const picked = new Date(year, month - 1, date);
  const start =
    picked.toDateString() === now.toDateString() ? new Date(now) : picked;
  const end = new Date(year, month - 1, date + 30, 23, 59);
  return {
    ...form,
    startDate: toDateTimeInput(start),
    endDate: toDateTimeInput(end),
  };
}

/** A new campaign opened from a quick-start card: the layers that play that game. */
export function playingGame(form: WizardForm, gameType: GameType): WizardForm {
  const engagement = MECHANICS_REGISTRY.find(
    (m) => m.layer === "engagement" && m.gameType === gameType,
  );
  if (engagement) {
    return {
      ...form,
      w: {
        ...form.w,
        category: engagement.category as WizardConfig["category"],
        engagementId: engagement.id,
        ...engagementDefaults(engagement),
      },
    };
  }
  const reveal = MECHANICS_REGISTRY.find(
    (m) => m.layer === "reward" && m.gameType === gameType,
  );
  return reveal
    ? {
        ...form,
        w: {
          ...form.w,
          category: "luck",
          method: "instant",
          revealId: reveal.id,
        },
      }
    : form;
}

export const gameTypeOf = (form: WizardForm) => resolveGameType(form.w);
export const isDraw = (form: WizardForm) => form.w.method === "draw";
/** Guaranteed: picked by the brand, or the only instant win of a preference game. */
export const isGuaranteed = (form: WizardForm) =>
  !isDraw(form) && (form.w.mode === "guaranteed" || forcesGuaranteed(form.w));
/** The quiz's questions, played and saved only by a quiz. */
export const isQuiz = (form: WizardForm) => isQuizEngagement(form.w);
/** Choose Your Brand: its mode and count are saved for the player page. */
export const isChooseBrand = (form: WizardForm) =>
  gameTypeOf(form) === "choose_brand";
/** A draw whose prizes and messages the brand handles itself. */
export const drawHandledByBrand = (form: WizardForm) =>
  isDraw(form) && form.w.draw.manageStock !== true;
export const consolationOn = (form: WizardForm) =>
  !isDraw(form) && !isGuaranteed(form) && form.w.consolation;

export const shownQuestions = (form: WizardForm) =>
  form.questions.slice(0, form.questionCount);

/** Sets how many questions are played; questions past it are kept in case it grows back. */
export const withQuestionCount = (
  form: WizardForm,
  questionCount: number,
): Partial<WizardForm> => ({
  questionCount,
  questions: withQuestions(form.questions, questionCount),
});

export const allocatedPrizeLines = (form: WizardForm) =>
  form.prizes.filter((line) => line.templateId !== "");

export const totalPrizeWeight = (lines: PrizeLine[]) =>
  lines.reduce((sum, line) => sum + Number(line.weight || 0), 0);

export const totalPrizeQuantity = (lines: PrizeLine[]) =>
  lines.reduce(
    (sum, line) => sum + (line.templateId ? Number(line.quantity) || 0 : 0),
    0,
  );

/** Stock that can still be given to this campaign, counting what it already holds. */
export function effectiveAvailableStock(
  template: PrizeTemplate,
  editingCampaign: Campaign | null | undefined,
) {
  const alreadyAllocated = editingCampaign
    ? editingCampaign.prizes
        .filter((prize) => prize.templateId === template.id)
        .reduce((sum, prize) => sum + prize.quantity, 0)
    : 0;
  return Math.min(
    template.totalStock,
    template.availableStock + alreadyAllocated,
  );
}

/**
 * The rules of a step, as { "field.path": message }: each message is shown under the input
 * whose path it carries. Sweepstake rules and draw messages are only required to go live.
 */
export function validateStep(
  form: WizardForm,
  step: StepId,
  status: SaveStatus,
  context: WizardContext,
): FieldErrors {
  const { w } = form;
  if (step === 1) {
    const found = fieldErrors(
      foundationSchema.safeParse({
        name: form.name,
        brandName: form.brandName,
        startDate: form.startDate,
        endDate: form.endDate,
      }),
    );
    const wanted = form.name.trim().toLowerCase();
    if (
      !found.name &&
      context.existingNames.some(
        (other) => other.trim().toLowerCase() === wanted,
      )
    ) {
      found.name = "A campaign with this name already exists.";
    }
    return found;
  }
  if (step === 2 && w.category === "skill") {
    const setup = mechanicById(w.engagementId)?.skill;
    return fieldErrors(
      skillSchemaFor(setup?.scoreMin ?? 1, setup?.scoreMax ?? 500).safeParse({
        targetScore: w.targetScore,
      }),
    );
  }
  if (step === 2 && isQuiz(form)) {
    return fieldErrors(
      quizSchema.safeParse({ questions: shownQuestions(form) }),
    );
  }
  if (step === 3 && isDraw(form)) {
    return fieldErrors(
      drawSchema(status === "active").safeParse({ draw: w.draw }),
    );
  }
  if (step === 4 && drawHandledByBrand(form)) {
    return w.draw.manageStock === null
      ? { manageStock: "Choose yes or no to continue." }
      : {};
  }
  if (step === 4) {
    const stockOf = (id: string) => {
      const template = context.templates.find((t) => t.id === id);
      return template
        ? effectiveAvailableStock(template, context.editingCampaign)
        : undefined;
    };
    const draw = isDraw(form);
    const found = fieldErrors(
      prizesSchema({
        stockOf,
        requireConsolation: consolationOn(form),
        draw: draw
          ? { winners: w.draw.winners, requireSms: status === "active" }
          : undefined,
      }).safeParse({
        prizes: form.prizes,
        consolationPrizes: consolationOn(form) ? w.consolationPrizes : [],
        sms: { winner: w.draw.smsWinner, loser: w.draw.smsLoser },
      }),
    );
    // Aktera manages the draw's stock: every row needs a reward and a quantity.
    if (draw) {
      if (form.prizes.length === 0) found.prizes ??= "Add at least one reward.";
      form.prizes.forEach((line, i) => {
        if (!line.templateId) {
          found[`prizes.${i}.templateId`] ??= "Select a reward.";
        }
        if (!(line.quantity >= 1))
          found[`prizes.${i}.quantity`] ??= "At least 1.";
      });
    }
    return found;
  }
  return {};
}

/** Every setting step's errors; a step with nothing to fix is left out. */
export function validateWizard(
  form: WizardForm,
  status: SaveStatus,
  context: WizardContext,
): Partial<Record<StepId, FieldErrors>> {
  const out: Partial<Record<StepId, FieldErrors>> = {};
  for (const step of SETTING_STEPS) {
    const found = validateStep(form, step, status, context);
    if (Object.keys(found).length > 0) out[step] = found;
  }
  return out;
}

/** The prize rows that are saved: a draw has no weights, every reward is for its winners. */
export function savedPrizeLines(form: WizardForm): PrizeLine[] {
  if (drawHandledByBrand(form)) return [];
  const draw = isDraw(form);
  return form.prizes
    .filter((line) => line.templateId && (!draw || line.quantity > 0))
    .map((line) => (draw ? { ...line, weight: 100 } : line));
}

/** game_logic_config as saved: the rules the server reads, and the wizard's own state. */
export function savedGameLogic(form: WizardForm, base: Campaign | null) {
  const { w } = form;
  return {
    ...(base?.gameLogicConfig ?? {}),
    brand_name: form.brandName.trim(),
    ...(w.category === "skill" && {
      win_threshold: w.targetScore,
      hit_it_duration_seconds: w.durationSeconds,
    }),
    ...(isQuiz(form) && {
      pass_threshold_percentage: w.passPercent,
    }),
    ...(isChooseBrand(form) && {
      choice_mode: w.choiceMode,
      choice_count: w.choiceCount,
    }),
    // A draw that Aktera does not manage keeps no messages.
    wizard: drawHandledByBrand(form)
      ? { ...w, draw: { ...w.draw, smsWinner: "", smsLoser: "" } }
      : w,
  };
}

/** The win chance the server draws with: guaranteed = 100%, a draw = no instant win. */
export const savedWinProbability = (form: WizardForm) =>
  isDraw(form) ? 0 : isGuaranteed(form) ? 100 : form.winProbability;

export const savedAutoPace = (form: WizardForm) =>
  !isDraw(form) && !isGuaranteed(form) && form.autoPace;

/** What the player sandbox plays: the campaign as configured now, even before it is saved. */
export function previewCampaign(
  form: WizardForm,
  base: Campaign | null,
  editingCampaign: Campaign | null,
): Campaign {
  const { w } = form;
  return {
    id: editingCampaign?.id ?? "wizard-preview",
    organizationId: editingCampaign?.organizationId,
    name: form.name,
    arabicName: form.arabicName,
    heroImageUrl: form.heroImageUrl || undefined,
    slug: form.slug,
    gameType: gameTypeOf(form),
    gameLogicConfig: {
      brand_name: form.brandName.trim(),
      win_threshold: w.targetScore,
      hit_it_duration_seconds: w.durationSeconds,
      pass_threshold_percentage: w.passPercent,
      ...(isChooseBrand(form) && {
        choice_mode: w.choiceMode,
        choice_count: w.choiceCount,
      }),
    },
    status: "draft",
    winProbability: isGuaranteed(form) ? 100 : form.winProbability,
    maxEntries: form.maxEntries,
    // Unsaved prizes have no id yet; the sandbox ignores prizes without one.
    prizes: form.prizes
      .filter((line) => line.templateId && line.quantity > 0)
      .map((line, i) => ({ ...line, id: line.id ?? `draft-${i}` })),
    questions: isQuiz(form) ? shownQuestions(form) : [],
    participantsCount: 0,
    rewardsClaimed: 0,
    startDate: form.startDate,
    endDate: form.endDate,
    playerScreenConfig: base?.playerScreenConfig,
  };
}

// ── Labels shared by the review ─────────────────────────────────────────────────

export const formatDateTime = (value: string) =>
  value
    ? new Date(value).toLocaleString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "—";

export const maxEntriesLabel = (maxEntries: string) =>
  maxEntries === "unlimited"
    ? "Unlimited"
    : `${maxEntries} ${maxEntries === "1" ? "play" : "plays"}`;

export function engagementLabel(form: WizardForm) {
  const { w } = form;
  if (w.category === "luck") return "Luck";
  const kind = w.category === "skill" ? "Skill" : "Knowledge";
  return `${kind} · ${mechanicById(w.engagementId)?.label ?? ""}`;
}

export function engagementSettings(form: WizardForm) {
  const { w } = form;
  if (w.category === "skill") {
    const setup = mechanicById(w.engagementId)?.skill;
    return `${w.durationSeconds} s · ${
      setup?.describe(w.targetScore) ?? `${w.targetScore} points to win`
    }`;
  }
  if (isQuiz(form)) {
    return `${form.questionCount} ${form.questionCount === 1 ? "question" : "questions"} · pass at ${w.passPercent}%`;
  }
  if (isChooseBrand(form)) {
    const { label, unit } = CHOICE_MODE_INFO[w.choiceMode];
    const picks = choicePicks(w.choiceMode, w.choiceCount);
    return `${label} · ${w.choiceCount} ${unit} · ${picks} picks per player`;
  }
  return "No game settings";
}

export function rewardModeLabel(form: WizardForm) {
  if (isDraw(form)) return "Draw";
  if (isGuaranteed(form)) return "Guaranteed (100% Gagnant)";
  return form.autoPace
    ? "Probabilistic · auto-distributed"
    : `Probabilistic · ${form.winProbability}%`;
}

export const revealLabel = (form: WizardForm) =>
  mechanicById(form.w.revealId)?.label ?? "—";

export type { FieldErrors, WizardConfig };
