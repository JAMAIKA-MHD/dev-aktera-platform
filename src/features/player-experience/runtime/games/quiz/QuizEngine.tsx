import { useEffect, useRef, useState } from "react";
import { DEFAULT_RULES } from "../../../domain/campaign";
import { resolveQuizQuestion } from "../../../domain/display";
import { useGameTheme } from "../../../theme/GameTheme";
import { OUTLINE } from "../../../theme/recipes";
import { runtimeAudio } from "../../feedback/audio";
import type { GameEngineProps } from "../types";
import { QuizCardFace } from "./QuizCardFace";

// The quiz (plan §8.6, tasks.md T5.5). It asks the campaign's own questions, in the player's
// language, and sends back what was answered — **indexed by the question's id and the option's
// position in the database**, so a translation can never change the answer that leaves the
// browser. It never marks an answer right or wrong: it does not know, and the correct answers
// are not even in the campaign snapshot it is given (N1).

const TICK_MS = 100;
// A lively theme (motion.games): the chosen answer is stamped and stays in view a moment
// before the next question slides in. It is only "chosen": the engine never knows whether it
// is right (the correct answers never reach the browser), so it never says so. The last three
// seconds of a question tick and turn red.
const CHOSEN_MS = 380;
const LOW_MS = 3000;

export function QuizEngine({
  campaign,
  config,
  phase,
  onInteractionComplete,
  onRevealComplete,
  reducedMotion,
  locale,
}: GameEngineProps) {
  const questions = campaign.quiz;
  const seconds =
    campaign.rules.quiz?.secondsPerQuestion ??
    DEFAULT_RULES.quiz.secondsPerQuestion;
  const timed = seconds > 0;

  const [index, setIndex] = useState(0);
  const [left, setLeft] = useState(seconds * 1000);
  const answers = useRef<Record<string, number>>({});
  const sent = useRef(false);
  const { manifest, assets } = useGameTheme();
  const lively = manifest?.motion.games === "lively" && !reducedMotion;
  const [chosen, setChosen] = useState<number | null>(null);
  const moving = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(moving.current), []);
  const playing = phase === "interacting" && chosen === null;

  // Sending happens once, whether the player answered everything or ran out of time on the
  // last question: an unanswered question is simply missing from `answers` — the server
  // counts it wrong, the engine never does.
  const send = useRef(onInteractionComplete);
  useEffect(() => {
    send.current = onInteractionComplete;
  });
  const finish = () => {
    if (sent.current) return;
    sent.current = true;
    send.current({ kind: "quiz", answers: answers.current });
  };

  const next = () => {
    setChosen(null);
    if (index + 1 >= questions.length) finish();
    else setIndex(index + 1);
  };

  const answer = (questionId: string, option: number) => {
    if (!playing) return;
    answers.current[questionId] = option;
    runtimeAudio.play("click");
    if (!lively) {
      next();
      return;
    }
    setChosen(option);
    moving.current = setTimeout(() => move.current(), CHOSEN_MS);
  };

  // The clock of one question. It restarts with each question, and an exhausted clock moves
  // on without an answer rather than leaving the player stuck (B9).
  const move = useRef(next);
  move.current = next;
  useEffect(() => {
    if (!playing || !timed) return;
    const total = seconds * 1000;
    const started = Date.now();
    setLeft(total);
    let ticked = Math.ceil(total / 1000);
    const timer = setInterval(() => {
      const remaining = total - (Date.now() - started);
      // One tick a second over the last three (a lively theme).
      const second = Math.ceil(remaining / 1000);
      if (lively && remaining > 0 && remaining <= LOW_MS && second < ticked) {
        ticked = second;
        runtimeAudio.play("countdown");
      }
      if (remaining > 0) setLeft(remaining);
      else {
        clearInterval(timer);
        move.current();
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [playing, timed, seconds, index, lively]);

  // A quiz has no reveal of its own: the answers are gone, the result belongs to the screens
  // that follow. It hands the journey back as soon as it is asked to show one.
  const revealComplete = useRef(onRevealComplete);
  useEffect(() => {
    revealComplete.current = onRevealComplete;
  });
  useEffect(() => {
    if (phase === "revealing") revealComplete.current();
  }, [phase]);

  const question = questions[Math.min(index, questions.length - 1)];
  const resolved = question
    ? resolveQuizQuestion(question, config, locale)
    : null;

  return (
    <div
      className="grid size-full min-h-0 place-items-center overflow-y-auto"
      data-xp-game="quiz"
      data-xp-phase={phase}
    >
      <QuizCardFace
        // A new card for each question: it comes in on its own (games.css).
        key={index}
        counter={`${Math.min(index + 1, questions.length)} / ${questions.length}`}
        timeLeft={
          timed && (playing || chosen !== null) ? left / (seconds * 1000) : null
        }
        low={lively ? left <= LOW_MS : undefined}
        progress={
          lively && questions.length > 0
            ? (index + (chosen !== null ? 1 : 0)) / questions.length
            : null
        }
        progressArt={assets?.prizes.star ?? null}
        question={resolved?.text ?? ""}
        options={(resolved?.options ?? []).map((option, position) => (
          <button
            // The option's position in the database is what is sent, whatever language it
            // is read in: the key is that position, never the text.
            key={`${question?.id}-${position}`}
            type="button"
            disabled={!playing}
            onClick={() => answer(question.id, position)}
            dir="auto"
            data-xp-quiz-option
            data-xp-chosen={chosen === position ? "" : undefined}
            className="xp-outlined min-h-[44px] w-full cursor-pointer rounded-[var(--xp-radius-md)] border px-3 py-2 text-start text-[clamp(0.8rem,3.6cqmin,1rem)] font-bold wrap-anywhere transition-colors duration-150 enabled:hover:border-[color:var(--xp-primary)] disabled:cursor-default disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]"
            style={{
              borderColor: `var(--xp-quiz-option-border, ${OUTLINE})`,
              transition: reducedMotion ? "none" : undefined,
            }}
          >
            {option}
          </button>
        ))}
      />
    </div>
  );
}
