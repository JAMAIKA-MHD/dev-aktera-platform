import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import {
  createClient,
  type SupabaseClient,
} from "https://esm.sh/@supabase/supabase-js@2.57.4";

// select-prize: the only authority on a player's outcome (CLAUDE.md, rule 1).
//
// Order of the checks (backend task B2.1):
//   1. input (campaign, phone)            → 400 INVALID_INPUT
//   2. consent (Law 18-07)                → 400 CONSENT_REQUIRED
//   3. same attempt replayed              → the same answer, nothing written
//   4. impression (analytics, never blocking)
//   5. campaign found, active, in period  → 404/400 CAMPAIGN_CLOSED
//   6. duplicate participation            → 400 ALREADY_PARTICIPATED
//   7. stock left                         → 400 CAMPAIGN_CLOSED
//   8. game outcome (resolve_game_outcome: scoring + atomic draw) → 500 DRAW_FAILED
//   9. entry recorded (duplicate race)    → 400 ALREADY_PARTICIPATED
//  10. coupon claimed atomically (claim_campaign_prize_coupon)
// Every error keeps its English `error` message (read by the legacy player page) and gets
// a stable `code` (read by the Player Experience gateway).

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

type ErrorCode =
  | "INVALID_INPUT"
  | "CONSENT_REQUIRED"
  | "CAMPAIGN_CLOSED"
  | "ALREADY_PARTICIPATED"
  | "DRAW_FAILED"
  | "SERVER_ERROR";

interface SelectPrizeBody {
  campaign_id: string;
  phone_number: string;
  participant_name?: string;
  participant_email?: string;
  quiz_passed?: boolean; // deprecated, ignored: the server scores the game
  game_payload?: Record<string, unknown>;
  // Free-form: source, wilaya, client_request_id and consent (required) are read from it.
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  dwell_time_seconds?: number;
}

interface ConsentRecord {
  accepted: true;
  acceptedAt: string;
  policyVersion: string;
  locale: string | null;
}

interface PrizeSummary {
  id: string;
  name: string;
  win_message: string | null;
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (status: number, code: ErrorCode, error: string) =>
  json(status, { ok: false, code, error });

const normalizeDzPhone = (rawPhone: string): string => {
  const digitsOnly = rawPhone.replace(/\D/g, "");
  if (digitsOnly.startsWith("213") && digitsOnly.length === 12) {
    return `0${digitsOnly.slice(3)}`;
  }
  if (digitsOnly.length === 9 && /^[567]/.test(digitsOnly)) {
    return `0${digitsOnly}`;
  }
  return digitsOnly;
};

// The consent proof sent by the player page: accepted, when, and which policy version.
// Anything else is refused: no participation without consent (Law 18-07).
function readConsent(metadata: Record<string, unknown>): ConsentRecord | null {
  const consent = metadata.consent;
  if (typeof consent !== "object" || consent === null) return null;
  const { accepted, acceptedAt, policyVersion, locale } = consent as Record<
    string,
    unknown
  >;
  if (accepted !== true) return null;
  if (typeof acceptedAt !== "string" || Number.isNaN(Date.parse(acceptedAt))) {
    return null;
  }
  if (typeof policyVersion !== "string" || policyVersion.trim() === "") {
    return null;
  }
  return {
    accepted: true,
    acceptedAt,
    policyVersion: policyVersion.trim(),
    locale: typeof locale === "string" ? locale : null,
  };
}

function readClientRequestId(metadata: Record<string, unknown>): string | null {
  const value = metadata.client_request_id;
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed.length > 0 && trimmed.length <= 100 ? trimmed : null;
}

async function loadPrize(
  admin: SupabaseClient,
  prizeId: string | null,
): Promise<PrizeSummary | null> {
  if (!prizeId) return null;
  const { data } = await admin
    .from("prizes")
    .select("id, name, win_message")
    .eq("id", prizeId)
    .maybeSingle();
  return data ?? null;
}

// Hands out the next unused code of the prize, atomically (FOR UPDATE SKIP LOCKED): two
// winners at the same time never get the same code. The function also records it in
// coupon_redemptions and on the entry. A failure leaves the win without a code.
async function claimCoupon(
  admin: SupabaseClient,
  prizeId: string,
  entryId: string,
): Promise<string | null> {
  const { data: code, error } = await admin.rpc("claim_campaign_prize_coupon", {
    p_prize_id: prizeId,
    p_entry_id: entryId,
  });
  if (error) {
    console.warn("[select-prize] coupon claim failed:", error.message);
    return null;
  }
  if (typeof code !== "string" || code.trim() === "") return null;

  // Keep the item's is_used flag in step, as before.
  const { data: redemption } = await admin
    .from("coupon_redemptions")
    .select("prize_template_item_id")
    .eq("entry_id", entryId)
    .maybeSingle();
  if (redemption?.prize_template_item_id) {
    await admin
      .from("prize_template_items")
      .update({ is_used: true, redeemed_at: new Date().toISOString() })
      .eq("id", redemption.prize_template_item_id);
  }
  return code.trim();
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return json(405, { ok: false, error: "Method not allowed" });
  }

