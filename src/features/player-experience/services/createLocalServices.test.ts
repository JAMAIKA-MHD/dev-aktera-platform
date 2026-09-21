import { afterEach, describe, expect, it, vi } from "vitest";
import { createDefaultExperience } from "../domain/defaults";
import type { DrawRequest } from "../domain/participation";
import * as publicApi from "../index";
import { createLocalServices } from "./createLocalServices";
import { ServicesProvider } from "./ServicesProvider";
import type { DemoCampaignRules } from "./local/demoRules";

const rules: DemoCampaignRules = {
  campaignId: "campaign-1",
  active: true,
  winProbability: 100,
  maxEntries: 1,
  prizes: [
    {
      id: "voucher",
      name: "Bon 2000 DA",
      winMessage: "Bravo",
      weight: 1,
      remaining: 3,
    },
  ],
};

const request = (campaignId: string): DrawRequest => ({
  clientRequestId: `request-${campaignId}`,
  campaignId,
  participant: { phone: "0541234567" },
  consent: {
    accepted: true,
    acceptedAt: "2026-09-21T21:00:00.000Z",
    policyVersion: "2026-09-01",
    locale: "fr",
  },
  gamePayload: { kind: "none" },
  humanToken: null,
  context: {
    sessionId: "session-1",
    dwellTimeSeconds: 5,
    userAgent: "vitest",
    source: "studio_preview",
  },
});

afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
  localStorage.clear();
});

describe("public API", () => {
  it("exposes the local services and the provider to the rest of the app", () => {
    expect(publicApi.createLocalServices).toBe(createLocalServices);
    expect(publicApi.ServicesProvider).toBe(ServicesProvider);
  });
});

describe("createLocalServices", () => {
  it("assembles the five local services, with the demo gateway by default", async () => {
    const services = createLocalServices();
    expect(Object.keys(services).sort()).toEqual([
      "analytics",
      "assets",
      "humanVerification",
      "participation",
      "repository",
    ]);
    expect(services.participation.mode).toBe("demo");
    await expect(services.humanVerification.getToken()).resolves.toBeNull();
    expect(services.assets.resolveUrl(null)).toBeNull();
    const debug = vi.spyOn(console, "debug").mockImplementation(() => {});
    services.analytics.track({
      name: "experience_viewed",
      at: "2026-09-21T21:00:00.000Z",
      campaignId: null,
      sessionId: "session-1",
      screen: "welcome",
      locale: "fr",
    });
    expect(debug).toHaveBeenCalledOnce(); // development build: written to the console
  });

  it("stores the configuration in the browser", async () => {
    const { repository } = createLocalServices();
    const config = createDefaultExperience({ gameType: "quiz" });
    const saved = await repository.save(config);
    expect(saved.ok).toBe(true);
    expect((await repository.load({ campaignId: null }))?.config.id).toBe(
      config.id,
    );
  });

  it("plays the demo campaign when no rules are given", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { participation } = createLocalServices();
    expect(await participation.checkAvailability("demo-campaign")).toEqual({
      open: true,
    });
    const pending = participation.draw(request("demo-campaign"));
    await vi.advanceTimersByTimeAsync(900); // demo latency
    expect((await pending).ok).toBe(true);
  });

  it("plays the campaign being edited with its own rules", async () => {
    const { participation } = createLocalServices({ rules });
    expect(await participation.checkAvailability("campaign-1")).toEqual({
      open: true,
    });
    expect(await participation.checkAvailability("demo-campaign")).toEqual({
      open: false,
      reason: "CLOSED",
    });
  });

  it("uses the scripted gateway on request, naming the prizes of the rules", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const scripted = createLocalServices({
      participation: "scripted",
      rules,
      scenario: "win-voucher",
    }).participation;
    expect(scripted.mode).toBe("scripted");
    const pending = scripted.draw(request("campaign-1"));
    await vi.advanceTimersByTimeAsync(300);
    expect(await pending).toMatchObject({
      ok: true,
      outcome: {
        prize: { id: "voucher", name: "Bon 2000 DA", winMessage: "Bravo" },
      },
    });
  });

  it("loses by default in scripted mode", async () => {
    vi.useFakeTimers();
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const { participation } = createLocalServices({
      participation: "scripted",
    });
    const pending = participation.draw(request("demo-campaign"));
    await vi.advanceTimersByTimeAsync(300);
    expect(await pending).toMatchObject({
      ok: true,
      outcome: { isWinner: false },
    });
  });
});
