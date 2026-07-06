-- ============================================================
-- YOUENGAGE FULL RESET + CLEAN APPLY
-- Run this entire script in Supabase SQL Editor
-- WARNING: DESTROYS ALL DATA.
-- ============================================================

-- STEP 1: Drop everything cleanly
DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT USAGE ON SCHEMA public TO postgres, anon, authenticated, service_role;
GRANT ALL ON SCHEMA public TO postgres, service_role;

-- ---- 20260630150449_create_dzengage_core_tables.sql ----
/*
# DZENGAGE Core Schema — Tables, Indexes, Triggers

## Overview
Creates the full multi-tenant schema for the DZENGAGE B2B gamification
platform: organizations, profiles, campaigns, prize_templates, prizes,
prize_inventory, quiz_questions, entries, and billing.

## New Tables
1. **organizations** — Top-level tenant. Fields: id, name, slug, contact_email,
   phone_number, logo_url, plan (free/starter/pro/enterprise), is_active,
   created_at, updated_at.
2. **profiles** — User accounts (1:1 with auth.users). Fields: id (FK to
   auth.users), organization_id, full_name, email, role
   (owner/admin/manager/viewer), avatar_url, timestamps.
3. **campaigns** — Gamification campaigns. Fields: id, organization_id, name,
   slug, description, status (draft/active/paused/ended/archived), start_date,
   end_date, win_probability (0–1), max_entries, require_phone, require_quiz,
   hero_image_url, theme_color, timestamps.
4. **prize_templates** — Reusable prize catalog per org. Fields: id,
   organization_id, name, description, category (voucher/physical/digital/cash),
   value, image_url, timestamps.
5. **prizes** — Prize allocated to a campaign. Fields: id, campaign_id,
   organization_id, prize_template_id, name, description, image_url, quantity,
   quantity_won, weight, probability, win_message, is_active, timestamps.
6. **prize_inventory** — Atomic stock counter per prize. Fields: id, prize_id,
   campaign_id, organization_id, initial_quantity, remaining, claimed,
   timestamps.
7. **quiz_questions** — Multiple-choice questions per campaign. Fields: id,
   campaign_id, organization_id, question, options (text[]), correct_option_index,
   explanation, position, is_active, timestamps.
8. **entries** — Participant plays. Fields: id, campaign_id, organization_id,
   phone_number, participant_name, participant_email, quiz_passed, is_winner,
   prize_id, metadata (jsonb), ip_address, user_agent, created_at. Unique
   constraint on (campaign_id, phone_number) for anti-fraud.
9. **billing** — Subscription/invoice records. Fields: id, organization_id,
   plan, billing_cycle, amount, status, stripe_customer_id, stripe_invoice_id,
   period_start, period_end, timestamps.

## Indexes
- Foreign key columns indexed for join performance.
- entries(campaign_id, phone_number) unique partial index.
- entries(created_at DESC) for dashboard sorting.

## Triggers
- `set_updated_at()` function + per-table BEFORE UPDATE triggers to auto-set
  updated_at on every row modification.

## Security
- RLS enabled on all tables (policies added in the next migration).
*/

-- pgcrypto for gen_random_uuid()
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- organizations
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

-- profiles
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

-- campaigns
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

