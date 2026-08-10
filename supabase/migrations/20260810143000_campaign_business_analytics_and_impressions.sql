/*
# Migration: 20260810143000_campaign_business_analytics_and_impressions.sql
# Description: Implements business-centric campaign analytics, visitor impressions, brand dwell time,
# OS distribution (Android vs iOS), form completion rate, and prize burn rate calculations in PostgreSQL.

## Overview for Teammates:
1. `campaign_impressions`: Tracks unique visitor sessions on `/play/:slug` links (WhatsApp blasts, QR codes, social ads).
2. `record_campaign_impression`: Public RPC allowing anonymous player portals to log impressions and brand dwell times safely.
3. `get_campaign_analytics_v2`: High-performance PostgreSQL RPC function that calculates all 7 B2B marketing metrics on the database server.
*/

-- 1. Create campaign_impressions table
CREATE TABLE IF NOT EXISTS public.campaign_impressions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id         uuid NOT NULL REFERENCES public.campaigns(id) ON DELETE CASCADE,
  organization_id     uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  session_id          text NOT NULL,
  user_agent          text,
  os_type             text NOT NULL DEFAULT 'other' CHECK (os_type IN ('android', 'ios', 'desktop', 'other')),
  ip_address          text,
  dwell_time_seconds  integer NOT NULL DEFAULT 0 CHECK (dwell_time_seconds >= 0),
  game_played         boolean NOT NULL DEFAULT false,
  form_completed      boolean NOT NULL DEFAULT false,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

-- Unique impression session per campaign
CREATE UNIQUE INDEX IF NOT EXISTS idx_campaign_impressions_unique_session
  ON public.campaign_impressions (campaign_id, session_id);

CREATE INDEX IF NOT EXISTS idx_campaign_impressions_campaign ON public.campaign_impressions (campaign_id);
CREATE INDEX IF NOT EXISTS idx_campaign_impressions_organization ON public.campaign_impressions (organization_id);
CREATE INDEX IF NOT EXISTS idx_campaign_impressions_created_at ON public.campaign_impressions (created_at DESC);

-- Enable RLS
ALTER TABLE public.campaign_impressions ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "Allow public insert to campaign_impressions"
  ON public.campaign_impressions FOR INSERT
  WITH CHECK (true);

CREATE POLICY "Allow public update to campaign_impressions by session"
  ON public.campaign_impressions FOR UPDATE
  USING (true);

CREATE POLICY "Allow authenticated org members to read campaign_impressions"
  ON public.campaign_impressions FOR SELECT
  USING (
    organization_id IN (
      SELECT organization_id FROM public.profiles WHERE id = auth.uid()
    )
  );

-- API grants
GRANT ALL ON TABLE public.campaign_impressions TO service_role;
GRANT SELECT, INSERT, UPDATE ON TABLE public.campaign_impressions TO anon, authenticated;

-- 2. Helper RPC for recording or updating player impressions
CREATE OR REPLACE FUNCTION public.record_campaign_impression(
  p_campaign_id uuid,
  p_session_id text,
  p_user_agent text DEFAULT NULL,
  p_ip_address text DEFAULT NULL,
  p_dwell_time_seconds integer DEFAULT 0,
  p_game_played boolean DEFAULT false,
  p_form_completed boolean DEFAULT false
)
RETURNS uuid
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_organization_id uuid;
  v_os_type text := 'other';
  v_impression_id uuid;
  v_ua text := lower(coalesce(p_user_agent, ''));
