import { useEffect, useState } from "react";
import { DEFAULT_MEMORY_FACES } from "../../../domain/defaults";
import { tint } from "../../../theme/recipes";
import { TeaserShell } from "../TeaserShell";
import type { GameTeaserProps } from "../types";
import { MemoryCard, type CardState } from "./MemoryCard";

// Pregame teaser of Memory Match (plan §8.7): six of the brand's own cards on a loop — one is
// turned, its twin is found, the pair stays lit — marked "Démo". No board is being played and
// nothing here can be won (rule 1) or played (rule 2).

const STEP_MS = 640;
const PAIRS = 3;
const STEPS_PER_PAIR = 3; // first card, its twin, the pair stays lit
const CYCLE = PAIRS * STEPS_PER_PAIR + 2; // and a short rest before it starts over

// Two rows of three: every card sits across the board from its twin.
const POSITIONS = [0, 1, 2, 0, 1, 2];

export function MemoryTeaser(props: GameTeaserProps) {
  const { settings, reducedMotion, active } = props;
  const still = reducedMotion || settings.teaser.mode === "static";
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (still || !active) return; // paused where it is (rule 4)
    const timer = setInterval(() => setStep((value) => value + 1), STEP_MS);
    return () => clearInterval(timer);
  }, [still, active]);

  const faces = settings.memory?.faces ?? DEFAULT_MEMORY_FACES;
  const backIcon = settings.memory?.backIcon ?? "help-circle";
  const backImage = settings.memory?.backImage ?? null;
  const inCycle = still ? CYCLE - 1 : step % CYCLE;

  const stateOf = (index: number): CardState => {
    const pair = POSITIONS[index];
    const second = index >= PAIRS;
    const base = pair * STEPS_PER_PAIR;
    if (still) return pair === 0 ? "matched" : "down"; // a still image: one pair turned
    if (inCycle >= base + 2) return "matched";
    if (inCycle >= base + 1) return "up";
    if (inCycle === base && !second) return "up";
    return "down";
  };

  return (
    <TeaserShell {...props}>
      <span className="relative block w-full">
        <span className="mb-2 flex justify-end">
          {/* Said plainly: this is a demonstration, not a board (plan §8.7). */}
          <span
            className="rounded-full border px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.18em]"
            style={{ borderColor: tint("--xp-text", 20) }}
          >
            Démo
          </span>
        </span>
        <span
          className="mx-auto grid w-[min(70cqw,18rem)] grid-cols-3 gap-[clamp(0.4rem,2.5cqmin,0.75rem)]"
          data-xp-memory-board
        >
          {POSITIONS.map((pair, index) => (
            <span key={index} className="aspect-square">
              <MemoryCard
                state={stateOf(index)}
                face={faces[pair % faces.length]}
                toneIndex={pair}
                backIcon={backIcon}
                backImage={backImage}
                reducedMotion={still}
              />
            </span>
          ))}
        </span>
      </span>
    </TeaserShell>
  );
}
