import { describe, expect, it } from "vitest";
import {
  BROWSER_TOOLBAR_HEIGHT,
  chromeFor,
  fitZoom,
  outerSize,
  STATUS_BAR_HEIGHT,
} from "./chromeMetrics";
import { deviceSafeArea, findDevice } from "./devices";

const portrait = { chrome: true, orientation: "portrait" as const };

describe("device shell metrics", () => {
  it("never changes the size of the screen: the shell is added around it", () => {
    const iphone = findDevice("iphone-12")!;
    const metrics = chromeFor(iphone, portrait);
    expect(metrics.kind).toBe("phone");
    // A notched phone draws its status bar over the top inset of the screen.
    expect(metrics.overlayStatusBar).toBe(true);
    expect(outerSize(iphone, metrics)).toEqual({
      width: 390 + metrics.bezel * 2,
      height: 844 + metrics.bezel * 2,
    });
  });

  it("puts the status bar above the screen of a phone without a notch", () => {
    const android = findDevice("android-360")!;
    const metrics = chromeFor(android, portrait);
    expect(metrics.overlayStatusBar).toBe(false);
    expect(metrics.top).toBe(STATUS_BAR_HEIGHT);
    // …and hides it in landscape, like the phone does.
    expect(
      chromeFor(android, { ...portrait, orientation: "landscape" }).top,
    ).toBe(0);
  });

  it("draws a browser window around a laptop, and nothing when the frame is off", () => {
    const laptop = findDevice("laptop-hd")!;
    expect(chromeFor(laptop, portrait)).toMatchObject({
      kind: "browser",
      top: BROWSER_TOOLBAR_HEIGHT,
    });
    expect(chromeFor(laptop, { ...portrait, chrome: false }).kind).toBe("none");
    expect(chromeFor(null, portrait).kind).toBe("none");
  });

  it("moves the notch to the sides in landscape", () => {
    const iphone = findDevice("iphone-12")!;
    expect(deviceSafeArea(iphone, "portrait")).toEqual(iphone.safeArea);
    const landscape = deviceSafeArea(iphone, "landscape");
    expect(landscape.top).toBe(0);
    expect(landscape.left).toBe(iphone.safeArea.top);
    expect(landscape.right).toBe(iphone.safeArea.top);
    expect(deviceSafeArea(null, "portrait")).toEqual({
      top: 0,
      right: 0,
      bottom: 0,
      left: 0,
    });
  });
});

describe("fit zoom", () => {
  it("shrinks to the room available, never above 100 %", () => {
    expect(
      fitZoom({ width: 2000, height: 2000 }, { width: 412, height: 866 }),
    ).toBe(1);
    expect(
      fitZoom({ width: 800, height: 433 }, { width: 412, height: 866 }),
    ).toBe(0.5);
    // Rounded down: the indicator never claims more than what is shown.
    expect(
      fitZoom({ width: 1000, height: 666 }, { width: 400, height: 1000 }),
    ).toBe(0.66);
  });

  it("stays usable in an unmeasured or tiny area", () => {
    expect(fitZoom({ width: 0, height: 0 }, { width: 400, height: 800 })).toBe(
      1,
    );
    expect(
      fitZoom({ width: 10, height: 10 }, { width: 2560, height: 1600 }),
    ).toBe(0.1);
  });
});
