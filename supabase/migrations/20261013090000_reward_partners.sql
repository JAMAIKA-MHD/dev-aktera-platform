/*
# Reward Library: partners the brand adds itself

## Why
The Reward Library shows Gifty, Yassir and Chargily as "Coming soon". A brand can also register
a partner it works with (a name, what they offer, how to reach them). Nothing is connected to
the partner in the MVP: this only keeps the brand's own list.

## What
- reward_partners: one row per partner, per organization.
- Every member of the organization reads the list; anyone but a viewer adds, edits or removes.
- Nothing for anon.
*/

CREATE TABLE IF NOT EXISTS public.reward_partners (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  name            text NOT NULL CHECK (char_length(btrim(name)) BETWEEN 2 AND 80),
  description     text CHECK (description IS NULL OR char_length(description) <= 300),
  website_url     text CHECK (website_url IS NULL OR (char_length(website_url) <= 200 AND website_url ~* '^https?://')),
  contact_name    text CHECK (contact_name IS NULL OR char_length(contact_name) <= 80),
  contact_email   text CHECK (contact_email IS NULL OR (char_length(contact_email) <= 120 AND contact_email ~* '^[^@\s]+@[^@\s]+\.[^@\s]+$')),
  contact_phone   text CHECK (contact_phone IS NULL OR char_length(contact_phone) <= 30),
  created_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL DEFAULT auth.uid(),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- One partner name per organization, whatever the case.
CREATE UNIQUE INDEX IF NOT EXISTS reward_partners_org_name_unique
  ON public.reward_partners (organization_id, lower(btrim(name)));

CREATE INDEX IF NOT EXISTS idx_reward_partners_org
  ON public.reward_partners (organization_id);

DROP TRIGGER IF EXISTS trg_set_updated_at ON public.reward_partners;
CREATE TRIGGER trg_set_updated_at
BEFORE UPDATE ON public.reward_partners
FOR EACH ROW
EXECUTE FUNCTION public.set_updated_at();

ALTER TABLE public.reward_partners ENABLE ROW LEVEL SECURITY;

-- Members of the organization read the list.
DROP POLICY IF EXISTS "select_org_reward_partners" ON public.reward_partners;
CREATE POLICY "select_org_reward_partners" ON public.reward_partners FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

-- A viewer reads; every other role writes. The role is read from the caller's own profile in
-- that organization.
DROP POLICY IF EXISTS "insert_org_reward_partners" ON public.reward_partners;
CREATE POLICY "insert_org_reward_partners" ON public.reward_partners FOR INSERT
  TO authenticated WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = reward_partners.organization_id
        AND p.role <> 'viewer'
    )
  );

DROP POLICY IF EXISTS "update_org_reward_partners" ON public.reward_partners;
CREATE POLICY "update_org_reward_partners" ON public.reward_partners FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = reward_partners.organization_id
        AND p.role <> 'viewer'
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = reward_partners.organization_id
        AND p.role <> 'viewer'
    )
  );

DROP POLICY IF EXISTS "delete_org_reward_partners" ON public.reward_partners;
CREATE POLICY "delete_org_reward_partners" ON public.reward_partners FOR DELETE
  TO authenticated USING (
    EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid()
        AND p.organization_id = reward_partners.organization_id
        AND p.role <> 'viewer'
    )
  );

-- Default privileges hand every right (even TRUNCATE) to anon and authenticated on new tables:
-- take them all back, grant what is needed.
REVOKE ALL ON TABLE public.reward_partners FROM PUBLIC, anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.reward_partners TO authenticated;
