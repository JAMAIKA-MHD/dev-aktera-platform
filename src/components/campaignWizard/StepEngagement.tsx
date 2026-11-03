// Step 2, layer 1 (engagement): what the player does. A skill game or a quiz has its own
// settings; luck has none — its mechanic is the way the reward is revealed (step 3).
import { Info, Plus, Trash2 } from "lucide-react";

import type { QuizQuestion } from "../../types";
import { cn } from "../../lib/utils";
import { CxButton, cxFocus } from "../campaigns/campaignUi";
import { GameEmblem } from "../campaigns/GameEmblem";
import {
  mechanicsFor,
  type EngagementCategory,
} from "../wizard/mechanicsRegistry";
import type { StepProps } from "./StepFoundation";
import {
  Field,
  FieldError,
  fieldLabelClass,
  GroupLabel,
  hintClass,
  inputClass,
  OptionCard,
  RangeField,
  rowClass,
  SegmentedChoice,
  StepPanel,
} from "./wizardFields";
import { shownQuestions, withQuestionCount } from "./wizardForm";

export const CATEGORIES: {
  id: EngagementCategory;
  title: string;
  description: string;
}[] = [
  { id: "skill", title: "Skill-based", description: "Performance minigames" },
  {
    id: "knowledge",
    title: "Knowledge-based",
    description: "Trivia and diagnostics",
  },
  { id: "luck", title: "Luck", description: "A chance micro-action" },
];

