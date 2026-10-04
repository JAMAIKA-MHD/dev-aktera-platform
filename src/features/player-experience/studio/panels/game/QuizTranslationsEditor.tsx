import type { QuizQuestionTranslation } from "../../../domain/types";
import { countTranslated } from "../../../domain/quizTranslation";
import { LOCALE_LABELS } from "../LanguagesSection";
import { useStudio } from "../../StudioContext";
import { PanelIssues, PanelSection } from "../PanelLayout";
import { QuizQuestionCard } from "./QuizQuestionCard";
import { useCampaignView } from "./useCampaignView";

// Quiz translations (plan §6.6, tasks.md T6.11): every question of the campaign, in its order,
// with a translation per language the players are offered. The questions themselves, their
// options and the right answer are the campaign's: never shown or edited here.

export function QuizTranslationsEditor() {
  const { campaign } = useCampaignView();
  const translations = useStudio(
    (state) => state.config.game.quiz?.translations ?? {},
  );
  const locales = useStudio((state) => state.config.locales);
  const updateGame = useStudio((state) => state.updateGame);
  // The database text counts as the default language: the others need a translation.
  const others = locales.enabled.filter((locale) => locale !== locales.default);

  const set = (id: string) => (next: QuizQuestionTranslation | null) => {
    const copy = { ...translations };
    if (next) copy[id] = next;
    else delete copy[id];
    updateGame({ quiz: { translations: copy } });
  };

  return (
    <PanelSection
      title="Question translations"
      description="The questions come from the campaign. Word them for players in each language you offer."
    >
      <PanelIssues prefixes={["game.quiz"]} />
      <div className="flex flex-wrap items-center gap-2">
        {others.map((locale) => {
          const done = countTranslated(campaign.quiz, translations, locale);
          const all = done === campaign.quiz.length;
          return (
            <span
              key={locale}
              className={`rounded-full px-2.5 py-1 text-[11px] font-bold tabular-nums ${
                all
                  ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-500/10 dark:text-emerald-300"
                  : "bg-card-bg-subtle text-brand-text-muted ring-1 ring-card-border"
              }`}
            >
              {done}/{campaign.quiz.length} questions translated in{" "}
              {LOCALE_LABELS[locale]}
            </span>
          );
        })}
      </div>
      {others.length === 0 && (
        <p className="text-xs text-brand-text-muted">
          Players are only offered the campaign&apos;s language. Offer Arabic or
          English in Content › Languages to translate the questions.
        </p>
      )}
      {others.length > 0 &&
        campaign.quiz.map((question, index) => (
          <QuizQuestionCard
            key={question.id}
            question={question}
            index={index}
            translation={translations[question.id]}
            onChange={set(question.id)}
          />
        ))}
    </PanelSection>
  );
}
