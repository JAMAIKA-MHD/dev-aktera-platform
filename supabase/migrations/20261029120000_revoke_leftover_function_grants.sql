-- Functions still executable by anon (and by PUBLIC), against the rule every SQL function
-- follows (REVOKE ALL … FROM PUBLIC, anon, authenticated, then GRANT to the one role that
-- needs it). None of them could be abused by anon today — each requires auth.uid() or runs
-- as the caller, under RLS — but the grants should say who calls them:
--   - claim_prize_inventory, increment_prize_winner_count: the inventory claim of the old
--     select-prize, called by nothing anymore (claim_campaign_prize_coupon replaced them).
--     They write stock: service_role only.
--   - complete_current_user_onboarding (CompleteOrganizationSetupPage), is_org_member (the
--     RLS policies, all TO authenticated): authenticated.
--   - create_organization_onboarding (the create-organization Edge Function): service_role.
--   - set_updated_at, enforce_prize_template_stock_allocation: trigger functions, which a
--     trigger runs whatever its caller's privileges: nobody needs to call them.
-- Checked by npm run backend:probe.
--
-- Rollback (restores the grants exactly as they were):
--   GRANT EXECUTE ON FUNCTION
--     public.claim_prize_inventory(uuid), public.increment_prize_winner_count(uuid),
--     public.complete_current_user_onboarding(text, text, text, text),
--     public.create_organization_onboarding(uuid, text, text, text, text, text),
--     public.is_org_member(uuid), public.set_updated_at(),
--     public.enforce_prize_template_stock_allocation()
--   TO PUBLIC, anon, authenticated, service_role;

REVOKE ALL ON FUNCTION public.claim_prize_inventory(uuid) FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.increment_prize_winner_count(uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_prize_inventory(uuid) TO service_role;
GRANT EXECUTE ON FUNCTION public.increment_prize_winner_count(uuid) TO service_role;

REVOKE ALL ON FUNCTION public.complete_current_user_onboarding(text, text, text, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.complete_current_user_onboarding(text, text, text, text) TO authenticated;

REVOKE ALL ON FUNCTION public.is_org_member(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_org_member(uuid) TO authenticated, service_role;

REVOKE ALL ON FUNCTION public.create_organization_onboarding(uuid, text, text, text, text, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_organization_onboarding(uuid, text, text, text, text, text) TO service_role;

REVOKE ALL ON FUNCTION public.set_updated_at() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.enforce_prize_template_stock_allocation() FROM PUBLIC, anon, authenticated;
