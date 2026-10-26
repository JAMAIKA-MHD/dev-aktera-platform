/*
# Reward Library: an expiry date set when the reward is created

## Why
The brand picks the expiry date in the form that creates a digital reward, not code by code. The
date belongs to the reward and applies to every one of its codes, the ones loaded later too.
A code can still carry its own date, which then wins.

## What
- prize_templates.expires_at (NULL = the reward's codes do not expire), digital rewards only.
- is_code_assignable: a code expires at COALESCE(its own date, its reward's date). Everything that
  hands out or draws a code goes through this function, so nothing else changes.
*/

ALTER TABLE public.prize_templates
  ADD COLUMN IF NOT EXISTS expires_at timestamptz;

-- A physical reward has no code to expire.
DO $$ BEGIN
  ALTER TABLE public.prize_templates
    ADD CONSTRAINT prize_templates_expiry_only_for_codes
    CHECK (category = 'voucher' OR expires_at IS NULL);
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

CREATE OR REPLACE FUNCTION public.is_code_assignable(p_item_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.prize_template_items pti
    JOIN public.prize_templates pt ON pt.id = pti.prize_template_id
    WHERE pti.id = p_item_id
      AND pti.item_value IS NOT NULL
      AND trim(pti.item_value) <> ''
      AND (
        COALESCE(pti.expires_at, pt.expires_at) IS NULL
        OR COALESCE(pti.expires_at, pt.expires_at) > now()
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.coupon_redemptions cr
        WHERE cr.prize_template_item_id = pti.id
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_code_assignable(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_code_assignable(uuid) TO authenticated, service_role;
