import { useEffect, useState } from "react";
import { buildDefaultChoiceRounds } from "../../../domain/defaults";
import { resolveText } from "../../../domain/locale";
import type { ChoiceRound } from "../../../domain/types";
import { tint } from "../../../theme/recipes";
import { TeaserShell } from "../TeaserShell";
import type { GameTeaserProps } from "../types";
import { ChoiceCard, type ChoiceSide } from "./ChoiceCard";

// Pregame teaser of Choose Your Brand (plan §8.7): the brand's own first rounds on a loop —
// one side lights up, then the next round comes in — marked "Démo". No round is being played
// and nothing here is picked for the player (rule 2), nor won (rule 1).

const STEP_MS = 1100;
const SHOWN_ROUNDS = 3;

export function ChooseBrandTeaser(props: GameTeaserProps) {
  const { settings, config, locale, reducedMotion, active } = props;
  const still = reducedMotion || settings.teaser.mode === "static";
  const [step, setStep] = useState(0);
  const [fallbackRounds] = useState(buildDefaultChoiceRounds);

  useEffect(() => {
    if (still || !active) return; // paused where it is (rule 4)
    const timer = setInterval(() => setStep((value) => value + 1), STEP_MS);
    return () => clearInterval(timer);
  }, [still, active]);

  const all: ChoiceRound[] = settings.chooseBrand?.rounds?.length
    ? settings.chooseBrand.rounds
    : fallbackRounds;
  const shown = all.slice(0, SHOWN_ROUNDS);
  // Two beats per round: both sides, then one of them lit (left, then right, in turn).
  const round = still ? shown[0] : shown[Math.floor(step / 2) % shown.length];
  const lit: ChoiceSide | null =
    still || step % 2 === 0
      ? null
      : Math.floor(step / 2) % 2 === 0
        ? "left"
        : "right";
  const text = (value: Parameters<typeof resolveText>[0]) =>
    resolveText(value, locale, config.locales.default);

  return (
    <TeaserShell {...props}>
      <span
        className="relative block w-full"
        data-xp-game-teaser="choose_brand"
        data-xp-still={still ? "" : undefined}
      >
        <span className="mb-2 flex justify-end">
          {/* Said plainly: this is a demonstration, not a round (plan §8.7). */}
          <span
            className="rounded-full border px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.18em]"
            style={{ borderColor: tint("--xp-text", 20) }}
          >
            Démo
          </span>
        </span>
        <span
          dir="ltr"
          key={round.id}
          className="mx-auto grid w-[min(76cqw,20rem)] grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] items-center gap-[clamp(0.4rem,2.5cqmin,0.75rem)]"
        >
          {(["left", "right"] as const).map((side) => (
            <span
              key={side}
              className="block aspect-[3/4]"
              style={{ gridColumn: side === "left" ? 1 : 3, gridRow: 1 }}
            >
              <ChoiceCard
                option={round[side]}
                label={text(round[side].label)}
                side={side}
                state={
                  lit === null ? "idle" : lit === side ? "picked" : "dropped"
                }
              />
            </span>
          ))}
          <span
            aria-hidden
            className="xp-choice-vs w-[clamp(1.75rem,9cqmin,2.5rem)]"
            style={{ gridColumn: 2, gridRow: 1 }}
          >
            VS
          </span>
        </span>
      </span>
    </TeaserShell>
  );
}
