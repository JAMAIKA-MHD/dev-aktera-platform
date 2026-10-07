import { isShortScreen } from "./shortScreen";

// Whether the device bar (device, size, zoom, tiers) is open, remembered per browser, like the
// preview's device itself: it describes how the brand works, not the experience. Until the brand
// chooses, the bar is open, except on a short screen where the room is for the preview. Storage
// may be blocked: every access is guarded.

export const DEVICE_BAR_KEY = "xp:studio:device-bar:v1";

export function loadDeviceBarOpen(
  storage: () => Storage = () => globalThis.localStorage,
): boolean {
  try {
    const stored = storage().getItem(DEVICE_BAR_KEY);
    if (stored === "open") return true;
    if (stored === "closed") return false;
  } catch {
    // Blocked storage: fall through to the default.
  }
  return !isShortScreen();
}

export function saveDeviceBarOpen(
  open: boolean,
  storage: () => Storage = () => globalThis.localStorage,
): void {
  try {
    storage().setItem(DEVICE_BAR_KEY, open ? "open" : "closed");
  } catch {
    // Blocked or full storage: the choice simply is not remembered.
  }
}
