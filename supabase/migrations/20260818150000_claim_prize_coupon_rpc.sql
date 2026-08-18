-- Migration: Atomically Claim Prize Coupon RPC
-- Allows both Edge Functions and anonymous player game flows to safely and sequentially
-- claim unique voucher codes without RLS permission bottlenecks or race conditions.

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
BEGIN
  -- 1. Find the prize_template_id for the prize
  SELECT prize_template_id INTO v_prize_template_id
  FROM public.prizes
  WHERE id = p_prize_id;

  IF v_prize_template_id IS NULL THEN
    RETURN NULL;
  END IF;

  -- 2. Atomically select the next available, unredeemed voucher item with SKIP LOCKED
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

  -- If an available unique voucher item was found, record the redemption and update entry
  IF v_item_id IS NOT NULL AND v_coupon_code IS NOT NULL THEN
    -- Insert into coupon_redemptions (if not already tracked)
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
    ON CONFLICT (prize_template_item_id) DO NOTHING;

    -- Update entries table with the redeemed coupon code
    UPDATE public.entries
    SET redeemed_coupon_value = v_coupon_code
    WHERE id = p_entry_id;

    RETURN v_coupon_code;
  END IF;

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

-- Grant execution to public anon, authenticated, and service_role
GRANT EXECUTE ON FUNCTION public.claim_campaign_prize_coupon(uuid, uuid) TO anon, authenticated, service_role;
