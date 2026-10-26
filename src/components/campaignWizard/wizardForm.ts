// The campaign wizard's form: its shape, its starting values and the rules a campaign must
// pass before it can be saved. Kept free of React so the rules can be tested on their own.
import type { Campaign, PrizeTemplate, QuizQuestion } from "../../types";
import { campaignDurationDays, type GameType } from "../campaigns/campaignMeta";

// A prize row of the campaign; rows loaded from an existing campaign keep their id and
// their won count, which the save needs.
export type PrizeLine = Campaign["prizes"][number];

export interface WizardForm {
  name: string;
  arabicName: string;
  heroImageUrl: string;
  slug: string;
  type: GameType;
  gameLogicConfig: any;
  startDate: string;
  endDate: string;
  winProbability: number;
  autoPacePrizes: boolean;
  maxEntries: "1" | "2" | "unlimited";
  prizes: PrizeLine[];
  questions: QuizQuestion[];
}

export type StepId = 1 | 2 | 3 | 4;

export const WIZARD_STEPS: { id: StepId; label: string; caption: string }[] = [
  { id: 1, label: "Basics", caption: "Game, name and dates" },
  { id: 2, label: "Game rules", caption: "How players win" },
  { id: 3, label: "Prizes", caption: "What players win" },
  { id: 4, label: "Review", caption: "Check and launch" },
];

export interface WizardIssue {
  step: 1 | 2 | 3;
  /** Identifies the input the message belongs to. */
  field: string;
  message: string;
}

const isoDay = (date: Date) => date.toISOString().split("T")[0];

export function initialWizardForm(
  editingCampaign: Campaign | null | undefined,
  relaunchDraft: Campaign | null | undefined,
  prizes: PrizeTemplate[],
): WizardForm {
  const base = editingCampaign ?? relaunchDraft ?? null;
  return {
    name: editingCampaign
      ? editingCampaign.name
      : relaunchDraft
        ? `${relaunchDraft.name} (Relaunch)`
        : "",
    arabicName: base?.arabicName ?? "",
    heroImageUrl: base?.heroImageUrl ?? "",
    slug: editingCampaign
      ? editingCampaign.slug
      : relaunchDraft
        ? `${relaunchDraft.slug}-relaunch`
        : "",
    type: base?.gameType ?? "lucky_wheel",
    gameLogicConfig: base?.gameLogicConfig ?? {
      win_threshold: 8,
      pass_threshold_percentage: 50,
    },
    startDate: base?.startDate ?? isoDay(new Date()),
    endDate:
      base?.endDate ?? isoDay(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)),
    winProbability: base ? base.winProbability : 60,
    autoPacePrizes: base?.autoPacePrizes ?? false,
    maxEntries: base?.maxEntries ?? "1",
    prizes: base
      ? base.prizes.map((prize) => ({ ...prize }))
      : [{ templateId: prizes[0]?.id || "", quantity: 100, weight: 100 }],
    questions:
      base?.questions && base.questions.length > 0
        ? base.questions.map((question) => ({
            ...question,
            options: [...question.options],
          }))
        : [
            {
              id: "q_1",
              questionText: "What is the local calling code for Algeria?",
              options: ["+213", "+212", "+216", "+20"],
              correctIndex: 0,
            },
          ],
  };
}

/** "Ramadan Super Spin 2026!" -> "ramadan-super-spin-2026". */
export const slugify = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

/** What can be typed in the link field: like slugify, but a trailing "-" may still be typed. */
export const sanitizeSlugInput = (text: string) =>
  text
    .toLowerCase()
    .replace(/[^a-z0-9-]+/g, "-")
    .replace(/-{2,}/g, "-")
    .replace(/^-+/, "");

export const allocatedPrizeLines = (form: WizardForm) =>
  form.prizes.filter((line) => line.templateId !== "");

export const totalPrizeWeight = (lines: PrizeLine[]) =>
  lines.reduce((sum, line) => sum + Number(line.weight || 0), 0);

export const totalPrizeQuantity = (lines: PrizeLine[]) =>
  lines.reduce((sum, line) => sum + (Number(line.quantity) || 0), 0);

export const questionIsComplete = (question: QuizQuestion) =>
  question.questionText.trim() !== "" &&
  question.options.every((option) => option.trim() !== "");

/** Everything that blocks saving, in the order of the steps. Empty when the form is valid. */
export function validateWizard(form: WizardForm): WizardIssue[] {
  const issues: WizardIssue[] = [];

  if (!form.name.trim()) {
    issues.push({
      step: 1,
      field: "name",
      message: "Give the campaign a name.",
    });
  }
  if (!form.slug.trim()) {
    issues.push({
      step: 1,
      field: "slug",
      message: "Choose the link players will open.",
    });
  }
  if (campaignDurationDays(form.startDate, form.endDate) === null) {
    issues.push({
      step: 1,
      field: "dates",
      message: "The end date must be on or after the start date.",
    });
  }

  if (form.type === "quiz") {
    if (form.questions.length === 0) {
      issues.push({
        step: 2,
        field: "questions",
        message: "A quiz needs at least one question.",
      });
    }
    form.questions.forEach((question, index) => {
      if (!questionIsComplete(question)) {
        issues.push({
          step: 2,
          field: `question-${question.id}`,
          message: `Question ${index + 1} needs its text and every answer filled in.`,
        });
      }
    });
  }

  const lines = allocatedPrizeLines(form);
  if (lines.length === 0) {
    issues.push({
      step: 3,
      field: "prizes",
      message: "Add at least one prize.",
    });
  } else if (totalPrizeWeight(lines) <= 0) {
    issues.push({
      step: 3,
      field: "weights",
      message: "At least one prize needs a weight above 0.",
    });
  }

  return issues;
}

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

export const maxEntriesLabel = (
  maxEntries: WizardForm["maxEntries"],
  type: GameType,
) => {
  const noun = type === "lucky_wheel" ? "spin" : "play";
  return maxEntries === "unlimited"
    ? "Unlimited"
    : `${maxEntries} ${noun}${maxEntries === "1" ? "" : "s"}`;
};
