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
