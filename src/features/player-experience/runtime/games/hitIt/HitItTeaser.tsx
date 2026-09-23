import { useEffect, useState } from "react";
import { DEFAULT_RULES } from "../../../domain/campaign";
import { tint } from "../../../theme/recipes";
import { TeaserShell } from "../TeaserShell";
import type { GameTeaserProps } from "../types";
import { HitTarget } from "./HitTarget";

// Pregame teaser of Hit It (plan §8.7). The prototype has none, so this one is new: the
// brand's own target hops around a field, a counter climbs and a time bar empties, then it
// all starts over. It is marked "Démo" and counts for nothing — no round is being played,
// and nothing here can be won (rule 1) or played (rule 2).

const STEP_MS = 620;
const ROUND_STEPS = 9;
const SPOTS = [
  { x: 28, y: 32 },
  { x: 70, y: 26 },
  { x: 46, y: 62 },
  { x: 76, y: 66 },
  { x: 22, y: 70 },
  { x: 58, y: 38 },
  { x: 34, y: 50 },
  { x: 68, y: 54 },
  { x: 44, y: 28 },
];

export function HitItTeaser(props: GameTeaserProps) {
  const { settings, campaign, reducedMotion, active } = props;
  const still = reducedMotion || settings.teaser.mode === "static";
  const rules = campaign.rules.hitIt ?? DEFAULT_RULES.hitIt;
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (still || !active) return; // paused where it is (rule 4)
    const timer = setInterval(() => setStep((value) => value + 1), STEP_MS);
    return () => clearInterval(timer);
  }, [still, active]);

  const inRound = step % ROUND_STEPS;
  const spot = SPOTS[inRound];
  // A demonstration count, climbing towards the campaign's own threshold and starting over.
  const shown = Math.min(
    Math.round((inRound / (ROUND_STEPS - 1)) * rules.winThreshold),
    rules.winThreshold,
  );

  return (
    <TeaserShell {...props}>
      <span className="relative block w-full">
        <span className="mb-2 flex items-center justify-between gap-3">
          <span
            data-xp-hit-score
            className="rounded-full border px-3 py-1 text-xs font-extrabold tabular-nums"
            style={{ borderColor: tint("--xp-primary", 40) }}
          >
            {shown} / {rules.winThreshold}
          </span>
          <span
            aria-hidden
            className="h-1.5 flex-1 overflow-hidden rounded-full"
            style={{ backgroundColor: tint("--xp-text", 12) }}
          >
            <span
              className="block h-full rounded-full"
              style={{
                width: `${(100 - (inRound / (ROUND_STEPS - 1)) * 100).toFixed(0)}%`,
                backgroundColor: "var(--xp-primary)",
                transition: still ? "none" : "width 500ms linear",
              }}
            />
          </span>
          {/* Said plainly: this is a demonstration, not a round (plan §8.7). */}
          <span
            className="rounded-full border px-2 py-0.5 text-[0.6rem] font-extrabold uppercase tracking-[0.18em]"
            style={{ borderColor: tint("--xp-text", 20) }}
          >
            Démo
          </span>
        </span>
        <span
          className="relative block h-[min(48cqh,14rem)] w-full rounded-[var(--xp-radius-lg)] border border-dashed"
          style={{ borderColor: tint("--xp-primary", 25) }}
        >
          <HitTarget
            icon={settings.hitIt?.targetIcon ?? "target"}
            image={settings.hitIt?.targetImage ?? null}
            x={spot.x}
            y={spot.y}
            style={{
              transition: still
                ? "none"
                : "inset-inline-start 380ms ease-out, top 380ms ease-out",
            }}
          />
        </span>
      </span>
    </TeaserShell>
  );
}
