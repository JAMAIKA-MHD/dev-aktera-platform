import { describe, expect, it } from "vitest";
import type { ExperienceEvent, ExperienceEventName } from "../ports";
import {
  createFakeSupabase,
  type FakeHandlers,
} from "./__tests__/fakeSupabaseClient";
import {
  IMPRESSION_FUNCTION,
  createSupabaseAnalyticsTracker,
} from "./supabaseAnalyticsTracker";

const event = (
  name: ExperienceEventName,
  at: string,
  overrides: Partial<ExperienceEvent> = {},
): ExperienceEvent => ({
  name,
  at,
  campaignId: "campaign-1",
  sessionId: "session-1",
  screen: "welcome",
  locale: "fr",
  ...overrides,
});

const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

function setup(rpc?: FakeHandlers["rpc"]) {
  const fake = createFakeSupabase({ rpc });
  const tracker = createSupabaseAnalyticsTracker({
    client: fake.client,
    userAgent: () => "UA-test",
    debug: () => {},
  });
  return { ...fake, tracker };
}

describe("createSupabaseAnalyticsTracker", () => {
  it("records a visit when the experience is viewed", async () => {
    const { tracker, calls } = setup();
    tracker.track(event("experience_viewed", "2026-09-29T10:00:00.000Z"));
    await flush();
    expect(calls).toEqual([
      {
        kind: "rpc",
        target: IMPRESSION_FUNCTION,
        payload: {
          p_campaign_id: "campaign-1",
          p_session_id: "session-1",
          p_user_agent: "UA-test",
          p_ip_address: null,
          p_dwell_time_seconds: 0,
          p_game_played: false,
          p_form_completed: false,
        },
      },
    ]);
  });

  it("records the completed form with the time spent since the visit", async () => {
    const { tracker, calls } = setup();
    tracker.track(event("experience_viewed", "2026-09-29T10:00:00.000Z"));
    tracker.track(
      event("form_submitted", "2026-09-29T10:00:42.400Z", {
        screen: "register",
      }),
    );
    await flush();
    expect(calls[1].payload).toMatchObject({
      p_dwell_time_seconds: 42,
      p_form_completed: true,
    });
  });

  it("ignores every other event and never sends personal data", async () => {
    const { tracker, calls } = setup();
    for (const name of [
      "cta_clicked",
      "game_started",
      "draw_requested",
      "coupon_copied",
    ] as const) {
      tracker.track(
        event(name, "2026-09-29T10:00:00.000Z", { data: { gameType: "quiz" } }),
      );
    }
    tracker.track(event("experience_viewed", "2026-09-29T10:00:00.000Z"));
    await flush();
    expect(calls).toHaveLength(1);
    expect(JSON.stringify(calls)).not.toMatch(/phone|email|name/i);
  });

  it("counts nothing for a standalone preview (no campaign)", async () => {
    const { tracker, calls } = setup();
    tracker.track(
      event("experience_viewed", "2026-09-29T10:00:00.000Z", {
        campaignId: null,
      }),
    );
    await flush();
    expect(calls).toEqual([]);
  });

  it("never throws nor rejects when the server fails", async () => {
    const { tracker } = setup(() => Promise.reject(new Error("offline")));
    expect(() =>
      tracker.track(event("experience_viewed", "2026-09-29T10:00:00.000Z")),
    ).not.toThrow();
    await flush();
  });
});
