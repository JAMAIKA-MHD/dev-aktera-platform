-- Migration: analytics participants come from real participations only.
--
-- get_campaign_participants used to pad its answer with one "Visitor Link Session" row per
-- page view whenever there was no entry yet, so a campaign nobody had played still showed
-- "participants". A visit is not a participation: the list is now the entries table only,
-- and a campaign without entries returns no rows.
--
-- Unchanged: the signature and the returned columns, SECURITY INVOKER (RLS limits the rows
-- to the caller's organization) and the grants (members only, never anon).

CREATE OR REPLACE FUNCTION public.get_campaign_participants(
  p_organization_id uuid DEFAULT NULL,
  p_campaign_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  campaign_id uuid,
  campaign_name text,
  phone_number text,
  participant_name text,
  is_winner boolean,
  prize_name text,
  quiz_passed boolean,
  coupon_confirmed boolean,
  redeemed_coupon_value text,
  dwell_time_seconds numeric,
  created_at timestamptz
)
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.campaign_id,
    coalesce(c.name, 'Campaign')::text AS campaign_name,
    coalesce(e.phone_number, 'N/A')::text AS phone_number,
    coalesce(e.participant_name, 'Anonymous Player')::text AS participant_name,
    coalesce(e.is_winner, false) AS is_winner,
    p.name::text AS prize_name,
    e.quiz_passed,
    e.coupon_confirmed,
    e.redeemed_coupon_value::text AS redeemed_coupon_value,
    coalesce(e.dwell_time_seconds, 0)::numeric AS dwell_time_seconds,
    e.created_at
  FROM public.entries e
  LEFT JOIN public.campaigns c ON c.id = e.campaign_id
  LEFT JOIN public.prizes p ON p.id = e.prize_id
  WHERE (p_campaign_id IS NULL OR e.campaign_id = p_campaign_id)
    AND (
      p_organization_id IS NULL
      OR e.organization_id = p_organization_id
      OR e.organization_id IS NULL
      OR e.campaign_id IN (SELECT cmp.id FROM public.campaigns cmp WHERE cmp.organization_id = p_organization_id)
    )
  ORDER BY e.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_campaign_participants(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_participants(uuid, uuid) TO authenticated, service_role;
