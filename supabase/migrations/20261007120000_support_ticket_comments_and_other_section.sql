/*
# Support: comments on a ticket, and an "other" platform section

## Comments
A client can comment on a ticket that is already open, and the support team can answer. The
thread is read by every member of the organization that owns the ticket.

### New table: support_ticket_comments
- ticket_id        the ticket (comments go with it if it is deleted)
- organization_id  copied from the ticket, so the policy needs no join
- author_id        the profile that wrote it (NULL if the account is deleted)
- author_name      the author's name when it was written
- author_type      client | support
- body             1 to 2000 characters

### Security
- RLS is on. Members of an organization READ the comments of its tickets, nothing else. No direct
  INSERT, UPDATE or DELETE for `anon` or `authenticated`.
- A client comments only through `add_support_ticket_comment(p_ticket_id, p_body)`
  (SECURITY DEFINER, `authenticated` only). It takes the organization and the author from the
  caller's own profile, never from the request; it refuses a ticket of another organization (as if
  it did not exist), a ticket that is resolved or cancelled, a bad body, and a flood (30 comments
  per author per hour). A comment also moves the ticket's `updated_at`.
- The support team answers with the service role (`author_type = 'support'`).
- The errors carry a PostgREST status (`PT404` not found, `PT409` ticket closed, `PT429` too many),
  so the API answers 404, 409 and 429 instead of a server error. The message keeps its code
  (`SUPPORT_TICKET_NOT_FOUND`, `SUPPORT_TICKET_CLOSED`, `SUPPORT_RATE_LIMITED`) for the front end.

## Other platform section
`platform_section` accepts "other" besides the four parts of the platform, for a problem that
belongs to none of them. `create_support_ticket` is replaced to accept it.
*/

-- 1. "other" platform section ---------------------------------------------------------------

ALTER TABLE public.support_tickets
  DROP CONSTRAINT IF EXISTS support_tickets_platform_section_check;
ALTER TABLE public.support_tickets
  ADD CONSTRAINT support_tickets_platform_section_check
  CHECK (platform_section IN (
    'campaign_creation', 'analytics', 'inventory', 'player_screen_editor', 'other'
  ));

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
       'campaign_creation', 'analytics', 'inventory', 'player_screen_editor', 'other') THEN
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
      USING ERRCODE = 'PT429';
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

-- 2. Comments --------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.support_ticket_comments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id       uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  author_id       uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  author_name     text NOT NULL DEFAULT '',
  author_type     text NOT NULL DEFAULT 'client'
                    CHECK (author_type IN ('client', 'support')),
  body            text NOT NULL
                    CHECK (char_length(btrim(body)) BETWEEN 1 AND 2000),
  created_at      timestamptz NOT NULL DEFAULT now()
);

-- A ticket's thread is read in order; the flood check counts an author's recent comments.
CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_ticket_created
  ON public.support_ticket_comments (ticket_id, created_at);
CREATE INDEX IF NOT EXISTS idx_support_ticket_comments_author_created
  ON public.support_ticket_comments (author_id, created_at DESC);

ALTER TABLE public.support_ticket_comments ENABLE ROW LEVEL SECURITY;

-- Default privileges give anon and authenticated everything on a new table: take it all back,
-- then give back the one thing that is allowed.
REVOKE ALL ON public.support_ticket_comments FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.support_ticket_comments TO authenticated;
GRANT ALL ON public.support_ticket_comments TO service_role;

DROP POLICY IF EXISTS "select_org_support_ticket_comments"
  ON public.support_ticket_comments;
CREATE POLICY "select_org_support_ticket_comments" ON public.support_ticket_comments
  FOR SELECT TO authenticated USING (public.is_org_member(organization_id));

-- Adds a comment of the caller to a ticket of the caller's own organization.
CREATE OR REPLACE FUNCTION public.add_support_ticket_comment(
  p_ticket_id uuid,
  p_body      text
)
RETURNS public.support_ticket_comments
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid     uuid := auth.uid();
  v_profile public.profiles%ROWTYPE;
  v_ticket  public.support_tickets%ROWTYPE;
  v_body    text := btrim(coalesce(p_body, ''));
  v_comment public.support_ticket_comments%ROWTYPE;
BEGIN
  IF v_uid IS NULL THEN
    RAISE EXCEPTION 'SUPPORT_UNAUTHENTICATED: sign in to contact support'
      USING ERRCODE = '28000';
  END IF;

  SELECT * INTO v_profile FROM public.profiles WHERE id = v_uid;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUPPORT_NO_ORGANIZATION: this account has no organization yet'
      USING ERRCODE = '42501';
  END IF;

  -- A ticket of another organization is answered exactly like one that does not exist.
  SELECT * INTO v_ticket
  FROM public.support_tickets
  WHERE id = p_ticket_id AND organization_id = v_profile.organization_id;
  IF NOT FOUND THEN
    RAISE EXCEPTION 'SUPPORT_TICKET_NOT_FOUND: no such ticket'
      USING ERRCODE = 'PT404';
  END IF;

  IF v_ticket.state IN ('resolved', 'cancelled') THEN
    RAISE EXCEPTION 'SUPPORT_TICKET_CLOSED: this ticket is closed'
      USING ERRCODE = 'PT409';
  END IF;

  IF char_length(v_body) < 1 OR char_length(v_body) > 2000 THEN
    RAISE EXCEPTION 'SUPPORT_INVALID_INPUT: the comment must have 1 to 2000 characters'
      USING ERRCODE = '22023';
  END IF;

  -- No flood: 30 comments per author and per hour.
  IF (SELECT count(*) FROM public.support_ticket_comments
      WHERE author_id = v_uid
        AND created_at > now() - interval '1 hour') >= 30 THEN
    RAISE EXCEPTION 'SUPPORT_RATE_LIMITED: too many comments in the last hour'
      USING ERRCODE = 'PT429';
  END IF;

  INSERT INTO public.support_ticket_comments (
    ticket_id, organization_id, author_id, author_name, author_type, body
  )
  VALUES (
    v_ticket.id, v_ticket.organization_id, v_uid, v_profile.full_name, 'client', v_body
  )
  RETURNING * INTO v_comment;

  -- The ticket shows it has news.
  UPDATE public.support_tickets SET updated_at = now() WHERE id = v_ticket.id;

  RETURN v_comment;
END;
$$;

REVOKE ALL ON FUNCTION public.add_support_ticket_comment(uuid, text)
  FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.add_support_ticket_comment(uuid, text)
  TO authenticated;
