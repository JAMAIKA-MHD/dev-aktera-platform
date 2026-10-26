/*
# Reward Library: an expiry that starts at delivery

## Why
A brand can choose, when it creates a digital reward, between a fixed date and a validity period
that starts when the code is given to the winner ("valid 30 days after delivery").

## What
- prize_templates.expiry_days: the validity period in days (digital rewards only; exclusive with
  prize_templates.expires_at).
- coupon_redemptions.expires_at: the deadline of a code given under a validity period, set when
  claim_campaign_prize_coupon gives it (end of that day in Algiers) and never moved afterwards.
- coupon_expiry_for_entry(entry): the deadline of the code a winner received, whichever way it
  was set. select-prize returns it with the coupon.
*/

ALTER TABLE public.prize_templates
  ADD COLUMN IF NOT EXISTS expiry_days integer;

ALTER TABLE public.coupon_redemptions
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

ALTER TABLE public.prize_templates
  DROP CONSTRAINT IF EXISTS prize_templates_expiry_only_for_codes;
ALTER TABLE public.prize_templates
  ADD CONSTRAINT prize_templates_expiry_only_for_codes
  CHECK (category = 'voucher' OR (expires_at IS NULL AND expiry_days IS NULL));

DO $$ BEGIN
  ALTER TABLE public.prize_templates
    ADD CONSTRAINT prize_templates_one_kind_of_expiry
    CHECK (expires_at IS NULL OR expiry_days IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.prize_templates
    ADD CONSTRAINT prize_templates_expiry_days_range
    CHECK (expiry_days IS NULL OR expiry_days BETWEEN 1 AND 3650);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- The code is given: same function as before, plus the deadline of a validity period.
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
  v_expiry_days integer;
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
      -- A reward valid for a period after delivery: the deadline starts when the code is given,
      -- and ends with that day in Algiers. It is frozen here, so changing the reward later does
      -- not move the deadline of a winner who already has the code.
      SELECT pt.expiry_days INTO v_expiry_days
      FROM public.prize_templates pt
      WHERE pt.id = v_prize_template_id;

      IF v_expiry_days IS NOT NULL THEN
        UPDATE public.coupon_redemptions
        SET expires_at = (
          ((now() AT TIME ZONE 'Africa/Algiers')::date + v_expiry_days) + time '23:59:59'
        ) AT TIME ZONE 'Africa/Algiers'
        WHERE id = v_redemption_id;
      END IF;

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

-- The deadline of the code a winner received: a date on the code itself, else the deadline
-- frozen when it was given (validity period), else the date of the reward.
CREATE OR REPLACE FUNCTION public.coupon_expiry_for_entry(p_entry_id uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(pti.expires_at, cr.expires_at, pt.expires_at)
  FROM public.coupon_redemptions cr
  JOIN public.prize_template_items pti ON pti.id = cr.prize_template_item_id
  JOIN public.prize_templates pt ON pt.id = pti.prize_template_id
  WHERE cr.entry_id = p_entry_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.coupon_expiry_for_entry(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.coupon_expiry_for_entry(uuid) TO service_role;
