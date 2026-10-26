// Step 2: how often players win, how many times they may play, the game's own setting
// and, for a quiz, its questions.
import {
  AlertTriangle,
  CalendarClock,
  Plus,
  ShieldCheck,
  Trash2,
} from "lucide-react";

import type { QuizQuestion } from "../../types";
import { cn } from "../../lib/utils";
import { campaignDurationDays, gameMeta } from "../campaigns/campaignMeta";
import { CxButton, CxNotice, cxFocus, cxText } from "../campaigns/campaignUi";
import type { StepProps } from "./StepBasics";
import {
  FieldError,
  fieldLabelClass,
  GroupLabel,
  hintClass,
  inputClass,
  rowClass,
  SegmentedChoice,
  StepPanel,
} from "./wizardFields";
import {
  maxEntriesLabel,
  questionIsComplete,
  totalPrizeQuantity,
  type WizardForm,
} from "./wizardForm";

const PASS_SCORES = [
  { value: 25, label: "25% — easy" },
  { value: 50, label: "50% — half correct" },
  { value: 75, label: "75% — demanding" },
  { value: 100, label: "100% — perfect score" },
];

function Switch({
  checked,
  onChange,
  label,
}: {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label: string;
}) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label={label}
      onClick={() => onChange(!checked)}
      className={cn(
        cxFocus,
        "relative h-6 w-11 shrink-0 cursor-pointer rounded-full transition-colors duration-[120ms]",
        checked ? "bg-cx-brand" : "bg-cx-control",
      )}
    >
      <span
        className={cn(
          "absolute left-0.5 top-0.5 size-5 rounded-full bg-cx-surface transition-transform duration-[120ms]",
          checked && "translate-x-5",
        )}
      />
    </button>
  );
}

