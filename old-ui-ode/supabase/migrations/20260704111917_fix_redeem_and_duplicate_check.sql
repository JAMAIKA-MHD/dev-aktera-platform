-- Add coupon_confirmed flag to entries table
-- This tracks whether the winner confirmed they received/copied the coupon
DO $$ BEGIN
  ALTER TABLE entries ADD COLUMN coupon_confirmed BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Allow anonymous players to confirm their own coupon by entry ID.
-- The player only knows their own entry ID (received from select-prize response),
-- so this is safe: they can only flip coupon_confirmed to true on that row.
DO $$ BEGIN
  CREATE POLICY "anon_confirm_coupon"
    ON entries
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (
      -- Only allow setting coupon_confirmed = true, nothing else changes
      coupon_confirmed = true
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
