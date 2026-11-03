import { useEffect, useRef } from "react";
import type { DrawOutcome } from "../../../domain/participation";
import type { WheelSegment } from "../../../domain/types";
import { runtimeAudio } from "../../feedback/audio";
import { vibrate } from "../../feedback/haptics";
import type { GamePhase } from "../types";
import { computeFinalRotation, pickSegmentForOutcome } from "./wheelMath";

// How the wheel turns (WheelEngine): it spins while the draw is in flight, then lands on a segment that
// matches the outcome it was handed (N1). It draws nothing at random and decides nothing.
// The angle lives in a ref and is written straight onto the rotor, so a spin never re-renders
// anything — and a resize, which changes pixels but not angles, leaves it exactly where it was.
//
// A lively theme (motion.games) plays it like a show, still landing exactly where the outcome
// says: a small pull-back before the launch, a longer landing whose last slices crawl past a
// pointer that flicks on every one of them (slower as the wheel slows), a slight zoom on the
// pointer near the end, a little bounce back once it stops, the slice it landed on lit and the
// others dimmed, and a short pause to read it before the result. A tap skips to the landing.
// The extra turns vary from one spin to the next — only how long it turns, never where it
// stops.

const FREE_SPIN_PER_SECOND = 420; // degrees, while waiting for the server
const LANDING_MS = 3600;
const LANDING_TURNS = 4;
const STILL_HOLD_MS = 600; // reduced motion: the result is placed, then read

const PULL_BACK_MS = 300;
const PULL_BACK_DEG = 10;
const SPEED_UP_MS = 500;
const LIVELY_LANDING_MS = 5200;
const OVERSHOOT_DEG = 2.5; // inside any slice: a wheel has 8 slices at most (45°)
const SETTLE_MS = 260;
const LANDED_HOLD_MS = 750; // the slice it landed on, read before the result
const SUSPENSE_FROM = 0.78; // of the landing: the zoom on the pointer
const FLICK_DEG = -16;
const STEP_DEG = 3; // a stepped wheel's smallest move

export interface WheelSpinOptions {
  phase: GamePhase;
  segments: readonly WheelSegment[];
  outcome: DrawOutcome | null;
  reducedMotion: boolean;
  onRevealComplete: () => void;
  // The element that turns: an SVG group, a div, whatever the wheel is drawn with.
  rotor: () => { style: CSSStyleDeclaration } | null;
  lively?: boolean; // the theme's lively motion (motion.games)
  // A stepped theme (motion.feel): the wheel shows in steps of a few degrees, invisible at
  // speed and plain as it slows — a retro wheel ticking round.
  stepped?: boolean;
  pointer?: () => Element | null; // flicks on each slice (lively)
  stage?: () => HTMLElement | null; // carries data-xp-suspense / data-xp-landed (lively)
}

const easeOutQuart = (progress: number) => 1 - Math.pow(1 - progress, 4);
const easeOutQuint = (progress: number) => 1 - Math.pow(1 - progress, 5);
const easeOutCubic = (progress: number) => 1 - Math.pow(1 - progress, 3);

