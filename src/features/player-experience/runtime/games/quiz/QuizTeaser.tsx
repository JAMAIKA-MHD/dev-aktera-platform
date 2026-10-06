import { useEffect, useState } from "react";
import { DEFAULT_RULES } from "../../../domain/campaign";
import { tint } from "../../../theme/recipes";
import { TeaserShell } from "../TeaserShell";
import type { GameTeaserProps } from "../types";
import { QuizCardFace } from "./QuizCardFace";

// Pregame teaser of the quiz (plan §8.7): the very card the player will answer on — the same
// counter, the same timer ring when the campaign has one — but **never the text of a real
// question** (rule 1). Reading one here would hand out thinking time before the clock starts,
// so the question and its options are question marks. It shows the game, not a head start.

const CYCLE_MS = 2600;
const TICK_MS = 120;

export function QuizTeaser(props: GameTeaserProps) {
  const { settings, campaign, reducedMotion, active } = props;
  const still = reducedMotion || settings.teaser.mode === "static";
  const total = Math.max(campaign.quiz.length, 1);
  const timed =
    (campaign.rules.quiz?.secondsPerQuestion ??
      DEFAULT_RULES.quiz.secondsPerQuestion) > 0;
  const [elapsed, setElapsed] = useState(0);

  useEffect(() => {
    if (still || !active) return; // paused where it is (rule 4)
    const timer = setInterval(
      () => setElapsed((value) => value + TICK_MS),
      TICK_MS,
    );
    return () => clearInterval(timer);
  }, [still, active]);

  const step = Math.floor(elapsed / CYCLE_MS);
  const left = 1 - (elapsed % CYCLE_MS) / CYCLE_MS;

  return (
    <TeaserShell {...props}>
      <QuizCardFace
        counter={`${(step % total) + 1} / ${total}`}
        timeLeft={timed && !still ? left : null}
        question={
          <span aria-hidden className="tracking-[0.3em]">
            ? ? ? ? ?
          </span>
        }
        options={Array.from({ length: 3 }, (_, option) => (
          <span
            key={option}
            aria-hidden
            className="grid min-h-[44px] place-items-center rounded-[var(--xp-radius-md)] border text-sm font-black"
            style={{ borderColor: tint("--xp-text", 14) }}
          >
            ?
          </span>
        ))}
      />
    </TeaserShell>
  );
}
