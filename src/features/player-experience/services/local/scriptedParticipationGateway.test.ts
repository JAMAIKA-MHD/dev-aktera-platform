import { afterEach, describe, expect, it, vi } from "vitest";
import type { DrawRequest, DrawResult } from "../../domain/participation";
import { createSeededRandom } from "./demoDrawEngine";
import {
  DEMO_GATEWAY_WARNING,
  createDemoParticipationGateway,
} from "./demoParticipationGateway";
import {
  SCRIPTED_LATENCY_MS,
  createScriptedParticipationGateway,
  type ScriptedScenario,
} from "./scriptedParticipationGateway";

const UUID =
  /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;
const COUPON = /^DEMO-[A-HJ-NP-Z2-9]{4}-[A-HJ-NP-Z2-9]{4}$/;

const PRIZES = [
  {
    id: "voucher",
    name: "Bon 2000 DA",
    winMessage: "Présentez ce code en caisse.",
  },
  { id: "gift", name: "", winMessage: null },
];

const request: DrawRequest = {
  clientRequestId: "request-1",
  campaignId: "campaign-1",
  participant: { phone: "0541234567" },
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
    dwellTimeSeconds: 3,
    userAgent: "vitest",
    source: "studio_preview",
  },
};

function setup(scenario: ScriptedScenario) {
  const sleep = vi.fn(async (_ms: number) => {});
  const warn = vi.fn();
  const gateway = createScriptedParticipationGateway({
    scenario,
    prizes: PRIZES,
    random: createSeededRandom(1),
    sleep,
    warn,
  });
  return { gateway, sleep, warn };
}

// The structure of a result: its keys, recursively, without the values.
function shape(value: unknown): unknown {
  if (typeof value !== "object" || value === null) return typeof value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, child]) => [key, shape(child)]),
  );
}

afterEach(() => {
  vi.useRealTimers();
  localStorage.clear();
});