export function useWheelSpin({
  phase,
  segments,
  outcome,
  reducedMotion,
  onRevealComplete,
  rotor,
  lively = false,
  stepped = false,
  pointer,
  stage,
}: WheelSpinOptions): { skip: () => void } {
  const angle = useRef(0);
  const skipping = useRef(false);
  // The latest callbacks, kept fresh without restarting a spin in progress.
  const latest = useRef({ onRevealComplete, rotor, pointer, stage });
  useEffect(() => {
    latest.current = { onRevealComplete, rotor, pointer, stage };
  });

  useEffect(() => {
    const turn = (value: number) => {
      angle.current = value;
      const shown = stepped ? Math.round(value / STEP_DEG) * STEP_DEG : value;
      latest.current
        .rotor()
        ?.style.setProperty("transform", `rotate(${shown}deg)`);
    };
    const mark = (name: string, on: boolean) =>
      latest.current.stage?.()?.toggleAttribute(name, on);
    let frame = 0;
    let timer: ReturnType<typeof setTimeout> | undefined;
    skipping.current = false;

    // Waiting for the server: the wheel is already turning, at a steady speed, so the draw
    // never shows as a pause. It carries on from wherever it is when the answer lands.
    if (phase === "awaiting-outcome") {
      if (reducedMotion) return;
      // Every measure comes from the timestamp the browser hands each frame: one clock, the
      // one the frames themselves are on.
      let previous: number | null = null;
      let started: number | null = null;
      const from = angle.current;
      const step = (now: number) => {
        started ??= now;
        const seconds = previous === null ? 0 : (now - previous) / 1000;
        previous = now;
        const elapsed = now - started;
        if (lively && elapsed < PULL_BACK_MS) {
          // Anticipation: a small pull-back before the launch.
          turn(from - PULL_BACK_DEG * easeOutCubic(elapsed / PULL_BACK_MS));
        } else {
          // Then a fast ease-in up to the free spin's speed.
          const speedUp = lively
            ? Math.min(1, (elapsed - PULL_BACK_MS) / SPEED_UP_MS)
            : 1;
          turn(angle.current + seconds * FREE_SPIN_PER_SECOND * speedUp);
        }
        frame = requestAnimationFrame(step);
      };
      frame = requestAnimationFrame(step);
      return () => cancelAnimationFrame(frame);
    }

    if (phase !== "revealing") return;

    // Where the outcome says to stop — always forward, from wherever the free spin left off.
    const landing = pickSegmentForOutcome(segments, outcome);
    const target = computeFinalRotation(
      landing,
      segments.length,
      angle.current,
      lively ? LANDING_TURNS + Math.floor(Math.random() * 3) : LANDING_TURNS,
    );

    if (reducedMotion) {
      turn(target);
      timer = setTimeout(
        () => latest.current.onRevealComplete(),
        STILL_HOLD_MS,
      );
      return () => clearTimeout(timer);
    }

    const from = angle.current;
    const segmentAngle = segments.length > 0 ? 360 / segments.length : 360;
    const duration = lively ? LIVELY_LANDING_MS : LANDING_MS;
    const overshoot = lively ? OVERSHOOT_DEG : 0;
    const ease = lively ? easeOutQuint : easeOutQuart;
    let started: number | null = null;
    let tickedAt = from;
    let lastTick: number | null = null;

    // The pointer flicks on each slice going past it, its flick as long as the gap between
    // two slices: quick at full speed, slow as the wheel crawls.
    const flick = (now: number, progress: number) => {
      const gap = lastTick === null ? 200 : now - lastTick;
      lastTick = now;
      const element = latest.current.pointer?.();
      if (element && typeof element.animate === "function") {
        element.animate([{ rotate: `${FLICK_DEG}deg` }, { rotate: "0deg" }], {
          duration: Math.min(260, Math.max(50, gap * 0.85)),
          // A stepped theme flicks it hard: two frames, no easing.
          easing: stepped ? "steps(2, end)" : "ease-out",
        });
      }
      if (progress > 0.88) vibrate("tick");
    };

    const land = () => {
      mark("data-xp-suspense", false);
      if (!lively) {
        latest.current.onRevealComplete();
        return;
      }
      // A little bounce back onto the slice, then it lights up, and the result waits to be
      // read.
      const settleFrom = angle.current;
      let settleStart: number | null = null;
      const settle = (now: number) => {
        settleStart ??= now;
        const progress = Math.min((now - settleStart) / SETTLE_MS, 1);
        turn(settleFrom + (target - settleFrom) * easeOutCubic(progress));
        if (progress < 1) {
          frame = requestAnimationFrame(settle);
          return;
        }
        const rotorElement =
          latest.current.rotor() as unknown as Element | null;
        const slices = rotorElement?.querySelectorAll?.("[data-xp-segment]");
        slices?.[landing]?.setAttribute("data-xp-hit", "");
        mark("data-xp-landed", true);
        timer = setTimeout(
          () => latest.current.onRevealComplete(),
          skipping.current ? 0 : LANDED_HOLD_MS,
        );
      };
      frame = requestAnimationFrame(settle);
    };

    const step = (now: number) => {
      started ??= now;
      // A tap skips the long landing: straight to its last moment.
      if (skipping.current) started = Math.min(started, now - duration);
      const progress = Math.min((now - started) / duration, 1);
      turn(from + (target + overshoot - from) * ease(progress));
      if (lively && progress >= SUSPENSE_FROM && progress < 1) {
        mark("data-xp-suspense", true);
      }
      // One tick per segment going past the pointer: the sound slows down with the wheel,
      // without a schedule of its own to keep in step.
      if (angle.current - tickedAt >= segmentAngle) {
        tickedAt = angle.current;
        runtimeAudio.play("tick");
        if (lively) flick(now, progress);
      }
      if (progress < 1) frame = requestAnimationFrame(step);
      // A wheel with no segment at all still finishes: the journey is never stuck (B9).
      else land();
    };
    frame = requestAnimationFrame(step);
    return () => {
      cancelAnimationFrame(frame);
      clearTimeout(timer);
      mark("data-xp-suspense", false);
    };
  }, [phase, reducedMotion, segments, outcome, lively, stepped]);

  return {
    skip: () => {
      skipping.current = true;
    },
  };
}
