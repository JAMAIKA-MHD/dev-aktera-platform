import { isShortScreen } from "./shortScreen";

// Whether the preview bar (language, screen tabs, device, size, zoom, tiers) is open, remembered
// per browser, like the preview's device itself: it describes how the brand works, not the
// experience. Until the brand chooses, the bar is open, except on a short screen where the room
// is for the preview. Storage may be blocked: every access is guarded.
//
// A key of its own: a choice made when the bar held the device controls only (the old key) would
// hide the tabs and the languages from someone who never meant to.

export const PREVIEW_BAR_KEY = "xp:studio:preview-bar:v1";

export function loadPreviewBarOpen(
  storage: () => Storage = () => globalThis.localStorage,
): boolean {
  try {
    const stored = storage().getItem(PREVIEW_BAR_KEY);
    if (stored === "open") return true;
    if (stored === "closed") return false;
  } catch {
    // Blocked storage: fall through to the default.
  }
  return !isShortScreen();
}

export function savePreviewBarOpen(
  open: boolean,
  storage: () => Storage = () => globalThis.localStorage,
): void {
  try {
    storage().setItem(PREVIEW_BAR_KEY, open ? "open" : "closed");
  } catch {
    // Blocked or full storage: the choice simply is not remembered.
  }
}
