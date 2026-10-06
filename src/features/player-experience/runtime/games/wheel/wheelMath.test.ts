import { describe, expect, it } from "vitest";
import type { DrawOutcome } from "../../../domain/participation";
import type { WheelSegment } from "../../../domain/types";
import { computeFinalRotation, pickSegmentForOutcome } from "./wheelMath";

// The wheel's landing (tasks.md T5.2): for every prize and for a loss, the wheel stops on a
// segment the result can be read on — checked by turning the rotation back into the segment
// that ends up under the pointer, the inverse of what the engine draws.

const segment = (id: string, prizeId: string | null): WheelSegment => ({
  id,
  prizeId,
  label: {},
  color: null,
  icon: null,
});

const SEGMENTS: WheelSegment[] = [
  segment("s0", "prize-voucher"),
  segment("s1", null),
  segment("s2", "prize-headphones"),
  segment("s3", null),
  segment("s4", "prize-voucher"), // the same prize twice: both are valid landings
  segment("s5", null),
];

const win = (prizeId: string): DrawOutcome => ({
  isWinner: true,
  prize: { id: prizeId, name: prizeId, winMessage: null },
  couponCode: "DEMO-0000-0000",
});
const LOSS: DrawOutcome = { isWinner: false, prize: null, couponCode: null };

// Inverse of computeFinalRotation: which segment a given rotation leaves under the pointer.
function segmentUnderPointer(rotation: number, segmentCount: number): number {
  const segmentAngle = 360 / segmentCount;
  // Undo the rotation, then read the wheel angle the pointer (12 o'clock) is facing.
  const facing = (((-90 - rotation) % 360) + 360) % 360;
  return Math.floor(facing / segmentAngle) % segmentCount;
}

describe("pickSegmentForOutcome", () => {
  it("lands on a segment carrying the prize won", () => {
    const index = pickSegmentForOutcome(SEGMENTS, win("prize-headphones"));
    expect(SEGMENTS[index].prizeId).toBe("prize-headphones");
  });

  it("chooses among every segment carrying the same prize", () => {
    const first = pickSegmentForOutcome(
      SEGMENTS,
      win("prize-voucher"),
      () => 0,
    );
    const last = pickSegmentForOutcome(
      SEGMENTS,
      win("prize-voucher"),
      () => 0.99,
    );
    expect([first, last]).toEqual([0, 4]);
  });

  it("lands on a losing segment when the player lost", () => {
    for (const draw of [0, 0.5, 0.99]) {
      const index = pickSegmentForOutcome(SEGMENTS, LOSS, () => draw);
      expect(SEGMENTS[index].prizeId).toBeNull();
    }
  });

  it("falls back to a losing segment when the prize won has none", () => {
    const index = pickSegmentForOutcome(SEGMENTS, win("prize-never-drawn"));
    expect(SEGMENTS[index].prizeId).toBeNull();
  });

  it("falls back to the first segment when the wheel has no losing one either", () => {
    const allPrizes = [segment("a", "p1"), segment("b", "p2")];
    expect(pickSegmentForOutcome(allPrizes, LOSS)).toBe(0);
    expect(pickSegmentForOutcome(allPrizes, win("p3"))).toBe(0);
  });

  it("survives an empty wheel and a random source at its bounds", () => {
    expect(pickSegmentForOutcome([], LOSS)).toBe(0);
    expect(pickSegmentForOutcome(SEGMENTS, LOSS, () => 1)).toBe(5); // clamped, never out of range
  });

  it("never reads the outcome's prize when the player lost", () => {
    const inconsistent: DrawOutcome = {
      isWinner: false,
      prize: { id: "prize-voucher", name: "Bon", winMessage: null },
      couponCode: null,
    };
    expect(
      SEGMENTS[pickSegmentForOutcome(SEGMENTS, inconsistent)].prizeId,
    ).toBe(null);
  });
});

describe("computeFinalRotation", () => {
  it("stops on the segment asked for, whatever the wheel's size", () => {
    for (const count of [4, 5, 6, 8, 12]) {
      for (let index = 0; index < count; index++) {
        const rotation = computeFinalRotation(index, count, 0, 5);
        expect(segmentUnderPointer(rotation, count)).toBe(index);
      }
    }
  });

  it("stops on the same segment whatever angle the wheel was left at", () => {
    for (const current of [0, 12.5, 180, 359.9, 1234.56, -400]) {
      const rotation = computeFinalRotation(3, 8, current, 6);
      expect(segmentUnderPointer(rotation, 8)).toBe(3);
    }
  });

  it("always turns forward, by at least the full turns asked for", () => {
    for (const current of [0, 47, 359.9, 2000]) {
      const rotation = computeFinalRotation(2, 6, current, 4);
      expect(rotation - current).toBeGreaterThanOrEqual(4 * 360);
      expect(rotation - current).toBeLessThan(5 * 360);
    }
  });

  it("leaves the wheel where it is when there is no segment", () => {
    expect(computeFinalRotation(0, 0, 137, 5)).toBe(137);
  });
});
