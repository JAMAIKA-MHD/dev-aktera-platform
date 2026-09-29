import type { SupabaseClient } from "@supabase/supabase-js";
import type { AnalyticsTracker, ExperienceEvent } from "../ports";

// AnalyticsTracker of the public player page (backend task B3.4): the visits feed the
// dashboard's existing statistics through record_campaign_impression, one row per campaign
// and session (the function merges repeated calls). Only two events are sent:
//   experience_viewed → a visit;
//   form_submitted    → the form was completed, with the time spent since the visit.
// select-prize records "game played" itself. Every other event is ignored (logged in
// development). Fire-and-forget: it never throws, never waits, never sends personal data.

export const IMPRESSION_FUNCTION = "record_campaign_impression";

export interface SupabaseAnalyticsTrackerOptions {
  client: SupabaseClient;
  userAgent?: () => string;
  debug?: (message: string, event: ExperienceEvent) => void; // development log
}

export function createSupabaseAnalyticsTracker(
  options: SupabaseAnalyticsTrackerOptions,
): AnalyticsTracker {
  const { client } = options;
  const userAgent =
    options.userAgent ??
    (() => (typeof navigator === "undefined" ? "" : navigator.userAgent));
  const debug =
    options.debug ??
    (import.meta.env.DEV
      ? (message: string, event: ExperienceEvent) =>
          console.debug(message, event)
      : () => {});
  // When each session was first seen, to measure the time spent before the form.
  const viewedAt = new Map<string, number>();

  function record(
    event: ExperienceEvent,
    dwellTimeSeconds: number,
    formCompleted: boolean,
  ) {
    if (!event.campaignId) return; // standalone preview: nothing to count
    void Promise.resolve()
      .then(() =>
        client.rpc(IMPRESSION_FUNCTION, {
          p_campaign_id: event.campaignId,
          p_session_id: event.sessionId,
          p_user_agent: userAgent(),
          p_ip_address: null,
          p_dwell_time_seconds: dwellTimeSeconds,
          p_game_played: false,
          p_form_completed: formCompleted,
        }),
      )
      .catch(() => {
        // Ignored on purpose: statistics never break the journey.
      });
  }

  return {
    track(event: ExperienceEvent) {
      try {
        debug(`[player-experience] ${event.name}`, event);
        const at = Date.parse(event.at);
        if (event.name === "experience_viewed") {
          if (!viewedAt.has(event.sessionId)) viewedAt.set(event.sessionId, at);
          record(event, 0, false);
        } else if (event.name === "form_submitted") {
          const since = viewedAt.get(event.sessionId) ?? at;
          const seconds = Math.max(0, Math.round((at - since) / 1000));
          record(event, Number.isFinite(seconds) ? seconds : 0, true);
        }
      } catch {
        // Ignored on purpose: analytics are fire-and-forget.
      }
    },
  };
}