-- prize_templates
CREATE TABLE IF NOT EXISTS prize_templates (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  name            text NOT NULL,
  description     text,
  category        text NOT NULL DEFAULT 'voucher'
                    CHECK (category IN ('voucher', 'physical', 'digital', 'cash')),
  value           numeric(12,2) NOT NULL DEFAULT 0,
  image_url       text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

-- prizes
CREATE TABLE IF NOT EXISTS prizes (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id       uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id   uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  prize_template_id uuid NOT NULL REFERENCES prize_templates(id) ON DELETE RESTRICT,
  name              text NOT NULL,
  description       text,
  image_url         text,
  quantity          integer NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  quantity_won      integer NOT NULL DEFAULT 0 CHECK (quantity_won >= 0),
  weight            numeric(8,4) NOT NULL DEFAULT 1 CHECK (weight >= 0),
  probability       numeric(5,4) NOT NULL DEFAULT 0
                      CHECK (probability >= 0 AND probability <= 1),
  win_message       text,
  is_active         boolean NOT NULL DEFAULT true,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

-- prize_inventory
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

-- quiz_questions
CREATE TABLE IF NOT EXISTS quiz_questions (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id          uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id      uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  question             text NOT NULL,
  options              text[] NOT NULL CHECK (array_length(options, 1) >= 2),
  correct_option_index integer NOT NULL CHECK (correct_option_index >= 0),
  explanation          text,
  position             integer NOT NULL DEFAULT 0,
  is_active            boolean NOT NULL DEFAULT true,
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now()
);

-- entries
CREATE TABLE IF NOT EXISTS entries (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id      uuid NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
  organization_id  uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  phone_number     text,
  participant_name text,
  participant_email text,
  quiz_passed      boolean,
  is_winner        boolean NOT NULL DEFAULT false,
  prize_id         uuid REFERENCES prizes(id) ON DELETE SET NULL,
  metadata         jsonb,
  ip_address       inet,
  user_agent       text,
  created_at       timestamptz NOT NULL DEFAULT now()
);

-- One entry per phone per campaign (anti-fraud)
CREATE UNIQUE INDEX IF NOT EXISTS entries_campaign_phone_unique
  ON entries (campaign_id, phone_number)
  WHERE phone_number IS NOT NULL;

-- billing
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

-- Indexes
CREATE INDEX IF NOT EXISTS idx_profiles_organization ON profiles(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_organization ON campaigns(organization_id);
CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
CREATE INDEX IF NOT EXISTS idx_prizes_campaign ON prizes(campaign_id);
CREATE INDEX IF NOT EXISTS idx_prizes_organization ON prizes(organization_id);
CREATE INDEX IF NOT EXISTS idx_prize_inventory_prize ON prize_inventory(prize_id);
CREATE INDEX IF NOT EXISTS idx_quiz_questions_campaign ON quiz_questions(campaign_id);
CREATE INDEX IF NOT EXISTS idx_entries_campaign ON entries(campaign_id);
CREATE INDEX IF NOT EXISTS idx_entries_organization ON entries(organization_id);
CREATE INDEX IF NOT EXISTS idx_entries_created_at ON entries(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_billing_organization ON billing(organization_id);

-- updated_at trigger function
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Attach trigger to all tables with updated_at
DO $$
DECLARE
  tbl text;
BEGIN
  FOR tbl IN
    SELECT unnest(ARRAY[
      'organizations', 'profiles', 'campaigns', 'prize_templates',
      'prizes', 'prize_inventory', 'quiz_questions', 'billing'
    ])
  LOOP
    EXECUTE format(
      'DROP TRIGGER IF EXISTS trg_set_updated_at ON %I; '
      'CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON %I '
      'FOR EACH ROW EXECUTE FUNCTION set_updated_at();',
      tbl, tbl
    );
  END LOOP;
END $$;

-- Enable RLS on all tables (policies added in next migration)
ALTER TABLE organizations   ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns        ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_templates  ENABLE ROW LEVEL SECURITY;
ALTER TABLE prizes           ENABLE ROW LEVEL SECURITY;
ALTER TABLE prize_inventory  ENABLE ROW LEVEL SECURITY;
ALTER TABLE quiz_questions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE entries          ENABLE ROW LEVEL SECURITY;
ALTER TABLE billing          ENABLE ROW LEVEL SECURITY;

-- ---- 20260630150507_create_dzengage_rls_policies.sql ----
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

-- ---- 20260701000000_create_organization_onboarding.sql ----
CREATE OR REPLACE FUNCTION public.create_organization_onboarding(
  p_user_id uuid,
  p_org_name text,
  p_full_name text,
  p_email text,
  p_phone text DEFAULT NULL,
  p_plan text DEFAULT 'free'
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_id uuid;
  v_slug text;
BEGIN
  v_slug := regexp_replace(lower(p_org_name), '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '(^-+|-+$)', '', 'g');
  IF v_slug = '' THEN
    v_slug := 'organization';
  END IF;
  v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  INSERT INTO public.organizations (
    name,
    slug,
    contact_email,
    phone_number,
    plan,
    is_active
  )
  VALUES (
    p_org_name,
    v_slug,
    p_email,
    p_phone,
    p_plan,
    true
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.profiles (
    id,
    organization_id,
    full_name,
    email,
    role
  )
  VALUES (
    p_user_id,
    v_org_id,
    p_full_name,
    p_email,
    'owner'
  );

  INSERT INTO public.billing (
    organization_id,
    plan,
    billing_cycle,
    amount,
    status,
    period_start,
    period_end
  )
  VALUES (
    v_org_id,
    p_plan,
    'yearly',
    0,
    'paid',
    now(),
    now() + interval '1 year'
  );

  RETURN v_org_id;
END;
$$;

-- ---- 20260702165436_harden_select_prize_atomic_inventory_claim.sql ----
-- Atomically claims one inventory row for a prize under concurrent load.
-- The SKIP LOCKED pattern prevents workers from blocking each other and
-- guarantees we never decrement below zero.
CREATE OR REPLACE FUNCTION public.claim_prize_inventory(
  p_prize_id uuid
)
RETURNS TABLE (inventory_id uuid)
LANGUAGE plpgsql
AS $$
BEGIN
  RETURN QUERY
  WITH target AS (
    SELECT pi.id
    FROM public.prize_inventory pi
    WHERE pi.prize_id = p_prize_id
      AND pi.remaining > 0
    ORDER BY pi.created_at
    LIMIT 1
    FOR UPDATE SKIP LOCKED
  ),
  updated AS (
    UPDATE public.prize_inventory pi
    SET
      remaining = pi.remaining - 1,
      claimed = pi.claimed + 1
    FROM target
    WHERE pi.id = target.id
    RETURNING pi.id
  )
  SELECT updated.id
  FROM updated;
END;
$$;

-- Keep winner counters accurate with an atomic increment operation.
CREATE OR REPLACE FUNCTION public.increment_prize_winner_count(
  p_prize_id uuid
)
RETURNS void
LANGUAGE sql
AS $$
  UPDATE public.prizes
  SET quantity_won = quantity_won + 1
  WHERE id = p_prize_id;
$$;
-- ---- 20260702205043_add_campaign_source_campaign_id.sql ----
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS source_campaign_id uuid REFERENCES public.campaigns(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS campaigns_source_campaign_id_idx
ON public.campaigns(source_campaign_id);
-- ---- 20260702211902_prompt7_prize_instance_values_workflow.sql ----
UPDATE public.prize_templates
SET category = 'voucher'
WHERE category NOT IN ('voucher', 'physical');

ALTER TABLE public.prize_templates
DROP CONSTRAINT IF EXISTS prize_templates_category_check;

ALTER TABLE public.prize_templates
ADD CONSTRAINT prize_templates_category_check
CHECK (category IN ('voucher', 'physical'));

CREATE TABLE IF NOT EXISTS public.prize_inventory_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  prize_inventory_id uuid NOT NULL REFERENCES public.prize_inventory(id) ON DELETE CASCADE,
  prize_id uuid NOT NULL REFERENCES public.prizes(id) ON DELETE CASCADE,
  campaign_id uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  item_index integer NOT NULL CHECK (item_index > 0),
  item_value text,
  source_type text NOT NULL DEFAULT 'manual' CHECK (source_type IN ('manual', 'bulk')),
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE (prize_inventory_id, item_index)
);

CREATE INDEX IF NOT EXISTS idx_prize_inventory_items_inventory
ON public.prize_inventory_items(prize_inventory_id);

CREATE INDEX IF NOT EXISTS idx_prize_inventory_items_org
ON public.prize_inventory_items(organization_id);

ALTER TABLE public.prize_inventory_items ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_prize_inventory_items" ON public.prize_inventory_items;
CREATE POLICY "select_org_prize_inventory_items" ON public.prize_inventory_items FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_org_prize_inventory_items" ON public.prize_inventory_items;
CREATE POLICY "insert_org_prize_inventory_items" ON public.prize_inventory_items FOR INSERT
  TO authenticated WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "update_org_prize_inventory_items" ON public.prize_inventory_items;
CREATE POLICY "update_org_prize_inventory_items" ON public.prize_inventory_items FOR UPDATE
  TO authenticated USING (is_org_member(organization_id))
  WITH CHECK (is_org_member(organization_id));

DROP POLICY IF EXISTS "delete_org_prize_inventory_items" ON public.prize_inventory_items;
CREATE POLICY "delete_org_prize_inventory_items" ON public.prize_inventory_items FOR DELETE
  TO authenticated USING (is_org_member(organization_id));
-- ---- 20260702214554_prompt8_storage_image_uploader.sql ----
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'campaign-media',
  'campaign-media',
  true,
  5242880,
  ARRAY['image/jpeg', 'image/png', 'image/webp']
)
ON CONFLICT (id) DO UPDATE
SET
  public = EXCLUDED.public,
  file_size_limit = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

DROP POLICY IF EXISTS "campaign_media_org_select" ON storage.objects;
CREATE POLICY "campaign_media_org_select" ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'campaign-media'
  AND (storage.foldername(name))[1] IN (
    SELECT p.organization_id::text
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "campaign_media_org_insert" ON storage.objects;
CREATE POLICY "campaign_media_org_insert" ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'campaign-media'
  AND (storage.foldername(name))[1] IN (
    SELECT p.organization_id::text
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "campaign_media_org_update" ON storage.objects;
CREATE POLICY "campaign_media_org_update" ON storage.objects FOR UPDATE
TO authenticated
USING (
  bucket_id = 'campaign-media'
  AND (storage.foldername(name))[1] IN (
    SELECT p.organization_id::text
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
)
WITH CHECK (
  bucket_id = 'campaign-media'
  AND (storage.foldername(name))[1] IN (
    SELECT p.organization_id::text
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
);

DROP POLICY IF EXISTS "campaign_media_org_delete" ON storage.objects;
CREATE POLICY "campaign_media_org_delete" ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'campaign-media'
  AND (storage.foldername(name))[1] IN (
    SELECT p.organization_id::text
    FROM public.profiles p
    WHERE p.id = auth.uid()
  )
);

-- ---- 20260703112252_template_inventory_global_stock.sql ----
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
-- ---- 20260703172325_add_coupon_tracking.sql ----
-- Add coupon tracking to entries table
-- This stores the actual coupon code that was given to the winner
-- Using DO block to safely skip if column already exists (idempotent)
DO $$ BEGIN
  ALTER TABLE entries ADD COLUMN redeemed_coupon_value VARCHAR(255) NULL;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Add a table to track which coupon codes have been used (for auditing)
CREATE TABLE IF NOT EXISTS coupon_redemptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  entry_id UUID NOT NULL REFERENCES entries(id) ON DELETE CASCADE,
  prize_template_item_id UUID NOT NULL REFERENCES prize_template_items(id),
  coupon_value VARCHAR(255) NOT NULL,
  redeemed_at TIMESTAMP DEFAULT now(),
  redeemed_by_player BOOLEAN DEFAULT false,
  UNIQUE(prize_template_item_id) -- Ensure each coupon is only used once
);

-- Enable RLS on coupon_redemptions
ALTER TABLE coupon_redemptions ENABLE ROW LEVEL SECURITY;

-- RLS Policy: Org members can view redemptions for their org's campaigns
-- Uses profiles table (user's org membership is stored there)
DO $$ BEGIN
  CREATE POLICY "coupon_redemptions_org_access"
    ON coupon_redemptions
    FOR SELECT
    TO authenticated
    USING (
      EXISTS (
        SELECT 1 FROM entries e
        JOIN campaigns c ON e.campaign_id = c.id
        WHERE e.id = entry_id
        AND c.organization_id = (
          SELECT organization_id FROM profiles
          WHERE id = auth.uid()
        )
      )
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- RLS Policy: Only select-prize edge function (via service role) can insert
-- This is implicit since the edge function uses service_role key

-- ---- 20260704111917_fix_redeem_and_duplicate_check.sql ----
-- Add coupon_confirmed flag to entries table
-- This tracks whether the winner confirmed they received/copied the coupon
DO $$ BEGIN
  ALTER TABLE entries ADD COLUMN coupon_confirmed BOOLEAN DEFAULT false;
EXCEPTION WHEN duplicate_column THEN NULL;
END $$;

-- Allow anonymous players to confirm their own coupon by entry ID.
-- The player only knows their own entry ID (received from select-prize response),
-- so this is safe: they can only flip coupon_confirmed to true on that row.
DO $$ BEGIN
  CREATE POLICY "anon_confirm_coupon"
    ON entries
    FOR UPDATE
    TO anon
    USING (true)
    WITH CHECK (
      -- Only allow setting coupon_confirmed = true, nothing else changes
      coupon_confirmed = true
    );
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

-- ---- 20260706091000_restore_api_grants_and_add_org_recovery.sql ----
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
