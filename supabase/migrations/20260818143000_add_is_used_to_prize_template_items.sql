-- Migration: Add is_used and redeemed_at to prize_template_items
-- Ensures voucher codes are tracked as used with a direct boolean flag

DO $$ BEGIN
  ALTER TABLE public.prize_template_items 
  ADD COLUMN is_used BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE public.prize_template_items 
  ADD COLUMN redeemed_at TIMESTAMPTZ NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

CREATE INDEX IF NOT EXISTS idx_prize_template_items_available 
ON public.prize_template_items(prize_template_id, is_used, item_index)
WHERE is_used = false;
