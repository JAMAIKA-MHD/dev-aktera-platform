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
