-- 01-init.sql
-- Initializes PostgreSQL roles, schemas, and mockup auth tables required by Supabase migrations

CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Create Supabase Core Roles
DO $$
BEGIN
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN NOINHERIT;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN NOINHERIT BYPASSRLS;
  END IF;
  IF NOT EXISTS (SELECT FROM pg_catalog.pg_roles WHERE rolname = 'supabase_admin') THEN
    CREATE ROLE supabase_admin LOGIN SUPERUSER PASSWORD 'postgres';
  END IF;
END $$;

-- 2. Create Required Supabase Schemas
CREATE SCHEMA IF NOT EXISTS auth;
CREATE SCHEMA IF NOT EXISTS storage;
CREATE SCHEMA IF NOT EXISTS extensions;

-- 3. Create auth.users Mock Table for Local / Containerized Postgres
CREATE TABLE IF NOT EXISTS auth.users (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  instance_id         uuid,
  aud                 varchar(255) DEFAULT 'authenticated',
  role                varchar(255) DEFAULT 'authenticated',
  email               varchar(255) UNIQUE,
  encrypted_password  varchar(255),
  email_confirmed_at  timestamptz DEFAULT now(),
  invited_at          timestamptz,
  confirmation_token  varchar(255),
  confirmation_sent_at timestamptz,
  recovery_token      varchar(255),
  recovery_sent_at    timestamptz,
  email_change_token_new varchar(255),
  email_change        varchar(255),
  email_change_sent_at timestamptz,
  last_sign_in_at     timestamptz,
  raw_app_meta_data   jsonb DEFAULT '{}'::jsonb,
  raw_user_meta_data  jsonb DEFAULT '{}'::jsonb,
  is_super_admin      boolean DEFAULT false,
  created_at          timestamptz DEFAULT now(),
  updated_at          timestamptz DEFAULT now(),
  phone               varchar(255) UNIQUE,
  phone_confirmed_at  timestamptz,
  phone_change        varchar(255) DEFAULT '',
  phone_change_token  varchar(255) DEFAULT '',
  phone_change_sent_at timestamptz,
  confirmed_at        timestamptz DEFAULT now(),
  email_change_token_current varchar(255) DEFAULT '',
  email_change_confirm_status smallint DEFAULT 0,
  banned_until        timestamptz,
  reauthentication_token varchar(255) DEFAULT '',
  reauthentication_sent_at timestamptz,
  is_sso_user         boolean DEFAULT false,
  deleted_at          timestamptz
);

-- Create auth helper function auth.uid() for RLS policies
CREATE OR REPLACE FUNCTION auth.uid()
RETURNS uuid
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::uuid;
$$;

CREATE OR REPLACE FUNCTION auth.role()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT COALESCE(current_setting('request.jwt.claim.role', true), 'anon')::text;
$$;

CREATE OR REPLACE FUNCTION auth.email()
RETURNS text
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(current_setting('request.jwt.claim.email', true), '')::text;
$$;

-- 4. Set Schema Permissions
GRANT ALL ON SCHEMA public TO postgres, service_role, anon, authenticated;
GRANT ALL ON SCHEMA auth TO postgres, service_role;
GRANT SELECT ON ALL TABLES IN SCHEMA auth TO anon, authenticated;
GRANT ALL ON SCHEMA storage TO postgres, service_role, anon, authenticated;
GRANT ALL ON SCHEMA extensions TO postgres, service_role;
