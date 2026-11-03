import { tint } from "../../../theme/recipes";
import { TeaserShell } from "../TeaserShell";
import type { GameTeaserProps } from "../types";
import { CatchItem } from "./CatchItem";

// Pregame teaser of Catch It (plan §8.7): the brand's own item falls through a field, three at
// a time, on one CSS loop — marked "Démo". Nobody catches anything and nothing can be won
// (rule 1) or played (rule 2). The loop is a single CSS animation, paused whenever the teaser is
// off screen (rule 4); a still image holds the items mid-field.

const LANES = [24, 50, 76];
const FALL_S = 2.6;

export function CatchTeaser(props: GameTeaserProps) {
  const { settings, reducedMotion, active } = props;
  const still = reducedMotion || settings.teaser.mode === "static";
  const icon = settings.catchIt?.itemIcon ?? "star";
  const image = settings.catchIt?.itemImage ?? null;
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
          className="relative block h-[min(48cqh,14rem)] w-full overflow-hidden rounded-[var(--xp-radius-lg)] border border-dashed"
          style={{ borderColor: tint("--xp-primary", 25) }}
        >
          {LANES.map((x, index) => (
            <CatchItem
              key={x}
              icon={icon}
              image={image}
              x={x}
              style={
                still
                  ? { top: `${28 + index * 22}%` }
                  : {
                      animation: `xp-fall ${FALL_S}s linear infinite`,
                      animationDelay: `${-(index * FALL_S) / LANES.length}s`,
                      animationPlayState: active ? "running" : "paused",
                    }
              }
            />
          ))}
        </span>
      </span>
    </TeaserShell>
  );
}
