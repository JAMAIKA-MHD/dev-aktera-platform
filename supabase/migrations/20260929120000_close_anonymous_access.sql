-- B1.1 — Close anonymous access to participations and to the internal functions.
--
-- Before this migration, the anon key (shipped in the browser bundle) could read every
-- participation (phones, names, coupons), insert winning entries, update any entry, draw
-- prizes without select-prize, harvest coupon codes, rewrite any campaign and list every
-- participant. After it:
--   * entries are read and written by members of their organization only; players write
--     through the select-prize and confirm-coupon Edge Functions (service_role);
--   * the draw internals run for select-prize (service_role), and for the dashboard test
--     tool (CampaignTestModal) on the member's own campaigns only;
--   * the dashboard functions run with the caller's rights (SECURITY INVOKER), so RLS limits
--     them to the caller's organization.
-- Idempotent: safe to run twice.

-- 1. entries --------------------------------------------------------------------------------

-- Every row, for anyone (anon included).
DROP POLICY IF EXISTS "select_entries_failsafe" ON public.entries;
-- Any insert, for anyone: bypassed select-prize and the duplicate protection.
DROP POLICY IF EXISTS "public_insert_entries" ON public.entries;
-- Any column of any row, for anon, as long as coupon_confirmed ends up true.
-- confirm-coupon already updates with service_role.
DROP POLICY IF EXISTS "anon_confirm_coupon" ON public.entries;

-- Members keep inserting test entries on their own campaigns (CampaignTestModal).
DROP POLICY IF EXISTS "insert_org_entries" ON public.entries;
CREATE POLICY "insert_org_entries" ON public.entries FOR INSERT
  TO authenticated WITH CHECK (is_org_member(organization_id));

-- "select_org_entries", "update_org_entries" and "delete_org_entries" stay as they are.

-- 2. Draw internals ------------------------------------------------------------------------

-- Called by select-prize only (service_role). Nothing in the browser may score a game.
REVOKE ALL ON FUNCTION public.resolve_game_outcome(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_game_outcome(uuid, jsonb) TO service_role;

-- Coupon codes are handed out by select-prize only.
REVOKE ALL ON FUNCTION public.claim_campaign_prize_coupon(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.claim_campaign_prize_coupon(uuid, uuid) TO service_role;

-- Also called by the dashboard test tool (CampaignTestModal). SECURITY INVOKER: a member only
-- reaches the campaigns, prizes and inventory of their own organization. When
-- resolve_game_outcome (SECURITY DEFINER) calls it for select-prize, it still runs with the
-- owner's rights, so the player flow is unchanged.
ALTER FUNCTION public.draw_and_claim_campaign_prize(uuid, boolean) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.draw_and_claim_campaign_prize(uuid, boolean) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.draw_and_claim_campaign_prize(uuid, boolean) TO authenticated, service_role;

-- 3. Dashboard functions -------------------------------------------------------------------

-- They only touch tables with "member of the organization" policies, so running them with
-- the caller's rights scopes them to the caller's organization without rewriting them.
ALTER FUNCTION public.save_campaign_full_in_place(
  uuid, uuid, text, text, text, text, text, text, timestamptz, timestamptz,
  numeric, integer, boolean, jsonb, jsonb, boolean, jsonb, text, jsonb) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.save_campaign_full_in_place(
  uuid, uuid, text, text, text, text, text, text, timestamptz, timestamptz,
  numeric, integer, boolean, jsonb, jsonb, boolean, jsonb, text, jsonb) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_campaign_full_in_place(
  uuid, uuid, text, text, text, text, text, text, timestamptz, timestamptz,
  numeric, integer, boolean, jsonb, jsonb, boolean, jsonb, text, jsonb) TO authenticated, service_role;

ALTER FUNCTION public.get_campaign_participants(uuid, uuid) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.get_campaign_participants(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_campaign_participants(uuid, uuid) TO authenticated, service_role;

ALTER FUNCTION public.get_campaign_analytics_v2(uuid, uuid) SECURITY INVOKER;
REVOKE ALL ON FUNCTION public.get_campaign_analytics_v2(uuid, uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_campaign_analytics_v2(uuid, uuid) TO authenticated, service_role;

-- 4. Leftover signature ---------------------------------------------------------------------

-- The 17-parameter save_campaign_full_in_place of 20260823122201 may still exist in some
-- databases (it no longer exists locally). It is a SECURITY DEFINER open to anon.
DROP FUNCTION IF EXISTS public.save_campaign_full_in_place(
  uuid, uuid, text, text, text, text, text, text, timestamptz, timestamptz,
  numeric, integer, boolean, jsonb, jsonb, boolean, jsonb);
