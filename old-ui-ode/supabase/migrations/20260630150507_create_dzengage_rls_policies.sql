/*
# DZENGAGE RLS Policies — Multi-Tenant Access Control

## Overview
Adds Row Level Security policies to all DZENGAGE tables. The platform is
multi-tenant: every table is scoped by `organization_id`, and access is
verified through a helper function that checks the user's profile membership.

## Security Model
1. **Organization-scoped tables** (profiles, campaigns, prize_templates,
   prizes, prize_inventory, quiz_questions, billing): authenticated users
   can only access rows in their own organization, verified via the
   `is_org_member()` helper.
2. **entries**: Public INSERT (anon + authenticated) so unauthenticated
   players can submit plays from the public player route. SELECT/UPDATE/
   DELETE restricted to the owning organization for dashboard management.
3. **prizes**: Public SELECT for *active* campaigns so the roulette wheel
   can render without authentication. All writes restricted to the org.
4. **quiz_questions**: Public SELECT for active campaigns so players can
   answer the quiz. Writes restricted to the org.
5. **organizations**: Users can read/update only their own organization.

## Helper Function
- `is_org_member(org_id)`: returns true if the current authenticated user
  has a profile row in the given organization. Used by all org-scoped
  policies to avoid repeating the membership join.

## Policy Pattern
- 4 separate policies per table (SELECT/INSERT/UPDATE/DELETE), never FOR ALL.
- SELECT: USING only. INSERT: WITH CHECK only. UPDATE: both. DELETE: USING only.
- Public-facing policies use `TO anon, authenticated`; org-scoped use
  `TO authenticated`.
*/

-- Helper: is the current user a member of a given organization?
CREATE OR REPLACE FUNCTION is_org_member(org_id uuid)
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY DEFINER
AS $$
  SELECT EXISTS (
    SELECT 1 FROM profiles
    WHERE profiles.organization_id = org_id
      AND profiles.id = auth.uid()
  );
$$;

-- organizations: read/update own org only
DROP POLICY IF EXISTS "select_own_organization" ON organizations;
CREATE POLICY "select_own_organization" ON organizations FOR SELECT
  TO authenticated USING (is_org_member(id));

DROP POLICY IF EXISTS "update_own_organization" ON organizations;
CREATE POLICY "update_own_organization" ON organizations FOR UPDATE
  TO authenticated USING (is_org_member(id)) WITH CHECK (is_org_member(id));

-- profiles: org-scoped CRUD (managers+ for writes)
DROP POLICY IF EXISTS "select_org_profiles" ON profiles;
CREATE POLICY "select_org_profiles" ON profiles FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_org_profiles" ON profiles;
CREATE POLICY "insert_org_profiles" ON profiles FOR INSERT
  TO authenticated WITH CHECK (id = auth.uid());

DROP POLICY IF EXISTS "update_org_profiles" ON profiles;
CREATE POLICY "update_org_profiles" ON profiles FOR UPDATE
  TO authenticated USING (id = auth.uid() OR is_org_member(organization_id))
  WITH CHECK (id = auth.uid() OR is_org_member(organization_id));

DROP POLICY IF EXISTS "delete_org_profiles" ON profiles;
CREATE POLICY "delete_org_profiles" ON profiles FOR DELETE
  TO authenticated USING (is_org_member(organization_id));

-- campaigns: org-scoped CRUD
DROP POLICY IF EXISTS "select_org_campaigns" ON campaigns;
CREATE POLICY "select_org_campaigns" ON campaigns FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_org_campaigns" ON campaigns;
CREATE POLICY "insert_org_campaigns" ON campaigns FOR INSERT
  TO authenticated WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "update_org_campaigns" ON campaigns;
CREATE POLICY "update_org_campaigns" ON campaigns FOR UPDATE
  TO authenticated USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "delete_org_campaigns" ON campaigns;
CREATE POLICY "delete_org_campaigns" ON campaigns FOR DELETE
  TO authenticated USING (is_org_member(organization_id));

-- prize_templates: org-scoped CRUD
DROP POLICY IF EXISTS "select_org_prize_templates" ON prize_templates;
CREATE POLICY "select_org_prize_templates" ON prize_templates FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_org_prize_templates" ON prize_templates;
CREATE POLICY "insert_org_prize_templates" ON prize_templates FOR INSERT
  TO authenticated WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "update_org_prize_templates" ON prize_templates;
CREATE POLICY "update_org_prize_templates" ON prize_templates FOR UPDATE
  TO authenticated USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "delete_org_prize_templates" ON prize_templates;
