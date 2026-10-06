import { afterEach, describe, expect, it, vi } from "vitest";
import type { DrawRequest, DrawResult } from "../../domain/participation";
import { createSeededRandom } from "./demoDrawEngine";
import { createDemoEntryStore } from "./demoEntryStore";
import {
  DEMO_GATEWAY_WARNING,
  createDemoParticipationGateway,
  type DemoParticipationGatewayOptions,
} from "./demoParticipationGateway";
import type { DemoCampaignRules } from "./demoRules";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const COUPON = /^DEMO-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

const rules = (
  changes: Partial<DemoCampaignRules> = {},
): DemoCampaignRules => ({
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
      remaining: 10,
    },
  ],
  ...changes,
});

let sequence = 0;
const request = (changes: Partial<DrawRequest> = {}): DrawRequest => {
  sequence += 1;
  return {
    clientRequestId: `request-${sequence}`,
    campaignId: "campaign-1",
    participant: { phone: "0541234567", fullName: "Amina B." },
    consent: {
      accepted: true,
      acceptedAt: "2026-09-21T19:00:00.000Z",
      policyVersion: "2026-09-01",
      locale: "fr",
    },
    gamePayload: { kind: "none" },
    humanToken: null,
    context: {
      sessionId: "session-1",
      dwellTimeSeconds: 12,
      userAgent: "vitest",
      source: "studio_preview",
    },
    ...changes,
  };
};

function setup(changes: Partial<DemoParticipationGatewayOptions> = {}) {
  const store = createDemoEntryStore();
  const sleep = vi.fn(async (_ms: number) => {});
  const warn = vi.fn();
  const gateway = createDemoParticipationGateway({
    rules: rules(),
    store,
    random: createSeededRandom(2026),
    sleep,
    warn,
    now: () => new Date("2026-09-21T19:30:00.000Z"),
    ...changes,
  });
  return { gateway, store, sleep, warn };
}

const errorCode = (result: DrawResult) =>
  result.ok === false ? result.error.code : null;

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe("demo gateway: draw", () => {
  it("draws, records the entry and answers like select-prize", async () => {
    const { gateway, store } = setup();
    expect(gateway.mode).toBe("demo");
    const result = await gateway.draw(request());
    expect(result).toEqual({
      ok: true,
      entryId: expect.stringMatching(UUID),
      outcome: {
        isWinner: true,
        prize: { id: "voucher", name: "Bon 2000 DA", winMessage: "Bravo" },
        couponCode: expect.stringMatching(COUPON),
      },
    });
    expect(store.list("campaign-1")).toEqual([
      expect.objectContaining({
        entryId: result.ok === true ? result.entryId : null,
        phone: "0541234567",
        createdAt: "2026-09-21T19:30:00.000Z",
        couponConfirmed: false,
      }),
    ]);
  });

  it("records a loss too: it counts as a participation", async () => {
    const { gateway, store } = setup({ rules: rules({ winProbability: 0 }) });
    const result = await gateway.draw(request());
    expect(result).toMatchObject({ ok: true, outcome: { isWinner: false } });
    expect(store.list("campaign-1")).toHaveLength(1);
  });

  it("judges the skill games with the rules of the campaign", async () => {
    const { gateway } = setup({
      rules: rules({ hitIt: { winThreshold: 8 } }),
    });
    const missed = await gateway.draw(
      request({ gamePayload: { kind: "hitIt", hits: 5 } }),
    );
    expect(missed).toMatchObject({ ok: true, outcome: { isWinner: false } });
  });

  it("waits like a real network, between 400 and 900 ms", async () => {
    const { gateway, sleep } = setup({ latencyMs: undefined });
    await gateway.draw(request());
    const [[ms]] = sleep.mock.calls;
    expect(ms).toBeGreaterThanOrEqual(400);
    expect(ms).toBeLessThanOrEqual(900);
  });

  it("really waits by default", async () => {
    vi.useFakeTimers();
    const gateway = createDemoParticipationGateway({
      rules: rules(),
      warn: () => {},
    });
    let settled = false;
    const pending = gateway.draw(request()).then((result) => {
      settled = true;
      return result;
    });
    await vi.advanceTimersByTimeAsync(399);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(501);
    expect((await pending).ok).toBe(true);
  });

  it("warns once in the console that outcomes are simulated", async () => {
    const { gateway, warn } = setup();
    await gateway.draw(request());
    await gateway.draw(request({ participant: { phone: "0661234567" } }));
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(DEMO_GATEWAY_WARNING);
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    await createDemoParticipationGateway({
      rules: rules(),
      sleep: async () => {},
    }).draw(request({ participant: { phone: "0771234567" } }));
    expect(consoleWarn).toHaveBeenCalledWith(DEMO_GATEWAY_WARNING);
    consoleWarn.mockRestore();
  });
});

