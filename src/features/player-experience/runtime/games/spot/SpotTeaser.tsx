import { useEffect, useState } from "react";
import { DEFAULT_SPOT_ICONS } from "../../../domain/defaults";
import { tint } from "../../../theme/recipes";
import { TeaserShell } from "../TeaserShell";
import type { GameTeaserProps } from "../types";
import { SpotPanel } from "./SpotPanel";
import { buildScene } from "./spotScene";

// Pregame teaser of Spot the Difference (plan §8.7): two small pictures from the brand's own
// icons, and a ring that visits each difference in turn — marked "Démo". Nobody plays and nothing
// can be won (rule 1) or played (rule 2). Paused off screen (rule 4); a still image rings one
// difference.

const STEP_MS = 1000;
const DIFFERENCES = 3;

export function SpotTeaser(props: GameTeaserProps) {
  const { settings, reducedMotion, active } = props;
  const still = reducedMotion || settings.teaser.mode === "static";
  const icons = settings.spot?.icons ?? DEFAULT_SPOT_ICONS;
  const [scene] = useState(() => buildScene(icons, DIFFERENCES, 3, 3));
  const [step, setStep] = useState(0);

  useEffect(() => {
    if (still || !active) return; // paused where it is (rule 4)
    const timer = setInterval(() => setStep((value) => value + 1), STEP_MS);
    return () => clearInterval(timer);
  }, [still, active]);

  const pointed =
    scene.differences[step % scene.differences.length]?.cell ?? null;

  return (
    <TeaserShell {...props}>
      <span className="relative block w-full">
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
          className="mx-auto flex w-[min(86cqw,22rem)] items-center justify-center gap-[clamp(0.4rem,3cqmin,0.9rem)]"
          data-xp-spot-board
        >
          <SpotPanel
            cells={scene.a}
            cols={scene.cols}
            highlight={null}
            reducedMotion={still}
            style={{ width: "50%" }}
          />
          <SpotPanel
            cells={scene.b}
            cols={scene.cols}
            highlight={pointed}
            reducedMotion={still}
            style={{ width: "50%" }}
          />
        </span>
      </span>
    </TeaserShell>
  );
}
