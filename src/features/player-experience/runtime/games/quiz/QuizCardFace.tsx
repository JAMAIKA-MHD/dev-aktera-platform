import type { ReactNode } from "react";
import { cardStyle, tint } from "../../../theme/recipes";

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
      className="flex w-full max-w-[min(100cqw,34rem)] flex-col gap-[clamp(0.6rem,3cqmin,1.1rem)] border p-[clamp(0.75rem,4cqmin,1.25rem)]"
      style={cardStyle}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          className="rounded-full border px-3 py-1 text-xs font-extrabold tracking-[0.12em]"
          style={{ borderColor: tint("--xp-primary", 40) }}
        >
          {counter}
        </span>
        {timeLeft !== null && (
          <span
            aria-hidden
            data-xp-quiz-timer
            className="relative grid size-[clamp(2rem,9cqmin,2.75rem)] shrink-0 place-items-center rounded-full"
            style={{
              // The ring empties as the time runs out — a picture of the clock, not a number.
              background: `conic-gradient(var(--xp-primary) ${(timeLeft * 360).toFixed(0)}deg, ${tint("--xp-text", 12)} 0)`,
            }}
          >
            <span
              className="size-[72%] rounded-full"
              style={{ backgroundColor: "var(--xp-surface)" }}
            />
          </span>
        )}
      </div>

      <p
        dir="auto"
        data-xp-clamp
        className="text-[clamp(0.95rem,4.4cqmin,1.3rem)] leading-snug font-extrabold wrap-anywhere"
      >
        {question}
      </p>

      {/* One column, two as soon as the card is wide enough for them (plan §8.6). */}
      <div className="xp-quiz-options grid gap-2">{options}</div>
    </div>
  );
}