describe("demo gateway: same refusals as the server", () => {
  it("refuses a second participation with the same phone, however it is written", async () => {
    const { gateway } = setup();
    await gateway.draw(request());
    for (const phone of ["0541234567", "+213 541 23 45 67", "05 41 23 45 67"]) {
      const again = await gateway.draw(request({ participant: { phone } }));
      expect(again).toEqual({
        ok: false,
        error: {
          code: "ALREADY_PARTICIPATED",
          message: "You have already participated in this campaign.",
        },
      });
    }
    const other = await gateway.draw(
      request({ participant: { phone: "0661234567" } }),
    );
    expect(other.ok).toBe(true);
  });

  it("follows the entry limit of the campaign", async () => {
    const twice = setup({ rules: rules({ maxEntries: 2 }) });
    expect((await twice.gateway.draw(request())).ok).toBe(true);
    expect((await twice.gateway.draw(request())).ok).toBe(true);
    expect(errorCode(await twice.gateway.draw(request()))).toBe(
      "ALREADY_PARTICIPATED",
    );
    localStorage.clear();
    const unlimited = setup({ rules: rules({ maxEntries: 0 }) });
    for (let index = 0; index < 5; index++) {
      expect((await unlimited.gateway.draw(request())).ok).toBe(true);
    }
  });

  it("refuses invalid input", async () => {
    const { gateway } = setup();
    expect(
      errorCode(
        await gateway.draw(request({ participant: { phone: "0212345678" } })),
      ),
    ).toBe("INVALID_INPUT");
    expect(
      errorCode(await gateway.draw(request({ participant: { phone: "" } }))),
    ).toBe("INVALID_INPUT");
    expect(errorCode(await gateway.draw(request({ campaignId: "" })))).toBe(
      "INVALID_INPUT",
    );
  });

  it("refuses to play without consent (Law 18-07)", async () => {
    const { gateway, store } = setup();
    const refused = await gateway.draw(
      request({ consent: undefined as unknown as DrawRequest["consent"] }),
    );
    expect(refused).toEqual({
      ok: false,
      error: {
        code: "INVALID_INPUT",
        message: "Consent is required before playing.",
      },
    });
    const notAccepted = await gateway.draw(
      request({
        consent: {
          ...request().consent,
          accepted: false,
        } as unknown as DrawRequest["consent"],
      }),
    );
    expect(errorCode(notAccepted)).toBe("INVALID_INPUT");
    expect(store.list("campaign-1")).toEqual([]);
  });

  it("refuses a campaign that is not active, or another campaign", async () => {
    const paused = setup({ rules: rules({ active: false }) });
    expect(await paused.gateway.draw(request())).toEqual({
      ok: false,
      error: { code: "CAMPAIGN_CLOSED", message: "Campaign is not active." },
    });
    const { gateway } = setup();
    expect(
      errorCode(await gateway.draw(request({ campaignId: "campaign-2" }))),
    ).toBe("CAMPAIGN_CLOSED");
  });

  it("closes the campaign once the demo has given away the whole stock", async () => {
    const onePrize = rules({
      prizes: [
        {
          id: "voucher",
          name: "Bon",
          winMessage: null,
          weight: 1,
          remaining: 1,
        },
      ],
    });
    const { gateway } = setup({ rules: onePrize });
    const first = await gateway.draw(request());
    expect(first).toMatchObject({ ok: true, outcome: { isWinner: true } });
    const second = await gateway.draw(
      request({ participant: { phone: "0661234567" } }),
    );
    expect(second).toEqual({
      ok: false,
      error: {
        code: "CAMPAIGN_CLOSED",
        message:
          "This campaign is closed. All voucher rewards have been claimed.",
      },
    });
    expect(onePrize.prizes[0].remaining).toBe(1); // the real stock is untouched
  });

  it("checks in the server's order", async () => {
    // Invalid input comes before the campaign status…
    const paused = setup({ rules: rules({ active: false }) });
    expect(
      errorCode(
        await paused.gateway.draw(request({ participant: { phone: "12" } })),
      ),
    ).toBe("INVALID_INPUT");
    // …and a duplicate before the stock.
    const onePrize = rules({
      prizes: [
        {
          id: "voucher",
          name: "Bon",
          winMessage: null,
          weight: 1,
          remaining: 1,
        },
      ],
    });
    localStorage.clear();
    const { gateway } = setup({ rules: onePrize });
    await gateway.draw(request());
    expect(errorCode(await gateway.draw(request()))).toBe(
      "ALREADY_PARTICIPATED",
    );
  });
});

describe("demo gateway: retries", () => {
  it("answers a retried request with the same entry, without drawing again", async () => {
    const { gateway, store } = setup({ rules: rules({ winProbability: 50 }) });
    const first = request();
    const results = [
      await gateway.draw(first),
      await gateway.draw(first),
      await gateway.draw(first),
    ];
    expect(results[1]).toEqual(results[0]);
    expect(results[2]).toEqual(results[0]);
    expect(store.list("campaign-1")).toHaveLength(1); // never counted as a duplicate
  });
});

describe("demo gateway: availability and coupons", () => {
  it("tells whether the campaign is open", async () => {
    expect(await setup().gateway.checkAvailability("campaign-1")).toEqual({
      open: true,
    });
    expect(await setup().gateway.checkAvailability("campaign-2")).toEqual({
      open: false,
      reason: "CLOSED",
    });
    expect(
      await setup({
        rules: rules({ active: false }),
      }).gateway.checkAvailability("campaign-1"),
    ).toEqual({ open: false, reason: "CLOSED" });
    const soldOut = rules({
      prizes: [
        {
          id: "voucher",
          name: "Bon",
          winMessage: null,
          weight: 1,
          remaining: 0,
        },
      ],
    });
    expect(
      await setup({ rules: soldOut }).gateway.checkAvailability("campaign-1"),
    ).toEqual({
      open: false,
      reason: "SOLD_OUT",
    });
  });

  it("confirms the coupon of a known entry only", async () => {
    const { gateway, store } = setup();
    const result = await gateway.draw(request());
    const entryId = result.ok === true ? result.entryId : "";
    expect(await gateway.confirmCoupon(entryId)).toEqual({ ok: true });
    expect(store.findById(entryId)?.couponConfirmed).toBe(true);
    expect(await gateway.confirmCoupon("unknown")).toEqual({
      ok: false,
      error: { code: "INVALID_INPUT", message: "Unknown entry." },
    });
  });
});
