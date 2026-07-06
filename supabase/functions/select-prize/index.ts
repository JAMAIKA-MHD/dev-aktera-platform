import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface SelectPrizeBody {
  campaign_id: string;
  phone_number: string;
  participant_name?: string;
  participant_email?: string;
  quiz_passed?: boolean;
  metadata?: Record<string, unknown>;
  ip_address?: string;
  user_agent?: string;
}

const normalizeDzPhone = (rawPhone: string): string => {
  const digitsOnly = rawPhone.replace(/\D/g, '');
  if (digitsOnly.startsWith('213') && digitsOnly.length === 12) {
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
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json() as SelectPrizeBody;
    const {
      campaign_id,
      phone_number,
      participant_name,
      participant_email,
      quiz_passed,
      metadata = {},
      ip_address,
      user_agent,
    } = body ?? {};

    if (!campaign_id || !phone_number) {
      return new Response(JSON.stringify({ ok: false, error: 'campaign_id and phone_number are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
    const normalizedPhoneNumber = normalizeDzPhone(phone_number);
    if (!/^(05|06|07)[0-9]{8}$/.test(normalizedPhoneNumber)) {
      return new Response(JSON.stringify({ ok: false, error: 'Invalid Algerian phone number format.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ ok: false, error: 'Server configuration is missing.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    // 1. Fetch Campaign and verify it is active
    const { data: campaign, error: campaignError } = await supabaseAdmin
      .from('campaigns')
      .select('id, organization_id, status, require_quiz, win_probability, max_entries')
      .eq('id', campaign_id)
      .single();

    if (campaignError || !campaign) {
      return new Response(JSON.stringify({ ok: false, error: 'Campaign not found.' }), {
        status: 404,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (campaign.status !== 'active') {
      return new Response(JSON.stringify({ ok: false, error: 'Campaign is not active.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 2. Check for duplicate entry (Anti-Fraud)
    const { count: existingEntriesCount, error: entryCheckError } = await supabaseAdmin
      .from('entries')
      .select('id', { count: 'exact', head: true })
      .eq('campaign_id', campaign_id)
      .eq('phone_number', normalizedPhoneNumber);

    if (entryCheckError) {
      return new Response(JSON.stringify({ ok: false, error: 'Failed to validate existing participation.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const maxEntries = campaign.max_entries ?? 1;
    const hasEntryLimit = maxEntries > 0;
    if (hasEntryLimit && (existingEntriesCount ?? 0) >= maxEntries) {
      return new Response(JSON.stringify({ ok: false, error: 'You have already participated in this campaign.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 3. Determine if Campaign is Wheel or Quiz
    // If it's a quiz campaign, is_winner and prize are decided either for participation or based on pass status
    // Per rules: "For quiz campaigns, record participation as a valid entry without using random instant-win logic."
    const isQuizCampaign = campaign.require_quiz;

    let isWinner = false;
    let selectedPrizeId: string | null = null;
    let selectedPrize: ActivePrizePayload | null = null;

    if (!isQuizCampaign) {
      // WHEEL GAME MECHANICS (Instant win logic with probability + weights)
      const roll = Math.random(); // 0 to 1
      const campaignProb = Number(campaign.win_probability);

      console.log(`[select-prize] campaign=${campaign_id} roll=${roll.toFixed(4)} prob=${campaignProb} willWin=${roll <= campaignProb}`);

      if (roll <= campaignProb) {
        // Winner rolled! Fetch eligible active prizes with stock remaining
        const { data: activePrizes, error: prizesError } = await supabaseAdmin
          .from('prizes')
          .select('id, name, weight, win_message, prize_inventory(id, remaining)')
          .eq('campaign_id', campaign_id)
          .eq('is_active', true);

        console.log(`[select-prize] activePrizes count=${activePrizes?.length ?? 0} prizesError=${prizesError?.message ?? 'none'}`);

        if (!prizesError && activePrizes && activePrizes.length > 0) {
          // Filter prizes that have stock remaining (> 0)
          const stockPrizes = (activePrizes as ActivePrizePayload[]).filter((p) => {
            const inventory = Array.isArray(p.prize_inventory)
              ? p.prize_inventory[0]
              : p.prize_inventory;
            const remaining = inventory?.remaining ?? 0;
            console.log(`[select-prize] prize=${p.id} name="${p.name}" remaining=${remaining} inventoryRaw=${JSON.stringify(p.prize_inventory)}`);
            return remaining > 0;
          });

          console.log(`[select-prize] stockPrizes count=${stockPrizes.length}`);

          if (stockPrizes.length > 0) {
            // Weighted random selection
            const totalWeight = stockPrizes.reduce((sum, p) => sum + Number(p.weight || 0), 0);
            if (totalWeight > 0) {
              let targetRoll = Math.random() * totalWeight;
              for (const p of stockPrizes) {
                targetRoll -= Number(p.weight || 0);
                if (targetRoll <= 0) {
                  selectedPrizeId = p.id;
                  selectedPrize = p;
                  isWinner = true;
                  console.log(`[select-prize] Selected prize="${p.name}" id=${p.id}`);
                  break;
                }
              }
            }
          } else {
            console.log('[select-prize] No prizes with stock remaining — converting winner to loser');
          }
        }
      }
    } else if (quiz_passed === true) {
      // QUIZ CAMPAIGN: player passed the quiz — run the same wheel probability logic
      const roll = Math.random();
      const campaignProb = Number(campaign.win_probability);

      console.log(`[select-prize] QUIZ campaign=${campaign_id} passed=true roll=${roll.toFixed(4)} prob=${campaignProb} willWin=${roll <= campaignProb}`);

      if (roll <= campaignProb) {
        const { data: activePrizes, error: prizesError } = await supabaseAdmin
          .from('prizes')
          .select('id, name, weight, win_message, prize_inventory(id, remaining)')
          .eq('campaign_id', campaign_id)
          .eq('is_active', true);

        if (!prizesError && activePrizes && activePrizes.length > 0) {
          const stockPrizes = (activePrizes as ActivePrizePayload[]).filter((p) => {
            const inventory = Array.isArray(p.prize_inventory)
              ? p.prize_inventory[0]
              : p.prize_inventory;
            return (inventory?.remaining ?? 0) > 0;
          });

          if (stockPrizes.length > 0) {
            const totalWeight = stockPrizes.reduce((sum, p) => sum + Number(p.weight || 0), 0);
            if (totalWeight > 0) {
              let targetRoll = Math.random() * totalWeight;
              for (const p of stockPrizes) {
                targetRoll -= Number(p.weight || 0);
                if (targetRoll <= 0) {
                  selectedPrizeId = p.id;
                  selectedPrize = p;
                  isWinner = true;
                  console.log(`[select-prize] QUIZ Selected prize="${p.name}" id=${p.id}`);
                  break;
                }
              }
            }
          }
        }
      }
    } else {
      // Quiz campaign + quiz_passed=false → always loser, no prize draw
      console.log(`[select-prize] QUIZ campaign=${campaign_id} passed=false — assigning loser`);
    }

    // 4. Atomic inventory claim (if winner)
    if (isWinner && selectedPrizeId) {
      const { data: claimedRows, error: claimInventoryError } = await supabaseAdmin.rpc(
        'claim_prize_inventory',
        { p_prize_id: selectedPrizeId },
      );

      if (claimInventoryError) {
        console.error('[select-prize] claim_prize_inventory error:', claimInventoryError.message);
        return new Response(JSON.stringify({ ok: false, error: 'Failed to reserve prize inventory.' }), {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        });
      }

      if (!claimedRows || (claimedRows as ClaimPrizeInventoryRow[]).length === 0) {
        // Stock was exhausted by concurrent winners.
        console.log('[select-prize] claim_prize_inventory returned empty — stock exhausted by concurrent winner');
        isWinner = false;
        selectedPrizeId = null;
        selectedPrize = null;
      } else {
        console.log('[select-prize] Inventory claimed successfully, row:', JSON.stringify(claimedRows));
        const { error: quantityWonError } = await supabaseAdmin.rpc(
          'increment_prize_winner_count',
          { p_prize_id: selectedPrizeId },
        );

        if (quantityWonError) {
          console.error('[select-prize] increment_prize_winner_count error:', quantityWonError.message, '— converting winner to loser (inventory already claimed!)');
          isWinner = false;
          selectedPrizeId = null;
          selectedPrize = null;
        }
      }
    }

    // 5. If winner, fetch and reserve a coupon code
    let couponCode: string | null = null;
    let couponItemId: string | null = null;

    if (isWinner && selectedPrizeId) {
      // Fetch the prize template to get coupon items
      const { data: prizeData, error: prizeError } = await supabaseAdmin
        .from('prizes')
        .select('prize_template_id')
        .eq('id', selectedPrizeId)
        .single();

      if (!prizeError && prizeData?.prize_template_id) {
        // Step A: get list of already-used coupon item IDs
        const { data: usedRows } = await supabaseAdmin
          .from('coupon_redemptions')
          .select('prize_template_item_id');

        const usedIds: string[] = (usedRows ?? []).map(
          (r: { prize_template_item_id: string }) => r.prize_template_item_id,
        );

        // Step B: fetch an available (unused) coupon code
        let couponQuery = supabaseAdmin
          .from('prize_template_items')
          .select('id, item_value')
          .eq('prize_template_id', prizeData.prize_template_id)
          .not('item_value', 'is', null)
          .limit(1);

        // Exclude already-used items only if there are any
        if (usedIds.length > 0) {
          couponQuery = couponQuery.not('id', 'in', `(${usedIds.join(',')})`);
        }

        const { data: couponItem, error: couponError } = await couponQuery.single();

        if (!couponError && couponItem?.item_value) {
          couponCode = couponItem.item_value;
          couponItemId = couponItem.id;
        }
      }
    }

    // 6. Create Entry Record
    const { data: newEntry, error: insertError } = await supabaseAdmin
      .from('entries')
      .insert({
        campaign_id,
        organization_id: campaign.organization_id,
        phone_number: normalizedPhoneNumber,
        participant_name: participant_name || null,
        participant_email: participant_email || null,
        quiz_passed: isQuizCampaign ? !!quiz_passed : null,
        is_winner: isWinner,
        prize_id: selectedPrizeId,
        redeemed_coupon_value: couponCode,
        metadata: {
          ...metadata,
          server_timestamp: new Date().toISOString(),
        },
        ip_address: ip_address || null,
        user_agent: user_agent || null,
      })
      .select()
      .single();

    if (insertError?.code === '23505') {
      return new Response(JSON.stringify({ ok: false, error: 'You have already participated in this campaign.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (insertError) {
      return new Response(JSON.stringify({ ok: false, error: 'Failed to record campaign entry.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    // 7. If coupon was assigned, track it in coupon_redemptions for audit trail
    if (couponCode && couponItemId && newEntry?.id) {
      const { error: trackError } = await supabaseAdmin
        .from('coupon_redemptions')
        .insert({
          entry_id: newEntry.id,
          prize_template_item_id: couponItemId,
          coupon_value: couponCode,
          redeemed_by_player: false,
        });

      if (trackError) {
        console.warn('Failed to track coupon redemption:', trackError);
        // Don't fail the whole request - the coupon is already in the entry
      }
    }

    return new Response(
      JSON.stringify({
        ok: true,
        entry: newEntry,
        prize: selectedPrize ? {
          id: selectedPrize.id,
          name: selectedPrize.name,
          win_message: selectedPrize.win_message,
        } : null,
        coupon: couponCode ? { code: couponCode } : null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
