-- Fix get_campaign_participants RPC character varying vs text type mismatch

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
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH all_entries AS (
    -- Player entries recorded in entries table
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

    UNION ALL

    -- Visitor impressions fallback if entries table has no rows for the target campaign
    SELECT
      ci.id,
      ci.campaign_id,
      coalesce(c.name, 'Campaign')::text AS campaign_name,
      'Visitor Link Session'::text AS phone_number,
      concat('Visitor (', upper(ci.os_type), ')')::text AS participant_name,
      false AS is_winner,
      NULL::text AS prize_name,
      ci.game_played AS quiz_passed,
      ci.form_completed AS coupon_confirmed,
      NULL::text AS redeemed_coupon_value,
      coalesce(ci.dwell_time_seconds, 0)::numeric AS dwell_time_seconds,
      ci.created_at
    FROM public.campaign_impressions ci
    LEFT JOIN public.campaigns c ON c.id = ci.campaign_id
    WHERE (p_campaign_id IS NULL OR ci.campaign_id = p_campaign_id)
      AND (
        p_organization_id IS NULL 
        OR ci.organization_id = p_organization_id 
        OR ci.organization_id IS NULL
        OR ci.campaign_id IN (SELECT cmp.id FROM public.campaigns cmp WHERE cmp.organization_id = p_organization_id)
      )
      AND NOT EXISTS (
        SELECT 1 FROM public.entries e2
        WHERE (p_campaign_id IS NULL OR e2.campaign_id = p_campaign_id)
      )
  )
  SELECT * FROM all_entries
  ORDER BY created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_participants(uuid, uuid) TO anon, authenticated, service_role;
