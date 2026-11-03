-- Migration: 20261031120000_user_onboarding_state.sql
-- Description: where each person stands in the first-run tour and the "Get started" checklist.
-- It lives on the profile, not in the browser, so the tour does not replay on another device.
--
--   onboarding_status        not_started, in_progress (resumes at onboarding_step), skipped, completed
--   onboarding_step          the step reached: 0 is the welcome, then the tour's steps in order
--   onboarding_completed_at  when the tour was finished
--   onboarding_checklist     what the data cannot tell: { sandbox_tested_at, dismissed_at }
--
-- Accounts that already have a campaign are marked as done: the tour and the setup section are
-- for accounts starting out, and their dashboard is not empty. An account without a campaign is
-- still starting out, however old it is, and gets both. The tour stays available from the account
-- menu. The columns and that mark are applied together, once, so running this again cannot end a
-- tour in progress.
--
-- Access: the existing policies apply. A person updates their own row (update_org_profiles);
-- no new function is needed.

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'profiles'
      AND column_name = 'onboarding_status'
  ) THEN
    ALTER TABLE public.profiles
      ADD COLUMN onboarding_status text NOT NULL DEFAULT 'not_started'
        CHECK (onboarding_status IN ('not_started', 'in_progress', 'skipped', 'completed')),
      ADD COLUMN onboarding_step integer NOT NULL DEFAULT 0
        CHECK (onboarding_step >= 0),
      ADD COLUMN onboarding_completed_at timestamptz,
      ADD COLUMN onboarding_checklist jsonb NOT NULL DEFAULT '{}'::jsonb;

    UPDATE public.profiles p
    SET onboarding_status = 'completed',
        onboarding_completed_at = now(),
        onboarding_checklist = jsonb_build_object('dismissed_at', now())
    WHERE EXISTS (
      SELECT 1 FROM public.campaigns c WHERE c.organization_id = p.organization_id
    );
  END IF;
END;
$$;
