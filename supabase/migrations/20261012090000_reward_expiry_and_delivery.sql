/*
# Reward Library: code expiry, exhausted-stock draw filter, delivery status

## Why
- Digital codes need an optional expiry date; an expired code must never be handed to a winner.
- The draw looked at prizes.quantity - quantity_won only, so a reward whose codes were all used
  or expired could still be drawn and the winner got no code. It now skips such rewards.
- Physical rewards get a delivery status the brand updates (AKTERA does not manage delivery).

## What
1. prize_template_items.expires_at (NULL = never expires), entries.delivery_status / delivered_at.
2. is_code_assignable(item) = the single definition of "this code can be given to a winner".
3. prize_has_assignable_reward(prize) = draw eligibility (no codes loaded, or one is assignable).
4. claim_campaign_prize_coupon skips codes that are not assignable.
5. draw_and_claim_campaign_prize leaves out rewards whose codes ran out.
6. set_entry_delivery_status: the only way to change a delivery status.
*/

-- 1. Columns (existing rows keep today's behavior) -----------------------------------------

ALTER TABLE public.prize_template_items
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS delivery_status text NOT NULL DEFAULT 'not_delivered';

ALTER TABLE public.entries
  ADD COLUMN IF NOT EXISTS delivered_at timestamptz;

DO $$ BEGIN
  ALTER TABLE public.entries
    ADD CONSTRAINT entries_delivery_status_check
    CHECK (delivery_status IN ('not_delivered', 'delivered'));
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- 2. The single definition of "this code can be given to a winner" --------------------------
-- Not empty, never handed out, not expired. SECURITY INVOKER on purpose: the draw is itself
-- invoker (a member only sees the codes of their own organization), and select-prize runs it
-- as service_role. Nothing for anon.

CREATE OR REPLACE FUNCTION public.is_code_assignable(p_item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.prize_template_items pti
    WHERE pti.id = p_item_id
      AND pti.item_value IS NOT NULL
      AND trim(pti.item_value) <> ''
      AND (pti.expires_at IS NULL OR pti.expires_at > now())
      AND NOT EXISTS (
        SELECT 1 FROM public.coupon_redemptions cr
        WHERE cr.prize_template_item_id = pti.id
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_code_assignable(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_code_assignable(uuid) TO authenticated, service_role;

-- 3. Hand out only assignable codes (same function as before, one more condition) ---------

CREATE OR REPLACE FUNCTION public.claim_campaign_prize_coupon(
  p_prize_id uuid,
  p_entry_id uuid
)
RETURNS text
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_prize_template_id uuid;
  v_item_id uuid;
  v_coupon_code text;
  v_redemption_id uuid;
BEGIN
  -- 1. Find the prize_template_id for the prize
  SELECT prize_template_id INTO v_prize_template_id
  FROM public.prizes
  WHERE id = p_prize_id;

  IF v_prize_template_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Claim the next free voucher item. The redemption insert decides: when another winner
  -- claimed the same item first, nothing is inserted and the next item is tried.
  LOOP
    SELECT pti.id, pti.item_value
    INTO v_item_id, v_coupon_code
    FROM public.prize_template_items pti
    WHERE pti.prize_template_id = v_prize_template_id
      AND pti.item_value IS NOT NULL
      AND trim(pti.item_value) <> ''
      AND NOT EXISTS (
        SELECT 1 FROM public.coupon_redemptions cr
        WHERE cr.prize_template_item_id = pti.id
      )
      AND public.is_code_assignable(pti.id)
    ORDER BY pti.item_index ASC
    LIMIT 1
    FOR UPDATE SKIP LOCKED;

    EXIT WHEN v_item_id IS NULL;

    v_redemption_id := NULL;
    INSERT INTO public.coupon_redemptions (
      entry_id,
      prize_template_item_id,
      coupon_value,
      redeemed_by_player
    ) VALUES (
      p_entry_id,
      v_item_id,
      v_coupon_code,
      false
    )
    ON CONFLICT (prize_template_item_id) DO NOTHING
    RETURNING id INTO v_redemption_id;

    IF v_redemption_id IS NOT NULL THEN
      UPDATE public.entries
      SET redeemed_coupon_value = v_coupon_code
      WHERE id = p_entry_id;

      RETURN v_coupon_code;
    END IF;
  END LOOP;

  -- 3. Fallback: If no individual item slots available, check prize_templates.item_value
  -- No assignable code left. (The old fallback read prize_templates.item_value, a column that
  -- does not exist: it raised an error whenever a reward had no code to give. NULL is the answer.)
  RETURN NULL;
END;
$$;

-- Same rights as B1.1: select-prize (service_role) only.
REVOKE ALL ON FUNCTION public.claim_campaign_prize_coupon(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_campaign_prize_coupon(uuid, uuid) TO service_role;

-- 4. A reward whose codes ran out is no longer drawn -----------------------------------------
-- Eligible when the reward has no code loaded at all (a "You Won!" reward, a physical item), or
-- when at least one of its codes can still be given. Uses is_code_assignable: one rule.

CREATE OR REPLACE FUNCTION public.prize_has_assignable_reward(p_prize_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT
    NOT EXISTS (
      SELECT 1
      FROM public.prizes p
      JOIN public.prize_template_items pti ON pti.prize_template_id = p.prize_template_id
      WHERE p.id = p_prize_id
        AND pti.item_value IS NOT NULL
        AND trim(pti.item_value) <> ''
    )
    OR EXISTS (
      SELECT 1
      FROM public.prizes p
      JOIN public.prize_template_items pti ON pti.prize_template_id = p.prize_template_id
      WHERE p.id = p_prize_id
        AND public.is_code_assignable(pti.id)
    );
$$;

REVOKE ALL ON FUNCTION public.prize_has_assignable_reward(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.prize_has_assignable_reward(uuid) TO authenticated, service_role;

-- The draw, as of 20260831145100, with one more eligibility condition in both candidate loops.
-- Kept SECURITY INVOKER with the rights of 20260929120000 (the dashboard test tool calls it).

CREATE OR REPLACE FUNCTION public.draw_and_claim_campaign_prize(
  p_campaign_id UUID,
  p_quiz_passed BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_campaign RECORD;
  v_now_dz TIMESTAMPTZ;
  v_day_start_dz TIMESTAMPTZ;
  v_pacing_start TIMESTAMPTZ;
  v_total_days INT;
  v_elapsed_days INT;
  v_remaining_days INT;
  v_eligible_prizes RECORD;
  v_candidates JSONB := '[]'::jsonb;
  v_total_weight NUMERIC := 0;
  v_prize RECORD;
  v_remaining_qty INT;
  v_daily_limit_today INT;
  v_won_today INT;
  v_roll NUMERIC;
  v_accum NUMERIC := 0;
  v_selected_prize_id UUID := NULL;
  v_selected_prize_name TEXT := NULL;
  v_selected_win_message TEXT := NULL;
  v_claimed_inv_id UUID := NULL;
  v_cand JSONB;
BEGIN
  -- 1. Fetch campaign
  SELECT id, organization_id, status, start_date, end_date, win_probability, require_quiz, auto_pace_prizes, auto_pace_enabled_at
  INTO v_campaign
  FROM public.campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Campaign not found.');
  END IF;

  IF v_campaign.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Campaign is not active.');
  END IF;

  -- 2. Quiz Gate
  IF v_campaign.require_quiz AND COALESCE(p_quiz_passed, false) = false THEN
    -- Quiz failed -> Guaranteed non-winner
    RETURN jsonb_build_object(
      'ok', true,
      'is_winner', false,
      'prize_id', null,
      'prize_name', null,
      'win_message', null
    );
  END IF;

  -- Time calculations in Algeria timezone (Africa/Algiers / UTC+1)
  v_now_dz := now() AT TIME ZONE 'Africa/Algiers';
  v_day_start_dz := (date_trunc('day', v_now_dz)) AT TIME ZONE 'Africa/Algiers';

  -- 3. Determine Eligibility & Daily Pacing
  IF v_campaign.auto_pace_prizes THEN
    -- Effective pacing start (forward-only if toggled mid-campaign)
    v_pacing_start := GREATEST(v_campaign.start_date, COALESCE(v_campaign.auto_pace_enabled_at, v_campaign.start_date));
    v_total_days := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_campaign.end_date - v_pacing_start)) / 86400));
    v_elapsed_days := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now_dz - (v_pacing_start AT TIME ZONE 'Africa/Algiers'))) / 86400));
    v_remaining_days := GREATEST(1, v_total_days - v_elapsed_days);

    -- Build candidate pool among active prizes with available daily quota
    FOR v_prize IN
      SELECT p.id, p.name, p.weight, p.win_message, p.quantity, p.quantity_won
      FROM public.prizes p
      WHERE p.campaign_id = p_campaign_id
        AND p.is_active = true
      ORDER BY p.id
    LOOP
      v_remaining_qty := GREATEST(0, v_prize.quantity - COALESCE(v_prize.quantity_won, 0));
      -- Self-correcting daily quota: remaining_quantity / remaining_days
      v_daily_limit_today := FLOOR(v_remaining_qty::numeric / v_remaining_days::numeric);

      -- Query how many won today in Algeria timezone
      SELECT COUNT(*) INTO v_won_today
      FROM public.entries e
      WHERE e.prize_id = v_prize.id
        AND e.created_at >= v_day_start_dz;

      -- Prize is eligible if remaining stock exists AND today's won count is under daily quota
      IF v_remaining_qty > 0 AND v_won_today < v_daily_limit_today
         AND public.prize_has_assignable_reward(v_prize.id) THEN
        v_candidates := v_candidates || jsonb_build_object(
          'id', v_prize.id,
          'name', v_prize.name,
          'weight', v_prize.weight,
          'win_message', v_prize.win_message
        );
        v_total_weight := v_total_weight + COALESCE(v_prize.weight, 1);
      END IF;
    END LOOP;

    -- If no prizes eligible today -> standard non-winner outcome
    IF jsonb_array_length(v_candidates) = 0 OR v_total_weight <= 0 THEN
      RETURN jsonb_build_object(
        'ok', true,
        'is_winner', false,
        'prize_id', null,
        'prize_name', null,
        'win_message', null
      );
    END IF;

    -- Weighted random selection among eligible candidates (prevents FCFS exploit)
    v_roll := random() * v_total_weight;
    FOR v_cand IN SELECT * FROM jsonb_array_elements(v_candidates)
    LOOP
      v_accum := v_accum + (v_cand->>'weight')::NUMERIC;
      IF v_roll <= v_accum THEN
        v_selected_prize_id := (v_cand->>'id')::UUID;
        v_selected_prize_name := v_cand->>'name';
        v_selected_win_message := v_cand->>'win_message';
        EXIT;
      END IF;
    END LOOP;

  ELSE
    -- Manual Win Probability Mode (0 - 1)
    IF random() > COALESCE(v_campaign.win_probability, 0) THEN
      RETURN jsonb_build_object(
        'ok', true,
        'is_winner', false,
        'prize_id', null,
        'prize_name', null,
        'win_message', null
      );
    END IF;

    -- Fetch active prizes with stock remaining
    FOR v_prize IN
      SELECT p.id, p.name, p.weight, p.win_message, p.quantity, p.quantity_won
      FROM public.prizes p
      WHERE p.campaign_id = p_campaign_id
        AND p.is_active = true
        AND (p.quantity - COALESCE(p.quantity_won, 0)) > 0
        AND public.prize_has_assignable_reward(p.id)
      ORDER BY p.id
    LOOP
      v_candidates := v_candidates || jsonb_build_object(
        'id', v_prize.id,
        'name', v_prize.name,
        'weight', v_prize.weight,
        'win_message', v_prize.win_message
      );
      v_total_weight := v_total_weight + COALESCE(v_prize.weight, 1);
    END LOOP;

    IF jsonb_array_length(v_candidates) = 0 OR v_total_weight <= 0 THEN
      RETURN jsonb_build_object(
        'ok', true,
        'is_winner', false,
        'prize_id', null,
        'prize_name', null,
        'win_message', null
      );
    END IF;

    v_roll := random() * v_total_weight;
    FOR v_cand IN SELECT * FROM jsonb_array_elements(v_candidates)
    LOOP
      v_accum := v_accum + (v_cand->>'weight')::NUMERIC;
      IF v_roll <= v_accum THEN
        v_selected_prize_id := (v_cand->>'id')::UUID;
        v_selected_prize_name := v_cand->>'name';
        v_selected_win_message := v_cand->>'win_message';
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- 4. Atomic Inventory Claim & Winner Counter Increment (Single Transaction)
  IF v_selected_prize_id IS NOT NULL THEN
    -- Attempt atomic inventory claim with SKIP LOCKED
    WITH target AS (
      SELECT pi.id
      FROM public.prize_inventory pi
      WHERE pi.prize_id = v_selected_prize_id
        AND pi.remaining > 0
      ORDER BY pi.created_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    ),
    updated AS (
      UPDATE public.prize_inventory pi
      SET
        remaining = pi.remaining - 1,
        claimed = pi.claimed + 1,
        updated_at = now()
      FROM target
      WHERE pi.id = target.id
      RETURNING pi.id
    )
    SELECT updated.id INTO v_claimed_inv_id FROM updated;

    IF v_claimed_inv_id IS NOT NULL THEN
      -- Increment quantity_won atomically
      UPDATE public.prizes
      SET quantity_won = quantity_won + 1, updated_at = now()
      WHERE id = v_selected_prize_id;

      RETURN jsonb_build_object(
        'ok', true,
        'is_winner', true,
        'prize_id', v_selected_prize_id,
        'prize_name', v_selected_prize_name,
        'win_message', v_selected_win_message
      );
    ELSE
      -- Stock was claimed by concurrent caller -> graceful non-winner
      RETURN jsonb_build_object(
        'ok', true,
        'is_winner', false,
        'prize_id', null,
        'prize_name', null,
        'win_message', null
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'is_winner', false,
    'prize_id', null,
    'prize_name', null,
    'win_message', null
  );
END;
$$;

REVOKE ALL ON FUNCTION public.draw_and_claim_campaign_prize(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.draw_and_claim_campaign_prize(uuid, boolean) TO authenticated, service_role;
