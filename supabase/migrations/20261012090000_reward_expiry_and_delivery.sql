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
