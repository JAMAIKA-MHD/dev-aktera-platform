-- Migration: 20261005130000_campaign_analytics_report_rpc.sql
-- Description: Report RPC for a single campaign. Returns everything the exported
-- campaign report needs in one payload: the full analytics dashboard
-- (get_campaign_dashboard_analytics), the owning organization, and the participant list.
--
-- Access: enforced by get_campaign_dashboard_analytics (caller must be a member of the
-- organization that owns the campaign), which runs before any other data is read.
-- The participant list is capped at the 5000 most recent entries; participants_total
-- always carries the real count so the report can say when it is truncated.

CREATE OR REPLACE FUNCTION public.get_campaign_analytics_report(
  p_campaign_id uuid,
  p_timezone text DEFAULT 'Africa/Algiers'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_participants_limit CONSTANT integer := 5000;
  v_analytics jsonb;
  v_tz text;
  v_organization jsonb;
  v_participants jsonb;
  v_participants_total bigint := 0;
BEGIN
  -- Raises when the caller has no access to this campaign.
  v_analytics := public.get_campaign_dashboard_analytics(p_campaign_id, p_timezone);
  v_tz := v_analytics ->> 'timezone';

  SELECT jsonb_build_object('id', o.id, 'name', o.name)
  INTO v_organization
  FROM public.campaigns c
  JOIN public.organizations o ON o.id = c.organization_id
  WHERE c.id = p_campaign_id;

  SELECT count(*)
  INTO v_participants_total
  FROM public.entries e
  WHERE e.campaign_id = p_campaign_id;

  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', r.id,
      'participant_name', r.participant_name,
      'phone_number', r.phone_number,
      'is_winner', r.is_winner,
      'prize_name', r.prize_name,
      'quiz_passed', r.quiz_passed,
      'redeemed_coupon_value', r.redeemed_coupon_value,
      'coupon_confirmed', r.coupon_confirmed,
      'dwell_time_seconds', r.dwell_time_seconds,
      'location', r.location,
      'submitted_at', to_char(r.created_at AT TIME ZONE v_tz, 'YYYY-MM-DD HH24:MI')
    )
    ORDER BY r.created_at DESC
  ), '[]'::jsonb)
  INTO v_participants
  FROM (
    SELECT
      e.id,
      e.participant_name,
      e.phone_number,
      e.is_winner,
      p.name AS prize_name,
      e.quiz_passed,
      e.redeemed_coupon_value,
      coalesce(e.coupon_confirmed, false) AS coupon_confirmed,
      coalesce(e.dwell_time_seconds, 0) AS dwell_time_seconds,
      coalesce(
        nullif(btrim(e.metadata ->> 'wilaya'), ''),
        nullif(btrim(e.metadata ->> 'ip_city'), '')
      ) AS location,
      e.created_at
    FROM public.entries e
    LEFT JOIN public.prizes p ON p.id = e.prize_id
    WHERE e.campaign_id = p_campaign_id
    ORDER BY e.created_at DESC
    LIMIT c_participants_limit
  ) r;

  RETURN jsonb_build_object(
    'generated_at', to_char(now() AT TIME ZONE v_tz, 'YYYY-MM-DD HH24:MI'),
    'organization', v_organization,
    'analytics', v_analytics,
    'participants', v_participants,
    'participants_total', v_participants_total,
    'participants_limit', c_participants_limit
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_campaign_analytics_report(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_campaign_analytics_report(uuid, text) TO authenticated, service_role;