  try {
    const body = ((await req.json()) ?? {}) as Partial<SelectPrizeBody>;
    const {
      campaign_id,
      phone_number,
      participant_name,
      participant_email,
      game_payload = {},
      ip_address,
      user_agent,
      session_id,
      dwell_time_seconds,
    } = body;
    const metadata =
      typeof body.metadata === "object" && body.metadata !== null
        ? body.metadata
        : {};

    // 1. Input
    if (!campaign_id || !phone_number) {
      return fail(
        400,
        "INVALID_INPUT",
        "campaign_id and phone_number are required.",
      );
    }
    const normalizedPhoneNumber = normalizeDzPhone(phone_number);
    if (!/^(05|06|07)[0-9]{8}$/.test(normalizedPhoneNumber)) {
      return fail(
        400,
        "INVALID_INPUT",
        "Invalid Algerian phone number format.",
      );
    }

    // 2. Consent
    const consent = readConsent(metadata);
    if (!consent) {
      return fail(
        400,
        "CONSENT_REQUIRED",
        "Consent is required before playing.",
      );
    }
    const clientRequestId = readClientRequestId(metadata);

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
    if (!supabaseUrl || !serviceRoleKey) {
      return fail(500, "SERVER_ERROR", "Server configuration is missing.");
    }
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // 3. Same attempt replayed (network retry after a success): same answer, nothing written.
    if (clientRequestId) {
      const { data: previous } = await supabaseAdmin
        .from("entries")
        .select("id, is_winner, prize_id, redeemed_coupon_value, quiz_passed")
        .eq("campaign_id", campaign_id)
        .eq("phone_number", normalizedPhoneNumber)
        .eq("metadata->>client_request_id", clientRequestId)
        .limit(1)
        .maybeSingle();
      if (previous) {
        const prize = previous.is_winner
          ? await loadPrize(supabaseAdmin, previous.prize_id)
          : null;
        return json(200, {
          ok: true,
          replayed: true,
          entry: {
            id: previous.id,
            redeemed_coupon_value: previous.redeemed_coupon_value,
          },
          prize,
          coupon: previous.redeemed_coupon_value
            ? { code: previous.redeemed_coupon_value }
            : null,
          game_outcome: {
            ok: true,
            is_winner: Boolean(previous.is_winner),
            prize_id: previous.prize_id,
            passed: previous.quiz_passed,
          },
        });
      }
    }

    // 4. Impression (analytics only: never blocks the participation)
    if (session_id) {
      try {
        const { error: impErr } = await supabaseAdmin.rpc(
          "record_campaign_impression",
          {
            p_campaign_id: campaign_id,
            p_session_id: session_id,
            p_user_agent: user_agent || null,
            p_ip_address: ip_address || null,
            p_dwell_time_seconds: dwell_time_seconds || 0,
            p_game_played: true,
            p_form_completed: true,
          },
        );
        if (impErr) {
          console.warn("[select-prize] impression notice:", impErr.message);
        }
      } catch (impEx) {
        console.warn("[select-prize] impression exception ignored:", impEx);
      }
    }

    // 5. Campaign found, active and within its dates
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("campaigns")
      .select(
        "id, organization_id, status, max_entries, start_date, end_date, game_type",
      )
      .eq("id", campaign_id)
      .single();

    if (campaignError || !campaign) {
      return fail(404, "CAMPAIGN_CLOSED", "Campaign not found.");
    }
    if (campaign.status !== "active") {
      return fail(400, "CAMPAIGN_CLOSED", "Campaign is not active.");
    }
    const now = Date.now();
    const startsAt = campaign.start_date
      ? Date.parse(campaign.start_date)
      : NaN;
    const endsAt = campaign.end_date ? Date.parse(campaign.end_date) : NaN;
    if (
      (Number.isFinite(startsAt) && now < startsAt) ||
      (Number.isFinite(endsAt) && now > endsAt)
    ) {
      return fail(400, "CAMPAIGN_CLOSED", "Campaign is not running.");
    }

    // 6. Duplicate participation (anti-fraud)
    const { count: existingEntriesCount, error: entryCheckError } =
      await supabaseAdmin
        .from("entries")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign_id)
        .eq("phone_number", normalizedPhoneNumber);

