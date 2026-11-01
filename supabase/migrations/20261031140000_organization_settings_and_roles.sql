-- Migration: 20261031140000_organization_settings_and_roles.sql
-- Description: the Organization page saved for real, and roles that mean something.
--   organizations  company details, regional preferences and notification settings
--   profiles       job title; when an invited teammate was invited and first arrived
--
-- Access changes, because a role now decides what a person can do:
--   - only an owner or admin updates the organization;
--   - a person updates their own profile only, and members are removed through the
--     team-members Edge Function, which checks the caller's role;
--   - role, organization, plan and active state can no longer be changed from the browser,
--     whatever the policies say: only the server (service_role) does that.

ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS nif text,
  ADD COLUMN IF NOT EXISTS nis text,
  ADD COLUMN IF NOT EXISTS rc text,
  ADD COLUMN IF NOT EXISTS ai text,
  ADD COLUMN IF NOT EXISTS address text,
  ADD COLUMN IF NOT EXISTS wilaya text,
  ADD COLUMN IF NOT EXISTS commune text,
  ADD COLUMN IF NOT EXISTS postal_code text,
  ADD COLUMN IF NOT EXISTS website text,
  ADD COLUMN IF NOT EXISTS industry text,
  ADD COLUMN IF NOT EXISTS language text NOT NULL DEFAULT 'fr',
  ADD COLUMN IF NOT EXISTS time_zone text NOT NULL DEFAULT 'Africa/Algiers',
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'DZD',
  ADD COLUMN IF NOT EXISTS notification_settings jsonb NOT NULL DEFAULT '{}'::jsonb;

ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS job_title text,
  ADD COLUMN IF NOT EXISTS invited_at timestamptz,
  ADD COLUMN IF NOT EXISTS joined_at timestamptz;

CREATE OR REPLACE FUNCTION public.is_org_admin(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE organization_id = org_id
      AND id = auth.uid()
      AND role IN ('owner', 'admin')
  );
$$;
REVOKE ALL ON FUNCTION public.is_org_admin(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.is_org_admin(uuid) TO authenticated;

DROP POLICY IF EXISTS "update_own_organization" ON public.organizations;
CREATE POLICY "update_own_organization" ON public.organizations FOR UPDATE
  TO authenticated
  USING (public.is_org_admin(id))
  WITH CHECK (public.is_org_admin(id));

DROP POLICY IF EXISTS "update_org_profiles" ON public.profiles;
CREATE POLICY "update_org_profiles" ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "delete_org_profiles" ON public.profiles;

CREATE OR REPLACE FUNCTION public.protect_profile_access()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated' AND (
    NEW.role IS DISTINCT FROM OLD.role
    OR NEW.organization_id IS DISTINCT FROM OLD.organization_id
    OR NEW.invited_at IS DISTINCT FROM OLD.invited_at
  ) THEN
    RAISE EXCEPTION 'A role can only be changed by an owner or an admin.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_profile_access() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_profile_access ON public.profiles;
CREATE TRIGGER trg_protect_profile_access
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.protect_profile_access();

CREATE OR REPLACE FUNCTION public.protect_organization_plan()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.role() = 'authenticated' AND (
    NEW.plan IS DISTINCT FROM OLD.plan
    OR NEW.is_active IS DISTINCT FROM OLD.is_active
  ) THEN
    RAISE EXCEPTION 'The plan cannot be changed from here.'
      USING ERRCODE = '42501';
  END IF;
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.protect_organization_plan() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_protect_organization_plan ON public.organizations;
CREATE TRIGGER trg_protect_organization_plan
  BEFORE UPDATE ON public.organizations
  FOR EACH ROW EXECUTE FUNCTION public.protect_organization_plan();
