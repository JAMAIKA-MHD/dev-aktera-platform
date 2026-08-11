-- Migration: 20260810160000_get_campaign_participants_rpc.sql
-- Description: Create server-side SECURITY DEFINER RPC to return campaign participants securely across RLS boundaries.

CREATE OR REPLACE FUNCTION public.get_campaign_participants(
  p_organization_id uuid DEFAULT NULL,
  p_campaign_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  campaign_id uuid,
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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.campaign_id,
    coalesce(e.phone_number, 'N/A') AS phone_number,
    e.participant_name,
    coalesce(e.is_winner, false) AS is_winner,
    p.name AS prize_name,
    e.quiz_passed,
    e.coupon_confirmed,
    e.redeemed_coupon_value,
    coalesce(e.dwell_time_seconds, 0) AS dwell_time_seconds,
    e.created_at
  FROM public.entries e
  LEFT JOIN public.prizes p ON p.id = e.prize_id
  WHERE (p_organization_id IS NULL OR e.organization_id = p_organization_id OR e.campaign_id IN (
    SELECT c.id FROM public.campaigns c WHERE c.organization_id = p_organization_id
  ))
  AND (p_campaign_id IS NULL OR e.campaign_id = p_campaign_id)
  ORDER BY e.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_participants(uuid, uuid) TO anon, authenticated, service_role;
