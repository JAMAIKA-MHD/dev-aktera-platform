import { CheckCheck, History } from "lucide-react";
import type { CampaignQuizQuestion } from "../../../domain/campaign";
import { resolveText, type LocalizedText } from "../../../domain/locale";
import {
  editTranslation,
  isOutdated,
  markReviewed,
} from "../../../domain/quizTranslation";
import type { QuizQuestionTranslation } from "../../../domain/types";
import { LocalizedTextField } from "../../fields/LocalizedTextField";
import { useStudio } from "../../StudioContext";
import { useTextLocale } from "../useTextLocale";

// One question of the campaign, and its translations (tasks.md T6.11). The source, as typed in
// the Wizard, is read-only here, without its right answer; the brand translates the
// question and each option, in the database order, and can neither add, remove nor reorder an
// option — so the answer a player sends never depends on the language.

const same = (text: string): LocalizedText => ({
  fr: text,
  ar: text,
  en: text,
});

export function QuizQuestionCard({
  question,
  index,
  translation,
  onChange,
}: {
  question: CampaignQuizQuestion;
  index: number;
  translation: QuizQuestionTranslation | undefined;
  onChange: (next: QuizQuestionTranslation | null) => void;
}) {
  // The campaign text is the default language: only the other languages are translated.
  const { locales, locale, onLocaleChange } = useTextLocale();
  const defaultLocale = useStudio((state) => state.config.locales.default);
  const textLocale = {
    locales: locales.filter((candidate) => candidate !== defaultLocale),
    locale,
    onLocaleChange,
  };
  const outdated = isOutdated(question, translation);
  const path = `game.quiz.translations.${question.id}`;

  return (
    <div
      className="space-y-3 rounded-2xl border border-card-border bg-card-bg p-3 shadow-sm"
      data-studio-path={path}
    >
      <div className="flex items-center gap-2">
        <span className="flex-1 text-xs font-bold text-brand-text">
          Question {index + 1}
        </span>
        {outdated && (
          <span className="flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase tracking-wider text-amber-800 dark:bg-amber-500/15 dark:text-amber-300">
            <History className="size-3" aria-hidden />
            Outdated
          </span>
        )}
      </div>

      <div
        className="space-y-1.5 rounded-xl bg-card-bg-subtle p-3 ring-1 ring-card-border"
        aria-label="In the campaign"
      >
        <p className="text-[10px] font-black uppercase tracking-wider text-brand-text-muted">
          In the campaign
        </p>
        <p dir="auto" className="text-sm font-semibold text-brand-text">
          {question.text}
        </p>
        <ol className="flex flex-wrap gap-1">
          {question.options.map((option, at) => (
            <li
              key={at}
              dir="auto"
              className="flex items-center gap-1 rounded-md bg-card-bg px-2 py-0.5 text-xs text-brand-text-muted ring-1 ring-card-border"
            >
              {option}
            </li>
          ))}
        </ol>
      </div>

      {outdated && translation && (
        <div
          role="group"
          aria-label="Review translation"
          className="space-y-2 rounded-xl border border-amber-300 bg-amber-50 p-3 text-xs text-amber-950 dark:border-amber-500/40 dark:bg-amber-500/10 dark:text-amber-100"
        >
          <p className="font-semibold">
            The question changed in the campaign settings. Players see the
            campaign text until you review this translation.
          </p>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <p className="font-black uppercase tracking-wider opacity-70">
                Now in the campaign
              </p>
              <p dir="auto">{question.text}</p>
            </div>
            <div>
              <p className="font-black uppercase tracking-wider opacity-70">
                Your translation
              </p>
              <p dir="auto">
                {resolveText(translation.text, textLocale.locale) || "—"}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onChange(markReviewed(question, translation))}
            className="flex min-h-10 items-center gap-1.5 rounded-xl bg-amber-500 px-3 font-bold text-amber-950 transition hover:bg-amber-400 active:scale-95"
          >
            <CheckCheck className="size-4" aria-hidden />
            Mark as reviewed
          </button>
        </div>
      )}

      <LocalizedTextField
        label="Question"
        path={`${path}.text`}
        value={translation?.text ?? {}}
        placeholder={same(question.text)}
        onChange={(text) =>
          onChange(editTranslation(question, translation, { text }))
        }
        multiline
        maxChars={160}
        {...textLocale}
      />
      {question.options.map((option, at) => (
        <LocalizedTextField
          key={at}
          label={`Option ${at + 1}`}
          path={`${path}.options.${at}`}
          value={translation?.options[at] ?? {}}
          placeholder={same(option)}
          onChange={(text) =>
            onChange(
              editTranslation(question, translation, {
                option: { index: at, text },
              }),
            )
          }
          maxChars={60}
          {...textLocale}
        />
      ))}
    </div>
  );
}
