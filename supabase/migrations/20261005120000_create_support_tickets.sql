/*
# Client support tickets

A client (an organization) tells the support team about a problem with the platform. The
account details of the ticket are never typed by the client: `create_support_ticket` copies
them from the account when the ticket is opened, so the team reads verified data, as it was
at that moment (the plan may change later).

## New table: support_tickets
- ticket_number     human reference (SUP-0001...), never reused
- organization_id   the client id (an organization is a client)
- created_by        who opened it (the profile; kept as NULL if the account is deleted)
- contact_email     account details at the time of the ticket
  contact_phone
  plan
- platform_section  campaign_creation | analytics | inventory | player_screen_editor
- type              platform_error | platform_slowness | other
- severity          low | medium | high | urgent
- description       what happened, 10 to 2000 characters
- state             new | open | on_hold | cancelled | resolved  (starts as "new")
- resolved_at       set by a trigger when the state becomes "resolved"

## Security
- RLS is enabled. Members of an organization can READ the tickets of their organization, and
  nothing else: no direct INSERT, UPDATE or DELETE for `anon` or `authenticated`.
- A ticket is opened only through `create_support_ticket` (SECURITY DEFINER, `authenticated`
  only), which takes the organization and the account details from the caller's own profile,
  never from the request, and refuses a flood (10 tickets per organization per hour).
- The support team changes the state with the service role (dashboard or back office).
*/

CREATE TABLE IF NOT EXISTS public.support_tickets (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_number    bigint GENERATED ALWAYS AS IDENTITY UNIQUE,
  organization_id  uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  created_by       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  contact_email    text NOT NULL,
  contact_phone    text,
  plan             text NOT NULL
                     CHECK (plan IN ('free', 'starter', 'pro', 'enterprise')),
  platform_section text NOT NULL
                     CHECK (platform_section IN (
                       'campaign_creation', 'analytics', 'inventory', 'player_screen_editor'
                     )),
  type             text NOT NULL
                     CHECK (type IN ('platform_error', 'platform_slowness', 'other')),
  severity         text NOT NULL
                     CHECK (severity IN ('low', 'medium', 'high', 'urgent')),
  description      text NOT NULL
                     CHECK (char_length(btrim(description)) BETWEEN 10 AND 2000),
  state            text NOT NULL DEFAULT 'new'
                     CHECK (state IN ('new', 'open', 'on_hold', 'cancelled', 'resolved')),
  resolved_at      timestamptz,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now()
);

-- A client reads its tickets newest first; the team works through the open ones by severity.
CREATE INDEX IF NOT EXISTS idx_support_tickets_org_created
  ON public.support_tickets (organization_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_support_tickets_state_created
  ON public.support_tickets (state, created_at DESC);

-- updated_at on every change (set_updated_at() comes with the core tables).
DROP TRIGGER IF EXISTS trg_set_updated_at ON public.support_tickets;
CREATE TRIGGER trg_set_updated_at BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- resolved_at follows the state: set when it becomes "resolved", cleared if it is reopened.
CREATE OR REPLACE FUNCTION public.support_tickets_track_resolution()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF NEW.state = 'resolved' AND OLD.state IS DISTINCT FROM 'resolved' THEN
    NEW.resolved_at := now();
  ELSIF NEW.state <> 'resolved' THEN
    NEW.resolved_at := NULL;
  END IF;
  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.support_tickets_track_resolution()
  FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_support_tickets_track_resolution ON public.support_tickets;
CREATE TRIGGER trg_support_tickets_track_resolution BEFORE UPDATE ON public.support_tickets
  FOR EACH ROW EXECUTE FUNCTION public.support_tickets_track_resolution();

-- Row level security: read your own organization's tickets, nothing else.
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- New tables get SELECT/INSERT/UPDATE/DELETE for anon and authenticated by default privileges:
-- take everything back, then give back the one thing that is allowed.
REVOKE ALL ON public.support_tickets FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.support_tickets TO authenticated;
GRANT ALL ON public.support_tickets TO service_role;

DROP POLICY IF EXISTS "select_org_support_tickets" ON public.support_tickets;
CREATE POLICY "select_org_support_tickets" ON public.support_tickets FOR SELECT
  TO authenticated USING (public.is_org_member(organization_id));

-- Opens a ticket for the caller's own organization.
CREATE OR REPLACE FUNCTION public.create_support_ticket(
  p_platform_section text,
  p_type             text,
  p_severity         text,
  p_description      text
)
RETURNS public.support_tickets
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid         uuid := auth.uid();
  v_profile     public.profiles%ROWTYPE;
  v_org         public.organizations%ROWTYPE;
  v_description text := btrim(coalesce(p_description, ''));
  v_ticket      public.support_tickets%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'SUPPORT_UNAUTHENTICATED: sign in to contact support'
      USING ERRCODE = '28000';
  END IF;

  -- The organization and the account details come from the caller, never from the request.
  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUPPORT_NO_ORGANIZATION: this account has no organization yet'
      USING ERRCODE = '42501';
  END IF;
  SELECT * INTO v_org FROM public.organizations WHERE id = v_profile.organization_id;

  IF p_platform_section IS NULL OR p_platform_section NOT IN (
       'campaign_creation', 'analytics', 'inventory', 'player_screen_editor') THEN
    RAISE EXCEPTION 'SUPPORT_INVALID_INPUT: unknown platform section'
      USING ERRCODE = '22023';
  END IF;
  IF p_type IS NULL OR p_type NOT IN ('platform_error', 'platform_slowness', 'other') THEN
    RAISE EXCEPTION 'SUPPORT_INVALID_INPUT: unknown ticket type'
      USING ERRCODE = '22023';
  END IF;
  IF p_severity IS NULL OR p_severity NOT IN ('low', 'medium', 'high', 'urgent') THEN
    RAISE EXCEPTION 'SUPPORT_INVALID_INPUT: unknown severity'
      USING ERRCODE = '22023';
  END IF;
  IF char_length(v_description) < 10 OR char_length(v_description) > 2000 THEN
    RAISE EXCEPTION 'SUPPORT_INVALID_INPUT: the description must have 10 to 2000 characters'
      USING ERRCODE = '22023';
  END IF;

  -- No flood: 10 tickets per organization and per hour is plenty for a real problem.
  IF (SELECT count(*) FROM public.support_tickets
      WHERE organization_id = v_org.id
        AND created_at > now() - interval '1 hour') >= 10 THEN
    RAISE EXCEPTION 'SUPPORT_RATE_LIMITED: too many tickets in the last hour'
      USING ERRCODE = '54000';
  END IF;

  INSERT INTO public.support_tickets (
    organization_id, created_by, contact_email, contact_phone, plan,
    platform_section, type, severity, description
  )
  VALUES (
    v_org.id, v_uid, v_profile.email, v_org.phone_number, v_org.plan,
    p_platform_section, p_type, p_severity, v_description
  )
  RETURNING * INTO v_ticket;

  RETURN v_ticket;
END;
$$;

REVOKE ALL ON FUNCTION public.create_support_ticket(text, text, text, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_support_ticket(text, text, text, text)
  TO authenticated;
