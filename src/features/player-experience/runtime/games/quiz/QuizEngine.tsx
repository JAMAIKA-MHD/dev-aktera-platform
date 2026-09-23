import { useEffect, useRef, useState } from "react";
import { DEFAULT_RULES } from "../../../domain/campaign";
import { resolveQuizQuestion } from "../../../domain/display";
import { tint } from "../../../theme/recipes";
import { runtimeAudio } from "../../feedback/audio";
import type { GameEngineProps } from "../types";
import { QuizCardFace } from "./QuizCardFace";

// The quiz (plan §8.6, tasks.md T5.5). It asks the campaign's own questions, in the player's
// language, and sends back what was answered — **indexed by the question's id and the option's
// position in the database**, so a translation can never change the answer that leaves the
// browser. It never marks an answer right or wrong: it does not know, and the correct answers
// are not even in the campaign snapshot it is given (N1).

const TICK_MS = 100;

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
  const playing = phase === "interacting";

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
    if (index + 1 >= questions.length) finish();
    else setIndex(index + 1);
  };

  const answer = (questionId: string, option: number) => {
    if (!playing) return;
    answers.current[questionId] = option;
    runtimeAudio.play("click");
    next();
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
    const timer = setInterval(() => {
      const remaining = total - (Date.now() - started);
      if (remaining > 0) setLeft(remaining);
      else {
        clearInterval(timer);
        move.current();
      }
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [playing, timed, seconds, index]);

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
        counter={`${Math.min(index + 1, questions.length)} / ${questions.length}`}
        timeLeft={timed && playing ? left / (seconds * 1000) : null}
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
            className="min-h-[44px] w-full cursor-pointer rounded-[var(--xp-radius-md)] border px-3 py-2 text-start text-[clamp(0.8rem,3.6cqmin,1rem)] font-bold wrap-anywhere transition-colors duration-150 enabled:hover:border-[color:var(--xp-primary)] disabled:cursor-default disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]"
            style={{
              borderColor: tint("--xp-text", 14),
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
