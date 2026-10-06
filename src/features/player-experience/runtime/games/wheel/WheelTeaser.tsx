import { useEffect, useRef } from "react";
import { resolveText } from "../../../domain/locale";
import { TeaserShell } from "../TeaserShell";
import type { GameTeaserProps } from "../types";
import { WheelFace } from "./WheelFace";

// Pregame teaser of the wheel (plan §8.7): the campaign's real wheel — same segments, same
// labels, same colors as the game that follows — turning slowly, with a nudge now and then.
// It never slows to a stop and never highlights a segment: a wheel landing on a prize would
// promise a win nobody has drawn (rule 1). It stands still off screen or with reduced motion.

const DRIFT_PER_SECOND = 20; // degrees
const BOOST_PER_SECOND = 130;
const BOOST_EVERY_MS = 3600;
const BOOST_SPREAD_MS = 2600;

export function WheelTeaser(props: GameTeaserProps) {
  const { settings, campaign, config, locale, reducedMotion, active } = props;
  const rotor = useRef<SVGGElement>(null);
  const angle = useRef(0);
  const still = reducedMotion || settings.teaser.mode === "static";

  useEffect(() => {
    if (still || !active) return; // paused where it is, never unmounted (rule 4)
    let frame = 0;
    // Every measure comes from the timestamp each frame carries: one clock, the frames' own.
    let previous: number | null = null;
    let speed = DRIFT_PER_SECOND;
    let boostAt = Number.POSITIVE_INFINITY;
    const step = (now: number) => {
      const seconds = previous === null ? 0 : (now - previous) / 1000;
      if (previous === null) boostAt = now + BOOST_EVERY_MS;
      previous = now;
      if (now >= boostAt) {
        speed = BOOST_PER_SECOND;
        boostAt = now + BOOST_EVERY_MS + Math.random() * BOOST_SPREAD_MS;
      }
      // Back down to the drift speed, smoothly: a nudge, never a spin that could look like
      // a real draw about to stop.
      speed += (DRIFT_PER_SECOND - speed) * Math.min(1, seconds * 1.4);
      angle.current += speed * seconds;
      rotor.current?.style.setProperty(
        "transform",
        `rotate(${angle.current}deg)`,
      );
      frame = requestAnimationFrame(step);
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [still, active]);

  return (
    <TeaserShell {...props}>
      <span
        data-xp-wheel
        className="block w-[min(92cqw,60cqh)] max-w-full aspect-square"
      >
        <WheelFace
          segments={settings.wheel?.segments ?? []}
          hubLabel={resolveText(
            settings.wheel?.hubLabel,
            locale,
            config.locales.default,
          )}
          campaign={campaign}
          config={config}
          locale={locale}
          rotorRef={rotor}
        />
      </span>
    </TeaserShell>
  );
}
