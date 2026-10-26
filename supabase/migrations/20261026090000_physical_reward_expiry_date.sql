/*
# Reward Library: an optional expiry date on a physical reward

## Why
A brand may give a physical reward a date (an offer valid until a given day, a prize to collect
before a deadline). The date is optional and only informative: it is kept with the reward and
shown in the library, and it never changes the draw. A physical reward stays drawn after it.

## What
- prize_templates.expires_at is now allowed on a physical reward. expiry_days (a period after
  delivery) stays for digital rewards only: a physical reward has no code to deliver.
- is_code_assignable and coupon_expiry_for_entry read the reward's date for digital rewards
  only, so the date of a physical reward can never stop a code from being given or appear as the
  deadline of a winner's code. Same definitions as 20261014090000 and 20261015090000 otherwise,
  same rights.
*/

-- 1. The date is allowed on a physical reward; the period after delivery is not ---------------

ALTER TABLE public.prize_templates
  DROP CONSTRAINT IF EXISTS prize_templates_expiry_only_for_codes;
ALTER TABLE public.prize_templates
  ADD CONSTRAINT prize_templates_expiry_only_for_codes
  CHECK (category = 'voucher' OR expiry_days IS NULL);

-- 2. The reward's date counts for the codes of a digital reward only --------------------------

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
        COALESCE(
          pti.expires_at,
          CASE WHEN pt.category = 'voucher' THEN pt.expires_at END
        ) IS NULL
        OR COALESCE(
          pti.expires_at,
          CASE WHEN pt.category = 'voucher' THEN pt.expires_at END
        ) > now()
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.coupon_redemptions cr
        WHERE cr.prize_template_item_id = pti.id
      )
  );
$$;

REVOKE ALL ON FUNCTION public.is_code_assignable(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_code_assignable(uuid) TO authenticated, service_role;

CREATE OR REPLACE FUNCTION public.coupon_expiry_for_entry(p_entry_id uuid)
RETURNS timestamptz
LANGUAGE sql
STABLE
SET search_path = public
AS $$
  SELECT COALESCE(
    pti.expires_at,
    cr.expires_at,
    CASE WHEN pt.category = 'voucher' THEN pt.expires_at END
  )
  FROM public.coupon_redemptions cr
  JOIN public.prize_template_items pti ON pti.id = cr.prize_template_item_id
  JOIN public.prize_templates pt ON pt.id = pti.prize_template_id
  WHERE cr.entry_id = p_entry_id
  LIMIT 1;
$$;

REVOKE ALL ON FUNCTION public.coupon_expiry_for_entry(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.coupon_expiry_for_entry(uuid) TO service_role;
