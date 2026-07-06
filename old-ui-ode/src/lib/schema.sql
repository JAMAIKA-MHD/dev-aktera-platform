-- ============================================================================
-- DZENGAGE — Full PostgreSQL Schema (Reference)
-- ============================================================================
-- This file is the human-readable reference for the DZENGAGE database schema.
-- The schema is applied to the live Supabase project via the
-- `mcp__supabase__apply_migration` MCP tool (see migration history).
--
-- Design notes:
--   * Multi-tenant: every table carries `organization_id` and RLS policies
--     scope all access to the requesting user's organization.
--   * Public player flow: the `entries` table allows public (anon) INSERTs
--     so unauthenticated players can submit plays, and the `prizes` table
--     allows public SELECTs for *active* campaigns so the roulette wheel can
--     render without authentication.
--   * Unique constraint on `entries(campaign_id, phone_number)` enforces
--     one entry per phone per campaign (anti-fraud).
-- ============================================================================

-- ----------------------------------------------------------------------------
-- Extensions
-- ----------------------------------------------------------------------------
-- pgcrypto provides gen_random_uuid() for default primary keys.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- ----------------------------------------------------------------------------
-- Table: organizations
-- ----------------------------------------------------------------------------
-- Top-level tenant. All other tables reference this via organization_id.
CREATE TABLE IF NOT EXISTS organizations (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  slug          text UNIQUE NOT NULL,
  contact_email text NOT NULL,
  phone_number  text,
  logo_url      text,
  plan          text NOT NULL DEFAULT 'free'
                  CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  is_active     boolean NOT NULL DEFAULT true,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: profiles
-- ----------------------------------------------------------------------------
-- One row per user account. Joins 1:1 with auth.users via id.
CREATE TABLE IF NOT EXISTS profiles (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  full_name       text NOT NULL,
  email           text NOT NULL,
  role            text NOT NULL DEFAULT 'viewer'
                    CHECK (role IN ('owner', 'admin', 'manager', 'viewer')),
  avatar_url      text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: campaigns
-- ----------------------------------------------------------------------------
-- The central gamification object. Each campaign has a time window and a
-- configurable win_probability.
CREATE TABLE IF NOT EXISTS campaigns (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  slug            text UNIQUE NOT NULL,
  description     text,
  status          text NOT NULL DEFAULT 'draft'
                    CHECK (status IN ('draft', 'active', 'paused', 'ended', 'archived')),
  start_date      timestamptz NOT NULL,
  end_date        timestamptz NOT NULL,
  win_probability numeric(5,4) NOT NULL DEFAULT 0
                    CHECK (win_probability >= 0 AND win_probability <= 1),
  max_entries     integer,
  require_phone   boolean NOT NULL DEFAULT true,
  require_quiz    boolean NOT NULL DEFAULT false,
  hero_image_url  text,
  theme_color     text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: prize_templates
-- ----------------------------------------------------------------------------
-- Reusable catalog of prizes owned by an organization.
CREATE TABLE IF NOT EXISTS prize_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  category        text NOT NULL DEFAULT 'voucher'
                    CHECK (category IN ('voucher', 'physical', 'digital', 'cash')),
  value           numeric(12,2) NOT NULL DEFAULT 0,
  stock_quantity  integer NOT NULL DEFAULT 0 CHECK (stock_quantity >= 0),
  image_url       text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS prize_template_items (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_template_id uuid NOT NULL REFERENCES prize_templates(id) ON DELETE CASCADE,
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  item_index       integer NOT NULL CHECK (item_index > 0),
  item_value       text,
  source_type      text NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'bulk')),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prize_template_id, item_index)
);