describe("scripted gateway", () => {
  it("wins the chosen prize, with a DEMO coupon", async () => {
    const { gateway } = setup("win-voucher");
    expect(gateway.mode).toBe("scripted");
    expect(await gateway.draw(request)).toEqual({
      ok: true,
      entryId: expect.stringMatching(UUID),
      outcome: {
        isWinner: true,
        prize: {
          id: "voucher",
          name: "Bon 2000 DA",
          winMessage: "Présentez ce code en caisse.",
        },
        couponCode: expect.stringMatching(COUPON),
      },
    });
  });

  it("names a prize without name, or unknown, by its id", async () => {
    for (const prizeId of ["gift", "missing"]) {
      const result = await setup(`win-${prizeId}`).gateway.draw(request);
      expect(result).toMatchObject({
        ok: true,
        outcome: { prize: { id: prizeId, name: prizeId, winMessage: null } },
      });
    }
    const noPrizes = createScriptedParticipationGateway({
      scenario: "win-voucher",
      sleep: async () => {},
      warn: () => {},
    });
    expect(await noPrizes.draw(request)).toMatchObject({
      ok: true,
      outcome: {
        prize: { name: "voucher" },
        couponCode: expect.stringMatching(COUPON),
      },
    });
  });

  it("loses", async () => {
    expect(await setup("lose").gateway.draw(request)).toEqual({
      ok: true,
      entryId: expect.stringMatching(UUID),
      outcome: { isWinner: false, prize: null, couponCode: null },
    });
  });

  it("returns the server errors", async () => {
    const cases: [ScriptedScenario, string][] = [
      ["duplicate", "ALREADY_PARTICIPATED"],
      ["closed", "CAMPAIGN_CLOSED"],
      ["network-error", "NETWORK"],
    ];
    for (const [scenario, code] of cases) {
      const result = await setup(scenario).gateway.draw(request);
      expect(result.ok === false ? result.error.code : null).toBe(code);
    }
    const unknown = await setup("explode" as ScriptedScenario).gateway.draw(
      request,
    );
    expect(unknown).toEqual({
      ok: false,
      error: {
        code: "UNKNOWN",
        message: 'Unknown scripted scenario "explode".',
      },
    });
  });

  it("switches scenario from the Studio", async () => {
    const { gateway } = setup("lose");
    expect(gateway.scenario).toBe("lose");
    gateway.setScenario("duplicate");
    expect(gateway.scenario).toBe("duplicate");
    const result = await gateway.draw(request);
    expect(result.ok === false ? result.error.code : null).toBe(
      "ALREADY_PARTICIPATED",
    );
  });

  it("waits a short fixed time, and warns once", async () => {
    const { gateway, sleep, warn } = setup("lose");
    await gateway.draw(request);
    await gateway.draw(request);
    expect(sleep).toHaveBeenCalledWith(SCRIPTED_LATENCY_MS);
    expect(SCRIPTED_LATENCY_MS).toBe(300);
    expect(warn).toHaveBeenCalledOnce();
    expect(warn).toHaveBeenCalledWith(DEMO_GATEWAY_WARNING);
  });

  it("really waits by default, and warns in the console", async () => {
    vi.useFakeTimers();
    const consoleWarn = vi.spyOn(console, "warn").mockImplementation(() => {});
    const gateway = createScriptedParticipationGateway({ scenario: "lose" });
    let settled = false;
    const pending = gateway.draw(request).then(() => (settled = true));
    await vi.advanceTimersByTimeAsync(299);
    expect(settled).toBe(false);
    await vi.advanceTimersByTimeAsync(1);
    await pending;
    expect(settled).toBe(true);
    expect(consoleWarn).toHaveBeenCalledWith(DEMO_GATEWAY_WARNING);
    consoleWarn.mockRestore();
  });

  it("reports availability from the scenario, and confirms any coupon", async () => {
    expect(
      await setup("closed").gateway.checkAvailability("campaign-1"),
    ).toEqual({
      open: false,
      reason: "CLOSED",
    });
    expect(await setup("lose").gateway.checkAvailability("campaign-1")).toEqual(
      {
        open: true,
      },
    );
    expect(await setup("win-voucher").gateway.confirmCoupon("any")).toEqual({
      ok: true,
    });
  });

  it("has no side effect: nothing is stored", async () => {
    const { gateway } = setup("win-voucher");
    await gateway.draw(request);
    await gateway.draw(request);
    expect(localStorage.length).toBe(0);
  });
});

describe("both gateways", () => {
  it("return results of exactly the same shape", async () => {
    const demo = (winProbability: number, maxEntries = 1) =>
      createDemoParticipationGateway({
        rules: {
          campaignId: "campaign-1",
          active: true,
          winProbability,
          maxEntries,
          prizes: [
            {
              id: "voucher",
              name: "Bon",
              winMessage: "Bravo",
              weight: 1,
              remaining: 5,
            },
          ],
        },
        sleep: async () => {},
        warn: () => {},
      });
    const results: Record<string, [DrawResult, DrawResult]> = {};
    results.win = [
      await demo(100).draw({ ...request, clientRequestId: "a" }),
      await setup("win-voucher").gateway.draw(request),
    ];
    localStorage.clear();
    results.lose = [
      await demo(0).draw({ ...request, clientRequestId: "b" }),
      await setup("lose").gateway.draw(request),
    ];
    const duplicateGateway = demo(0);
    results.duplicate = [
      await duplicateGateway
        .draw({ ...request, clientRequestId: "c" })
        .then(() =>
          duplicateGateway.draw({ ...request, clientRequestId: "d" }),
        ),
      await setup("duplicate").gateway.draw(request),
    ];
    for (const [name, [fromDemo, fromScript]] of Object.entries(results)) {
      expect(shape(fromScript), name).toEqual(shape(fromDemo));
    }
  });
});
