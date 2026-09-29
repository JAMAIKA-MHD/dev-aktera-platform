import type {
  DrawRequest,
  DrawResult,
  GamePayload,
  ParticipationErrorCode,
} from "../../domain/participation";

// Pure translation between the Player Experience's participation contract and the
// select-prize Edge Function (backend tasks B2.1, B3.2). No I/O: fully unit-tested, so that a
// change on either side is noticed.

export interface SelectPrizeBody {
  campaign_id: string;
  phone_number: string;
  participant_name?: string;
  participant_email?: string;
  game_payload: Record<string, unknown>;
  session_id: string;
  dwell_time_seconds: number;
  user_agent: string;
  metadata: Record<string, unknown>;
}

// What came back: the HTTP status (null when the request never got an answer: network
// failure, timeout) and the parsed JSON body (null when there was none).
export interface SelectPrizeHttpResult {
  status: number | null;
  body: unknown;
}

function toGamePayload(payload: GamePayload): Record<string, unknown> {
  switch (payload.kind) {
    case "quiz":
      return { answers: payload.answers };
    case "boxes":
      return { selected_box_index: payload.selectedIndex };
    case "hitIt":
      return { hits: payload.hits };
    case "none":
      return {};
  }
}

export function toSelectPrizeBody(request: DrawRequest): SelectPrizeBody {
  const { participant, context } = request;
  const metadata: Record<string, unknown> = {
    client_request_id: request.clientRequestId,
    consent: request.consent,
    source: context.source,
  };
  if (participant.wilaya) metadata.wilaya = participant.wilaya;
  // Sent for a future captcha check; select-prize neither checks nor stores it yet.
  if (request.humanToken) metadata.human_token = request.humanToken;
  return {
    campaign_id: request.campaignId,
    phone_number: participant.phone,
    ...(participant.fullName ? { participant_name: participant.fullName } : {}),
    ...(participant.email ? { participant_email: participant.email } : {}),
    game_payload: toGamePayload(request.gamePayload),
    session_id: context.sessionId,
    dwell_time_seconds: context.dwellTimeSeconds,
    user_agent: context.userAgent,
    metadata,
  };
}

// The codes select-prize returns (its ErrorCode type), onto the player's codes.
const SERVER_CODES: Readonly<Record<string, ParticipationErrorCode>> = {
  ALREADY_PARTICIPATED: "ALREADY_PARTICIPATED",
  CAMPAIGN_CLOSED: "CAMPAIGN_CLOSED",
  INVALID_INPUT: "INVALID_INPUT",
  CONSENT_REQUIRED: "INVALID_INPUT", // the form must be sent again with the consent
  DRAW_FAILED: "NETWORK", // server-side failure: worth retrying
  SERVER_ERROR: "NETWORK",
};

// Answers of a select-prize deployed before B2.1 carry no code for these: they are recognized
// by their message. Each one is pinned by a test, so a change of wording is noticed.
const LEGACY_MESSAGES: ReadonlyArray<[RegExp, ParticipationErrorCode]> = [
  [/already participated/i, "ALREADY_PARTICIPATED"],
  [
    /campaign not found|campaign is not active|campaign is closed/i,
    "CAMPAIGN_CLOSED",
  ],
  [/phone|required/i, "INVALID_INPUT"],
];

const failure = (
  code: ParticipationErrorCode,
  message: string,
): DrawResult => ({
  ok: false,
  error: { code, message },
});

function readObject(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null
    ? (value as Record<string, unknown>)
    : null;
}

export function toDrawResult(result: SelectPrizeHttpResult): DrawResult {
  if (result.status === null) {
    return failure("NETWORK", "select-prize could not be reached.");
  }
  const body = readObject(result.body);
  const entry = readObject(body?.entry);

  if (body?.ok === true && typeof entry?.id === "string") {
    const prize = readObject(body.prize);
    const coupon = readObject(body.coupon);
    return {
      ok: true,
      entryId: entry.id,
      outcome: {
        isWinner: prize !== null,
        prize:
          prize && typeof prize.id === "string"
            ? {
                id: prize.id,
                name: typeof prize.name === "string" ? prize.name : "",
                winMessage:
                  typeof prize.win_message === "string"
                    ? prize.win_message
                    : null,
              }
            : null,
        couponCode: typeof coupon?.code === "string" ? coupon.code : null,
      },
    };
  }

  const message =
    typeof body?.error === "string"
      ? body.error
      : `select-prize answered HTTP ${result.status}.`;
  const code =
    typeof body?.code === "string" ? SERVER_CODES[body.code] : undefined;
  if (code) return failure(code, message);
  if (result.status >= 500) return failure("NETWORK", message);
  for (const [pattern, legacyCode] of LEGACY_MESSAGES) {
    if (typeof body?.error === "string" && pattern.test(body.error)) {
      return failure(legacyCode, message);
    }
  }
  return failure("UNKNOWN", message);
}
