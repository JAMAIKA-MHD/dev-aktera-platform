UPDATE public.prize_templates
SET category = 'voucher'
WHERE category NOT IN ('voucher', 'physical');

ALTER TABLE public.prize_templates
DROP CONSTRAINT IF EXISTS prize_templates_category_check;

ALTER TABLE public.prize_templates
ADD CONSTRAINT prize_templates_category_check
CHECK (category IN ('voucher', 'physical'));

CREATE TABLE IF NOT EXISTS public.prize_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_inventory_id uuid NOT NULL REFERENCES public.prize_inventory(id) ON DELETE CASCADE,
  prize_id uuid NOT NULL REFERENCES public.prizes(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_index integer NOT NULL CHECK (item_index > 0),
  item_value text,
  source_type text NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'bulk')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prize_inventory_id, item_index)
);

CREATE INDEX IF NOT EXISTS idx_prize_inventory_items_inventory
ON public.prize_inventory_items(prize_inventory_id);

CREATE INDEX IF NOT EXISTS idx_prize_inventory_items_org
ON public.prize_inventory_items(organization_id);

ALTER TABLE public.prize_inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_prize_inventory_items" ON public.prize_inventory_items;
CREATE POLICY "select_org_prize_inventory_items" ON public.prize_inventory_items FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_org_prize_inventory_items" ON public.prize_inventory_items;
CREATE POLICY "insert_org_prize_inventory_items" ON public.prize_inventory_items FOR INSERT
  TO authenticated WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "update_org_prize_inventory_items" ON public.prize_inventory_items;
CREATE POLICY "update_org_prize_inventory_items" ON public.prize_inventory_items FOR UPDATE
  TO authenticated USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "delete_org_prize_inventory_items" ON public.prize_inventory_items;
CREATE POLICY "delete_org_prize_inventory_items" ON public.prize_inventory_items FOR DELETE
  TO authenticated USING (is_org_member(organization_id));