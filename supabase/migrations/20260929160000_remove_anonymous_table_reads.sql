-- B6.2 — Remove the direct anonymous reads of campaigns, prizes and quiz questions.
--
-- The legacy player page (src/pages/play/PlayerFlowPage.tsx, removed in B6.2) read these tables
-- with the anon key, quiz answers (correct_option_index) and prize weights included. The public
-- page now reads get_public_experience (B1.2) only, which returns safe fields, so these policies
-- have no user left. Brand members keep their own select_org_* policies.
--
-- Deploy only once no deployed front still runs the legacy page (deployment runbook, B6.3).
-- The two last policies were added by hand in the cloud project (named in the legacy page's
-- header); DROP POLICY IF EXISTS makes them no-ops where they do not exist.
-- Idempotent: safe to run twice.

DROP POLICY IF EXISTS "public_select_active_campaign_prizes" ON public.prizes;
DROP POLICY IF EXISTS "public_select_active_quiz_questions" ON public.quiz_questions;

-- Manual cloud policies.
DROP POLICY IF EXISTS "Public read active campaigns" ON public.campaigns;
DROP POLICY IF EXISTS "Public read prizes for active campaigns" ON public.prizes;