function QuizBuilder({ form, update, errorFor }: StepProps) {
  const setQuestions = (questions: QuizQuestion[]) => update({ questions });
  const patchQuestion = (index: number, patch: Partial<QuizQuestion>) =>
    setQuestions(
      form.questions.map((question, i) =>
        i === index ? { ...question, ...patch } : question,
      ),
    );
  const addQuestion = () =>
    setQuestions([
      ...form.questions,
      {
        id: `q_${Date.now()}`,
        questionText: "",
        options: ["", "", "", ""],
        correctIndex: 0,
      },
    ]);

  return (
    <StepPanel
      title="Quiz questions"
      description="Write each question, its answers, and mark the correct one."
      actions={
        <CxButton size="sm" onClick={addQuestion}>
          <Plus aria-hidden />
          Add question
        </CxButton>
      }
    >
      {errorFor("questions") && (
        <FieldError>{errorFor("questions")}</FieldError>
      )}
      <ol className="grid grid-cols-1 gap-4">
        {form.questions.map((question, index) => {
          const error = errorFor(`question-${question.id}`);
          return (
            <li
              key={question.id}
              className={cn(
                rowClass,
                "grid grid-cols-1 gap-3",
                error && "border-cx-danger",
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <span className={fieldLabelClass}>
                  Question {index + 1}
                  {questionIsComplete(question) ? null : (
                    <span className="font-medium text-cx-ink-subtle">
                      {" "}
                      — incomplete
                    </span>
                  )}
                </span>
                <CxButton
                  variant="danger"
                  size="sm"
                  iconOnly
                  aria-label={`Remove question ${index + 1}`}
                  disabled={form.questions.length <= 1}
                  title={
                    form.questions.length <= 1
                      ? "A quiz needs at least one question"
                      : undefined
                  }
                  onClick={() =>
                    setQuestions(form.questions.filter((_, i) => i !== index))
                  }
                >
                  <Trash2 aria-hidden />
                </CxButton>
              </div>

              <input
                type="text"
                aria-label={`Question ${index + 1} text`}
                value={question.questionText}
                onChange={(event) =>
                  patchQuestion(index, { questionText: event.target.value })
                }
                placeholder="Type the question"
                className={inputClass()}
              />

              <div
                role="radiogroup"
                aria-label={`Correct answer of question ${index + 1}`}
                className="grid grid-cols-1 gap-2 sm:grid-cols-2"
              >
                {question.options.map((option, optionIndex) => {
                  const isCorrect = question.correctIndex === optionIndex;
                  return (
                    <div
                      key={optionIndex}
                      className={cn(
                        "flex h-10 items-center gap-2 rounded-cx-md border px-2.5 transition-colors duration-[120ms] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-cx-focus",
                        isCorrect
                          ? "border-cx-success bg-cx-success-soft"
                          : "border-cx-control bg-cx-surface",
                      )}
                    >
                      <button
                        type="button"
                        role="radio"
                        aria-checked={isCorrect}
                        aria-label={`Mark answer ${optionIndex + 1} as correct`}
                        title="Mark as the correct answer"
                        onClick={() =>
                          patchQuestion(index, { correctIndex: optionIndex })
                        }
                        className={cn(
                          cxFocus,
                          "grid size-5 shrink-0 cursor-pointer place-items-center rounded-full border-2 transition-colors duration-[120ms]",
                          isCorrect
                            ? "border-cx-success bg-cx-success"
                            : "border-cx-control bg-cx-surface hover:border-cx-success",
                        )}
                      >
                        {isCorrect && (
                          <span className="size-2 rounded-full bg-cx-on-success" />
                        )}
                      </button>
                      <input
                        type="text"
                        aria-label={`Question ${index + 1}, answer ${optionIndex + 1}`}
                        value={option}
                        onChange={(event) =>
                          patchQuestion(index, {
                            options: question.options.map((current, i) =>
                              i === optionIndex ? event.target.value : current,
                            ),
                          })
                        }
                        placeholder={`Answer ${optionIndex + 1}`}
                        className="h-full min-w-0 flex-1 bg-transparent text-sm font-medium text-cx-ink outline-none placeholder:font-normal placeholder:text-cx-ink-subtle"
                      />
                      {isCorrect && (
                        <span className="shrink-0 text-xs font-bold text-cx-success">
                          Correct
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              {error && <FieldError>{error}</FieldError>}
            </li>
          );
        })}
      </ol>
    </StepPanel>
  );
}

export function StepGameRules({
  form,
  update,
  errorFor,
  isLiveCampaign,
  pacingWasEnabled,
}: StepProps & {
  isLiveCampaign: boolean;
  /** Whether the campaign being edited already had daily pacing on. */
  pacingWasEnabled: boolean;
}) {
  const game = gameMeta(form.type);
  const days = campaignDurationDays(form.startDate, form.endDate) ?? 1;
  const totalQuantity = totalPrizeQuantity(form.prizes);
  const playNoun = form.type === "lucky_wheel" ? "spin" : "play";
  const setLogic = (patch: Record<string, number>) =>
    update({ gameLogicConfig: { ...form.gameLogicConfig, ...patch } });
  const hitsNeeded = form.gameLogicConfig.win_threshold ?? 8;
  const passScore = form.gameLogicConfig.pass_threshold_percentage ?? 50;

  return (
    <div className="grid grid-cols-1 gap-6">
      <StepPanel
        title="Winning"
        description="Decide how often a player wins a prize."
      >
        <div
          className={cn(
            rowClass,
            "grid grid-cols-1 gap-3 transition-colors duration-[120ms]",
            form.autoPacePrizes && "border-cx-brand",
          )}
        >
          <div className="flex items-start justify-between gap-4">
            <div className="flex items-start gap-3">
              <CalendarClock
                className="mt-0.5 size-4 shrink-0 text-cx-brand-text"
                aria-hidden
              />
              <div>
                <p className="font-semibold text-cx-ink">
                  Spread prizes evenly over the campaign
                </p>
                <p className={cn(hintClass, "mt-0.5 max-w-xl")}>
                  A daily prize budget is set automatically so the stock lasts
                  all {days} {days === 1 ? "day" : "days"}. The win chance is
                  then managed for you.
                </p>
              </div>
            </div>
            <Switch
              checked={form.autoPacePrizes}
              onChange={(autoPacePrizes) => update({ autoPacePrizes })}
              label="Spread prizes evenly over the campaign"
            />
          </div>
          {form.autoPacePrizes && (
            <p className="border-t border-cx-border pt-3 text-[13px] font-semibold tabular-nums text-cx-brand-text">
              About {(totalQuantity / days).toFixed(1)} prizes per day (
              {totalQuantity} prizes over {days} {days === 1 ? "day" : "days"}
              ).
            </p>
          )}
          {isLiveCampaign && !pacingWasEnabled && form.autoPacePrizes && (
            <CxNotice tone="warning" icon={AlertTriangle}>
              Turning this on mid-campaign paces the prizes not yet won, from
              today onward.
            </CxNotice>
          )}
        </div>

        <div
          className={cn(
            rowClass,
            "grid grid-cols-1 gap-3",
            form.autoPacePrizes && "opacity-60",
          )}
        >
          <div className="flex items-end justify-between gap-3">
            <label htmlFor="wizard-win-chance">
              <span className="block font-semibold text-cx-ink">
                Win chance
              </span>
              <span className={cn(hintClass, "mt-0.5 block")}>
                {form.autoPacePrizes
                  ? "Managed automatically while prizes are spread over the campaign."
                  : `Out of 100 ${playNoun}s, about ${form.winProbability} win a prize.`}
              </span>
            </label>
            <span className={cxText.statValue}>
              {form.autoPacePrizes ? "Auto" : `${form.winProbability}%`}
            </span>
          </div>
          <input
            id="wizard-win-chance"
            type="range"
            min="5"
            max="100"
            step="5"
            disabled={form.autoPacePrizes}
            value={form.winProbability}
            onChange={(event) =>
              update({ winProbability: Number(event.target.value) })
            }
            className={cn(
              cxFocus,
              "h-1.5 w-full cursor-pointer rounded-full accent-cx-brand disabled:cursor-not-allowed",
            )}
          />
          <div
            className={cn(hintClass, "flex justify-between gap-2 tabular-nums")}
          >
            <span>5% · rare wins</span>
            <span>50% · balanced</span>
            <span>100% · everyone wins</span>
          </div>
        </div>
      </StepPanel>

      <StepPanel
        title={`${game.label} settings`}
        description={game.description}
      >
        {form.type === "hit_it" && (
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabelClass}>Hits needed to win</span>
              <input
                type="number"
                min="1"
                max="30"
                value={hitsNeeded}
                onChange={(event) =>
                  setLogic({
                    win_threshold: Math.max(
                      1,
                      parseInt(event.target.value, 10) || 8,
                    ),
                  })
                }
                className={inputClass()}
              />
            </label>
            <p className="text-[13px] leading-5 text-cx-ink-muted">
              Players must hit the target at least{" "}
              <strong className="text-cx-ink">{hitsNeeded} times</strong> in 10
              seconds to enter the prize draw.
            </p>
          </div>
        )}

        {form.type === "quiz" && (
          <div className="grid grid-cols-1 items-center gap-4 sm:grid-cols-2">
            <label className="flex flex-col gap-1.5">
              <span className={fieldLabelClass}>Passing score</span>
              <select
                value={passScore}
                onChange={(event) =>
                  setLogic({
                    pass_threshold_percentage: parseInt(event.target.value, 10),
                  })
                }
                className={inputClass()}
              >
                {PASS_SCORES.map((score) => (
                  <option key={score.value} value={score.value}>
                    {score.label}
                  </option>
                ))}
              </select>
            </label>
            <p className="text-[13px] leading-5 text-cx-ink-muted">
              Players who answer at least{" "}
              <strong className="text-cx-ink">{passScore}%</strong> of the
              questions correctly enter the prize draw.
            </p>
          </div>
        )}

        {(form.type === "lucky_wheel" ||
          form.type === "scratch_card" ||
          form.type === "mystery_box") && (
          <p className="text-[13px] leading-5 text-cx-ink-muted">
            Nothing else to set for this game: the result of each {playNoun} is
            drawn on the server from your win chance and your prizes.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
          <div className="grid grid-cols-1 content-start gap-2">
            <GroupLabel
              hint={`Recommended: 1 ${playNoun}, so prizes reach more customers.`}
            >
              {form.type === "lucky_wheel" ? "Spins" : "Plays"} per phone number
            </GroupLabel>
            <SegmentedChoice<WizardForm["maxEntries"]>
              label="Plays per phone number"
              value={form.maxEntries}
              onChange={(maxEntries) => update({ maxEntries })}
              options={(["1", "2", "unlimited"] as const).map((value) => ({
                value,
                label: maxEntriesLabel(value, form.type),
              }))}
            />
          </div>
          <CxNotice tone="success" icon={ShieldCheck} className="self-start">
            Phone numbers are always checked against the Algerian format (05, 06
            and 07 prefixes).
          </CxNotice>
        </div>
      </StepPanel>

      {form.type === "quiz" && (
        <QuizBuilder form={form} update={update} errorFor={errorFor} />
      )}
    </div>
  );
}
