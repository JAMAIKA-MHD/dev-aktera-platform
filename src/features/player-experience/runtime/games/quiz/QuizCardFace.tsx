import type { ReactNode } from "react";
import { cardStyle, tint } from "../../../theme/recipes";

// Little time left on a question: the ring turns to the theme's warning color and beats.
export const QUIZ_LOW_TIME = 0.25;

// The question card, drawn once and shared by the engine and the pregame teaser (plan §8.7):
// the counter, the timer ring when the campaign has one, the question, and the options
// underneath. Pure drawing — the teaser hands it questions marks instead of a real question,
// and never a correct answer (there is none to hand: the campaign snapshot holds none).

export interface QuizCardFaceProps {
  counter: string; // "2 / 3"
  // 0 to 1, how much of the question's time is left. Null when the campaign has no timer.
  timeLeft: number | null;
  question: ReactNode;
  options: ReactNode;
}

export function QuizCardFace({
  counter,
  timeLeft,
  question,
  options,
}: QuizCardFaceProps) {
  return (
    <div
      data-xp-quiz
      className="xp-quiz-card flex w-full max-w-[min(100cqw,34rem)] flex-col gap-[clamp(0.6rem,3cqmin,1.1rem)] border p-[clamp(0.75rem,4cqmin,1.25rem)]"
      style={cardStyle}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          data-xp-quiz-counter
          className="rounded-full border px-3 py-1 text-xs font-extrabold tracking-[0.12em]"
          style={{
            backgroundColor: "var(--xp-quiz-counter-bg, transparent)",
            color: "var(--xp-quiz-counter-text, inherit)",
            borderColor: `var(--xp-quiz-counter-border, ${tint("--xp-primary", 40)})`,
            fontFamily: "var(--xp-quiz-counter-font, inherit)",
          }}
        >
          {counter}
        </span>
        {timeLeft !== null && (
          <span
            aria-hidden
            data-xp-quiz-timer
            data-xp-low={timeLeft <= QUIZ_LOW_TIME ? "" : undefined}
            className="xp-quiz-timer relative grid size-[clamp(2rem,9cqmin,2.75rem)] shrink-0 place-items-center rounded-full"
            style={{
              // The ring empties as the time runs out — a picture of the clock, not a number.
              background: `conic-gradient(var(--xp-quiz-timer-now) ${(timeLeft * 360).toFixed(0)}deg, var(--xp-quiz-timer-track, ${tint("--xp-text", 12)}) 0)`,
            }}
          >
            <span
              className="size-[72%] rounded-full"
              style={{
                backgroundColor: "var(--xp-card-bg, var(--xp-surface))",
              }}
            />
          </span>
        )}
      </div>

      <p
        dir="auto"
        data-xp-clamp
        className="text-[clamp(0.95rem,4.4cqmin,1.3rem)] leading-snug font-extrabold wrap-anywhere"
        style={{
          color: "var(--xp-quiz-question, inherit)",
          fontFamily: "var(--xp-quiz-question-font, inherit)",
        }}
      >
        {question}
      </p>

      {/* One column, two as soon as the card is wide enough for them (plan §8.6). */}
      <div className="xp-quiz-options grid gap-2">{options}</div>
    </div>
  );
}
