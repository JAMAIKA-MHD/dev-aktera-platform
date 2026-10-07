import { DEFAULT_VIEWPORT, type ViewportState } from "../store";
import { clampToEnvelope, ZOOM_LEVELS } from "./viewportMath";

// The preview's device, size, orientation, zoom and frame, remembered per browser (plan §9.3).
// Never part of ExperienceConfig nor of the undo history: they describe how the brand looks at
// the experience, not the experience. Storage may be blocked: every access is guarded, and a
// broken value falls back to the defaults (C7).

export const VIEWPORT_PREFS_KEY = "xp:studio:viewport:v1";

function read(value: unknown): ViewportState | null {
  if (typeof value !== "object" || value === null) return null;
  const prefs = value as Record<string, unknown>;
  const { width, height } = prefs;
  if (typeof width !== "number" || typeof height !== "number") return null;
  const zoom =
    prefs.zoom === "fit" ||
    prefs.zoom === "fit-width" ||
    (typeof prefs.zoom === "number" &&
      (ZOOM_LEVELS as readonly number[]).includes(prefs.zoom))
      ? (prefs.zoom as ViewportState["zoom"])
      : "fit";
  return {
    deviceId: typeof prefs.deviceId === "string" ? prefs.deviceId : null,
    ...clampToEnvelope({ width, height }),
    orientation: prefs.orientation === "landscape" ? "landscape" : "portrait",
    zoom,
    chrome: prefs.chrome !== false,
  };
}

export function loadViewportPrefs(
  storage: () => Storage = () => globalThis.localStorage,
): ViewportState {
  try {
    const raw = storage().getItem(VIEWPORT_PREFS_KEY);
    return (raw && read(JSON.parse(raw))) || DEFAULT_VIEWPORT;
  } catch {
    return DEFAULT_VIEWPORT;
  }
}

export function saveViewportPrefs(
  viewport: ViewportState,
  storage: () => Storage = () => globalThis.localStorage,
): void {
  try {
    storage().setItem(VIEWPORT_PREFS_KEY, JSON.stringify(viewport));
  } catch {
    // Blocked or full storage: the choice simply is not remembered.
  }
}
