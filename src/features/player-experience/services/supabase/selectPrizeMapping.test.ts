import { describe, expect, it } from "vitest";
import type { DrawRequest, GamePayload } from "../../domain/participation";
import { toDrawResult, toSelectPrizeBody } from "./selectPrizeMapping";

const request = (overrides: Partial<DrawRequest> = {}): DrawRequest => ({
  clientRequestId: "req-1",
  campaignId: "campaign-1",
  participant: {
    phone: "0550123456",
    fullName: "Amine B.",
    email: "a@b.dz",
    wilaya: "16",
  },
  consent: {
    accepted: true,
    acceptedAt: "2026-09-29T10:00:00.000Z",
    policyVersion: "2026-09-01",
    locale: "ar",
  },
  gamePayload: { kind: "none" },
  humanToken: null,
  context: {
    sessionId: "session-1",
    dwellTimeSeconds: 42,
    userAgent: "Mozilla/5.0",
    source: "web_player",
  },
  ...overrides,
});

describe("toSelectPrizeBody", () => {
  it("maps every field of a participation", () => {
    expect(toSelectPrizeBody(request())).toEqual({
      campaign_id: "campaign-1",
      phone_number: "0550123456",
      participant_name: "Amine B.",
      participant_email: "a@b.dz",
      game_payload: {},
      session_id: "session-1",
      dwell_time_seconds: 42,
      user_agent: "Mozilla/5.0",
      metadata: {
        client_request_id: "req-1",
        consent: {
          accepted: true,
          acceptedAt: "2026-09-29T10:00:00.000Z",
          policyVersion: "2026-09-01",
          locale: "ar",
        },
        source: "web_player",
        wilaya: "16",
      },
    });
  });

  it("leaves out the optional fields the player did not fill", () => {
    const body = toSelectPrizeBody(
      request({ participant: { phone: "0550123456" } }),
    );
    expect(body).not.toHaveProperty("participant_name");
    expect(body).not.toHaveProperty("participant_email");
    expect(body.metadata).not.toHaveProperty("wilaya");
    expect(body.metadata).not.toHaveProperty("human_token");
  });

  it("sends the captcha token when there is one", () => {
    expect(
      toSelectPrizeBody(request({ humanToken: "tok" })).metadata.human_token,
    ).toBe("tok");
  });

  it.each<[GamePayload, Record<string, unknown>]>([
    [{ kind: "none" }, {}],
    [
      { kind: "quiz", answers: { q1: 2, q2: 0 } },
      { answers: { q1: 2, q2: 0 } },
    ],
    [{ kind: "boxes", selectedIndex: 1 }, { selected_box_index: 1 }],
    [{ kind: "hitIt", hits: 9 }, { hits: 9 }],
  ])("maps the %j game payload", (gamePayload, expected) => {
    expect(toSelectPrizeBody(request({ gamePayload })).game_payload).toEqual(
      expected,
    );
  });
});

describe("toDrawResult — success", () => {
  it("maps a win with its coupon", () => {
    expect(
      toDrawResult({
        status: 200,
        body: {
          ok: true,
          entry: { id: "entry-1", redeemed_coupon_value: "OOR-1" },
          prize: { id: "prize-1", name: "Bon 1000 DA", win_message: "Bravo !" },
          coupon: { code: "OOR-1" },
          game_outcome: { ok: true, is_winner: true },
        },
      }),
    ).toEqual({
      ok: true,
      entryId: "entry-1",
      outcome: {
        isWinner: true,
        prize: { id: "prize-1", name: "Bon 1000 DA", winMessage: "Bravo !" },
        couponCode: "OOR-1",
      },
    });
  });

  it("maps a loss", () => {
    expect(
      toDrawResult({
        status: 200,
        body: { ok: true, entry: { id: "entry-2" }, prize: null, coupon: null },
      }),
    ).toEqual({
      ok: true,
      entryId: "entry-2",
      outcome: { isWinner: false, prize: null, couponCode: null },
    });
  });

  it("maps a win without a code (no code left) and a replayed answer", () => {
    const result = toDrawResult({
      status: 200,
      body: {
        ok: true,
        replayed: true,
        entry: { id: "entry-3", redeemed_coupon_value: null },
        prize: { id: "prize-1", name: "Mug", win_message: null },
        coupon: null,
      },
    });
    expect(result).toEqual({
      ok: true,
      entryId: "entry-3",
      outcome: {
        isWinner: true,
        prize: { id: "prize-1", name: "Mug", winMessage: null },
        couponCode: null,
      },
    });
  });
});

describe("toDrawResult — errors with a code (select-prize since B2.1)", () => {
  it.each([
    [400, "ALREADY_PARTICIPATED", "ALREADY_PARTICIPATED"],
    [404, "CAMPAIGN_CLOSED", "CAMPAIGN_CLOSED"],
    [400, "CAMPAIGN_CLOSED", "CAMPAIGN_CLOSED"],
    [400, "INVALID_INPUT", "INVALID_INPUT"],
    [400, "CONSENT_REQUIRED", "INVALID_INPUT"],
    [500, "DRAW_FAILED", "NETWORK"],
    [500, "SERVER_ERROR", "NETWORK"],
  ])("HTTP %i %s → %s", (status, serverCode, expected) => {
    const result = toDrawResult({
      status,
      body: { ok: false, code: serverCode, error: "Server text." },
    });
    expect(result).toEqual({
      ok: false,
      error: { code: expected, message: "Server text." },
    });
  });
});

describe("toDrawResult — messages of a select-prize deployed before B2.1 (no code)", () => {
  // One line per message of the old function: a change of wording must break a test.
  it.each([
    [
      400,
      "You have already participated in this campaign.",
      "ALREADY_PARTICIPATED",
    ],
    [404, "Campaign not found.", "CAMPAIGN_CLOSED"],
    [400, "Campaign is not active.", "CAMPAIGN_CLOSED"],
    [
      400,
      "This campaign is closed. All voucher rewards have been claimed.",
      "CAMPAIGN_CLOSED",
    ],
    [400, "Invalid Algerian phone number format.", "INVALID_INPUT"],
    [400, "campaign_id and phone_number are required.", "INVALID_INPUT"],
    [500, "Failed to process prize draw.", "NETWORK"],
    [500, "Failed to record campaign entry.", "NETWORK"],
    [500, "Server configuration is missing.", "NETWORK"],
  ])('HTTP %i "%s" → %s', (status, error, expected) => {
    const result = toDrawResult({ status, body: { ok: false, error } });
    expect(result.ok === false && result.error.code).toBe(expected);
  });
});

describe("toDrawResult — no usable answer", () => {
  it("treats a request without answer (network, timeout) as a network failure", () => {
    expect(toDrawResult({ status: null, body: null })).toEqual({
      ok: false,
      error: { code: "NETWORK", message: "select-prize could not be reached." },
    });
  });

  it("treats a 5xx without body as a network failure", () => {
    const result = toDrawResult({ status: 502, body: null });
    expect(result).toEqual({
      ok: false,
      error: { code: "NETWORK", message: "select-prize answered HTTP 502." },
    });
  });

  it.each([
    [200, { ok: true }], // success without entry
    [200, "not json"],
    [400, { ok: false, error: "Something unexpected." }],
    [403, { message: "Forbidden" }],
  ])("anything else is UNKNOWN (HTTP %i %j)", (status, body) => {
    const result = toDrawResult({ status, body });
    expect(result.ok === false && result.error.code).toBe("UNKNOWN");
  });
});