function QuizQuestions({ form, update, errorFor }: StepProps) {
  const questions = shownQuestions(form);
  const patchQuestion = (index: number, patch: Partial<QuizQuestion>) =>
    update({
      questions: form.questions.map((question, i) =>
        i === index ? { ...question, ...patch } : question,
      ),
    });

  return (
    <ol className="grid grid-cols-1 gap-4">
      {questions.map((question, index) => {
        const textError = errorFor(`questions.${index}.questionText`);
        const listError = errorFor(`questions.${index}.options`);
        return (
          <li
            key={question.id}
            className={cn(
              rowClass,
              "grid grid-cols-1 gap-3",
              (textError || listError) && "border-cx-danger",
            )}
          >
            <span className={fieldLabelClass}>Question {index + 1}</span>
            <input
              type="text"
              aria-label={`Question ${index + 1} text`}
              aria-invalid={textError ? true : undefined}
              value={question.questionText}
              onChange={(event) =>
                patchQuestion(index, { questionText: event.target.value })
              }
              placeholder="e.g. Which year was our first store opened?"
              className={inputClass(Boolean(textError))}
            />
            {textError && <FieldError>{textError}</FieldError>}

            <p className={hintClass}>2 to 4 answers. Mark the correct one.</p>
            <div
              role="radiogroup"
              aria-label={`Correct answer of question ${index + 1}`}
              className="grid grid-cols-1 gap-2 sm:grid-cols-2"
            >
              {question.options.map((option, optionIndex) => {
                const isCorrect = question.correctIndex === optionIndex;
                const optionError = errorFor(
                  `questions.${index}.options.${optionIndex}`,
                );
                return (
                  <div key={optionIndex} className="grid grid-cols-1 gap-1">
                    <div
                      className={cn(
                        "flex h-10 items-center gap-2 rounded-cx-md border px-2.5 transition-colors duration-[120ms] focus-within:outline-2 focus-within:outline-offset-2 focus-within:outline-cx-focus",
                        optionError
                          ? "border-cx-danger bg-cx-surface"
                          : isCorrect
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
                        aria-invalid={optionError ? true : undefined}
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
                      {question.options.length > 2 && (
                        <CxButton
                          variant="danger"
                          size="sm"
                          iconOnly
                          aria-label={`Remove answer ${optionIndex + 1} of question ${index + 1}`}
                          className="-mr-1.5 size-7"
                          onClick={() =>
                            patchQuestion(index, {
                              options: question.options.filter(
                                (_, i) => i !== optionIndex,
                              ),
                              correctIndex:
                                question.correctIndex === optionIndex
                                  ? 0
                                  : question.correctIndex > optionIndex
                                    ? question.correctIndex - 1
                                    : question.correctIndex,
                            })
                          }
                        >
                          <Trash2 aria-hidden />
                        </CxButton>
                      )}
                    </div>
                    {optionError && <FieldError>{optionError}</FieldError>}
                  </div>
                );
              })}
            </div>
            {listError && <FieldError>{listError}</FieldError>}
            {question.options.length < 4 && (
              <CxButton
                size="sm"
                className="justify-self-start"
                onClick={() =>
                  patchQuestion(index, { options: [...question.options, ""] })
                }
              >
                <Plus aria-hidden />
                Add answer
              </CxButton>
            )}
          </li>
        );
      })}
    </ol>
  );
}

export function StepEngagement({ form, update, errorFor }: StepProps) {
  const { w } = form;
  const patch = (changes: Partial<typeof w>) =>
    update({ w: { ...w, ...changes } });

  return (
    <div className="grid grid-cols-1 gap-6">
      <StepPanel
        title="What does the player do?"
        description="This is separate from how the reward is decided, which comes next."
      >
        <div
          role="radiogroup"
          aria-label="Engagement"
          className="grid grid-cols-1 gap-3 sm:grid-cols-3"
        >
          {CATEGORIES.map((category) => (
            <OptionCard
              key={category.id}
              selected={w.category === category.id}
              title={category.title}
              description={category.description}
              onSelect={() =>
                patch({
                  category: category.id,
                  engagementId:
                    mechanicsFor("engagement", category.id).find(
                      (m) => m.gameType,
                    )?.id ?? w.engagementId,
                })
              }
            />
          ))}
        </div>

        {w.category === "luck" && (
          <div className="flex items-start gap-3 rounded-cx-md bg-cx-brand-soft px-4 py-3 text-[13px] leading-5 text-cx-ink">
            <Info
              className="mt-0.5 size-4 shrink-0 text-cx-brand-text"
              aria-hidden
            />
            <p>
              <strong>No game settings for luck.</strong> You choose the luck
              mechanic (Wheel of Fortune, Scratch Card or Mystery Box) in the
              next step, as the way the reward is revealed.
            </p>
          </div>
        )}
      </StepPanel>

      {w.category !== "luck" && (
        <StepPanel
          title={w.category === "skill" ? "Choose a game" : "Choose a format"}
          description="From the mechanics library. New mechanics appear here automatically."
        >
          <div
            role="radiogroup"
            aria-label={w.category === "skill" ? "Game" : "Format"}
            className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-3"
          >
            {mechanicsFor("engagement", w.category).map((mechanic) => (
              <OptionCard
                key={mechanic.id}
                selected={w.engagementId === mechanic.id}
                disabled={!mechanic.gameType}
                badge={mechanic.gameType ? undefined : "Soon"}
                title={mechanic.label}
                icon={
                  mechanic.gameType && (
                    <GameEmblem gameType={mechanic.gameType} size={36} />
                  )
                }
                onSelect={() => patch({ engagementId: mechanic.id })}
              />
            ))}
          </div>
        </StepPanel>
      )}

      {w.category === "skill" && (
        <StepPanel
          title="Game settings"
          description="How long a game lasts and the score a player needs to win."
        >
          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
            <RangeField
              label="Game duration"
              value={w.durationSeconds}
              min={10}
              max={60}
              step={5}
              unit=" s"
              onChange={(durationSeconds) => patch({ durationSeconds })}
            />
            <Field
              label="Target score to win"
              required
              hint={`Players reach ${w.targetScore || "…"} points in ${w.durationSeconds} seconds to win.`}
              error={errorFor("targetScore")}
            >
              {(props) => (
                <input
                  {...props}
                  type="number"
                  min={1}
                  value={Number.isNaN(w.targetScore) ? "" : w.targetScore}
                  onChange={(event) =>
                    patch({ targetScore: event.target.valueAsNumber })
                  }
                  className={inputClass(Boolean(errorFor("targetScore")))}
                />
              )}
            </Field>
          </div>
        </StepPanel>
      )}

      {w.category === "knowledge" && (
        <StepPanel
          title="Quiz settings"
          description="How many questions players answer and the score they need to win."
        >
          <div className="grid grid-cols-1 items-start gap-5 md:grid-cols-2">
            <div className="grid grid-cols-1 gap-2">
              <GroupLabel>Number of questions</GroupLabel>
              <SegmentedChoice
                label="Number of questions"
                value={String(form.questionCount)}
                onChange={(count) =>
                  update(withQuestionCount(form, Number(count)))
                }
                options={["1", "2", "3", "4", "5"].map((value) => ({
                  value,
                  label: value,
                }))}
              />
            </div>
            <RangeField
              label="Minimum passing score"
              hint={`Players who answer at least ${w.passPercent}% of the questions correctly win.`}
              value={w.passPercent}
              min={0}
              max={100}
              step={5}
              unit="%"
              onChange={(passPercent) => patch({ passPercent })}
            />
          </div>
          <QuizQuestions form={form} update={update} errorFor={errorFor} />
        </StepPanel>
      )}
    </div>
  );
}
