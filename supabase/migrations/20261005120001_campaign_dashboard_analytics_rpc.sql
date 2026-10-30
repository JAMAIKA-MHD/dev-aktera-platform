-- Migration: 20261005120000_campaign_dashboard_analytics_rpc.sql
-- Description: Per-campaign analytics dashboard RPC. Returns every metric shown on the
-- single-campaign analytics view in one JSON payload: total entries, participants over time,
-- average dwell time, win rate, OS distribution, completion rate, prize burn rate,
-- prize distribution over time, wilaya segmentation and time segmentation (hour of day / weekday).
--
-- Access: the caller must be a member of the organization that owns the campaign.
-- All time bucketing is done in p_timezone (defaults to Africa/Algiers).

CREATE OR REPLACE FUNCTION public.get_campaign_dashboard_analytics(
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
  v_campaign public.campaigns%ROWTYPE;
  v_tz text := 'Africa/Algiers';

  v_total_entries bigint := 0;
  v_total_wins bigint := 0;
  v_avg_dwell numeric;
  v_first_day date;
  v_last_day date;

  v_android bigint := 0;
  v_ios bigint := 0;
  v_desktop bigint := 0;
  v_other_os bigint := 0;

  v_total_impressions bigint := 0;
  v_completed_impressions bigint := 0;

  v_prize_quantity bigint := 0;
  v_prize_won bigint := 0;

  v_location_unknown bigint := 0;

  v_prizes_json jsonb;
  v_daily_json jsonb;
  v_prize_daily_json jsonb;
  v_location_json jsonb;
  v_hourly_json jsonb;
  v_weekday_json jsonb;
BEGIN
  SELECT * INTO v_campaign
  FROM public.campaigns
  WHERE id = p_campaign_id;

  -- Same error for "missing" and "not yours" so campaign ids cannot be probed.
  IF NOT FOUND OR NOT public.is_org_member(v_campaign.organization_id) THEN
    RAISE EXCEPTION 'You do not have access to analytics for this campaign.'
      USING ERRCODE = '42501';
  END IF;

  IF p_timezone IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN
    v_tz := p_timezone;
  END IF;

  -- Headline entry stats + OS split (classified from the participant's user agent)
  SELECT
    count(*),
    count(*) FILTER (WHERE e.is_winner),
    avg(e.dwell_time_seconds) FILTER (WHERE e.dwell_time_seconds > 0),
    min((e.created_at AT TIME ZONE v_tz)::date),
    max((e.created_at AT TIME ZONE v_tz)::date),
    count(*) FILTER (WHERE ua.os = 'android'),
    count(*) FILTER (WHERE ua.os = 'ios'),
    count(*) FILTER (WHERE ua.os = 'desktop'),
    count(*) FILTER (WHERE ua.os = 'other')
  INTO
    v_total_entries,
    v_total_wins,
    v_avg_dwell,
    v_first_day,
    v_last_day,
    v_android,
    v_ios,
    v_desktop,
    v_other_os
  FROM public.entries e
  CROSS JOIN LATERAL (
    SELECT CASE
      WHEN lower(coalesce(e.user_agent, '')) LIKE '%android%' THEN 'android'
      WHEN lower(coalesce(e.user_agent, '')) ~ '(iphone|ipad|ipod)' THEN 'ios'
      WHEN lower(coalesce(e.user_agent, '')) ~ '(windows|macintosh|linux|cros)' THEN 'desktop'
      ELSE 'other'
    END AS os
  ) ua
  WHERE e.campaign_id = p_campaign_id;

  -- Visitor funnel: sessions that opened the campaign vs sessions that submitted the form
  SELECT
    count(*),
    count(*) FILTER (WHERE ci.form_completed)
  INTO
    v_total_impressions,
    v_completed_impressions
  FROM public.campaign_impressions ci
  WHERE ci.campaign_id = p_campaign_id;

  -- Prize stock consumption
  SELECT
    coalesce(sum(p.quantity), 0),
    coalesce(sum(p.quantity_won), 0),
    coalesce(jsonb_agg(
      jsonb_build_object(
        'id', p.id,
        'name', p.name,
        'quantity', p.quantity,
        'quantity_won', p.quantity_won,
        'remaining', greatest(0, p.quantity - p.quantity_won),
        'burn_rate_percentage', CASE
          WHEN p.quantity > 0 THEN round((p.quantity_won::numeric / p.quantity::numeric) * 100, 1)
          ELSE NULL
        END
      )
      ORDER BY p.created_at, p.name
    ), '[]'::jsonb)
  INTO
    v_prize_quantity,
    v_prize_won,
    v_prizes_json
  FROM public.prizes p
  WHERE p.campaign_id = p_campaign_id;

  -- Participants over time: one row per calendar day between the first and last entry
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'date', to_char(d.day, 'YYYY-MM-DD'),
      'entries', coalesce(s.entries, 0),
      'winners', coalesce(s.winners, 0)
    )
    ORDER BY d.day
  ), '[]'::jsonb)
  INTO v_daily_json
  FROM (
    SELECT generate_series(v_first_day::timestamp, v_last_day::timestamp, interval '1 day')::date AS day
  ) d
  LEFT JOIN (
    SELECT
      (e.created_at AT TIME ZONE v_tz)::date AS day,
      count(*) AS entries,
      count(*) FILTER (WHERE e.is_winner) AS winners
    FROM public.entries e
    WHERE e.campaign_id = p_campaign_id
    GROUP BY 1
  ) s ON s.day = d.day;

  -- Prize distribution: prizes won per day, per prize (only days/prizes with wins)
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'date', to_char(w.day, 'YYYY-MM-DD'),
      'prize_id', w.prize_id,
      'prize_name', w.prize_name,
      'wins', w.wins
    )
    ORDER BY w.day, w.prize_name
  ), '[]'::jsonb)
  INTO v_prize_daily_json
  FROM (
    SELECT
      (e.created_at AT TIME ZONE v_tz)::date AS day,
      e.prize_id,
      coalesce(p.name, 'Removed prize') AS prize_name,
      count(*) AS wins
    FROM public.entries e
    LEFT JOIN public.prizes p ON p.id = e.prize_id
    WHERE e.campaign_id = p_campaign_id
      AND e.is_winner
    GROUP BY 1, 2, 3
  ) w;

  -- Wilaya segmentation: raw location label captured on the entry (wilaya, else city)
  SELECT
    coalesce(jsonb_agg(
      jsonb_build_object('location', l.location, 'count', l.cnt)
      ORDER BY l.cnt DESC, l.location
    ) FILTER (WHERE l.location IS NOT NULL), '[]'::jsonb),
    coalesce(sum(l.cnt) FILTER (WHERE l.location IS NULL), 0)
  INTO
    v_location_json,
    v_location_unknown
  FROM (
    SELECT
      coalesce(
        nullif(btrim(e.metadata ->> 'wilaya'), ''),
        nullif(btrim(e.metadata ->> 'ip_city'), '')
      ) AS location,
      count(*) AS cnt
    FROM public.entries e
    WHERE e.campaign_id = p_campaign_id
    GROUP BY 1
  ) l;

  -- Time segmentation: hour of day (0-23)
  SELECT jsonb_agg(
    jsonb_build_object(
      'hour', h.hour,
      'entries', coalesce(s.entries, 0),
      'winners', coalesce(s.winners, 0)
    )
    ORDER BY h.hour
  )
  INTO v_hourly_json
  FROM generate_series(0, 23) AS h(hour)
  LEFT JOIN (
    SELECT
      extract(hour FROM e.created_at AT TIME ZONE v_tz)::int AS hour,
      count(*) AS entries,
      count(*) FILTER (WHERE e.is_winner) AS winners
    FROM public.entries e
    WHERE e.campaign_id = p_campaign_id
    GROUP BY 1
  ) s ON s.hour = h.hour;

  -- Time segmentation: day of week (ISO, 1 = Monday ... 7 = Sunday)
  SELECT jsonb_agg(
    jsonb_build_object(
      'weekday', wd.weekday,
      'entries', coalesce(s.entries, 0),
      'winners', coalesce(s.winners, 0)
    )
    ORDER BY wd.weekday
  )
  INTO v_weekday_json
  FROM generate_series(1, 7) AS wd(weekday)
  LEFT JOIN (
    SELECT
      extract(isodow FROM e.created_at AT TIME ZONE v_tz)::int AS weekday,
      count(*) AS entries,
      count(*) FILTER (WHERE e.is_winner) AS winners
    FROM public.entries e
    WHERE e.campaign_id = p_campaign_id
    GROUP BY 1
  ) s ON s.weekday = wd.weekday;

  RETURN jsonb_build_object(
    'campaign', jsonb_build_object(
      'id', v_campaign.id,
      'name', v_campaign.name,
      'status', v_campaign.status,
      'start_date', v_campaign.start_date,
      'end_date', v_campaign.end_date
    ),
    'timezone', v_tz,
    'total_entries', v_total_entries,
    'total_wins', v_total_wins,
    'win_rate', CASE
      WHEN v_total_entries > 0 THEN round((v_total_wins::numeric / v_total_entries::numeric) * 100, 1)
      ELSE NULL
    END,
    'avg_dwell_time_seconds', round(v_avg_dwell, 1),
    'total_impressions', v_total_impressions,
    'completed_impressions', v_completed_impressions,
    'completion_rate', CASE
      WHEN v_total_impressions > 0 THEN round((v_completed_impressions::numeric / v_total_impressions::numeric) * 100, 1)
      ELSE NULL
    END,
    'prize_burn_rate', jsonb_build_object(
      'total_quantity', v_prize_quantity,
      'total_won', v_prize_won,
      'remaining', greatest(0, v_prize_quantity - v_prize_won),
      'percentage', CASE
        WHEN v_prize_quantity > 0 THEN round((v_prize_won::numeric / v_prize_quantity::numeric) * 100, 1)
        ELSE NULL
      END
    ),
    'prizes', v_prizes_json,
    'os_distribution', jsonb_build_object(
      'android', v_android,
      'ios', v_ios,
      'desktop', v_desktop,
      'other', v_other_os
    ),
    'participants_over_time', v_daily_json,
    'prize_distribution', v_prize_daily_json,
    'location_distribution', v_location_json,
    'location_unknown_count', v_location_unknown,
    'hourly_distribution', v_hourly_json,
    'weekday_distribution', v_weekday_json
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_campaign_dashboard_analytics(uuid, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.get_campaign_dashboard_analytics(uuid, text) TO authenticated, service_role;
