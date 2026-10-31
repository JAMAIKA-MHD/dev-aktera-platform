-- Migration: 20261014120000_limit_active_campaigns.sql
-- Description: An organization can have at most 5 active campaigns at once.
--
-- A campaign takes a slot when it is published (status = 'active') and its end date has
-- not passed. A published campaign that has not started yet (shown as Scheduled) takes a
-- slot too: it will run without anyone saving it again, so the limit has to hold for it
-- when it is published. get_billing_usage_analytics counts the same campaigns.
--
-- The limit is enforced by a trigger on campaigns, so it holds for every write path: the
-- Wizard (save_campaign_full_in_place), the pause/resume toggle (a direct update), and
-- anything added later. The app shows the same number (src/lib/planAllowances.ts).

CREATE OR REPLACE FUNCTION public.enforce_active_campaign_limit()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_max_active_campaigns constant int := 5;
  v_others int;
BEGIN
  -- Only a row that takes a slot is checked.
  IF NEW.status IS DISTINCT FROM 'active' OR NEW.end_date < now() THEN
    RETURN NEW;
  END IF;

  -- A campaign that already held its slot keeps it when it is edited, so an organization
  -- that was over the limit before this migration can still edit its live campaigns.
  IF TG_OP = 'UPDATE'
     AND OLD.status = 'active'
     AND OLD.end_date >= now()
     AND OLD.organization_id = NEW.organization_id THEN
    RETURN NEW;
  END IF;

  -- Two campaigns activated at the same moment must not both see 4 others: activations
  -- of one organization wait for each other until the end of the transaction.
  PERFORM pg_advisory_xact_lock(
    hashtextextended('active_campaign_limit:' || NEW.organization_id::text, 0)
  );

  SELECT count(*) INTO v_others
  FROM public.campaigns c
  WHERE c.organization_id = NEW.organization_id
    AND c.status = 'active'
    AND c.end_date >= now()
    AND c.id <> NEW.id;

  IF v_others >= c_max_active_campaigns THEN
    RAISE EXCEPTION
      'You can have up to % active campaigns at once. Pause or end one before activating another.',
      c_max_active_campaigns
      USING ERRCODE = 'P0001', HINT = 'ACTIVE_CAMPAIGN_LIMIT';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_active_campaign_limit() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS campaigns_active_limit ON public.campaigns;
CREATE TRIGGER campaigns_active_limit
  BEFORE INSERT OR UPDATE OF status, end_date, organization_id ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_active_campaign_limit();
