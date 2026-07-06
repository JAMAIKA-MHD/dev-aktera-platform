-- Add coupon tracking to entries table
-- This stores the actual coupon code that was given to the winner
-- Using DO block to safely skip if column already exists (idempotent)
DO $$ BEGIN
  ALTER TABLE entries ADD COLUMN redeemed_coupon_value VARCHAR(255) NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add a table to track which coupon codes have been used (for auditing)
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  prize_template_item_id UUID NOT NULL REFERENCES prize_template_items(id),
  coupon_value VARCHAR(255) NOT NULL,
  redeemed_at TIMESTAMP DEFAULT now(),
  redeemed_by_player BOOLEAN DEFAULT false,
  UNIQUE(prize_template_item_id) -- Ensure each coupon is only used once
);

-- Enable RLS on coupon_redemptions
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Org members can view redemptions for their org's campaigns
-- Uses profiles table (user's org membership is stored there)
DO $$ BEGIN
  CREATE POLICY "coupon_redemptions_org_access"
    ON coupon_redemptions
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM entries e
        JOIN campaigns c ON e.campaign_id = c.id
        WHERE e.id = entry_id
        AND c.organization_id = (
          SELECT organization_id FROM profiles
          WHERE id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS Policy: Only select-prize edge function (via service role) can insert
-- This is implicit since the edge function uses service_role key
