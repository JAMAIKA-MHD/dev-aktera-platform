import { ENVELOPE } from "../../runtime/layout/breakpoints";
import type { SafeAreaInsets } from "../../runtime/layout/safeArea";

// The arithmetic of the DevTools-like preview (plan §9.3, tasks.md T6.9). Pure, so every rule
// (bounds, zoom, drag, rotation) is tested without a browser.

export interface Size {
  width: number;
  height: number;
}

export type Insets = SafeAreaInsets;

export const ZOOM_LEVELS = [0.5, 0.75, 1, 1.25, 1.5] as const;
export const MIN_ZOOM = 0.1;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));

// Every size the Studio can show is one the runtime supports (RWD1).
export function clampToEnvelope(size: Size): Size {
  return {
    width: Math.round(clamp(size.width, ENVELOPE.minWidth, ENVELOPE.maxWidth)),
    height: Math.round(
      clamp(size.height, ENVELOPE.minHeight, ENVELOPE.maxHeight),
    ),
  };
}

// "Fit": the device and its shell as large as the room allows, never above 100 %. Rounded down
// to the percent, so the indicator never claims more than what is shown.
export function computeFitZoom(
  device: Size,
  chrome: Insets,
  available: Size,
): number {
  if (available.width <= 0 || available.height <= 0) return 1;
  const outer = {
    width: device.width + chrome.left + chrome.right,
    height: device.height + chrome.top + chrome.bottom,
  };
  const ratio = Math.min(
    available.width / outer.width,
    available.height / outer.height,
    1,
  );
  return Math.max(MIN_ZOOM, Math.floor(ratio * 100) / 100);
}

// A handle dragged by (dx, dy) screen pixels: at 50 % zoom, 10 px on screen are 20 CSS pixels
// of the device. The result stays inside the envelope.
export function applyPointerDelta(
  size: Size,
  edge: "right" | "bottom" | "corner",
  dx: number,
  dy: number,
  zoom: number,
): Size {
  return clampToEnvelope({
    width: edge === "bottom" ? size.width : size.width + dx / zoom,
    height: edge === "right" ? size.height : size.height + dy / zoom,
  });
}

// Portrait → landscape, as the phone's browser does it: width and height swap; the notch
// (top inset) now sits on one side and the page keeps the same margin on the other side;
// there is no status bar any more; the home indicator stays at the bottom, shorter.
export function rotate(
  size: Size,
  safeArea: Insets,
): { size: Size; safeArea: Insets } {
  return {
    size: { width: size.height, height: size.width },
    safeArea: {
      top: 0,
      right: safeArea.top,
      bottom: safeArea.bottom > 0 ? Math.round(safeArea.bottom * 0.6) : 0,
      left: safeArea.top,
    },
  };
}
