import { useEffect, useState } from "react";
import { TeaserShell } from "../TeaserShell";
import type { GameTeaserProps } from "../types";
import { BoxFace } from "./BoxFace";

// Pregame teaser of the mystery boxes (plan §8.7): the brand's own three boxes, floating one
// after another, each lid barely lifting on a glow — and nothing inside (rule 1). No box ever
// opens on a gift, because no prize is ever handed to the drawing.

const STEP_MS = 1100;

export function BoxesTeaser(props: GameTeaserProps) {
  const { settings, reducedMotion, active } = props;
  const still = reducedMotion || settings.teaser.mode === "static";
  const count = settings.boxes?.count ?? 3;
  const [lifted, setLifted] = useState(-1); // which box is being nudged; -1 = none

  useEffect(() => {
    if (still || !active) return; // paused where it is (rule 4)
    const timer = setInterval(
      () => setLifted((previous) => (previous + 1) % (count + 1)),
      STEP_MS,
    );
    return () => clearInterval(timer);
  }, [still, active, count]);

  return (
    <TeaserShell {...props}>
      <span
        className="grid w-full grid-flow-col justify-center gap-[clamp(0.5rem,4cqmin,1.5rem)]"
        style={{ gridAutoColumns: "min(28cqw, 26cqh, 9rem)" }}
      >
        {Array.from({ length: count }, (_, index) => (
          <BoxFace
            key={index}
            icon={settings.boxes?.icon ?? "gift"}
            color={settings.boxes?.color ?? null}
            // "picked" only lifts the lid a little, on a glow: never "open", which is the
            // one state that would show something inside.
            state={index === lifted ? "picked" : "closed"}
            style={{
              transition: "transform 500ms ease-out",
              transform:
                index === lifted && !still ? "translateY(-8%)" : "none",
            }}
          />
        ))}
      </span>
    </TeaserShell>
  );
}
