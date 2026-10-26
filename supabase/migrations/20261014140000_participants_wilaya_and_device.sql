-- Migration: 20261014140000_participants_wilaya_and_device.sql
-- Description: get_campaign_participants also returns each player's wilaya and device, so
-- the players table can show and filter them.
--
--   * wilaya: the label captured on the entry (metadata.wilaya, else metadata.ip_city), the
--     same rule as the wilaya map of get_campaign_dashboard_analytics. Raw, may be null.
--   * os: android, ios, desktop or other, read from the user agent with the same rule as
--     the device chart.
--
-- Also: with p_campaign_id the rows are that campaign's only. The organization filter no
-- longer lets through entries without an organization; RLS still limits the rows to the
-- caller's organization (SECURITY INVOKER).
--
-- The returned columns change, so the function is dropped and created again. Grants: members
-- only, never anon.

DROP FUNCTION IF EXISTS public.get_campaign_participants(uuid, uuid);

CREATE FUNCTION public.get_campaign_participants(
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
  created_at timestamptz,
  wilaya text,
  os text
)
LANGUAGE plpgsql
STABLE
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
    e.created_at,
    coalesce(
      nullif(btrim(e.metadata ->> 'wilaya'), ''),
      nullif(btrim(e.metadata ->> 'ip_city'), '')
    )::text AS wilaya,
    (CASE
      WHEN lower(coalesce(e.user_agent, '')) LIKE '%android%' THEN 'android'
      WHEN lower(coalesce(e.user_agent, '')) ~ '(iphone|ipad|ipod)' THEN 'ios'
      WHEN lower(coalesce(e.user_agent, '')) ~ '(windows|macintosh|linux|cros)' THEN 'desktop'
      ELSE 'other'
    END)::text AS os
  FROM public.entries e
  LEFT JOIN public.campaigns c ON c.id = e.campaign_id
  LEFT JOIN public.prizes p ON p.id = e.prize_id
  WHERE (p_campaign_id IS NULL OR e.campaign_id = p_campaign_id)
    AND (
      p_organization_id IS NULL
      OR e.organization_id = p_organization_id
      OR c.organization_id = p_organization_id
    )
  ORDER BY e.created_at DESC;
END;
$$;

REVOKE ALL ON FUNCTION public.get_campaign_participants(uuid, uuid) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_campaign_participants(uuid, uuid) TO authenticated, service_role;
