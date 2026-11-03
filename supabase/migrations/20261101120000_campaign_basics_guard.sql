-- Migration: 20261101120000_campaign_basics_guard.sql
-- Description: the rules the campaign wizard checks on a campaign's basics also hold on the
-- server. A campaign needs a name and a link, and it cannot end before it starts.
--
-- The rules sit in a trigger on campaigns, like campaigns_active_limit, so they hold for every
-- write path: the Wizard (save_campaign_full_in_place) and anything added later. Each message
-- is the wizard's own, and save_campaign_full_in_place passes it on to the window as it is.
-- Only a write to one of these columns is checked: an older row is left alone until then.

CREATE OR REPLACE FUNCTION public.enforce_campaign_basics()
RETURNS trigger
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  IF btrim(coalesce(NEW.name, '')) = '' THEN
    RAISE EXCEPTION 'Give the campaign a name.'
      USING ERRCODE = 'P0001', HINT = 'CAMPAIGN_NAME_REQUIRED';
  END IF;

  IF btrim(coalesce(NEW.slug, '')) = '' THEN
    RAISE EXCEPTION 'Choose the link players will open.'
      USING ERRCODE = 'P0001', HINT = 'CAMPAIGN_SLUG_REQUIRED';
  END IF;

  IF NEW.end_date < NEW.start_date THEN
    RAISE EXCEPTION 'The end date must be on or after the start date.'
      USING ERRCODE = 'P0001', HINT = 'CAMPAIGN_DATES_REVERSED';
  END IF;

  RETURN NEW;
END;
$$;

REVOKE ALL ON FUNCTION public.enforce_campaign_basics() FROM PUBLIC, anon, authenticated;

DROP TRIGGER IF EXISTS campaigns_basics_guard ON public.campaigns;
CREATE TRIGGER campaigns_basics_guard
  BEFORE INSERT OR UPDATE OF name, slug, start_date, end_date ON public.campaigns
  FOR EACH ROW
  EXECUTE FUNCTION public.enforce_campaign_basics();
