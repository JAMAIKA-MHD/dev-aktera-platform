import type { AnalyticsTracker, ExperienceEvent } from "../ports";

// AnalyticsTracker for the MVP: events are written to the console in development, and
// dropped in production builds. Tracking must never break the journey, so it never throws.

export interface ConsoleAnalyticsTrackerOptions {
  enabled?: boolean; // default: development builds only
  log?: (message: string, event: ExperienceEvent) => void;
}

export function createConsoleAnalyticsTracker(
  options: ConsoleAnalyticsTrackerOptions = {},
): AnalyticsTracker {
  const enabled = options.enabled ?? import.meta.env.DEV;
  const log =
    options.log ??
    ((message: string, event: ExperienceEvent) =>
      console.debug(message, event));
  return {
    track(event: ExperienceEvent) {
      if (!enabled) return;
      try {
        log(`[player-experience] ${event.name}`, event);
      } catch {
        // A failing logger is ignored: analytics are fire-and-forget.
      }
    },
  };
}