CREATE POLICY "delete_org_prize_templates" ON prize_templates FOR DELETE
  TO authenticated USING (is_org_member(organization_id));

-- prizes: public SELECT for active campaigns + org-scoped writes
DROP POLICY IF EXISTS "public_select_active_campaign_prizes" ON prizes;
CREATE POLICY "public_select_active_campaign_prizes" ON prizes FOR SELECT
  TO anon, authenticated USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = prizes.campaign_id
        AND campaigns.status = 'active'
        AND now() BETWEEN campaigns.start_date AND campaigns.end_date
    )
  );

DROP POLICY IF EXISTS "select_org_prizes" ON prizes;
CREATE POLICY "select_org_prizes" ON prizes FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_org_prizes" ON prizes;
CREATE POLICY "insert_org_prizes" ON prizes FOR INSERT
  TO authenticated WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "update_org_prizes" ON prizes;
CREATE POLICY "update_org_prizes" ON prizes FOR UPDATE
  TO authenticated USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "delete_org_prizes" ON prizes;
CREATE POLICY "delete_org_prizes" ON prizes FOR DELETE
  TO authenticated USING (is_org_member(organization_id));

-- prize_inventory: org-scoped CRUD
DROP POLICY IF EXISTS "select_org_prize_inventory" ON prize_inventory;
CREATE POLICY "select_org_prize_inventory" ON prize_inventory FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_org_prize_inventory" ON prize_inventory;
CREATE POLICY "insert_org_prize_inventory" ON prize_inventory FOR INSERT
  TO authenticated WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "update_org_prize_inventory" ON prize_inventory;
CREATE POLICY "update_org_prize_inventory" ON prize_inventory FOR UPDATE
  TO authenticated USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "delete_org_prize_inventory" ON prize_inventory;
CREATE POLICY "delete_org_prize_inventory" ON prize_inventory FOR DELETE
  TO authenticated USING (is_org_member(organization_id));

-- quiz_questions: public SELECT for active campaigns + org-scoped writes
DROP POLICY IF EXISTS "public_select_active_quiz_questions" ON quiz_questions;
CREATE POLICY "public_select_active_quiz_questions" ON quiz_questions FOR SELECT
  TO anon, authenticated USING (
    is_active = true
    AND EXISTS (
      SELECT 1 FROM campaigns
      WHERE campaigns.id = quiz_questions.campaign_id
        AND campaigns.status = 'active'
        AND now() BETWEEN campaigns.start_date AND campaigns.end_date
    )
  );

DROP POLICY IF EXISTS "select_org_quiz_questions" ON quiz_questions;
CREATE POLICY "select_org_quiz_questions" ON quiz_questions FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_org_quiz_questions" ON quiz_questions;
CREATE POLICY "insert_org_quiz_questions" ON quiz_questions FOR INSERT
  TO authenticated WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "update_org_quiz_questions" ON quiz_questions;
CREATE POLICY "update_org_quiz_questions" ON quiz_questions FOR UPDATE
  TO authenticated USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "delete_org_quiz_questions" ON quiz_questions;
CREATE POLICY "delete_org_quiz_questions" ON quiz_questions FOR DELETE
  TO authenticated USING (is_org_member(organization_id));

-- entries: public INSERT + org-scoped SELECT/UPDATE/DELETE
DROP POLICY IF EXISTS "public_insert_entries" ON entries;
CREATE POLICY "public_insert_entries" ON entries FOR INSERT
  TO anon, authenticated WITH CHECK (true);

DROP POLICY IF EXISTS "select_org_entries" ON entries;
CREATE POLICY "select_org_entries" ON entries FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "update_org_entries" ON entries;
CREATE POLICY "update_org_entries" ON entries FOR UPDATE
  TO authenticated USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "delete_org_entries" ON entries;
CREATE POLICY "delete_org_entries" ON entries FOR DELETE
  TO authenticated USING (is_org_member(organization_id));

-- billing: org-scoped CRUD
DROP POLICY IF EXISTS "select_org_billing" ON billing;
CREATE POLICY "select_org_billing" ON billing FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_org_billing" ON billing;
CREATE POLICY "insert_org_billing" ON billing FOR INSERT
  TO authenticated WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "update_org_billing" ON billing;
CREATE POLICY "update_org_billing" ON billing FOR UPDATE
  TO authenticated USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "delete_org_billing" ON billing;
CREATE POLICY "delete_org_billing" ON billing FOR DELETE
  TO authenticated USING (is_org_member(organization_id));
