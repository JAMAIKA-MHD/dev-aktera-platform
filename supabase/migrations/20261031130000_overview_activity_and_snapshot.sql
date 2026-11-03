-- Migration: 20261031130000_overview_activity_and_snapshot.sql
-- Description: what the Overview needs to show real data.
--   activity_log           the team's actions on campaigns and rewards. Written by the triggers
--                          below and, for team changes, by the team-members Edge Function.
--                          Members read their organization's log; nobody edits it.
--   get_overview_snapshot  participants, rewards claimed and redemption over the last days,
--                          compared with the days before, computed on every entry.

CREATE TABLE IF NOT EXISTS public.activity_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  actor_id        uuid REFERENCES public.profiles(id) ON DELETE SET NULL,
  actor_name      text NOT NULL,
  category        text NOT NULL CHECK (category IN ('campaign', 'reward', 'team')),
  verb            text NOT NULL,
  object_name     text NOT NULL,
  object_id       uuid,
  detail          text,
  created_at      timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_activity_log_org_created
  ON public.activity_log (organization_id, created_at DESC);

ALTER TABLE public.activity_log ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "select_org_activity" ON public.activity_log;
CREATE POLICY "select_org_activity" ON public.activity_log FOR SELECT
  TO authenticated USING (public.is_org_member(organization_id));

REVOKE ALL ON public.activity_log FROM PUBLIC, anon, authenticated;
GRANT SELECT ON public.activity_log TO authenticated;
GRANT SELECT, INSERT ON public.activity_log TO service_role;

-- The person behind the current request, or "System" for what the server does on its own.
CREATE OR REPLACE FUNCTION public.current_actor_name()
RETURNS text
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT COALESCE(
    (SELECT full_name FROM public.profiles WHERE id = auth.uid()),
    'System'
  );
$$;
REVOKE ALL ON FUNCTION public.current_actor_name() FROM PUBLIC, anon, authenticated;

CREATE OR REPLACE FUNCTION public.log_campaign_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verb text;
  v_detail text;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_verb := CASE WHEN NEW.status = 'active' THEN 'launched' ELSE 'created' END;
  ELSIF NEW.status IS DISTINCT FROM OLD.status THEN
    v_verb := CASE NEW.status
      WHEN 'active' THEN CASE WHEN OLD.status = 'paused' THEN 'resumed' ELSE 'launched' END
      WHEN 'paused' THEN 'paused'
      WHEN 'archived' THEN 'archived'
      WHEN 'ended' THEN 'ended'
      ELSE 'moved to draft'
    END;
    v_detail := 'Status: ' || OLD.status || ' → ' || NEW.status;
  ELSE
    RETURN NEW;
  END IF;

  INSERT INTO public.activity_log
    (organization_id, actor_id, actor_name, category, verb, object_name, object_id, detail)
  VALUES
    (NEW.organization_id, auth.uid(), public.current_actor_name(), 'campaign', v_verb,
     NEW.name, NEW.id, v_detail);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.log_campaign_activity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_log_campaign_activity ON public.campaigns;
CREATE TRIGGER trg_log_campaign_activity
  AFTER INSERT OR UPDATE OF status ON public.campaigns
  FOR EACH ROW EXECUTE FUNCTION public.log_campaign_activity();

CREATE OR REPLACE FUNCTION public.log_reward_activity()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_verb text := 'added';
  v_detail text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    IF NEW.stock_quantity IS NOT DISTINCT FROM OLD.stock_quantity THEN
      RETURN NEW;
    END IF;
    v_verb := 'changed the stock of';
    v_detail := 'Stock: ' || OLD.stock_quantity || ' → ' || NEW.stock_quantity;
  END IF;

  INSERT INTO public.activity_log
    (organization_id, actor_id, actor_name, category, verb, object_name, object_id, detail)
  VALUES
    (NEW.organization_id, auth.uid(), public.current_actor_name(), 'reward', v_verb,
     NEW.name, NEW.id, v_detail);
  RETURN NEW;
END;
$$;
REVOKE ALL ON FUNCTION public.log_reward_activity() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS trg_log_reward_activity ON public.prize_templates;
CREATE TRIGGER trg_log_reward_activity
  AFTER INSERT OR UPDATE OF stock_quantity ON public.prize_templates
  FOR EACH ROW EXECUTE FUNCTION public.log_reward_activity();

-- What already exists starts the log, once, so an active account does not open on nothing.
INSERT INTO public.activity_log
  (organization_id, actor_name, category, verb, object_name, object_id, created_at)
SELECT c.organization_id, 'System', 'campaign', 'created', c.name, c.id, c.created_at
FROM public.campaigns c
WHERE NOT EXISTS (SELECT 1 FROM public.activity_log a WHERE a.object_id = c.id);

INSERT INTO public.activity_log
  (organization_id, actor_name, category, verb, object_name, object_id, created_at)
SELECT t.organization_id, 'System', 'reward', 'added', t.name, t.id, t.created_at
FROM public.prize_templates t
WHERE NOT EXISTS (SELECT 1 FROM public.activity_log a WHERE a.object_id = t.id);

CREATE OR REPLACE FUNCTION public.get_overview_snapshot(
  p_organization_id uuid,
  p_days integer DEFAULT 7
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_tz constant text := 'Africa/Algiers';
  v_days integer := LEAST(GREATEST(COALESCE(p_days, 7), 1), 366);
  v_today date := (now() AT TIME ZONE c_tz)::date;
  v_from date := v_today - (v_days - 1);
  v_prev_from date := v_from - v_days;
  v_result jsonb;
BEGIN
  -- Same error for "missing" and "not yours" so organization ids cannot be probed.
  IF p_organization_id IS NULL OR NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'You do not have access to this organization.'
      USING ERRCODE = '42501';
  END IF;

  WITH scoped AS (
    SELECT
      (e.created_at AT TIME ZONE c_tz)::date AS day,
      e.is_winner,
      e.coupon_confirmed
    FROM public.entries e
    WHERE e.organization_id = p_organization_id
  ),
  days AS (
    SELECT generate_series(v_from, v_today, interval '1 day')::date AS day
  )
  SELECT jsonb_build_object(
    'days', v_days,
    'total_participants', (SELECT count(*) FROM scoped),
    'participants', count(*) FILTER (WHERE s.day >= v_from),
    'previous_participants', count(*) FILTER (WHERE s.day >= v_prev_from AND s.day < v_from),
    'claimed', count(*) FILTER (WHERE s.day >= v_from AND s.is_winner),
    'redeemed', count(*) FILTER (WHERE s.day >= v_from AND s.is_winner AND s.coupon_confirmed),
    'previous_claimed', count(*) FILTER (
      WHERE s.day >= v_prev_from AND s.day < v_from AND s.is_winner
    ),
    'previous_redeemed', count(*) FILTER (
      WHERE s.day >= v_prev_from AND s.day < v_from AND s.is_winner AND s.coupon_confirmed
    ),
    'available', (
      SELECT COALESCE(sum(t.stock_quantity), 0)
      FROM public.prize_templates t
      WHERE t.organization_id = p_organization_id
    ),
    'daily', (
      SELECT jsonb_agg(
        (SELECT count(*) FROM scoped x WHERE x.day = d.day) ORDER BY d.day
      )
      FROM days d
    )
  )
  INTO v_result
  FROM scoped s;

  RETURN v_result;
END;
$$;

REVOKE ALL ON FUNCTION public.get_overview_snapshot(uuid, integer) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_overview_snapshot(uuid, integer) TO authenticated;
