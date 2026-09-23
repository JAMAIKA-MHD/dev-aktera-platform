import type { DrawOutcome } from "../../../domain/participation";
import type { WheelSegment } from "../../../domain/types";

// The wheel's geometry and its landing, as pure functions (plan §6.4, tasks.md T5.2).
// The engine never draws an outcome: it receives one and only computes where to stop.
// The server's own `segment_index`, when it sends one, is ignored — the segments the player
// sees come from the configuration, which the server knows nothing about.

// Segments are drawn from 3 o'clock, clockwise; the pointer sits at 12 o'clock.
const POINTER_ANGLE = -90;

export type RandomSource = () => number;

// The segment the wheel must stop on for this outcome: the one carrying the prize won,
// otherwise a losing segment, otherwise the first one (a campaign whose prizes have no
// segment at all — the Studio's design check warns about it, T1.11).
export function pickSegmentForOutcome(
  segments: readonly WheelSegment[],
  outcome: DrawOutcome | null,
  random: RandomSource = Math.random,
): number {
  if (segments.length === 0) return 0;
  const indices = (keep: (segment: WheelSegment) => boolean) =>
    segments.reduce<number[]>(
      (kept, segment, index) => (keep(segment) ? [...kept, index] : kept),
      [],
    );
  const prizeId = outcome?.isWinner ? (outcome.prize?.id ?? null) : null;
  const matching = prizeId
    ? indices((segment) => segment.prizeId === prizeId)
    : [];
  const candidates = matching.length
    ? matching
    : indices((segment) => segment.prizeId === null);
  if (candidates.length === 0) return 0;
  const pick = Math.floor(random() * candidates.length);
  return candidates[Math.min(Math.max(pick, 0), candidates.length - 1)];
}

// The absolute rotation, in degrees, that brings `segmentIndex` under the pointer. Always
// forward from where the wheel already is, by at least `extraTurns` full turns: the wheel
// never jumps back, whatever angle a spin in progress left behind.
export function computeFinalRotation(
  segmentIndex: number,
  segmentCount: number,
  currentRotation: number,
  extraTurns: number,
): number {
  if (segmentCount <= 0) return currentRotation;
  const segmentAngle = 360 / segmentCount;
  const centerInWheel = segmentIndex * segmentAngle + segmentAngle / 2;
  // Rotation that puts that center under the pointer, brought back into [0, 360).
  const aligned = (((POINTER_ANGLE - centerInWheel) % 360) + 360) % 360;
  const current = ((currentRotation % 360) + 360) % 360;
  const forward = (((aligned - current) % 360) + 360) % 360;
  return currentRotation + extraTurns * 360 + forward;
}
