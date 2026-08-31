import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

interface SelectPrizeBody {
  campaign_id: string;
  phone_number: string;
  participant_name?: string;
  participant_email?: string;
  quiz_passed?: boolean; // deprecated, use game_payload
  game_payload?: any;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
  session_id?: string;
  dwell_time_seconds?: number;
}

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

interface PrizeInventoryPayload {
  id: string;
  remaining: number;
}

interface ActivePrizePayload {
  id: string;
  name: string;
  weight: number | null;
  win_message: string | null;
  prize_inventory: PrizeInventoryPayload[] | PrizeInventoryPayload | null;
}

interface ClaimPrizeInventoryRow {
  inventory_id: string;
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(
      JSON.stringify({ ok: false, error: "Method not allowed" }),
      {
        status: 405,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  try {
    const body = (await req.json()) as SelectPrizeBody;
    const {
      campaign_id,
      phone_number,
      participant_name,
      participant_email,
      quiz_passed,
      game_payload = {},
      metadata = {},
      ip_address,
      user_agent,
      session_id,
      dwell_time_seconds,
    } = body ?? {};

    if (!campaign_id || !phone_number) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "campaign_id and phone_number are required.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }
    const normalizedPhoneNumber = normalizeDzPhone(phone_number);
    if (!/^(05|06|07)[0-9]{8}$/.test(normalizedPhoneNumber)) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Invalid Algerian phone number format.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Server configuration is missing.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

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

    // 1. Fetch Campaign and verify it is active
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from("campaigns")
      .select(
        "id, organization_id, status, require_quiz, win_probability, max_entries",
      )
      .eq("id", campaign_id)
      .single();

    if (campaignError || !campaign) {
      return new Response(
        JSON.stringify({ ok: false, error: "Campaign not found." }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (campaign.status !== "active") {
      return new Response(
        JSON.stringify({ ok: false, error: "Campaign is not active." }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 2. Check for duplicate entry (Anti-Fraud)
    const { count: existingEntriesCount, error: entryCheckError } =
      await supabaseAdmin
        .from("entries")
        .select("id", { count: "exact", head: true })
        .eq("campaign_id", campaign_id)
        .eq("phone_number", normalizedPhoneNumber);

    if (entryCheckError) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to validate existing participation.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    const maxEntries = campaign.max_entries ?? 1;
    const hasEntryLimit = maxEntries > 0;
    if (hasEntryLimit && (existingEntriesCount ?? 0) >= maxEntries) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "You have already participated in this campaign.",
          code: "ALREADY_PARTICIPATED",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 3. Check if all campaign prizes / voucher stock have been completely claimed
    const { data: campaignPrizes } = await supabaseAdmin
      .from("prizes")
      .select(
        "id, name, weight, win_message, quantity, quantity_won, prize_template_id, prize_inventory(id, remaining)",
      )
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

    const totalWinnersSoFar = winningEntriesCount ?? 0;
    const isCampaignFullyClaimed =
      totalAllocatedPrizes > 0 && totalWinnersSoFar >= totalAllocatedPrizes;

    if (isCampaignFullyClaimed) {
      return new Response(
        JSON.stringify({
          ok: false,
          error:
            "This campaign is closed. All voucher rewards have been claimed.",
          code: "CAMPAIGN_CLOSED",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 4. Atomic Prize Selection & Inventory Claim (Server-side & Auto-Paced)
    let isWinner = false;
    let selectedPrizeId: string | null = null;
    let selectedPrize: ActivePrizePayload | null = null;

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
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to process prize draw.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (drawResult?.ok && drawResult?.is_winner && drawResult?.prize_id) {
      isWinner = true;
      selectedPrizeId = drawResult.prize_id;
      selectedPrize = {
        id: drawResult.prize_id,
        name: drawResult.prize_name || "Prize",
        win_message: drawResult.win_message || null,
        weight: null,
        prize_inventory: null,
      };
      console.log(
        `[select-prize] Winner selected atomically: prize="${drawResult.prize_name}" id=${drawResult.prize_id}`,
      );
    } else {
      isWinner = false;
      selectedPrizeId = null;
      selectedPrize = null;
      console.log(
        `[select-prize] Non-winner outcome determined atomically for campaign ${campaign_id}.`,
      );
    }

    // 5. If winner, fetch and reserve a coupon code from prize_template_items
    let couponCode: string | null = null;
    let couponItemId: string | null = null;

    if (isWinner && selectedPrizeId) {
      // Fetch the prize to get prize_template_id
      const { data: prizeData, error: prizeError } = await supabaseAdmin
        .from("prizes")
        .select("prize_template_id")
        .eq("id", selectedPrizeId)
        .single();

      if (!prizeError && prizeData?.prize_template_id) {
        // Step A: get list of already-used coupon item IDs
        const { data: usedRows } = await supabaseAdmin
          .from("coupon_redemptions")
          .select("prize_template_item_id");

        const usedIds = new Set<string>(
          (usedRows ?? [])
            .map(
              (r: { prize_template_item_id?: string | null }) =>
                r.prize_template_item_id,
            )
            .filter((id): id is string => Boolean(id)),
        );

        // Step B: fetch all items for this prize template ordered by item_index ASC
        const { data: templateItems, error: itemsError } = await supabaseAdmin
          .from("prize_template_items")
          .select("id, item_value, item_index")
          .eq("prize_template_id", prizeData.prize_template_id)
          .not("item_value", "is", null)
          .order("item_index", { ascending: true });

        if (!itemsError && templateItems && templateItems.length > 0) {
          const availableItem = templateItems.find(
            (item: { id: string; item_value: string | null }) =>
              item.item_value &&
              item.item_value.trim().length > 0 &&
              !usedIds.has(item.id),
          );

          if (availableItem && availableItem.item_value) {
            couponCode = availableItem.item_value.trim();
            couponItemId = availableItem.id;

            // Safely attempt to mark this voucher code as used on prize_template_items
            try {
              await supabaseAdmin
                .from("prize_template_items")
                .update({
                  is_used: true,
                  redeemed_at: new Date().toISOString(),
                })
                .eq("id", couponItemId);
            } catch {
              // Ignore if is_used column not present
            }
          }
        }

        // Step C: Fallback to prize_templates default item_value if no individual item row
        if (!couponCode) {
          const { data: templateData } = await supabaseAdmin
            .from("prize_templates")
            .select("item_value")
            .eq("id", prizeData.prize_template_id)
            .single();

          if (
            templateData?.item_value &&
            templateData.item_value.trim().length > 0
          ) {
            couponCode = templateData.item_value.trim();
          }
        }
      }
    }

    // 6. Create Entry Record
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
        prize_id: selectedPrizeId,
        redeemed_coupon_value: couponCode,
        dwell_time_seconds: dwell_time_seconds || 0,
        metadata: {
          ...metadata,
          server_timestamp: new Date().toISOString(),
        },
        ip_address: ip_address || null,
        user_agent: user_agent || null,
      })
      .select()
      .single();

    if (insertError?.code === "23505") {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "You have already participated in this campaign.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    if (insertError) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: "Failed to record campaign entry.",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // 7. If coupon was assigned, track it in coupon_redemptions for audit trail
    if (couponCode && couponItemId && newEntry?.id) {
      const { error: trackError } = await supabaseAdmin
        .from("coupon_redemptions")
        .insert({
          entry_id: newEntry.id,
          prize_template_item_id: couponItemId,
          coupon_value: couponCode,
          redeemed_by_player: false,
        });

      if (trackError) {
        console.warn("Failed to track coupon redemption:", trackError);
        // Don't fail the whole request - the coupon is already in the entry
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        entry: newEntry,
        prize: selectedPrize
          ? {
              id: selectedPrize.id,
              name: selectedPrize.name,
              win_message: selectedPrize.win_message,
            }
          : null,
        coupon: couponCode ? { code: couponCode } : null,
        game_outcome: drawResult,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unexpected server error";
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
