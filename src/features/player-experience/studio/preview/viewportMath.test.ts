import { describe, expect, it } from "vitest";
import { ENVELOPE } from "../../runtime/layout/breakpoints";
import {
  applyPointerDelta,
  clampToEnvelope,
  computeFitZoom,
  rotate,
} from "./viewportMath";

const NONE = { top: 0, right: 0, bottom: 0, left: 0 };

describe("clampToEnvelope", () => {
  it("keeps every size inside the supported envelope, in whole pixels", () => {
    expect(clampToEnvelope({ width: 100, height: 100 })).toEqual({
      width: ENVELOPE.minWidth,
      height: ENVELOPE.minHeight,
    });
    expect(clampToEnvelope({ width: 9999, height: 9999 })).toEqual({
      width: ENVELOPE.maxWidth,
      height: ENVELOPE.maxHeight,
    });
    expect(clampToEnvelope({ width: 390.4, height: 843.6 })).toEqual({
      width: 390,
      height: 844,
    });
  });
});

describe("computeFitZoom", () => {
  it("fits the device and its shell in the room, never above 100 %", () => {
    const shell = { top: 11, right: 11, bottom: 11, left: 11 };
    expect(
      computeFitZoom({ width: 390, height: 844 }, shell, {
        width: 2000,
        height: 2000,
      }),
    ).toBe(1);
    // 866 px of phone in 433 px of room: half size.
    expect(
      computeFitZoom({ width: 390, height: 844 }, shell, {
        width: 1000,
        height: 433,
      }),
    ).toBe(0.5);
    expect(
      computeFitZoom({ width: 400, height: 1000 }, NONE, {
        width: 1000,
        height: 666,
      }),
    ).toBe(0.66);
  });

  it("stays usable before the room is measured, or when it is tiny", () => {
    expect(
      computeFitZoom({ width: 390, height: 844 }, NONE, {
        width: 0,
        height: 0,
      }),
    ).toBe(1);
    expect(
      computeFitZoom({ width: 2560, height: 1600 }, NONE, {
        width: 10,
        height: 10,
      }),
    ).toBe(0.1);
  });
});

describe("applyPointerDelta", () => {
  const size = { width: 390, height: 844 };

  it("moves only the dragged edge, the corner moves both", () => {
    expect(applyPointerDelta(size, "right", 50, 70, 1)).toEqual({
      width: 440,
      height: 844,
    });
    expect(applyPointerDelta(size, "bottom", 50, -44, 1)).toEqual({
      width: 390,
      height: 800,
    });
    expect(applyPointerDelta(size, "corner", 10, 10, 1)).toEqual({
      width: 400,
      height: 854,
    });
  });

  it("divides the drag by the zoom: the device grows in CSS pixels", () => {
    expect(applyPointerDelta(size, "right", 10, 0, 0.5).width).toBe(410);
    expect(applyPointerDelta(size, "right", 30, 0, 1.5).width).toBe(410);
  });

  it("never leaves the envelope, from 280 px to 2560 px", () => {
    expect(applyPointerDelta(size, "right", -1000, 0, 1).width).toBe(280);
    expect(applyPointerDelta(size, "corner", 5000, 5000, 1)).toEqual({
      width: 2560,
      height: 1600,
    });
  });
});

describe("rotate", () => {
  it("swaps the size and moves the notch to the sides", () => {
    const iphone = { top: 47, right: 0, bottom: 34, left: 0 };
    const turned = rotate({ width: 390, height: 844 }, iphone);
    expect(turned.size).toEqual({ width: 844, height: 390 });
    expect(turned.safeArea).toEqual({
      top: 0,
      right: 47,
      bottom: 20,
      left: 47,
    });
  });

  it("leaves a phone without insets without insets", () => {
    expect(rotate({ width: 360, height: 800 }, NONE).safeArea).toEqual(NONE);
  });
});