BEGIN
  -- Determine campaign tenant
  SELECT organization_id INTO v_organization_id
  FROM public.campaigns
  WHERE id = p_campaign_id;

  IF v_organization_id IS NULL THEN
    RAISE EXCEPTION 'Campaign not found.';
  END IF;

  -- Categorize OS from user agent string
  IF v_ua LIKE '%android%' THEN
    v_os_type := 'android';
  ELSIF v_ua LIKE '%iphone%' OR v_ua LIKE '%ipad%' OR v_ua LIKE '%ipod%' OR v_ua LIKE '%cpu os%' THEN
    v_os_type := 'ios';
  ELSIF v_ua LIKE '%windows%' OR v_ua LIKE '%macintosh%' OR v_ua LIKE '%mac os%' OR v_ua LIKE '%linux%' THEN
    v_os_type := 'desktop';
  ELSE
    v_os_type := 'other';
  END IF;

  -- Upsert impression record
  INSERT INTO public.campaign_impressions (
    campaign_id,
    organization_id,
    session_id,
    user_agent,
    os_type,
    ip_address,
    dwell_time_seconds,
    game_played,
    form_completed,
    updated_at
  ) VALUES (
    p_campaign_id,
    v_organization_id,
    p_session_id,
    p_user_agent,
    v_os_type,
    p_ip_address,
    greatest(0, p_dwell_time_seconds),
    p_game_played,
    p_form_completed,
    now()
  )
  ON CONFLICT (campaign_id, session_id) DO UPDATE SET
    dwell_time_seconds = greatest(public.campaign_impressions.dwell_time_seconds, EXCLUDED.dwell_time_seconds),
    game_played = public.campaign_impressions.game_played OR EXCLUDED.game_played,
    form_completed = public.campaign_impressions.form_completed OR EXCLUDED.form_completed,
    updated_at = now()
  RETURNING id INTO v_impression_id;

  RETURN v_impression_id;
END;
$$;

GRANT EXECUTE ON FUNCTION public.record_campaign_impression TO anon, authenticated, service_role;

-- 3. Comprehensive Business Analytics Engine RPC
CREATE OR REPLACE FUNCTION public.get_campaign_analytics_v2(
  p_organization_id uuid,
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
  v_carrier_json jsonb := '[]'::jsonb;

  v_mobilis_count bigint := 0;
  v_djezzy_count bigint := 0;
  v_ooredoo_count bigint := 0;
  v_other_carrier_count bigint := 0;
  v_total_phone_entries bigint := 0;
BEGIN
  -- Calculate impression counts and dwell times
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
  WHERE ci.organization_id = p_organization_id
    AND (p_campaign_id IS NULL OR ci.campaign_id = p_campaign_id);

  -- Calculate entry stats
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
  WHERE e.organization_id = p_organization_id
    AND (p_campaign_id IS NULL OR e.campaign_id = p_campaign_id);

  -- Fallback for impressions if migration is newly deployed
  IF v_total_impressions < v_total_entries THEN
    v_total_impressions := v_total_entries;
    v_unique_game_plays := v_total_entries;
  END IF;

  -- Compute Key Business Ratios
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

  -- Carrier phone prefix counts
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
  WHERE e.organization_id = p_organization_id
    AND (p_campaign_id IS NULL OR e.campaign_id = p_campaign_id)
    AND e.phone_number IS NOT NULL AND e.phone_number <> '';

  v_total_phone_entries := v_mobilis_count + v_djezzy_count + v_ooredoo_count + v_other_carrier_count;

  -- Build Prize Burn Rate list
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
  WHERE p.organization_id = p_organization_id
    AND (p_campaign_id IS NULL OR p.campaign_id = p_campaign_id)
    AND p.is_active = true;

  IF v_prizes_json IS NULL THEN
    v_prizes_json := '[]'::jsonb;
  END IF;

  -- Build Campaign Summary Breakdown
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
  WHERE c.organization_id = p_organization_id
    AND (p_campaign_id IS NULL OR c.id = p_campaign_id);

  IF v_by_campaign_json IS NULL THEN
    v_by_campaign_json := '[]'::jsonb;
  END IF;

  -- Build final JSON payload
  RETURN jsonb_build_object(
    'total_impressions', v_total_impressions,
    'total_entries', v_total_entries,
    'total_wins', v_total_wins,
    'game_play_rate', v_game_play_rate,
    'form_completion_rate', v_form_completion_rate,
    'win_rate', v_win_rate,
    'avg_dwell_time_seconds', round(v_avg_dwell_time, 1),
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
    'prize_burn_rate', v_prizes_json,
    'by_campaign', v_by_campaign_json
  );
END;
$$;

GRANT EXECUTE ON FUNCTION public.get_campaign_analytics_v2 TO authenticated, service_role;
