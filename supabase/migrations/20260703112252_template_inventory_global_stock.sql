ALTER TABLE public.prize_templates
ADD COLUMN IF NOT EXISTS stock_quantity integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0);

CREATE TABLE IF NOT EXISTS public.prize_template_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_template_id uuid NOT NULL REFERENCES public.prize_templates(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_index integer NOT NULL CHECK (item_index > 0),
  item_value text,
  source_type text NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'bulk')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prize_template_id, item_index)
);

CREATE INDEX IF NOT EXISTS idx_prize_template_items_template
ON public.prize_template_items(prize_template_id);

CREATE INDEX IF NOT EXISTS idx_prize_template_items_org
ON public.prize_template_items(organization_id);

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.prize_template_items;
CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON public.prize_template_items
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.prize_template_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_prize_template_items" ON public.prize_template_items;
CREATE POLICY "select_org_prize_template_items" ON public.prize_template_items FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_org_prize_template_items" ON public.prize_template_items;
CREATE POLICY "insert_org_prize_template_items" ON public.prize_template_items FOR INSERT
  TO authenticated WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "update_org_prize_template_items" ON public.prize_template_items;
CREATE POLICY "update_org_prize_template_items" ON public.prize_template_items FOR UPDATE
  TO authenticated USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "delete_org_prize_template_items" ON public.prize_template_items;
CREATE POLICY "delete_org_prize_template_items" ON public.prize_template_items FOR DELETE
  TO authenticated USING (is_org_member(organization_id));

CREATE OR REPLACE FUNCTION public.enforce_prize_template_stock_allocation()
RETURNS trigger
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  campaign_status text;
  template_stock integer;
  reserved_quantity integer;
BEGIN
  SELECT status INTO campaign_status
  FROM public.campaigns
  WHERE id = NEW.campaign_id;

  IF campaign_status IS NULL THEN
    RAISE EXCEPTION 'Campaign % does not exist', NEW.campaign_id;
  END IF;

  IF campaign_status NOT IN ('draft', 'active', 'paused') THEN
    RETURN NEW;
  END IF;

  SELECT stock_quantity INTO template_stock
  FROM public.prize_templates
  WHERE id = NEW.prize_template_id;

  IF template_stock IS NULL THEN
    RAISE EXCEPTION 'Prize template % does not exist', NEW.prize_template_id;
  END IF;

  SELECT COALESCE(SUM(p.quantity), 0)::integer INTO reserved_quantity
  FROM public.prizes p
  JOIN public.campaigns c ON c.id = p.campaign_id
  WHERE p.prize_template_id = NEW.prize_template_id
    AND c.status IN ('draft', 'active', 'paused')
    AND p.id <> COALESCE(NEW.id, '00000000-0000-0000-0000-000000000000'::uuid);

  IF reserved_quantity + NEW.quantity > template_stock THEN
    RAISE EXCEPTION 'Requested quantity (%s) exceeds available template stock (%s).',
      NEW.quantity,
      GREATEST(template_stock - reserved_quantity, 0)
      USING ERRCODE = 'P0001';
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS enforce_prize_template_stock_allocation_on_prizes ON public.prizes;
CREATE TRIGGER enforce_prize_template_stock_allocation_on_prizes
BEFORE INSERT OR UPDATE OF prize_template_id, quantity, campaign_id
ON public.prizes
FOR EACH ROW
EXECUTE FUNCTION public.enforce_prize_template_stock_allocation();