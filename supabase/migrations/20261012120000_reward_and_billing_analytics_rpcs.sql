-- Migration: 20261012120000_reward_and_billing_analytics_rpcs.sql
-- Description: The two RPCs behind the "Reward Analytics" and "Billing" sections of the
-- analytics page. Each returns every number of its section in one JSON payload, so the
-- browser never downloads raw rows to add them up.
--
--   * get_reward_analytics: where the reward stock stands, by type (physical gifts and
--     vouchers) and by reward, how fast it is being won and what will run out. Stock usage
--     day by day is get_reward_stock_usage.
--   * get_billing_usage_analytics: how much of the plan the organization uses (entries of
--     the calendar month, active campaigns), how that evolved month after month, which
--     campaigns consume it, and what was billed.
--
-- A unit of stock is in exactly one of three places:
--   won         already won by a player (prizes.quantity_won, every campaign);
--   reserved    committed to a draft, active or paused campaign and not won yet;
--   unallocated the rest: free to put in a campaign.
--
-- Access: the caller must be a member of p_organization_id.

CREATE OR REPLACE FUNCTION public.get_reward_analytics(
  p_organization_id uuid,
  p_from date DEFAULT NULL,
  p_to date DEFAULT NULL,
  p_timezone text DEFAULT 'Africa/Algiers'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  -- Stock risk: share of the stock left, and days of stock left at the last 7 days' pace.
  -- Same thresholds as get_program_analytics.
  c_burn_window_days constant int := 7;
  c_critical_remaining_pct constant numeric := 10;
  c_warning_remaining_pct constant numeric := 25;
  c_critical_days_left constant numeric := 3;
  c_warning_days_left constant numeric := 14;

  v_tz text := 'Africa/Algiers';
  v_from_ts timestamptz;
  v_to_ts timestamptz;

  v_totals_json jsonb;
  v_by_type_json jsonb;
  v_rewards_json jsonb;
BEGIN
  -- Same error for "missing" and "not yours" so organization ids cannot be probed.
  IF p_organization_id IS NULL OR NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'You do not have access to analytics for this organization.'
      USING ERRCODE = '42501';
  END IF;

  IF p_timezone IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN
    v_tz := p_timezone;
  END IF;

  v_from_ts := p_from::timestamp AT TIME ZONE v_tz;
  v_to_ts := (p_to + 1)::timestamp AT TIME ZONE v_tz;

  -- One row per reward of the organization, with or without stock.
  WITH allocation AS (
    SELECT
      p.prize_template_id,
      coalesce(sum(p.quantity_won), 0) AS won,
      coalesce(sum(greatest(0, p.quantity - p.quantity_won))
        FILTER (WHERE c.status IN ('draft', 'active', 'paused')), 0) AS reserved,
      count(DISTINCT p.campaign_id) FILTER (WHERE c.status = 'active') AS active_campaigns
    FROM public.prizes p
    JOIN public.campaigns c ON c.id = p.campaign_id
    WHERE p.organization_id = p_organization_id
    GROUP BY p.prize_template_id
  ),
  wins AS (
    SELECT
      p.prize_template_id,
      count(*) FILTER (
        WHERE (v_from_ts IS NULL OR e.created_at >= v_from_ts)
          AND (v_to_ts IS NULL OR e.created_at < v_to_ts)
      ) AS won_in_period,
      count(*) FILTER (
        WHERE e.created_at >= now() - make_interval(days => c_burn_window_days)
      ) AS recent_wins
    FROM public.entries e
    JOIN public.prizes p ON p.id = e.prize_id
    WHERE e.organization_id = p_organization_id
      AND e.is_winner
    GROUP BY p.prize_template_id
  ),
  -- Voucher codes typed or imported for the units in stock.
  codes AS (
    SELECT i.prize_template_id, count(*) AS loaded
    FROM public.prize_template_items i
    JOIN public.prize_templates t ON t.id = i.prize_template_id
    WHERE i.organization_id = p_organization_id
      AND nullif(btrim(i.item_value), '') IS NOT NULL
      AND i.item_index <= t.stock_quantity
    GROUP BY i.prize_template_id
  ),
  measured AS (
    SELECT
      pt.id,
      pt.name,
      CASE WHEN pt.category = 'physical' THEN 'physical' ELSE 'voucher' END AS category,
      pt.stock_quantity AS total,
      least(coalesce(a.won, 0), pt.stock_quantity) AS won,
      greatest(0, pt.stock_quantity - coalesce(a.won, 0)) AS remaining,
      least(
        coalesce(a.reserved, 0),
        greatest(0, pt.stock_quantity - coalesce(a.won, 0))
      ) AS reserved,
      coalesce(a.active_campaigns, 0) AS active_campaigns,
      coalesce(w.won_in_period, 0) AS won_in_period,
      coalesce(w.recent_wins, 0) AS recent_wins,
      coalesce(cd.loaded, 0) AS codes_loaded
    FROM public.prize_templates pt
    LEFT JOIN allocation a ON a.prize_template_id = pt.id
    LEFT JOIN wins w ON w.prize_template_id = pt.id
    LEFT JOIN codes cd ON cd.prize_template_id = pt.id
    WHERE pt.organization_id = p_organization_id
  ),
  paced AS (
    SELECT
      m.*,
      m.remaining - m.reserved AS unallocated,
      CASE
        WHEN m.total > 0 THEN round((m.remaining::numeric / m.total::numeric) * 100, 1)
        ELSE NULL
      END AS remaining_pct,
      CASE
        WHEN m.recent_wins > 0
        THEN round(m.remaining::numeric / (m.recent_wins::numeric / c_burn_window_days), 1)
        ELSE NULL
      END AS days_left,
      -- Vouchers need one code per unit; physical gifts need none.
      CASE
        WHEN m.category = 'voucher' THEN greatest(0, m.total - m.codes_loaded)
        ELSE 0
      END AS codes_missing
    FROM measured m
  ),
  scored AS (
    SELECT
      s.*,
      CASE
        WHEN s.total = 0 THEN NULL
        WHEN s.remaining = 0 THEN 'out'
        WHEN s.remaining_pct <= c_critical_remaining_pct OR s.days_left <= c_critical_days_left THEN 'critical'
        WHEN s.remaining_pct <= c_warning_remaining_pct OR s.days_left <= c_warning_days_left THEN 'warning'
        ELSE NULL
      END AS risk
    FROM paced s
  )
  SELECT
    jsonb_build_object(
      'rewards', count(*),
      'total_stock', coalesce(sum(s.total), 0),
      'won', coalesce(sum(s.won), 0),
      'reserved', coalesce(sum(s.reserved), 0),
      'unallocated', coalesce(sum(s.unallocated), 0),
      'remaining', coalesce(sum(s.remaining), 0),
      'won_in_period', coalesce(sum(s.won_in_period), 0),
      'at_risk', count(*) FILTER (WHERE s.risk IS NOT NULL),
      'out_of_stock', count(*) FILTER (WHERE s.risk = 'out'),
      'codes_missing', coalesce(sum(s.codes_missing), 0)
    ),
    (
      SELECT jsonb_agg(
        jsonb_build_object(
          'category', t.category,
          'rewards', coalesce(g.rewards, 0),
          'total_stock', coalesce(g.total, 0),
          'won', coalesce(g.won, 0),
          'reserved', coalesce(g.reserved, 0),
          'unallocated', coalesce(g.unallocated, 0),
          'remaining', coalesce(g.remaining, 0),
          'won_in_period', coalesce(g.won_in_period, 0),
          'at_risk', coalesce(g.at_risk, 0),
          'out_of_stock', coalesce(g.out_of_stock, 0),
          'codes_loaded', coalesce(g.codes_loaded, 0),
          'codes_missing', coalesce(g.codes_missing, 0)
        )
        ORDER BY t.ord
      )
      FROM (VALUES ('physical', 1), ('voucher', 2)) AS t(category, ord)
      LEFT JOIN (
        SELECT
          s2.category,
          count(*) AS rewards,
          sum(s2.total) AS total,
          sum(s2.won) AS won,
          sum(s2.reserved) AS reserved,
          sum(s2.unallocated) AS unallocated,
          sum(s2.remaining) AS remaining,
          sum(s2.won_in_period) AS won_in_period,
          count(*) FILTER (WHERE s2.risk IS NOT NULL) AS at_risk,
          count(*) FILTER (WHERE s2.risk = 'out') AS out_of_stock,
          sum(s2.codes_loaded) AS codes_loaded,
          sum(s2.codes_missing) AS codes_missing
        FROM scored s2
        GROUP BY s2.category
      ) g ON g.category = t.category
    ),
    coalesce(jsonb_agg(
      jsonb_build_object(
        'template_id', s.id,
        'name', s.name,
        'category', s.category,
        'risk', s.risk,
        'total_stock', s.total,
        'won', s.won,
        'reserved', s.reserved,
        'unallocated', s.unallocated,
        'remaining', s.remaining,
        'remaining_percentage', s.remaining_pct,
        'won_in_period', s.won_in_period,
        'wins_per_day', round(s.recent_wins::numeric / c_burn_window_days, 1),
        'days_left', s.days_left,
        'active_campaigns', s.active_campaigns,
        'codes_missing', s.codes_missing
      )
      ORDER BY
        array_position(ARRAY['out', 'critical', 'warning'], s.risk) NULLS LAST,
        s.days_left NULLS LAST,
        s.remaining_pct NULLS LAST,
        s.name
    ), '[]'::jsonb)
  INTO
    v_totals_json,
    v_by_type_json,
    v_rewards_json
  FROM scored s;

  RETURN jsonb_build_object(
    'timezone', v_tz,
    'period', jsonb_build_object('from', p_from, 'to', p_to),
    'totals', v_totals_json,
    'by_type', v_by_type_json,
    'rewards', v_rewards_json
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_reward_analytics(uuid, date, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_reward_analytics(uuid, date, date, text) TO authenticated, service_role;


-- Plan usage. The allowance of each plan lives in the app (src/lib/planAllowances.ts) and is
-- not enforced yet: this function only counts what was used.
CREATE OR REPLACE FUNCTION public.get_billing_usage_analytics(
  p_organization_id uuid,
  p_months int DEFAULT 12,
  p_timezone text DEFAULT 'Africa/Algiers'
)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  c_max_months constant int := 24;
  c_payments_limit constant int := 12;

  v_tz text := 'Africa/Algiers';
  v_months int;
  v_today date;
  v_month_first date;
  v_month_last date;
  v_month_start_ts timestamptz;
  v_history_first date;
  v_plan text;

  v_days_in_month int;
  v_days_elapsed int;
  v_entries_this_month bigint := 0;
  v_entries_last_month bigint := 0;
  v_active_campaigns bigint := 0;

  v_daily_json jsonb;
  v_monthly_json jsonb;
  v_campaigns_json jsonb;
  v_payments_json jsonb;
  v_subscription_json jsonb;
  v_total_paid numeric := 0;
BEGIN
  -- Same error for "missing" and "not yours" so organization ids cannot be probed.
  IF p_organization_id IS NULL OR NOT public.is_org_member(p_organization_id) THEN
    RAISE EXCEPTION 'You do not have access to analytics for this organization.'
      USING ERRCODE = '42501';
  END IF;

  IF p_timezone IS NOT NULL
     AND EXISTS (SELECT 1 FROM pg_timezone_names WHERE name = p_timezone) THEN
    v_tz := p_timezone;
  END IF;

  v_months := least(greatest(coalesce(p_months, 12), 1), c_max_months);
  v_today := (now() AT TIME ZONE v_tz)::date;
  v_month_first := date_trunc('month', v_today)::date;
  v_month_last := (v_month_first + interval '1 month' - interval '1 day')::date;
  v_month_start_ts := v_month_first::timestamp AT TIME ZONE v_tz;
  v_history_first := (v_month_first - make_interval(months => v_months - 1))::date;
  v_days_in_month := v_month_last - v_month_first + 1;
  v_days_elapsed := v_today - v_month_first + 1;

  SELECT o.plan INTO v_plan
  FROM public.organizations o
  WHERE o.id = p_organization_id;

  -- Campaigns that take a slot of the active-campaign limit (enforce_active_campaign_limit):
  -- published and not ended. A Scheduled campaign counts, it will run on its own; one whose
  -- end date has passed does not, select-prize already refuses its participations.
  SELECT count(*) INTO v_active_campaigns
  FROM public.campaigns c
  WHERE c.organization_id = p_organization_id
    AND c.status = 'active'
    AND c.end_date >= now();

  -- Entries per day of the current month. Days still to come have no value, so the chart
  -- stops today.
  WITH daily AS (
    SELECT (e.created_at AT TIME ZONE v_tz)::date AS day, count(*) AS entries
    FROM public.entries e
    WHERE e.organization_id = p_organization_id
      AND e.created_at >= v_month_start_ts
    GROUP BY 1
  ),
  days AS (
    SELECT
      d.day::date AS day,
      coalesce(dl.entries, 0) AS entries,
      sum(coalesce(dl.entries, 0)) OVER (ORDER BY d.day) AS cumulative
    FROM generate_series(v_month_first, v_month_last, interval '1 day') AS d(day)
    LEFT JOIN daily dl ON dl.day = d.day::date
  )
  SELECT
    jsonb_agg(
      jsonb_build_object(
        'date', to_char(x.day, 'YYYY-MM-DD'),
        'entries', CASE WHEN x.day <= v_today THEN x.entries ELSE NULL END,
        'cumulative', CASE WHEN x.day <= v_today THEN x.cumulative ELSE NULL END
      )
      ORDER BY x.day
    ),
    coalesce(max(x.cumulative) FILTER (WHERE x.day <= v_today), 0)
  INTO
    v_daily_json,
    v_entries_this_month
  FROM days x;

  -- Entries per calendar month, oldest first, months without entries included.
  SELECT jsonb_agg(
    jsonb_build_object(
      'month', to_char(m.month, 'YYYY-MM'),
      'entries', coalesce(s.entries, 0),
      'winners', coalesce(s.winners, 0),
      'campaigns', coalesce(s.campaigns, 0),
      'is_current', m.month::date = v_month_first
    )
    ORDER BY m.month
  )
  INTO v_monthly_json
  FROM generate_series(v_history_first, v_month_first, interval '1 month') AS m(month)
  LEFT JOIN (
    SELECT
      date_trunc('month', e.created_at AT TIME ZONE v_tz)::date AS month,
      count(*) AS entries,
      count(*) FILTER (WHERE e.is_winner) AS winners,
      count(DISTINCT e.campaign_id) AS campaigns
    FROM public.entries e
    WHERE e.organization_id = p_organization_id
      AND e.created_at >= v_history_first::timestamp AT TIME ZONE v_tz
    GROUP BY 1
  ) s ON s.month = m.month::date;

  SELECT count(*) INTO v_entries_last_month
  FROM public.entries e
  WHERE e.organization_id = p_organization_id
    AND e.created_at >= (v_month_first - interval '1 month')::timestamp AT TIME ZONE v_tz
    AND e.created_at < v_month_start_ts;

  -- Which campaigns used the allowance this month.
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'campaign_id', c.id,
      'campaign_name', c.name,
      'status', c.status,
      'entries', s.entries
    )
    ORDER BY s.entries DESC, c.name
  ), '[]'::jsonb)
  INTO v_campaigns_json
  FROM (
    SELECT e.campaign_id, count(*) AS entries
    FROM public.entries e
    WHERE e.organization_id = p_organization_id
      AND e.created_at >= v_month_start_ts
    GROUP BY e.campaign_id
  ) s
  JOIN public.campaigns c ON c.id = s.campaign_id;

  -- Billing records, most recent first.
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'id', b.id,
      'plan', b.plan,
      'billing_cycle', b.billing_cycle,
      'amount', b.amount,
      'status', b.status,
      'period_start', to_char(b.period_start AT TIME ZONE v_tz, 'YYYY-MM-DD'),
      'period_end', to_char(b.period_end AT TIME ZONE v_tz, 'YYYY-MM-DD')
    )
    ORDER BY b.period_start DESC, b.created_at DESC
  ), '[]'::jsonb)
  INTO v_payments_json
  FROM (
    SELECT *
    FROM public.billing b0
    WHERE b0.organization_id = p_organization_id
    ORDER BY b0.period_start DESC, b0.created_at DESC
    LIMIT c_payments_limit
  ) b;

  SELECT coalesce(sum(b.amount), 0) INTO v_total_paid
  FROM public.billing b
  WHERE b.organization_id = p_organization_id
    AND b.status = 'paid';

  -- The billing period running now; none when nothing is billed (free plan).
  SELECT jsonb_build_object(
    'plan', b.plan,
    'billing_cycle', b.billing_cycle,
    'amount', b.amount,
    'status', b.status,
    'period_start', to_char(b.period_start AT TIME ZONE v_tz, 'YYYY-MM-DD'),
    'period_end', to_char(b.period_end AT TIME ZONE v_tz, 'YYYY-MM-DD'),
    'days_left', greatest(0, (b.period_end AT TIME ZONE v_tz)::date - v_today)
  )
  INTO v_subscription_json
  FROM public.billing b
  WHERE b.organization_id = p_organization_id
    AND b.period_start <= now()
    AND b.period_end > now()
  ORDER BY b.period_start DESC, b.created_at DESC
  LIMIT 1;

  RETURN jsonb_build_object(
    'timezone', v_tz,
    'plan', coalesce(v_plan, 'free'),
    'current_month', jsonb_build_object(
      'month', to_char(v_month_first, 'YYYY-MM'),
      'today', to_char(v_today, 'YYYY-MM-DD'),
      'days_in_month', v_days_in_month,
      'days_elapsed', v_days_elapsed,
      'entries', v_entries_this_month,
      'entries_last_month', v_entries_last_month,
      -- This month's total if every remaining day goes like the average day so far.
      'projected_entries', round((v_entries_this_month::numeric / v_days_elapsed) * v_days_in_month),
      'active_campaigns', v_active_campaigns
    ),
    'daily_usage', v_daily_json,
    'monthly_usage', v_monthly_json,
    'usage_by_campaign', v_campaigns_json,
    'subscription', v_subscription_json,
    'payments', v_payments_json,
    'total_paid', v_total_paid
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_billing_usage_analytics(uuid, int, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_billing_usage_analytics(uuid, int, text) TO authenticated, service_role;
