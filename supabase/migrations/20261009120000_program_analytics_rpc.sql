-- Migration: 20261009120000_program_analytics_rpc.sql
-- Description: Cross-campaign ("program") analytics RPC. Returns every number shown on the
-- "All campaigns" analytics view in one JSON payload, so the browser never downloads raw
-- entries to add them up:
--   * program totals: entries, prizes distributed, campaigns by lifecycle state;
--   * comparison: campaign leaderboard, performance by game mechanic, decay curve
--     (entries by day since each campaign's first entry);
--   * audience: unique audience, new vs returning participants, repeat participation rate;
--   * control: prize templates at risk of running out, plan usage counters;
--   * segmentation: wilaya, hour of day, weekday and device, across the program.
--
-- Period: p_from / p_to are calendar days in p_timezone, both inclusive; NULL leaves that side
-- open. The period filters entries and impressions. It does not filter what describes the
-- present (campaign states, stock risk, plan usage), nor the decay curve, which is relative
-- to each campaign's launch.
--
-- A participant is a phone number, normalized so 0541234567 and +213541234567 are one person.
-- Entries without a phone number count as entries but not as audience.
--
-- Access: the caller must be a member of p_organization_id.

CREATE OR REPLACE FUNCTION public.get_program_analytics(
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
  -- Decay curve: campaigns overlaid, and days shown after each one's first entry.
  c_decay_campaigns constant int := 8;
  c_decay_days constant int := 60;
  -- Stock risk: share of the stock left, and days of stock left at the last 7 days' pace.
  c_burn_window_days constant int := 7;
  c_critical_remaining_pct constant numeric := 10;
  c_warning_remaining_pct constant numeric := 25;
  c_critical_days_left constant numeric := 3;
  c_warning_days_left constant numeric := 14;

  v_tz text := 'Africa/Algiers';
  v_today date;
  v_from_ts timestamptz;
  v_to_ts timestamptz;
  v_month_start timestamptz;
  v_plan text;

  v_total_entries bigint := 0;
  v_total_prizes bigint := 0;
  v_total_impressions bigint := 0;
  v_completed_impressions bigint := 0;

  v_unique_audience bigint := 0;
  v_repeat_participants bigint := 0;
  v_new_participants bigint := 0;
  v_returning_participants bigint := 0;

  v_android bigint := 0;
  v_ios bigint := 0;
  v_desktop bigint := 0;
  v_other_os bigint := 0;
  v_location_unknown bigint := 0;

  v_entries_this_month bigint := 0;
  v_templates_tracked bigint := 0;

  v_status_json jsonb;
  v_leaderboard_json jsonb;
  v_mechanics_json jsonb;
  v_decay_json jsonb;
  v_stock_json jsonb;
  v_location_json jsonb;
  v_hourly_json jsonb;
  v_weekday_json jsonb;
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

  v_today := (now() AT TIME ZONE v_tz)::date;
  v_from_ts := p_from::timestamp AT TIME ZONE v_tz;
  v_to_ts := (p_to + 1)::timestamp AT TIME ZONE v_tz;
  v_month_start := date_trunc('month', now() AT TIME ZONE v_tz) AT TIME ZONE v_tz;

  SELECT o.plan INTO v_plan
  FROM public.organizations o
  WHERE o.id = p_organization_id;

  -- Campaigns by lifecycle state (as they are now)
  SELECT jsonb_build_object(
    'total', count(*),
    'active', count(*) FILTER (WHERE c.status = 'active'),
    'paused', count(*) FILTER (WHERE c.status = 'paused'),
    'draft', count(*) FILTER (WHERE c.status = 'draft'),
    'ended', count(*) FILTER (WHERE c.status = 'ended'),
    'archived', count(*) FILTER (WHERE c.status = 'archived')
  )
  INTO v_status_json
  FROM public.campaigns c
  WHERE c.organization_id = p_organization_id;

  -- Audience. A participant is "new" in the campaign of their first-ever entry and
  -- "returning" in every later campaign; the first entry is looked up over all time,
  -- then only the participations of the period are counted.
  WITH identified AS (
    SELECT
      e.campaign_id,
      e.created_at,
      first_value(e.campaign_id) OVER (
        PARTITION BY k.participant ORDER BY e.created_at, e.id
      ) AS first_campaign_id,
      k.participant
    FROM public.entries e
    CROSS JOIN LATERAL (
      SELECT nullif(regexp_replace(
        regexp_replace(coalesce(e.phone_number, ''), '\D', '', 'g'),
        '^(00213|213)', '0'
      ), '') AS participant
    ) k
    WHERE e.organization_id = p_organization_id
      AND k.participant IS NOT NULL
  ),
  participations AS (
    SELECT
      i.participant,
      i.campaign_id,
      bool_or(i.campaign_id = i.first_campaign_id) AS is_new
    FROM identified i
    WHERE (v_from_ts IS NULL OR i.created_at >= v_from_ts)
      AND (v_to_ts IS NULL OR i.created_at < v_to_ts)
    GROUP BY i.participant, i.campaign_id
  ),
  per_participant AS (
    SELECT p.participant, count(*) AS campaigns
    FROM participations p
    GROUP BY p.participant
  ),
  audience_by_campaign AS (
    SELECT
      p.campaign_id,
      count(*) FILTER (WHERE p.is_new) AS new_participants,
      count(*) FILTER (WHERE NOT p.is_new) AS returning_participants
    FROM participations p
    GROUP BY p.campaign_id
  ),
  -- Comparison: one row per campaign of the organization, played or not.
  entry_stats AS (
    SELECT
      e.campaign_id,
      count(*) AS entries,
      count(*) FILTER (WHERE e.is_winner) AS rewards
    FROM public.entries e
    WHERE e.organization_id = p_organization_id
      AND (v_from_ts IS NULL OR e.created_at >= v_from_ts)
      AND (v_to_ts IS NULL OR e.created_at < v_to_ts)
    GROUP BY e.campaign_id
  ),
  impression_stats AS (
    SELECT
      ci.campaign_id,
      count(*) AS impressions,
      count(*) FILTER (WHERE ci.form_completed) AS completed
    FROM public.campaign_impressions ci
    WHERE ci.organization_id = p_organization_id
      AND (v_from_ts IS NULL OR ci.created_at >= v_from_ts)
      AND (v_to_ts IS NULL OR ci.created_at < v_to_ts)
    GROUP BY ci.campaign_id
  ),
  campaign_stats AS (
    SELECT
      c.id,
      c.name,
      c.status,
      c.game_type,
      c.start_date,
      c.end_date,
      c.created_at,
      coalesce(es.entries, 0) AS entries,
      coalesce(es.rewards, 0) AS rewards,
      coalesce(ims.impressions, 0) AS impressions,
      coalesce(ims.completed, 0) AS completed,
      coalesce(a.new_participants, 0) AS new_participants,
      coalesce(a.returning_participants, 0) AS returning_participants
    FROM public.campaigns c
    LEFT JOIN entry_stats es ON es.campaign_id = c.id
    LEFT JOIN impression_stats ims ON ims.campaign_id = c.id
    LEFT JOIN audience_by_campaign a ON a.campaign_id = c.id
    WHERE c.organization_id = p_organization_id
  )
  SELECT
    (SELECT count(*) FROM per_participant),
    (SELECT count(*) FROM per_participant pp WHERE pp.campaigns >= 2),
    coalesce((SELECT sum(s.new_participants) FROM campaign_stats s), 0),
    coalesce((SELECT sum(s.returning_participants) FROM campaign_stats s), 0),
    coalesce((SELECT sum(s.entries) FROM campaign_stats s), 0),
    coalesce((SELECT sum(s.rewards) FROM campaign_stats s), 0),
    coalesce((SELECT sum(s.impressions) FROM campaign_stats s), 0),
    coalesce((SELECT sum(s.completed) FROM campaign_stats s), 0),
    coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'campaign_id', s.id,
          'campaign_name', s.name,
          'status', s.status,
          'game_type', s.game_type,
          'start_date', s.start_date,
          'end_date', s.end_date,
          'entries', s.entries,
          'rewards', s.rewards,
          'impressions', s.impressions,
          'completed_impressions', s.completed,
          'completion_rate', CASE
            WHEN s.impressions > 0 THEN round((s.completed::numeric / s.impressions::numeric) * 100, 1)
            ELSE NULL
          END,
          'new_participants', s.new_participants,
          'returning_participants', s.returning_participants
        )
        ORDER BY s.entries DESC, s.created_at DESC, s.name
      )
      FROM campaign_stats s
    ), '[]'::jsonb),
    coalesce((
      SELECT jsonb_agg(
        jsonb_build_object(
          'game_type', m.game_type,
          'campaigns', m.campaigns,
          'entries', m.entries,
          'rewards', m.rewards,
          'impressions', m.impressions,
          'completed_impressions', m.completed,
          'completion_rate', CASE
            WHEN m.impressions > 0 THEN round((m.completed::numeric / m.impressions::numeric) * 100, 1)
            ELSE NULL
          END
        )
        ORDER BY m.entries DESC, m.game_type
      )
      FROM (
        SELECT
          s.game_type,
          count(*) AS campaigns,
          sum(s.entries) AS entries,
          sum(s.rewards) AS rewards,
          sum(s.impressions) AS impressions,
          sum(s.completed) AS completed
        FROM campaign_stats s
        GROUP BY s.game_type
      ) m
    ), '[]'::jsonb)
  INTO
    v_unique_audience,
    v_repeat_participants,
    v_new_participants,
    v_returning_participants,
    v_total_entries,
    v_total_prizes,
    v_total_impressions,
    v_completed_impressions,
    v_leaderboard_json,
    v_mechanics_json;

  -- Decay curve: for the most played campaigns of the period, entries per day counted from
  -- the day of their first entry (index 0), up to today or the campaign's end.
  WITH top_campaigns AS (
    SELECT c.id, c.name, c.end_date, s.entries
    FROM public.campaigns c
    JOIN (
      SELECT e.campaign_id, count(*) AS entries
      FROM public.entries e
      WHERE e.organization_id = p_organization_id
        AND (v_from_ts IS NULL OR e.created_at >= v_from_ts)
        AND (v_to_ts IS NULL OR e.created_at < v_to_ts)
      GROUP BY e.campaign_id
    ) s ON s.campaign_id = c.id
    WHERE c.organization_id = p_organization_id
    ORDER BY s.entries DESC, c.created_at DESC
    LIMIT c_decay_campaigns
  ),
  daily AS (
    SELECT
      e.campaign_id,
      (e.created_at AT TIME ZONE v_tz)::date AS day,
      count(*) AS entries
    FROM public.entries e
    WHERE e.campaign_id IN (SELECT t.id FROM top_campaigns t)
    GROUP BY 1, 2
  ),
  lifespans AS (
    SELECT
      t.id,
      t.name,
      t.entries,
      b.first_day,
      greatest(b.last_day, least(v_today, (t.end_date AT TIME ZONE v_tz)::date)) AS last_day
    FROM top_campaigns t
    JOIN (
      SELECT d.campaign_id, min(d.day) AS first_day, max(d.day) AS last_day
      FROM daily d
      GROUP BY d.campaign_id
    ) b ON b.campaign_id = t.id
  )
  SELECT coalesce(jsonb_agg(
    jsonb_build_object(
      'campaign_id', l.id,
      'campaign_name', l.name,
      'launch_date', to_char(l.first_day, 'YYYY-MM-DD'),
      'entries', l.entries,
      'points', pts.points
    )
    ORDER BY l.entries DESC, l.name
  ), '[]'::jsonb)
  INTO v_decay_json
  FROM lifespans l
  CROSS JOIN LATERAL (
    SELECT jsonb_agg(coalesce(d.entries, 0) ORDER BY g.n) AS points
    FROM generate_series(0, least(c_decay_days - 1, l.last_day - l.first_day)) AS g(n)
    LEFT JOIN daily d ON d.campaign_id = l.id AND d.day = l.first_day + g.n
  ) pts;

  -- Stock risk: templates whose stock is low, or burning fast enough to run out soon.
  WITH template_stock AS (
    SELECT
      pt.id,
      pt.name,
      pt.category,
      pt.stock_quantity AS total,
      coalesce(sum(p.quantity_won), 0) AS won,
      count(DISTINCT p.campaign_id) FILTER (WHERE c.status = 'active') AS active_campaigns
    FROM public.prize_templates pt
    LEFT JOIN public.prizes p ON p.prize_template_id = pt.id
    LEFT JOIN public.campaigns c ON c.id = p.campaign_id
    WHERE pt.organization_id = p_organization_id
      AND pt.stock_quantity > 0
    GROUP BY pt.id
  ),
  recent_wins AS (
    SELECT p.prize_template_id, count(*) AS wins
    FROM public.entries e
    JOIN public.prizes p ON p.id = e.prize_id
    WHERE e.organization_id = p_organization_id
      AND e.is_winner
      AND e.created_at >= now() - make_interval(days => c_burn_window_days)
    GROUP BY p.prize_template_id
  ),
  measured AS (
    SELECT
      t.*,
      greatest(0, t.total - t.won) AS remaining,
      round((greatest(0, t.total - t.won)::numeric / t.total::numeric) * 100, 1) AS remaining_pct,
      coalesce(r.wins, 0) AS recent_wins,
      CASE
        WHEN coalesce(r.wins, 0) > 0
        THEN round(greatest(0, t.total - t.won)::numeric / (r.wins::numeric / c_burn_window_days), 1)
        ELSE NULL
      END AS days_left
    FROM template_stock t
    LEFT JOIN recent_wins r ON r.prize_template_id = t.id
  ),
  scored AS (
    SELECT
      m.*,
      CASE
        WHEN m.remaining = 0 THEN 'out'
        WHEN m.remaining_pct <= c_critical_remaining_pct OR m.days_left <= c_critical_days_left THEN 'critical'
        WHEN m.remaining_pct <= c_warning_remaining_pct OR m.days_left <= c_warning_days_left THEN 'warning'
        ELSE NULL
      END AS risk
    FROM measured m
  )
  SELECT
    count(*),
    coalesce(jsonb_agg(
      jsonb_build_object(
        'template_id', s.id,
        'name', s.name,
        'category', s.category,
        'risk', s.risk,
        'total_stock', s.total,
        'won', s.won,
        'remaining', s.remaining,
        'remaining_percentage', s.remaining_pct,
        'burn_rate_percentage', round(100 - s.remaining_pct, 1),
        'wins_per_day', round(s.recent_wins::numeric / c_burn_window_days, 1),
        'days_left', s.days_left,
        'active_campaigns', s.active_campaigns
      )
      ORDER BY
        array_position(ARRAY['out', 'critical', 'warning'], s.risk),
        s.days_left NULLS LAST,
        s.remaining_pct,
        s.name
    ) FILTER (WHERE s.risk IS NOT NULL), '[]'::jsonb)
  INTO
    v_templates_tracked,
    v_stock_json
  FROM scored s;

  -- Plan usage counters (the allowance itself is not enforced yet)
  SELECT count(*)
  INTO v_entries_this_month
  FROM public.entries e
  WHERE e.organization_id = p_organization_id
    AND e.created_at >= v_month_start;

  -- Device segmentation (classified from the participant's user agent)
  SELECT
    count(*) FILTER (WHERE ua.os = 'android'),
    count(*) FILTER (WHERE ua.os = 'ios'),
    count(*) FILTER (WHERE ua.os = 'desktop'),
    count(*) FILTER (WHERE ua.os = 'other')
  INTO
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
  WHERE e.organization_id = p_organization_id
    AND (v_from_ts IS NULL OR e.created_at >= v_from_ts)
    AND (v_to_ts IS NULL OR e.created_at < v_to_ts);

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
    WHERE e.organization_id = p_organization_id
      AND (v_from_ts IS NULL OR e.created_at >= v_from_ts)
      AND (v_to_ts IS NULL OR e.created_at < v_to_ts)
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
    WHERE e.organization_id = p_organization_id
      AND (v_from_ts IS NULL OR e.created_at >= v_from_ts)
      AND (v_to_ts IS NULL OR e.created_at < v_to_ts)
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
    WHERE e.organization_id = p_organization_id
      AND (v_from_ts IS NULL OR e.created_at >= v_from_ts)
      AND (v_to_ts IS NULL OR e.created_at < v_to_ts)
    GROUP BY 1
  ) s ON s.weekday = wd.weekday;

  RETURN jsonb_build_object(
    'timezone', v_tz,
    'period', jsonb_build_object('from', p_from, 'to', p_to),
    'totals', jsonb_build_object(
      'entries', v_total_entries,
      'prizes_distributed', v_total_prizes,
      'impressions', v_total_impressions,
      'completed_impressions', v_completed_impressions,
      'completion_rate', CASE
        WHEN v_total_impressions > 0 THEN round((v_completed_impressions::numeric / v_total_impressions::numeric) * 100, 1)
        ELSE NULL
      END
    ),
    'campaign_status', v_status_json,
    'leaderboard', v_leaderboard_json,
    'mechanics', v_mechanics_json,
    'decay_curve', v_decay_json,
    'audience', jsonb_build_object(
      'unique_audience', v_unique_audience,
      'new_participants', v_new_participants,
      'returning_participants', v_returning_participants,
      'repeat_participants', v_repeat_participants,
      'repeat_participation_rate', CASE
        WHEN v_unique_audience > 0 THEN round((v_repeat_participants::numeric / v_unique_audience::numeric) * 100, 1)
        ELSE NULL
      END
    ),
    'stock_risk', v_stock_json,
    'stock_templates_tracked', v_templates_tracked,
    'plan_usage', jsonb_build_object(
      'plan', coalesce(v_plan, 'free'),
      'entries_this_month', v_entries_this_month,
      'active_campaigns', coalesce((v_status_json ->> 'active')::bigint, 0)
    ),
    'os_distribution', jsonb_build_object(
      'android', v_android,
      'ios', v_ios,
      'desktop', v_desktop,
      'other', v_other_os
    ),
    'location_distribution', v_location_json,
    'location_unknown_count', v_location_unknown,
    'hourly_distribution', v_hourly_json,
    'weekday_distribution', v_weekday_json
  );
END;
$$;

REVOKE ALL ON FUNCTION public.get_program_analytics(uuid, date, date, text) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_program_analytics(uuid, date, date, text) TO authenticated, service_role;
