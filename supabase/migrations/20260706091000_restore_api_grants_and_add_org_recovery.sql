/*
# Restore API Grants + Add Organization Recovery RPC

## Why
- A raw `DROP SCHEMA public CASCADE` reset removes the grants that PostgREST
  relies on for `anon`, `authenticated`, and `service_role`.
- Without those grants, dashboard CRUD and edge functions fail even if the
  tables and RLS policies were recreated correctly.
- Existing auth users can also become "orphaned" after a reset because
  `auth.users` survives while `public.profiles` and `public.organizations` do not.

## What this migration does
1. Restores schema/table/sequence/routine grants for API roles.
2. Restores default privileges for future tables/functions.
3. Adds `complete_current_user_onboarding(...)` so an authenticated orphaned
   user can recreate their organization/profile safely.
*/

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;

GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT ALL ON ALL ROUTINES IN SCHEMA public TO service_role;

GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated;
GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO anon, authenticated;
GRANT EXECUTE ON ALL ROUTINES IN SCHEMA public TO anon, authenticated, service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT ALL ON ROUTINES TO service_role;

ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT USAGE, SELECT ON SEQUENCES TO anon, authenticated;
ALTER DEFAULT PRIVILEGES IN SCHEMA public
  GRANT EXECUTE ON ROUTINES TO anon, authenticated, service_role;

CREATE OR REPLACE FUNCTION public.complete_current_user_onboarding(
  p_org_name text,
  p_full_name text,
  p_phone text DEFAULT NULL,
  p_plan text DEFAULT 'free'
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid := auth.uid();
  v_email text := lower(trim(coalesce(auth.jwt() ->> 'email', '')));
  v_org_name text := trim(coalesce(p_org_name, ''));
  v_full_name text := trim(coalesce(p_full_name, ''));
  v_phone text := nullif(trim(coalesce(p_phone, '')), '');
  v_existing_org_id uuid;
  v_org_id uuid;
BEGIN
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication is required.';
  END IF;

  IF v_org_name = '' OR v_full_name = '' THEN
    RAISE EXCEPTION 'Organization name and full name are required.';
  END IF;

  IF v_email = '' THEN
    RAISE EXCEPTION 'Authenticated email is unavailable. Please sign in again.';
  END IF;

  SELECT p.organization_id
  INTO v_existing_org_id
  FROM public.profiles p
  WHERE p.id = v_user_id;

  IF v_existing_org_id IS NOT NULL THEN
    IF EXISTS (
      SELECT 1
      FROM public.organizations o
      WHERE o.id = v_existing_org_id
    ) THEN
      RETURN v_existing_org_id;
    END IF;

    DELETE FROM public.profiles
    WHERE id = v_user_id;
  END IF;

  IF EXISTS (
    SELECT 1
    FROM public.organizations o
    WHERE lower(o.name) = lower(v_org_name)
  ) THEN
    RAISE EXCEPTION 'This organization name is already in use. Please choose another name.';
  END IF;

  SELECT public.create_organization_onboarding(
    v_user_id,
    v_org_name,
    v_full_name,
    v_email,
    v_phone,
    p_plan
  )
  INTO v_org_id;

  RETURN v_org_id;
END;
$$;
