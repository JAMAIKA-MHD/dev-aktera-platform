import { describe, expect, it } from "vitest";
import type { DrawRequest } from "../../domain/participation";
import {
  createFakeSupabase,
  type FakeHandlers,
} from "./__tests__/fakeSupabaseClient";
import {
  CONFIRM_COUPON_FUNCTION,
  DEFAULT_TIMEOUT_MS,
  SELECT_PRIZE_FUNCTION,
  createSupabaseParticipationGateway,
} from "./supabaseParticipationGateway";

const request: DrawRequest = {
  clientRequestId: "req-1",
  campaignId: "campaign-1",
  participant: { phone: "0550123456" },
  consent: {
    accepted: true,
    acceptedAt: "2026-09-29T10:00:00.000Z",
    policyVersion: "2026-09-01",
    locale: "fr",
  },
  gamePayload: { kind: "hitIt", hits: 9 },
  humanToken: null,
  context: {
    sessionId: "s",
    dwellTimeSeconds: 3,
    userAgent: "UA",
    source: "web_player",
  },
};

// A non-2xx answer, as functions-js reports it: an error whose context is the HTTP response.
const httpError = (status: number, body: unknown) => ({
  error: {
    message: "Edge Function returned a non-2xx status code",
    context: { status, json: async () => body },
  },
});

function setup(invoke?: FakeHandlers["invoke"], timeoutMs?: number) {
  const fake = createFakeSupabase({ invoke });
  const gateway = createSupabaseParticipationGateway({
    client: fake.client,
    availability: { open: false, reason: "SOLD_OUT" },
    timeoutMs,
  });
  return { ...fake, gateway };
}

describe("createSupabaseParticipationGateway", () => {
  it("is the live gateway", () => {
    expect(setup().gateway.mode).toBe("live");
  });

  it("answers availability from what was read with the campaign, without a call", async () => {
    const { gateway, calls } = setup();
    expect(await gateway.checkAvailability("campaign-1")).toEqual({
      open: false,
      reason: "SOLD_OUT",
    });
    expect(calls).toEqual([]);
  });

  it("draws through select-prize, with the mapped body and a timeout", async () => {
    let seenTimeout: unknown;
    const { gateway, calls } = setup((_name, options) => {
      seenTimeout = (options as { timeout?: number }).timeout;
      return {
        data: {
          ok: true,
          entry: { id: "entry-1" },
          prize: { id: "p1", name: "Mug", win_message: null },
          coupon: { code: "MUG-1" },
        },
      };
    });
    const result = await gateway.draw(request);
    expect(result).toEqual({
      ok: true,
      entryId: "entry-1",
      outcome: {
        isWinner: true,
        prize: { id: "p1", name: "Mug", winMessage: null },
        couponCode: "MUG-1",
      },
    });
    expect(calls[0].target).toBe(SELECT_PRIZE_FUNCTION);
    expect(calls[0].payload).toMatchObject({
      campaign_id: "campaign-1",
      phone_number: "0550123456",
      game_payload: { hits: 9 },
      metadata: { client_request_id: "req-1" },
    });
    expect(seenTimeout).toBe(DEFAULT_TIMEOUT_MS);
  });

  it("reads the body of a non-2xx answer", async () => {
    const { gateway } = setup(() =>
      httpError(400, {
        ok: false,
        code: "ALREADY_PARTICIPATED",
        error: "You have already participated in this campaign.",
      }),
    );
    expect(await gateway.draw(request)).toEqual({
      ok: false,
      error: {
        code: "ALREADY_PARTICIPATED",
        message: "You have already participated in this campaign.",
      },
    });
  });

  it("turns a timeout, a network failure or a thrown error into a retryable NETWORK error", async () => {
    const failures: FakeHandlers["invoke"][] = [
      () => ({ error: { message: "Request timed out" } }), // FunctionsFetchError: no HTTP response
      () => Promise.reject(new TypeError("Failed to fetch")),
      () => httpError(502, undefined),
    ];
    for (const invoke of failures) {
      const result = await setup(invoke).gateway.draw(request);
      expect(result.ok === false && result.error.code).toBe("NETWORK");
    }
  });

  it("handles a non-JSON error body", async () => {
    const { gateway } = setup(() => ({
      error: {
        message: "Bad gateway",
        context: {
          status: 503,
          json: async () => {
            throw new SyntaxError("not json");
          },
        },
      },
    }));
    const result = await gateway.draw(request);
    expect(result.ok === false && result.error.code).toBe("NETWORK");
  });

  it("uses the timeout it is given", async () => {
    let seenTimeout: unknown;
    const { gateway } = setup((_name, options) => {
      seenTimeout = (options as { timeout?: number }).timeout;
      return {
        data: { ok: true, entry: { id: "e" }, prize: null, coupon: null },
      };
    }, 5000);
    await gateway.draw(request);
    expect(seenTimeout).toBe(5000);
  });
});

describe("createSupabaseParticipationGateway — confirmCoupon", () => {
  it("confirms through confirm-coupon", async () => {
    const { gateway, calls } = setup(() => ({ data: { ok: true } }));
    expect(await gateway.confirmCoupon("entry-1")).toEqual({ ok: true });
    expect(calls).toEqual([
      {
        kind: "invoke",
        target: CONFIRM_COUPON_FUNCTION,
        payload: { entry_id: "entry-1" },
      },
    ]);
  });

  it("reports a server error as NETWORK and an unexpected answer as UNKNOWN", async () => {
    const serverError = await setup(() =>
      httpError(500, { ok: false, error: "entry_id is required." }),
    ).gateway.confirmCoupon("e");
    expect(serverError).toEqual({
      ok: false,
      error: { code: "NETWORK", message: "entry_id is required." },
    });

    const offline = await setup(() =>
      Promise.reject(new TypeError("Failed to fetch")),
    ).gateway.confirmCoupon("e");
    expect(offline.ok === false && offline.error.code).toBe("NETWORK");

    const odd = await setup(() => ({
      data: { ok: false },
    })).gateway.confirmCoupon("e");
    expect(odd).toEqual({
      ok: false,
      error: {
        code: "UNKNOWN",
        message: "confirm-coupon could not be reached.",
      },
    });
  });
});
