-- Migration: 20261014130000_reward_stock_usage_rpc.sql
-- Description: get_reward_stock_usage, behind the "Stock usage over time" chart of the
-- Reward Analytics section: how fast the reward stock has been used, day by day, for every
-- reward or for one type (physical gifts or vouchers).
--
-- Stock has no history table, so the stock left at the end of a past day is rebuilt from
-- today: what is left now plus every reward won after that day. "Left now" follows the same
-- rule as get_reward_analytics (stock_quantity minus the units won, never below 0), so the
-- last point of the chart is the "Left in stock" figure of the section.
--
-- Access: the caller must be a member of p_organization_id.

CREATE OR REPLACE FUNCTION public.get_reward_stock_usage(
  p_organization_id uuid,
  p_category text DEFAULT NULL,
  p_from date DEFAULT NULL,
  p_timezone text DEFAULT 'Africa/Algiers'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Pace used for the "days left" projection, as in get_reward_analytics.
  c_pace_window_days constant int := 7;
  -- Longest daily series returned when the period is open on the left.
  c_max_series_days constant int := 366;

  v_tz text := 'Africa/Algiers';
  v_today date;
  v_series_from date;
  v_series_from_ts timestamptz;
  v_days int;

  v_total_stock bigint := 0;
  v_physical_left bigint := 0;
  v_voucher_left bigint := 0;
  v_recent_used bigint := 0;

  v_daily_json jsonb;
  v_used_in_period bigint := 0;
  v_left_at_start bigint := 0;
BEGIN
  -- Same error for "missing" and "not yours" so organization ids cannot be probed.
  IF p_organization_id IS NULL OR NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'You do not have access to analytics for this organization.'
      USING ERRCODE = '42501';
  END IF;

  IF p_category IS NOT NULL AND p_category NOT IN ('physical', 'voucher') THEN
    RAISE EXCEPTION 'Unknown reward type: %. Use physical, voucher or null for all.', p_category
      USING ERRCODE = '22023';
  END IF;

  IF p_timezone IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN
    v_tz := p_timezone;
  END IF;

  v_today := (now() AT TIME ZONE v_tz)::date;

  -- Stock of the selected rewards now, per type.
  WITH won AS (
    SELECT p.prize_template_id, sum(p.quantity_won) AS won
    FROM public.prizes p
    WHERE p.organization_id = p_organization_id
    GROUP BY p.prize_template_id
  ),
  stock AS (
    SELECT
      CASE WHEN pt.category = 'physical' THEN 'physical' ELSE 'voucher' END AS category,
      pt.stock_quantity AS total,
      greatest(0, pt.stock_quantity - coalesce(w.won, 0)) AS remaining
    FROM public.prize_templates pt
    LEFT JOIN won w ON w.prize_template_id = pt.id
    WHERE pt.organization_id = p_organization_id
  )
  SELECT
    coalesce(sum(s.total), 0),
    coalesce(sum(s.remaining) FILTER (WHERE s.category = 'physical'), 0),
    coalesce(sum(s.remaining) FILTER (WHERE s.category = 'voucher'), 0)
  INTO v_total_stock, v_physical_left, v_voucher_left
  FROM stock s
  WHERE p_category IS NULL OR s.category = p_category;

  -- First day of the series: the period start, or the first reward of this scope ever won.
  v_series_from := p_from;
  IF v_series_from IS NULL THEN
    SELECT min((e.created_at AT TIME ZONE v_tz)::date)
    INTO v_series_from
    FROM public.entries e
    JOIN public.prizes p ON p.id = e.prize_id
    JOIN public.prize_templates pt ON pt.id = p.prize_template_id
    WHERE e.organization_id = p_organization_id
      AND e.is_winner
      AND (p_category IS NULL
           OR (CASE WHEN pt.category = 'physical' THEN 'physical' ELSE 'voucher' END) = p_category);
  END IF;
  v_series_from := least(
    greatest(coalesce(v_series_from, v_today), v_today - (c_max_series_days - 1)),
    v_today
  );
  v_series_from_ts := v_series_from::timestamp AT TIME ZONE v_tz;
  v_days := v_today - v_series_from + 1;

  -- Units used per day and per type over the series, then the stock left at the end of
  -- each day: left now + everything used after that day.
  WITH used AS (
    SELECT
      (e.created_at AT TIME ZONE v_tz)::date AS day,
      count(*) FILTER (WHERE pt.category = 'physical') AS physical,
      count(*) FILTER (WHERE pt.category <> 'physical') AS voucher
    FROM public.entries e
    JOIN public.prizes p ON p.id = e.prize_id
    JOIN public.prize_templates pt ON pt.id = p.prize_template_id
    WHERE e.organization_id = p_organization_id
      AND e.is_winner
      AND e.created_at >= v_series_from_ts
    GROUP BY 1
  ),
  days AS (
    SELECT
      d.day::date AS day,
      coalesce(u.physical, 0) AS physical_used,
      coalesce(u.voucher, 0) AS voucher_used,
      -- Used strictly after this day, up to now.
      coalesce(sum(u.physical) OVER later, 0) AS physical_after,
      coalesce(sum(u.voucher) OVER later, 0) AS voucher_after
    FROM generate_series(v_series_from, v_today, interval '1 day') AS d(day)
    LEFT JOIN used u ON u.day = d.day::date
    WINDOW later AS (ORDER BY d.day ROWS BETWEEN 1 FOLLOWING AND UNBOUNDED FOLLOWING)
  ),
  scoped AS (
    SELECT
      x.day,
      CASE WHEN p_category IS NULL OR p_category = 'physical' THEN x.physical_used END AS physical_used,
      CASE WHEN p_category IS NULL OR p_category = 'voucher' THEN x.voucher_used END AS voucher_used,
      CASE WHEN p_category IS NULL OR p_category = 'physical'
        THEN v_physical_left + x.physical_after END AS physical_left,
      CASE WHEN p_category IS NULL OR p_category = 'voucher'
        THEN v_voucher_left + x.voucher_after END AS voucher_left
    FROM days x
  )
  SELECT
    coalesce(jsonb_agg(
      jsonb_build_object(
        'date', to_char(s.day, 'YYYY-MM-DD'),
        'used', coalesce(s.physical_used, 0) + coalesce(s.voucher_used, 0),
        'remaining', least(v_total_stock, coalesce(s.physical_left, 0) + coalesce(s.voucher_left, 0)),
        'physical_used', s.physical_used,
        'voucher_used', s.voucher_used,
        'physical_remaining', s.physical_left,
        'voucher_remaining', s.voucher_left
      )
      ORDER BY s.day
    ), '[]'::jsonb),
    coalesce(sum(coalesce(s.physical_used, 0) + coalesce(s.voucher_used, 0)), 0),
    coalesce(sum(coalesce(s.physical_used, 0) + coalesce(s.voucher_used, 0))
      FILTER (WHERE s.day > v_today - c_pace_window_days), 0)
  INTO v_daily_json, v_used_in_period, v_recent_used
  FROM scoped s;

  -- Stock left when the period started: left now + everything used in the period.
  v_left_at_start := least(v_total_stock, v_physical_left + v_voucher_left + v_used_in_period);

  RETURN jsonb_build_object(
    'timezone', v_tz,
    'category', p_category,
    'period', jsonb_build_object('from', to_char(v_series_from, 'YYYY-MM-DD'), 'to', to_char(v_today, 'YYYY-MM-DD')),
    'summary', jsonb_build_object(
      'total_stock', v_total_stock,
      'remaining', v_physical_left + v_voucher_left,
      'remaining_at_start', v_left_at_start,
      'used_in_period', v_used_in_period,
      'used_percentage', CASE WHEN v_left_at_start > 0
        THEN round((v_used_in_period::numeric / v_left_at_start) * 100, 1) END,
      'used_per_day', round(v_used_in_period::numeric / v_days, 1),
      'recent_used_per_day', round(v_recent_used::numeric / c_pace_window_days, 1),
      'days_left', CASE WHEN v_recent_used > 0
        THEN round((v_physical_left + v_voucher_left)::numeric / (v_recent_used::numeric / c_pace_window_days), 1) END
    ),
    'daily', v_daily_json
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_reward_stock_usage(uuid, text, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_reward_stock_usage(uuid, text, date, text) TO authenticated, service_role;
