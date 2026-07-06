/**
 * confirm-coupon Edge Function
 * ============================
 * Called by the player on the Result screen when they confirm they have copied
 * their coupon code. Uses service_role to bypass RLS — players are anonymous so
 * there is no auth session, but we accept the trade-off at MVP stage.
 *
 * Safety guards:
 *   - entry_id must be provided (UUID)
 *   - The entry must be a winner (is_winner = true)
 *   - Idempotent: only updates if coupon_confirmed is still false
 */

import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

serve(async (req) => {
  // Handle CORS preflight
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
    const body = await req.json();
    const { entry_id } = body ?? {};

    if (!entry_id) {
      return new Response(JSON.stringify({ ok: false, error: 'entry_id is required.' }), {
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

    // Use service_role so we can write without auth — anon players have no session
    const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false, autoRefreshToken: false },
    });

    // Update the entry: mark coupon as confirmed.
    // Safety: only update rows where is_winner = true AND not yet confirmed (idempotent).
    const { error } = await supabaseAdmin
      .from('entries')
      .update({ coupon_confirmed: true })
      .eq('id', entry_id)
      .eq('is_winner', true)
      .eq('coupon_confirmed', false);

    if (error) {
      console.error('[confirm-coupon] DB update error:', error.message);
      throw error;
    }

    console.log('[confirm-coupon] Confirmed coupon for entry:', entry_id);

    return new Response(JSON.stringify({ ok: true }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    console.error('[confirm-coupon] Error:', message);
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
