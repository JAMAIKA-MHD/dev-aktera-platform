import type { ViewportState } from "../store";
import type { Device } from "./devices";
import type { Insets } from "./viewportMath";

// How much room the device shell takes around the screen, in CSS pixels. The screen itself
// always keeps the exact size of the device: the shell is drawn *around* it, never by
// shrinking it (plan §9.3, the EditorCanvas mistake). A phone with a notch draws its status
// bar over the top inset of the screen, like the real thing; one without draws it above.

export type ChromeKind = "none" | "phone" | "tablet" | "browser";

export interface ChromeMetrics {
  kind: ChromeKind;
  bezel: number; // on every side
  top: number; // above the screen, inside the bezel: status bar or browser toolbar
  radius: number; // outer corner radius
  overlayStatusBar: boolean; // status bar drawn over the screen's top inset
}

const NONE: ChromeMetrics = {
  kind: "none",
  bezel: 0,
  top: 0,
  radius: 0,
  overlayStatusBar: false,
};

export const STATUS_BAR_HEIGHT = 24;
export const BROWSER_TOOLBAR_HEIGHT = 40;

export function chromeFor(
  device: Device | null,
  viewport: Pick<ViewportState, "chrome" | "orientation">,
): ChromeMetrics {
  if (!device || !viewport.chrome) return NONE;
  if (device.group === "laptop") {
    return {
      kind: "browser",
      bezel: 1,
      top: BROWSER_TOOLBAR_HEIGHT,
      radius: 12,
      overlayStatusBar: false,
    };
  }
  const portrait = viewport.orientation === "portrait";
  if (device.group === "tablet") {
    return {
      kind: "tablet",
      bezel: 14,
      top: STATUS_BAR_HEIGHT,
      radius: 30,
      overlayStatusBar: false,
    };
  }
  const notch = device.safeArea.top > 0;
  return {
    kind: "phone",
    bezel: 11,
    // Landscape phones hide the status bar; a notched phone draws it over its top inset.
    top: portrait && !notch ? STATUS_BAR_HEIGHT : 0,
    radius: notch ? 54 : 38,
    overlayStatusBar: portrait && notch,
  };
}

export function outerSize(
  viewport: Pick<ViewportState, "width" | "height">,
  metrics: ChromeMetrics,
): { width: number; height: number } {
  return {
    width: viewport.width + metrics.bezel * 2,
    height: viewport.height + metrics.bezel * 2 + metrics.top,
  };
}

// The shell as insets around the screen, for computeFitZoom (viewportMath.ts).
export function chromeInsets(metrics: ChromeMetrics): Insets {
  return {
    top: metrics.bezel + metrics.top,
    right: metrics.bezel,
    bottom: metrics.bezel,
    left: metrics.bezel,
  };
}