-- ----------------------------------------------------------------------------
-- Table: prizes
-- ----------------------------------------------------------------------------
-- A prize allocated to a specific campaign, drawn from a prize_template.
CREATE TABLE IF NOT EXISTS prizes (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prize_template_id uuid NOT NULL REFERENCES prize_templates(id) ON DELETE RESTRICT,
  name             text NOT NULL,
  description      text,
  image_url        text,
  quantity         integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  quantity_won     integer NOT NULL DEFAULT 0 CHECK (quantity_won >= 0),
  weight           numeric(8,4) NOT NULL DEFAULT 1 CHECK (weight >= 0),
  probability      numeric(5,4) NOT NULL DEFAULT 0
                     CHECK (probability >= 0 AND probability <= 1),
  win_message      text,
  is_active        boolean NOT NULL DEFAULT true,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: prize_inventory
-- ----------------------------------------------------------------------------
-- Authoritative atomic stock counter per prize per campaign.
CREATE TABLE IF NOT EXISTS prize_inventory (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_id         uuid NOT NULL REFERENCES prizes(id) ON DELETE CASCADE,
  campaign_id      uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  initial_quantity integer NOT NULL DEFAULT 0 CHECK (initial_quantity >= 0),
  remaining        integer NOT NULL DEFAULT 0 CHECK (remaining >= 0),
  claimed          integer NOT NULL DEFAULT 0 CHECK (claimed >= 0),
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: quiz_questions
-- ----------------------------------------------------------------------------
-- Multiple-choice questions attached to a campaign.
CREATE TABLE IF NOT EXISTS quiz_questions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id     uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  question            text NOT NULL,
  options             text[] NOT NULL CHECK (array_length(options, 1) >= 2),
  correct_option_index integer NOT NULL
                        CHECK (correct_option_index >= 0),
  explanation         text,
  position            integer NOT NULL DEFAULT 0,
  is_active           boolean NOT NULL DEFAULT true,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Table: entries
-- ----------------------------------------------------------------------------
-- A single play submitted by a participant. Public INSERTs are allowed
-- (anon role) so unauthenticated players can submit entries.
CREATE TABLE IF NOT EXISTS entries (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id     uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number    text,
  participant_name text,
  participant_email text,
  quiz_passed     boolean,
  is_winner       boolean NOT NULL DEFAULT false,
  prize_id        uuid REFERENCES prizes(id) ON DELETE SET NULL,
  metadata        jsonb,
  ip_address      inet,
  user_agent      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- One entry per phone per campaign (anti-fraud when require_phone = true).
CREATE UNIQUE INDEX IF NOT EXISTS entries_campaign_phone_unique
  ON entries (campaign_id, phone_number)
  WHERE phone_number IS NOT NULL;

-- ----------------------------------------------------------------------------
-- Table: billing
-- ----------------------------------------------------------------------------
-- Billing/subscription records per organization.
CREATE TABLE IF NOT EXISTS billing (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id    uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  plan               text NOT NULL DEFAULT 'free'
                       CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  billing_cycle      text NOT NULL DEFAULT 'monthly'
                       CHECK (billing_cycle IN ('monthly', 'yearly', 'one_time')),
  amount             numeric(12,2) NOT NULL DEFAULT 0,
  status             text NOT NULL DEFAULT 'pending'
                       CHECK (status IN ('pending', 'paid', 'failed', 'refunded')),
  stripe_customer_id text,
  stripe_invoice_id  text,
  period_start       timestamptz NOT NULL,
  period_end         timestamptz NOT NULL,
  created_at         timestamptz NOT NULL DEFAULT now(),
  updated_at         timestamptz NOT NULL DEFAULT now()
);

-- ----------------------------------------------------------------------------
-- Indexes for query performance
-- ----------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_organization ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_prizes_campaign ON prizes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prizes_organization ON prizes(organization_id);
CREATE INDEX IF NOT EXISTS idx_prize_template_items_template ON prize_template_items(prize_template_id);
CREATE INDEX IF NOT EXISTS idx_prize_template_items_org ON prize_template_items(organization_id);
CREATE INDEX IF NOT EXISTS idx_prize_inventory_prize ON prize_inventory(prize_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_campaign ON quiz_questions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_entries_campaign ON entries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_entries_organization ON entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_organization ON billing(organization_id);

-- ----------------------------------------------------------------------------
-- updated_at trigger function
-- ----------------------------------------------------------------------------
-- Automatically set updated_at on every row update for all tables that have it.
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Attach the trigger to every table with an updated_at column.
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'organizations', 'profiles', 'campaigns', 'prize_templates',
      'prize_template_items', 'prizes', 'prize_inventory', 'quiz_questions', 'billing'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_at ON %I; '
      'CREATE TRIGGER trg_set_updated_tat BEFORE UPDATE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;

CREATE OR REPLACE FUNCTION enforce_prize_template_stock_allocation()
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
  FROM campaigns
  WHERE id = NEW.campaign_id;

  IF campaign_status IS NULL THEN
    RAISE EXCEPTION 'Campaign % does not exist', NEW.campaign_id;
  END IF;

  IF campaign_status NOT IN ('draft', 'active', 'paused') THEN
    RETURN NEW;
  END IF;

  SELECT stock_quantity INTO template_stock
  FROM prize_templates
  WHERE id = NEW.prize_template_id;

  IF template_stock IS NULL THEN
    RAISE EXCEPTION 'Prize template % does not exist', NEW.prize_template_id;
  END IF;

  SELECT COALESCE(SUM(p.quantity), 0)::integer INTO reserved_quantity
  FROM prizes p
  JOIN campaigns c ON c.id = p.campaign_id
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

DROP TRIGGER IF EXISTS enforce_prize_template_stock_allocation_on_prizes ON prizes;
CREATE TRIGGER enforce_prize_template_stock_allocation_on_prizes
BEFORE INSERT OR UPDATE OF prize_template_id, quantity, campaign_id
ON prizes
FOR EACH ROW
EXECUTE FUNCTION enforce_prize_template_stock_allocation();

-- ============================================================================
-- Row Level Security (RLS)
-- ============================================================================
-- Strategy:
--   * Organization-scoped tables (profiles, campaigns, prize_templates,
--     prizes, prize_inventory, quiz_questions, billing): authenticated users
--     can only see/modify rows belonging to their own organization, verified
--     by joining profiles to confirm membership.
--   * entries: public INSERT (anon) so players can submit plays; SELECT/UPDATE/
--     DELETE restricted to the owning organization.
--   * prizes: public SELECT for *active* campaigns so the player wheel renders
--     without auth; writes restricted to the owning organization.
--   * organizations: a user can read/update only their own organization.
-- ============================================================================

-- Enable RLS on every table.
ALTER TABLE organizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_template_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_inventory  ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing          ENABLE ROW LEVEL SECURITY;

-- ----------------------------------------------------------------------------
-- Helper: is the current user a member of a given organization?
-- ----------------------------------------------------------------------------
-- Used by RLS policies to verify org membership without repeating the join.
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

-- ----------------------------------------------------------------------------
-- organizations policies
-- ----------------------------------------------------------------------------
-- A user can read/update only the org they belong to.
DROP POLICY IF EXISTS "select_own_organization" ON organizations;
CREATE POLICY "select_own_organization" ON organizations FOR SELECT
  TO authenticated USING (is_org_member(id));

DROP POLICY IF EXISTS "update_own_organization" ON organizations;
CREATE POLICY "update_own_organization" ON organizations FOR UPDATE
  TO authenticated USING (is_org_member(id)) WITH CHECK (is_org_member(id));

-- ----------------------------------------------------------------------------
-- profiles policies
-- ----------------------------------------------------------------------------
-- Users can read all profiles in their org; only owners/admins can modify.
DROP POLICY IF EXISTS "select_org_profiles" ON profiles;
CREATE POLICY "select_org_profiles" ON profiles FOR SELECT
  TO authenticated USING (organization_id IN (
    SELECT organization_id FROM profiles WHERE id = auth.uid()
  ));

DROP POLICY IF EXISTS "insert_org_profiles" ON profiles;
CREATE POLICY "insert_org_profiles" ON profiles FOR INSERT
  TO authenticated WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
  ));

DROP POLICY IF EXISTS "update_org_profiles" ON profiles;
CREATE POLICY "update_org_profiles" ON profiles FOR UPDATE
  TO authenticated USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
  )) WITH CHECK (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
  ));

