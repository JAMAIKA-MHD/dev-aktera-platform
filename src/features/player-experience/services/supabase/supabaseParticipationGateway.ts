import type { SupabaseClient } from "@supabase/supabase-js";
import type { DrawRequest, DrawResult } from "../../domain/participation";
import type {
  Availability,
  ConfirmCouponResult,
  ParticipationGateway,
} from "../ports";
import {
  toDrawResult,
  toSelectPrizeBody,
  type SelectPrizeHttpResult,
} from "./selectPrizeMapping";

// The live ParticipationGateway (backend task B3.2): the select-prize Edge Function decides
// every outcome, confirm-coupon records the coupon confirmation. There is no fallback of any
// kind: nothing in the browser ever draws, scores or writes a participation (CLAUDE.md, rule 1).

export const SELECT_PRIZE_FUNCTION = "select-prize";
export const CONFIRM_COUPON_FUNCTION = "confirm-coupon";
export const DEFAULT_TIMEOUT_MS = 15_000;

export interface SupabaseParticipationGatewayOptions {
  client: SupabaseClient;
  // Read once with the campaign (get_public_experience): the page's starting point.
  availability: Availability;
  timeoutMs?: number;
}

// Calls an Edge Function and returns its HTTP status and JSON body. A non-2xx answer comes back
// as an error whose `context` is the HTTP response; no answer at all (network, timeout) gives
// a null status.
async function invoke(
  client: SupabaseClient,
  name: string,
  body: unknown,
  timeoutMs: number,
): Promise<SelectPrizeHttpResult> {
  try {
    const { data, error } = await client.functions.invoke(name, {
      body: body as Record<string, unknown>,
      timeout: timeoutMs,
    });
    if (!error) return { status: 200, body: data };
    const response: unknown = (error as { context?: unknown }).context;
    if (
      typeof response === "object" &&
      response !== null &&
      typeof (response as { status?: unknown }).status === "number"
    ) {
      const { status, json } = response as {
        status: number;
        json?: () => Promise<unknown>;
      };
      let parsed: unknown = null;
      try {
        parsed = typeof json === "function" ? await json.call(response) : null;
      } catch {
        parsed = null; // not a JSON body (gateway error page)
      }
      return { status, body: parsed };
    }
    return { status: null, body: null };
  } catch {
    return { status: null, body: null };
  }
}

export function createSupabaseParticipationGateway(
  options: SupabaseParticipationGatewayOptions,
): ParticipationGateway {
  const { client, availability } = options;
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;

  return {
    mode: "live",

    async checkAvailability(): Promise<Availability> {
      return availability;
    },

    async draw(request: DrawRequest): Promise<DrawResult> {
      const result = await invoke(
        client,
        SELECT_PRIZE_FUNCTION,
        toSelectPrizeBody(request),
        timeoutMs,
      );
      return toDrawResult(result);
    },

    async confirmCoupon(entryId: string): Promise<ConfirmCouponResult> {
      const result = await invoke(
        client,
        CONFIRM_COUPON_FUNCTION,
        { entry_id: entryId },
        timeoutMs,
      );
      const body = result.body as { ok?: unknown; error?: unknown } | null;
      if (result.status === 200 && body?.ok === true) return { ok: true };
      const message =
        typeof body?.error === "string"
          ? body.error
          : "confirm-coupon could not be reached.";
      return {
        ok: false,
        error: {
          code:
            result.status === null || result.status >= 500
              ? "NETWORK"
              : "UNKNOWN",
          message,
        },
      };
    },
  };
}
