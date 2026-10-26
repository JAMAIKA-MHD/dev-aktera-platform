import { useEffect, useRef } from "react";
import type { DrawOutcome } from "../../../domain/participation";
import type { WheelSegment } from "../../../domain/types";
import { runtimeAudio } from "../../feedback/audio";
import type { GamePhase } from "../types";
import { computeFinalRotation, pickSegmentForOutcome } from "./wheelMath";

// How the wheel turns (WheelEngine): it spins while the draw is in flight, then lands on a segment that
// matches the outcome it was handed (N1). It draws nothing at random and decides nothing.
// The angle lives in a ref and is written straight onto the rotor, so a spin never re-renders
// anything — and a resize, which changes pixels but not angles, leaves it exactly where it was.

const FREE_SPIN_PER_SECOND = 420; // degrees, while waiting for the server
const LANDING_MS = 3600;
const LANDING_TURNS = 4;
const STILL_HOLD_MS = 600; // reduced motion: the result is placed, then read

export interface WheelSpinOptions {
  phase: GamePhase;
  segments: readonly WheelSegment[];
  outcome: DrawOutcome | null;
  reducedMotion: boolean;
  onRevealComplete: () => void;
  // The element that turns: an SVG group, a div, whatever the wheel is drawn with.
  rotor: () => { style: CSSStyleDeclaration } | null;
}

export function useWheelSpin({
  phase,
  segments,
  outcome,
  reducedMotion,
  onRevealComplete,
  rotor,
}: WheelSpinOptions): void {
  const angle = useRef(0);
  // The latest callbacks, kept fresh without restarting a spin in progress.
  const latest = useRef({ onRevealComplete, rotor });
  useEffect(() => {
    latest.current = { onRevealComplete, rotor };
  });

  useEffect(() => {
    const turn = (value: number) => {
      angle.current = value;
      latest.current
        .rotor()
        ?.style.setProperty("transform", `rotate(${value}deg)`);
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
      const timer = setTimeout(
        () => latest.current.onRevealComplete(),
        STILL_HOLD_MS,
      );
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
      else latest.current.onRevealComplete();
    };
    frame = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame);
  }, [phase, reducedMotion, segments, outcome]);
}