    if (entryCheckError) {
      return fail(
        500,
        "SERVER_ERROR",
        "Failed to validate existing participation.",
      );
    }

    const maxEntries = campaign.max_entries ?? 1;
    if (maxEntries > 0 && (existingEntriesCount ?? 0) >= maxEntries) {
      return fail(
        400,
        "ALREADY_PARTICIPATED",
        "You have already participated in this campaign.",
      );
    }

    // 7. Stock left
    const { data: campaignPrizes } = await supabaseAdmin
      .from("prizes")
      .select("quantity")
      .eq("campaign_id", campaign_id)
      .eq("is_active", true);

    const totalAllocatedPrizes = (campaignPrizes ?? []).reduce(
      (sum, p) => sum + Number(p.quantity || 0),
      0,
    );

    const { count: winningEntriesCount } = await supabaseAdmin
      .from("entries")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaign_id)
      .eq("is_winner", true);

    if (
      totalAllocatedPrizes > 0 &&
      (winningEntriesCount ?? 0) >= totalAllocatedPrizes
    ) {
      return fail(
        400,
        "CAMPAIGN_CLOSED",
        "This campaign is closed. All voucher rewards have been claimed.",
      );
    }

    // 8. Game outcome: scoring (quiz, Hit It) and atomic draw, all in the database.
    const { data: drawResult, error: drawError } = await supabaseAdmin.rpc(
      "resolve_game_outcome",
      {
        p_campaign_id: campaign_id,
        p_payload: game_payload,
      },
    );

    if (drawError) {
      console.error(
        "[select-prize] resolve_game_outcome error:",
        drawError.message,
      );
      return fail(500, "DRAW_FAILED", "Failed to process prize draw.");
    }
    if (drawResult?.ok === false) {
      // The campaign changed state between step 5 and the draw.
      return fail(
        400,
        "CAMPAIGN_CLOSED",
        String(drawResult.error ?? "Campaign is not active."),
      );
    }

    const isWinner = Boolean(
      drawResult?.ok && drawResult?.is_winner && drawResult?.prize_id,
    );
    const selectedPrize: PrizeSummary | null = isWinner
      ? {
          id: drawResult.prize_id,
          name: drawResult.prize_name || "Prize",
          win_message: drawResult.win_message || null,
        }
      : null;

    // 9. Entry, with the consent proof. The captcha token is never stored.
    const { human_token: _humanToken, ...storedMetadata } = metadata;
    const { data: newEntry, error: insertError } = await supabaseAdmin
      .from("entries")
      .insert({
        campaign_id,
        organization_id: campaign.organization_id,
        phone_number: normalizedPhoneNumber,
        participant_name: participant_name || null,
        participant_email: participant_email || null,
        quiz_passed: drawResult?.passed ?? null,
        is_winner: isWinner,
        prize_id: selectedPrize?.id ?? null,
        dwell_time_seconds: dwell_time_seconds || 0,
        metadata: {
          ...storedMetadata,
          consent,
          client_request_id: clientRequestId,
          game_type: campaign.game_type,
          server_timestamp: new Date().toISOString(),
        },
        ip_address: ip_address || null,
        user_agent: user_agent || null,
      })
      .select("id")
      .single();

    if (insertError?.code === "23505") {
      // Two requests of the same phone at the same time: the unique index wins.
      return fail(
        400,
        "ALREADY_PARTICIPATED",
        "You have already participated in this campaign.",
      );
    }
    if (insertError || !newEntry) {
      return fail(500, "SERVER_ERROR", "Failed to record campaign entry.");
    }

    // 10. Coupon, claimed atomically once the entry exists.
    const couponCode =
      isWinner && selectedPrize
        ? await claimCoupon(supabaseAdmin, selectedPrize.id, newEntry.id)
        : null;

    return json(200, {
      ok: true,
      entry: { id: newEntry.id, redeemed_coupon_value: couponCode },
      prize: selectedPrize,
      coupon: couponCode ? { code: couponCode } : null,
      game_outcome: drawResult,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return fail(500, "SERVER_ERROR", message);
  }
});
