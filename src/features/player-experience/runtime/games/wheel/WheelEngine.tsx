import { useEffect, useRef } from "react";
import { resolveText } from "../../../domain/locale";
import { runtimeAudio } from "../../feedback/audio";
import type { GameEngineProps } from "../types";
import { WheelFace } from "./WheelFace";
import { computeFinalRotation, pickSegmentForOutcome } from "./wheelMath";

// The wheel (plan §8.6, tasks.md T5.2). It draws nothing at random and decides nothing: it
// spins while the draw is in flight, then lands on a segment that matches the outcome it was
// handed (N1). The angle lives in a ref and is written straight onto the rotor, so a spin
// never re-renders the segments — and a resize, which changes pixels but not angles, leaves
// the spin exactly where it was.

const FREE_SPIN_PER_SECOND = 420; // degrees, while waiting for the server
const LANDING_MS = 3600;
const LANDING_TURNS = 4;
const STILL_HOLD_MS = 600; // reduced motion: the result is placed, then read

export function WheelEngine({
  settings,
  campaign,
  config,
  phase,
  outcome,
  onStart,
  onRevealComplete,
  reducedMotion,
  locale,
}: GameEngineProps) {
  const rotor = useRef<SVGGElement>(null);
  const angle = useRef(0);
  // The flow's callback, kept fresh without restarting a spin in progress.
  const revealComplete = useRef(onRevealComplete);
  useEffect(() => {
    revealComplete.current = onRevealComplete;
  });

  const segments = settings.wheel?.segments ?? [];
  const hubLabel = resolveText(
    settings.wheel?.hubLabel,
    locale,
    config.locales.default,
  );

  useEffect(() => {
    const turn = (value: number) => {
      angle.current = value;
      rotor.current?.style.setProperty("transform", `rotate(${value}deg)`);
    };
    let frame = 0;

    // Waiting for the server: the wheel is already turning, at a steady speed, so the draw
    // never shows as a pause. It carries on from wherever it is when the answer lands.
    if (phase === "awaiting-outcome") {
      if (reducedMotion) return;
      // Every measure comes from the timestamp the browser hands each frame: one clock, the
      // one the frames themselves are on.
      let previous: number | null = null;
      const step = (now: number) => {
        const seconds = previous === null ? 0 : (now - previous) / 1000;
        previous = now;
        turn(angle.current + seconds * FREE_SPIN_PER_SECOND);
        frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
      return () => cancelAnimationFrame(frame);
    }

    if (phase !== "revealing") return;

    // Where the outcome says to stop — always forward, from wherever the free spin left off.
    const target = computeFinalRotation(
      pickSegmentForOutcome(segments, outcome),
      segments.length,
      angle.current,
      LANDING_TURNS,
    );

    if (reducedMotion) {
      turn(target);
      const timer = setTimeout(() => revealComplete.current(), STILL_HOLD_MS);
      return () => clearTimeout(timer);
    }

    const from = angle.current;
    const segmentAngle = segments.length > 0 ? 360 / segments.length : 360;
    let started: number | null = null;
    let tickedAt = from;
    const step = (now: number) => {
      started ??= now;
      const progress = Math.min((now - started) / LANDING_MS, 1);
      turn(from + (target - from) * (1 - Math.pow(1 - progress, 4)));
      // One tick per segment going past the pointer: the sound slows down with the wheel,
      // without a schedule of its own to keep in step.
      if (angle.current - tickedAt >= segmentAngle) {
        tickedAt = angle.current;
        runtimeAudio.play("tick");
      }
      if (progress < 1) frame = requestAnimationFrame(step);
      // A wheel with no segment at all still finishes: the journey is never stuck (B9).
      else revealComplete.current();
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [phase, reducedMotion, segments, outcome]);

  const face = (
    <WheelFace
      segments={segments}
      hubLabel={hubLabel}
      campaign={campaign}
      config={config}
      locale={locale}
      rotorRef={rotor}
    />
  );
  // Square, sized on the slot itself and never on the screen (plan §8.6). The audit reads
  // data-xp-wheel to check it stays square at every size (wheel-not-square, T3.8).
  const size =
    "block w-[min(100cqw,100cqh)] aspect-square max-w-full self-center";

  // Idle: the wheel is the button, next to the CTA of slot 7 and firing the same event.
  // Once it turns, it is a picture: tapping it again would change nothing.
  return (
    <div
      className="grid size-full min-h-0 place-items-center"
      data-xp-game="lucky_wheel"
      data-xp-phase={phase}
    >
      {phase === "idle" ? (
        <button
          type="button"
          onClick={onStart}
          aria-label={hubLabel}
          data-xp-wheel
          className={`${size} cursor-pointer transition-transform duration-200 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--xp-primary)]`}
        >
          {face}
        </button>
      ) : (
        <div className={size} data-xp-wheel>
          {face}
        </div>
      )}
    </div>
  );
}
