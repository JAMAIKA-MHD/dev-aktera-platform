import { afterEach, describe, expect, it, vi } from "vitest";
import type { ExperienceEvent } from "../ports";
import { createConsoleAnalyticsTracker } from "./consoleAnalyticsTracker";
import { createNoopHumanVerification } from "./noopHumanVerification";

const event: ExperienceEvent = {
  name: "cta_clicked",
  at: "2026-09-21T21:00:00.000Z",
  campaignId: "campaign-1",
  sessionId: "session-1",
  screen: "welcome",
  locale: "fr",
  data: { cta: "primary" },
};

afterEach(() => vi.restoreAllMocks());

describe("consoleAnalyticsTracker", () => {
  it("writes the events when enabled", () => {
    const log = vi.fn();
    createConsoleAnalyticsTracker({ enabled: true, log }).track(event);
    expect(log).toHaveBeenCalledWith("[player-experience] cta_clicked", event);
  });

  it("drops the events when disabled (production builds)", () => {
    const log = vi.fn();
    createConsoleAnalyticsTracker({ enabled: false, log }).track(event);
    expect(log).not.toHaveBeenCalled();
  });

  it("uses console.debug in development by default", () => {
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    createConsoleAnalyticsTracker().track(event);
    expect(import.meta.env.DEV).toBe(true); // vitest runs as a development build
    expect(debug).toHaveBeenCalledWith(
      "[player-experience] cta_clicked",
      event,
    );
  });

  it("never breaks the journey, even if logging fails", () => {
    const tracker = createConsoleAnalyticsTracker({
      enabled: true,
      log: () => {
        throw new Error("console unavailable");
      },
    });
    expect(() => tracker.track(event)).not.toThrow();
  });
});

describe("noopHumanVerification", () => {
  it("has no captcha in the MVP: the token is null", async () => {
    await expect(createNoopHumanVerification().getToken()).resolves.toBeNull();
  });
});
