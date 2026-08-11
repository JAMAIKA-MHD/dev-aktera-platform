-- Migration: 20260811020000_fix_analytics_histogram_and_participants_rpc.sql
-- Description: Drop existing RPC functions to clear signature conflicts, add daily/hourly distribution aggregation to get_campaign_analytics_v2, add campaign_name to get_campaign_participants RPC, and ensure full database RLS permissions.

-- 0. Drop existing RPC functions to prevent PostgreSQL return signature conflicts
DROP FUNCTION IF EXISTS public.get_campaign_participants(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_campaign_participants();
DROP FUNCTION IF EXISTS public.get_campaign_analytics_v2(uuid, uuid);
DROP FUNCTION IF EXISTS public.get_campaign_analytics_v2();

-- Ensure public/authenticated roles have read permissions on core analytics tables
GRANT SELECT ON public.entries TO anon, authenticated, service_role;
GRANT SELECT ON public.campaigns TO anon, authenticated, service_role;
GRANT SELECT ON public.prizes TO anon, authenticated, service_role;
GRANT SELECT ON public.campaign_impressions TO anon, authenticated, service_role;

-- Fail-safe RLS SELECT policy for entries table
DROP POLICY IF EXISTS "select_entries_failsafe" ON public.entries;
CREATE POLICY "select_entries_failsafe" ON public.entries FOR SELECT
  TO anon, authenticated
  USING (true);

-- 1. Create get_campaign_participants with campaign_name & SECURITY DEFINER rights
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
  SELECT
    e.id,
    e.campaign_id,
    coalesce(c.name, 'Campaign') AS campaign_name,
    coalesce(e.phone_number, 'N/A') AS phone_number,
    e.participant_name,
    coalesce(e.is_winner, false) AS is_winner,
    p.name AS prize_name,
    e.quiz_passed,
    e.coupon_confirmed,
    e.redeemed_coupon_value,
    coalesce(e.dwell_time_seconds, 0)::numeric AS dwell_time_seconds,
    e.created_at
  FROM public.entries e
  LEFT JOIN public.campaigns c ON c.id = e.campaign_id
  LEFT JOIN public.prizes p ON p.id = e.prize_id
  WHERE (p_organization_id IS NULL OR e.organization_id = p_organization_id OR e.campaign_id IN (
    SELECT cmp.id FROM public.campaigns cmp WHERE cmp.organization_id = p_organization_id
  ))
  AND (p_campaign_id IS NULL OR e.campaign_id = p_campaign_id)
  ORDER BY e.created_at DESC;
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_participants(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_campaign_participants() TO anon, authenticated, service_role;

-- 2. Comprehensive Business Analytics Engine RPC with Daily & Hourly Distributions
CREATE OR REPLACE FUNCTION public.get_campaign_analytics_v2(
  p_organization_id uuid DEFAULT NULL,
  p_campaign_id uuid DEFAULT NULL
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_total_impressions bigint := 0;
  v_total_entries bigint := 0;
  v_total_wins bigint := 0;
  v_total_quizzes bigint := 0;
  v_passed_quizzes bigint := 0;
  v_total_coupons bigint := 0;
  v_confirmed_coupons bigint := 0;
  v_unique_game_plays bigint := 0;
  v_avg_dwell_time numeric := 0;

  v_game_play_rate numeric := 0;
  v_form_completion_rate numeric := 0;
  v_win_rate numeric := 0;
  v_quiz_pass_rate numeric := 0;
  v_coupon_confirm_rate numeric := 0;

  v_android_count bigint := 0;
  v_ios_count bigint := 0;
  v_desktop_count bigint := 0;
  v_other_os_count bigint := 0;

  v_prizes_json jsonb := '[]'::jsonb;
  v_by_campaign_json jsonb := '[]'::jsonb;
  v_daily_json jsonb := '[]'::jsonb;
  v_hourly_json jsonb := '[]'::jsonb;

  v_mobilis_count bigint := 0;
  v_djezzy_count bigint := 0;
  v_ooredoo_count bigint := 0;
  v_other_carrier_count bigint := 0;
  v_total_phone_entries bigint := 0;

  v_unique_users_count bigint := 0;
  v_repeat_users_count bigint := 0;
  v_avg_participations_per_user numeric := 0;
  v_max_user_participations bigint := 0;
BEGIN
  -- Impressions and OS count
  SELECT
    coalesce(count(*), 0),
    coalesce(count(*) FILTER (WHERE game_played OR form_completed), 0),
    coalesce(avg(dwell_time_seconds), 0),
    coalesce(count(*) FILTER (WHERE os_type = 'android'), 0),
    coalesce(count(*) FILTER (WHERE os_type = 'ios'), 0),
    coalesce(count(*) FILTER (WHERE os_type = 'desktop'), 0),
    coalesce(count(*) FILTER (WHERE os_type = 'other'), 0)
  INTO
    v_total_impressions,
    v_unique_game_plays,
    v_avg_dwell_time,
    v_android_count,
    v_ios_count,
    v_desktop_count,
    v_other_os_count
  FROM public.campaign_impressions ci
  WHERE (p_organization_id IS NULL OR ci.organization_id = p_organization_id OR ci.campaign_id IN (
    SELECT id FROM public.campaigns WHERE organization_id = p_organization_id
  ))
  AND (p_campaign_id IS NULL OR ci.campaign_id = p_campaign_id);

  -- Entry stats
  SELECT
    coalesce(count(*), 0),
    coalesce(count(*) FILTER (WHERE is_winner = true), 0),
    coalesce(count(*) FILTER (WHERE quiz_passed IS NOT NULL), 0),
    coalesce(count(*) FILTER (WHERE quiz_passed = true), 0),
    coalesce(count(*) FILTER (WHERE redeemed_coupon_value IS NOT NULL AND redeemed_coupon_value <> ''), 0),
    coalesce(count(*) FILTER (WHERE coupon_confirmed = true), 0)
  INTO
    v_total_entries,
    v_total_wins,
    v_total_quizzes,
    v_passed_quizzes,
    v_total_coupons,
    v_confirmed_coupons
  FROM public.entries e
  WHERE (p_organization_id IS NULL OR e.organization_id = p_organization_id OR e.campaign_id IN (
    SELECT id FROM public.campaigns WHERE organization_id = p_organization_id
  ))
  AND (p_campaign_id IS NULL OR e.campaign_id = p_campaign_id);

  -- Combined dwell time
  SELECT coalesce(avg(greatest(dwell_sec, 0)), 0)
  INTO v_avg_dwell_time
  FROM (
    SELECT dwell_time_seconds as dwell_sec
    FROM public.campaign_impressions
    WHERE (p_organization_id IS NULL OR organization_id = p_organization_id OR campaign_id IN (SELECT id FROM public.campaigns WHERE organization_id = p_organization_id))
      AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
      AND dwell_time_seconds > 0
    UNION ALL
    SELECT dwell_time_seconds as dwell_sec
    FROM public.entries
    WHERE (p_organization_id IS NULL OR organization_id = p_organization_id OR campaign_id IN (SELECT id FROM public.campaigns WHERE organization_id = p_organization_id))
      AND (p_campaign_id IS NULL OR campaign_id = p_campaign_id)
      AND dwell_time_seconds > 0
  ) dwell_combined;

  IF v_total_impressions < v_total_entries THEN
    v_total_impressions := v_total_entries;
    v_unique_game_plays := v_total_entries;
  END IF;

  -- Business ratios
  IF v_total_impressions > 0 THEN
    v_game_play_rate := round((v_unique_game_plays::numeric / v_total_impressions::numeric) * 100, 1);
  ELSE
    v_game_play_rate := 0;
  END IF;

  IF v_unique_game_plays > 0 THEN
    v_form_completion_rate := round((v_total_entries::numeric / v_unique_game_plays::numeric) * 100, 1);
  ELSIF v_total_impressions > 0 THEN
    v_form_completion_rate := round((v_total_entries::numeric / v_total_impressions::numeric) * 100, 1);
  ELSE
    v_form_completion_rate := 0;
  END IF;

  IF v_total_entries > 0 THEN
    v_win_rate := round((v_total_wins::numeric / v_total_entries::numeric) * 100, 1);
  ELSE
    v_win_rate := 0;
  END IF;

  IF v_total_quizzes > 0 THEN
    v_quiz_pass_rate := round((v_passed_quizzes::numeric / v_total_quizzes::numeric) * 100, 1);
  ELSE
    v_quiz_pass_rate := 0;
  END IF;

  IF v_total_coupons > 0 THEN
    v_coupon_confirm_rate := round((v_confirmed_coupons::numeric / v_total_coupons::numeric) * 100, 1);
  ELSE
    v_coupon_confirm_rate := 0;
  END IF;

  -- Fallback OS counts from entries
  IF (v_android_count + v_ios_count + v_desktop_count) = 0 THEN
    SELECT
      coalesce(count(*) FILTER (WHERE lower(e.user_agent) LIKE '%android%'), 0),
      coalesce(count(*) FILTER (WHERE lower(e.user_agent) LIKE '%iphone%' OR lower(e.user_agent) LIKE '%ipad%' OR lower(e.user_agent) LIKE '%mac os%'), 0),
      coalesce(count(*) FILTER (WHERE lower(e.user_agent) LIKE '%windows%' OR lower(e.user_agent) LIKE '%macintosh%' OR lower(e.user_agent) LIKE '%linux%'), 0),
      coalesce(count(*) FILTER (WHERE e.user_agent IS NOT NULL AND NOT (
        lower(e.user_agent) LIKE '%android%' OR
        lower(e.user_agent) LIKE '%iphone%' OR lower(e.user_agent) LIKE '%ipad%' OR lower(e.user_agent) LIKE '%mac os%' OR
        lower(e.user_agent) LIKE '%windows%' OR lower(e.user_agent) LIKE '%macintosh%' OR lower(e.user_agent) LIKE '%linux%'
      )), 0)
    INTO
      v_android_count,
      v_ios_count,
      v_desktop_count,
      v_other_os_count
    FROM public.entries e
    WHERE (p_organization_id IS NULL OR e.organization_id = p_organization_id OR e.campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id = p_organization_id
    ))
    AND (p_campaign_id IS NULL OR e.campaign_id = p_campaign_id);
  END IF;

  -- Carrier phone counts
  SELECT
    coalesce(count(*) FILTER (WHERE e.phone_number LIKE '06%' OR e.phone_number LIKE '2136%'), 0),
    coalesce(count(*) FILTER (WHERE e.phone_number LIKE '07%' OR e.phone_number LIKE '2137%'), 0),
    coalesce(count(*) FILTER (WHERE e.phone_number LIKE '05%' OR e.phone_number LIKE '2135%'), 0),
    coalesce(count(*) FILTER (WHERE NOT (
      e.phone_number LIKE '06%' OR e.phone_number LIKE '2136%' OR
      e.phone_number LIKE '07%' OR e.phone_number LIKE '2137%' OR
      e.phone_number LIKE '05%' OR e.phone_number LIKE '2135%'
    )), 0)
  INTO
    v_mobilis_count,
    v_djezzy_count,
    v_ooredoo_count,
    v_other_carrier_count
  FROM public.entries e
  WHERE (p_organization_id IS NULL OR e.organization_id = p_organization_id OR e.campaign_id IN (
    SELECT id FROM public.campaigns WHERE organization_id = p_organization_id
  ))
  AND (p_campaign_id IS NULL OR e.campaign_id = p_campaign_id);

  v_total_phone_entries := v_mobilis_count + v_djezzy_count + v_ooredoo_count + v_other_carrier_count;

  -- Repeat user statistics
  SELECT
    coalesce(count(DISTINCT user_stats.phone_number), 0),
    coalesce(count(*) FILTER (WHERE user_stats.cnt > 1), 0),
    coalesce(max(user_stats.cnt), 0)
  INTO
    v_unique_users_count,
    v_repeat_users_count,
    v_max_user_participations
  FROM (
    SELECT phone_number, count(*) as cnt
    FROM public.entries e2
    WHERE (p_organization_id IS NULL OR e2.organization_id = p_organization_id OR e2.campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id = p_organization_id
    ))
    AND (p_campaign_id IS NULL OR e2.campaign_id = p_campaign_id)
    AND phone_number IS NOT NULL AND phone_number <> ''
    GROUP BY phone_number
  ) user_stats;

  IF v_unique_users_count > 0 THEN
    v_avg_participations_per_user := round((v_total_entries::numeric / v_unique_users_count::numeric), 2);
  ELSE
    v_avg_participations_per_user := 0;
  END IF;

  -- Hourly distribution calculation
  SELECT jsonb_agg(
    jsonb_build_object(
      'hour', h_bucket.label,
      'label', h_bucket.label,
      'count', coalesce(h_stats.entry_count, 0),
      'winners', coalesce(h_stats.winner_count, 0)
    )
  ) INTO v_hourly_json
  FROM (
    VALUES
      (0, '00:00 - 04:00', 0, 4),
      (1, '04:00 - 08:00', 4, 8),
      (2, '08:00 - 12:00', 8, 12),
      (3, '12:00 - 16:00', 12, 16),
      (4, '16:00 - 20:00', 16, 20),
      (5, '20:00 - 24:00', 20, 24)
  ) AS h_bucket(idx, label, b_start, b_end)
  LEFT JOIN (
    SELECT
      floor(EXTRACT(HOUR FROM e.created_at) / 4)::int as bucket_idx,
      count(*) as entry_count,
      count(*) FILTER (WHERE e.is_winner = true) as winner_count
    FROM public.entries e
    WHERE (p_organization_id IS NULL OR e.organization_id = p_organization_id OR e.campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id = p_organization_id
    ))
    AND (p_campaign_id IS NULL OR e.campaign_id = p_campaign_id)
    GROUP BY floor(EXTRACT(HOUR FROM e.created_at) / 4)::int
  ) h_stats ON h_stats.bucket_idx = h_bucket.idx;

  -- Daily distribution calculation (last 14 days)
  SELECT jsonb_agg(
    jsonb_build_object(
      'date', to_char(d_series.d, 'Mon DD'),
      'entries', coalesce(d_stats.entry_count, 0),
      'winners', coalesce(d_stats.winner_count, 0)
    )
  ) INTO v_daily_json
  FROM (
    SELECT generate_series(
      (CURRENT_DATE - INTERVAL '13 days')::date,
      CURRENT_DATE::date,
      '1 day'::interval
    )::date AS d
  ) d_series
  LEFT JOIN (
    SELECT
      (e.created_at AT TIME ZONE 'UTC')::date as entry_date,
      count(*) as entry_count,
      count(*) FILTER (WHERE e.is_winner = true) as winner_count
    FROM public.entries e
    WHERE (p_organization_id IS NULL OR e.organization_id = p_organization_id OR e.campaign_id IN (
      SELECT id FROM public.campaigns WHERE organization_id = p_organization_id
    ))
    AND (p_campaign_id IS NULL OR e.campaign_id = p_campaign_id)
    GROUP BY (e.created_at AT TIME ZONE 'UTC')::date
  ) d_stats ON d_stats.entry_date = d_series.d;

  IF v_hourly_json IS NULL THEN v_hourly_json := '[]'::jsonb; END IF;
  IF v_daily_json IS NULL THEN v_daily_json := '[]'::jsonb; END IF;

  -- Prize Burn Rate list
  SELECT jsonb_agg(
    jsonb_build_object(
      'id', p.id,
      'name', p.name,
      'campaign_id', p.campaign_id,
      'quantity', p.quantity,
      'quantity_won', p.quantity_won,
      'remaining', greatest(0, p.quantity - p.quantity_won),
      'burn_rate_percentage', CASE
        WHEN p.quantity > 0 THEN round((p.quantity_won::numeric / p.quantity::numeric) * 100, 1)
        ELSE 0
      END
    )
  ) INTO v_prizes_json
  FROM public.prizes p
  WHERE (p_organization_id IS NULL OR p.organization_id = p_organization_id OR p.campaign_id IN (
    SELECT id FROM public.campaigns WHERE organization_id = p_organization_id
  ))
  AND (p_campaign_id IS NULL OR p.campaign_id = p_campaign_id)
  AND p.is_active = true;

  IF v_prizes_json IS NULL THEN v_prizes_json := '[]'::jsonb; END IF;

  -- Campaign Summary Breakdown
  SELECT jsonb_agg(
    jsonb_build_object(
      'campaign_id', c.id,
      'campaign_name', c.name,
      'status', c.status,
      'total_entries', coalesce(entry_stats.entries_count, 0),
      'total_winners', coalesce(entry_stats.winners_count, 0),
      'win_rate', CASE
        WHEN coalesce(entry_stats.entries_count, 0) > 0
        THEN round((coalesce(entry_stats.winners_count, 0)::numeric / entry_stats.entries_count::numeric) * 100, 1)
        ELSE 0
      END,
      'quiz_pass_rate', CASE
        WHEN coalesce(entry_stats.quiz_total, 0) > 0
        THEN round((coalesce(entry_stats.quiz_passed, 0)::numeric / entry_stats.quiz_total::numeric) * 100, 1)
        ELSE 0
      END,
      'coupon_confirmation_rate', CASE
        WHEN coalesce(entry_stats.coupon_total, 0) > 0
        THEN round((coalesce(entry_stats.coupon_confirmed, 0)::numeric / entry_stats.coupon_total::numeric) * 100, 1)
        ELSE 0
      END
    )
  ) INTO v_by_campaign_json
  FROM public.campaigns c
  LEFT JOIN (
    SELECT
      campaign_id,
      count(*) as entries_count,
      count(*) FILTER (WHERE is_winner = true) as winners_count,
      count(*) FILTER (WHERE quiz_passed IS NOT NULL) as quiz_total,
      count(*) FILTER (WHERE quiz_passed = true) as quiz_passed,
      count(*) FILTER (WHERE redeemed_coupon_value IS NOT NULL AND redeemed_coupon_value <> '') as coupon_total,
      count(*) FILTER (WHERE coupon_confirmed = true) as coupon_confirmed
    FROM public.entries
    GROUP BY campaign_id
  ) entry_stats ON entry_stats.campaign_id = c.id
  WHERE (p_organization_id IS NULL OR c.organization_id = p_organization_id);

  IF v_by_campaign_json IS NULL THEN v_by_campaign_json := '[]'::jsonb; END IF;

  -- Build final JSON payload
  RETURN jsonb_build_object(
    'total_impressions', v_total_impressions,
    'total_entries', v_total_entries,
    'total_wins', v_total_wins,
    'game_play_rate', v_game_play_rate,
    'form_completion_rate', v_form_completion_rate,
    'win_rate', v_win_rate,
    'avg_dwell_time_seconds', round(v_avg_dwell_time, 1),
    'unique_users_count', v_unique_users_count,
    'repeat_users_count', v_repeat_users_count,
    'avg_participations_per_user', v_avg_participations_per_user,
    'max_user_participations', v_max_user_participations,
    'quiz_pass_rate', v_quiz_pass_rate,
    'quiz_total', v_total_quizzes,
    'quiz_passed', v_passed_quizzes,
    'coupon_confirmation_rate', v_coupon_confirm_rate,
    'coupon_total', v_total_coupons,
    'coupon_confirmed', v_confirmed_coupons,
    'os_distribution', jsonb_build_object(
      'android', v_android_count,
      'ios', v_ios_count,
      'desktop', v_desktop_count,
      'other', v_other_os_count
    ),
    'carrier_distribution', jsonb_build_array(
      jsonb_build_object(
        'name', 'Mobilis (06)', 'code', 'mobilis', 'count', v_mobilis_count,
        'percentage', CASE WHEN v_total_phone_entries > 0 THEN round((v_mobilis_count::numeric / v_total_phone_entries::numeric) * 100, 1) ELSE 0 END,
        'color', '#059669'
      ),
      jsonb_build_object(
        'name', 'Djezzy (07)', 'code', 'djezzy', 'count', v_djezzy_count,
        'percentage', CASE WHEN v_total_phone_entries > 0 THEN round((v_djezzy_count::numeric / v_total_phone_entries::numeric) * 100, 1) ELSE 0 END,
        'color', '#DC2626'
      ),
      jsonb_build_object(
        'name', 'Ooredoo (05)', 'code', 'ooredoo', 'count', v_ooredoo_count,
        'percentage', CASE WHEN v_total_phone_entries > 0 THEN round((v_ooredoo_count::numeric / v_total_phone_entries::numeric) * 100, 1) ELSE 0 END,
        'color', '#2563EB'
      ),
      jsonb_build_object(
        'name', 'Other Networks', 'code', 'other', 'count', v_other_carrier_count,
        'percentage', CASE WHEN v_total_phone_entries > 0 THEN round((v_other_carrier_count::numeric / v_total_phone_entries::numeric) * 100, 1) ELSE 0 END,
        'color', '#64748B'
      )
    ),
    'hourly_distribution', v_hourly_json,
    'daily_distribution', v_daily_json,
    'prize_burn_rate', v_prizes_json,
    'by_campaign', v_by_campaign_json
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_analytics_v2(uuid, uuid) TO anon, authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_campaign_analytics_v2() TO anon, authenticated, service_role;
