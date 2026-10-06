-- B6.1 (fix of B2.1) — Never hand the same coupon code to two simultaneous winners.
--
-- claim_campaign_prize_coupon picked the first free voucher item with FOR UPDATE SKIP LOCKED,
-- where "free" means "no coupon_redemptions row". The redemption row lives in another table,
-- so the lock on the item did not protect it: when a first winner committed between the
-- snapshot of a second winner's query and its row lock, the second winner still saw the item
-- as free, locked it, hit ON CONFLICT DO NOTHING on the redemption insert, and yet returned
-- the same code (found by npm run backend:smoke, scenario T8: two winners with one code).
--
-- Fix: the redemption insert is the claim. When it inserts nothing, the item was taken in the
-- meantime and the function tries the next one; each attempt runs with a fresh snapshot, so
-- the loop ends once no free item is left. Everything else is unchanged (item order, entry
-- update, template fallback, return value, rights).
-- Idempotent: safe to run twice.

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
  SELECT pt.item_value INTO v_coupon_code
  FROM public.prize_templates pt
  WHERE pt.id = v_prize_template_id;

  IF v_coupon_code IS NOT NULL AND trim(v_coupon_code) <> '' THEN
    UPDATE public.entries
    SET redeemed_coupon_value = trim(v_coupon_code)
    WHERE id = p_entry_id;
    RETURN trim(v_coupon_code);
  END IF;

  RETURN NULL;
END;
$$;

-- Same rights as B1.1: select-prize (service_role) only.
REVOKE ALL ON FUNCTION public.claim_campaign_prize_coupon(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_campaign_prize_coupon(uuid, uuid) TO service_role;