DROP POLICY IF EXISTS "delete_org_profiles" ON profiles;
CREATE POLICY "delete_org_profiles" ON profiles FOR DELETE
  TO authenticated USING (organization_id IN (
    SELECT organization_id FROM profiles
    WHERE id = auth.uid()
      AND role IN ('owner', 'admin')
  ));

-- ----------------------------------------------------------------------------
-- campaigns policies
-- ----------------------------------------------------------------------------
-- Org members can read; managers+ can write.
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

-- ----------------------------------------------------------------------------
-- prize_templates policies
-- ----------------------------------------------------------------------------
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

DROP POLICY IF EXISTS "select_org_prize_template_items" ON prize_template_items;
CREATE POLICY "select_org_prize_template_items" ON prize_template_items FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_org_prize_template_items" ON prize_template_items;
CREATE POLICY "insert_org_prize_template_items" ON prize_template_items FOR INSERT
  TO authenticated WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "update_org_prize_template_items" ON prize_template_items;
CREATE POLICY "update_org_prize_template_items" ON prize_template_items FOR UPDATE
  TO authenticated USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "delete_org_prize_template_items" ON prize_template_items;
CREATE POLICY "delete_org_prize_template_items" ON prize_template_items FOR DELETE
  TO authenticated USING (is_org_member(organization_id));

-- ----------------------------------------------------------------------------
-- prizes policies
-- ----------------------------------------------------------------------------
-- Public SELECT for active campaigns (player wheel needs no auth).
-- Org-scoped writes for everything else.
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

-- ----------------------------------------------------------------------------
-- prize_inventory policies
-- ----------------------------------------------------------------------------
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

-- ----------------------------------------------------------------------------
-- quiz_questions policies
-- ----------------------------------------------------------------------------
-- Public SELECT for active campaigns (player needs to see quiz questions).
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

-- ----------------------------------------------------------------------------
-- entries policies
-- ----------------------------------------------------------------------------
-- Public INSERT so unauthenticated players can submit plays.
-- Org-scoped SELECT/UPDATE/DELETE for the dashboard.
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

-- ----------------------------------------------------------------------------
-- billing policies
-- ----------------------------------------------------------------------------
-- Only org members can see billing; only owners/admins can modify.
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
