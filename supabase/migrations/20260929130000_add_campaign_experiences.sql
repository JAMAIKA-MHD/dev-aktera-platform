-- B1.2 — The Studio design of each campaign, and a safe public read for /play/:slug.
--
-- campaign_experiences holds one row per campaign: the whole Player Experience design
-- (ExperienceConfig, plain JSON), kept apart from the campaign rules. The campaigns table is
-- not modified, and the Wizard (which rewrites campaigns.player_screen_config on every save)
-- can never overwrite the design.
--
-- save_experience_config writes it with optimistic concurrency (members only).
-- get_public_experience gives players what they may see, and nothing else.
-- Idempotent: safe to run twice.

-- 1. Table ---------------------------------------------------------------------------------

CREATE TABLE IF NOT EXISTS public.campaign_experiences (
  campaign_id     uuid PRIMARY KEY REFERENCES public.campaigns(id) ON DELETE CASCADE,
  organization_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  config          jsonb NOT NULL CHECK (jsonb_typeof(config) = 'object'), -- ExperienceConfig
  updated_at      timestamptz NOT NULL DEFAULT now(),
  updated_by      uuid REFERENCES auth.users(id) ON DELETE SET NULL
);

CREATE INDEX IF NOT EXISTS idx_campaign_experiences_organization
  ON public.campaign_experiences (organization_id);

ALTER TABLE public.campaign_experiences ENABLE ROW LEVEL SECURITY;

-- 2. Policies: members of the organization only --------------------------------------------

-- On write, organization_id must also be the campaign's: a member of one organization can
-- never attach a design to a campaign of another one.
DROP POLICY IF EXISTS "select_org_campaign_experiences" ON public.campaign_experiences;
CREATE POLICY "select_org_campaign_experiences" ON public.campaign_experiences FOR SELECT
  TO authenticated USING (is_org_member(organization_id));

DROP POLICY IF EXISTS "insert_org_campaign_experiences" ON public.campaign_experiences;
CREATE POLICY "insert_org_campaign_experiences" ON public.campaign_experiences FOR INSERT
  TO authenticated WITH CHECK (
    is_org_member(organization_id)
    AND organization_id = (SELECT c.organization_id FROM public.campaigns c WHERE c.id = campaign_id)
  );

DROP POLICY IF EXISTS "update_org_campaign_experiences" ON public.campaign_experiences;
CREATE POLICY "update_org_campaign_experiences" ON public.campaign_experiences FOR UPDATE
  TO authenticated USING (is_org_member(organization_id))
  WITH CHECK (
    is_org_member(organization_id)
    AND organization_id = (SELECT c.organization_id FROM public.campaigns c WHERE c.id = campaign_id)
  );

DROP POLICY IF EXISTS "delete_org_campaign_experiences" ON public.campaign_experiences;
CREATE POLICY "delete_org_campaign_experiences" ON public.campaign_experiences FOR DELETE
  TO authenticated USING (is_org_member(organization_id));

-- No anon policy: players get the design through get_public_experience only. The default
-- privileges of 20260706091000 grant anon every new table: take that back as well.
REVOKE ALL ON TABLE public.campaign_experiences FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE ON TABLE public.campaign_experiences TO authenticated;
GRANT ALL ON TABLE public.campaign_experiences TO service_role;

-- 3. save_experience_config ----------------------------------------------------------------

-- SECURITY INVOKER: the policies above apply. Returns { ok: true, config } or
-- { ok: false, code: INVALID | TOO_LARGE | NOT_FOUND | CONFLICT }.
CREATE OR REPLACE FUNCTION public.save_experience_config(
  p_campaign_id uuid,
  p_config jsonb,
  p_expected_updated_at text DEFAULT NULL -- null = overwrite (import of a design)
)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY INVOKER
SET search_path = public
AS $$
DECLARE
  v_org uuid;
  v_now timestamptz := clock_timestamp();
  v_config jsonb;
  v_rows int;
BEGIN
  IF p_config IS NULL OR jsonb_typeof(p_config) <> 'object' THEN
    RETURN jsonb_build_object('ok', false, 'code', 'INVALID');
  END IF;
  -- ~2 MB: a design this large still embeds its images (data URLs).
  IF pg_column_size(p_config) > 2000000 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'TOO_LARGE');
  END IF;

  -- RLS on campaigns: only a member of the campaign's organization finds it.
  SELECT organization_id INTO v_org FROM public.campaigns WHERE id = p_campaign_id;
  IF v_org IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'code', 'NOT_FOUND');
  END IF;

  -- The server owns updatedAt and campaignId.
  v_config := p_config || jsonb_build_object(
    'updatedAt', to_char(v_now AT TIME ZONE 'UTC', 'YYYY-MM-DD"T"HH24:MI:SS.MS"Z"'),
    'campaignId', p_campaign_id::text);

  -- The first save creates the row; later saves only succeed on the expected version.
  INSERT INTO public.campaign_experiences AS ce
    (campaign_id, organization_id, config, updated_at, updated_by)
  VALUES (p_campaign_id, v_org, v_config, v_now, auth.uid())
  ON CONFLICT (campaign_id) DO UPDATE
    SET config = EXCLUDED.config,
        updated_at = EXCLUDED.updated_at,
        updated_by = EXCLUDED.updated_by
    WHERE p_expected_updated_at IS NULL
       OR ce.config->>'updatedAt' = p_expected_updated_at;
  GET DIAGNOSTICS v_rows = ROW_COUNT;

  IF v_rows = 0 THEN
    RETURN jsonb_build_object('ok', false, 'code', 'CONFLICT');
  END IF;
  RETURN jsonb_build_object('ok', true, 'config', v_config);
END;
$$;

REVOKE ALL ON FUNCTION public.save_experience_config(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_experience_config(uuid, jsonb, text) TO authenticated, service_role;

-- 4. get_public_experience -----------------------------------------------------------------

-- Public read for /play/:slug. SECURITY DEFINER because anon has no read policy on campaigns,
-- prizes, quiz_questions or campaign_experiences, and must not get one. It only returns
-- fields that are safe to show: never weights, quantities, win probability, entry limits,
-- correct answers, coupons or organization ids.
CREATE OR REPLACE FUNCTION public.get_public_experience(p_slug text)
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_c public.campaigns%ROWTYPE;
  v_reason text;
  v_allocated int;
  v_winners int;
BEGIN
  SELECT * INTO v_c FROM public.campaigns WHERE slug = p_slug;
  -- Drafts and archived campaigns are not published.
  IF NOT FOUND OR v_c.status IN ('draft', 'archived') THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  IF v_c.status <> 'active' OR now() NOT BETWEEN v_c.start_date AND v_c.end_date THEN
    v_reason := 'CLOSED';
  ELSE
    -- Same sold-out rule as select-prize (step 3).
    SELECT COALESCE(SUM(quantity), 0) INTO v_allocated
      FROM public.prizes WHERE campaign_id = v_c.id AND is_active;
    SELECT COUNT(*) INTO v_winners
      FROM public.entries WHERE campaign_id = v_c.id AND is_winner;
    IF v_allocated > 0 AND v_winners >= v_allocated THEN
      v_reason := 'SOLD_OUT';
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'found', true,
    'campaign', jsonb_build_object(
      'id', v_c.id,
      'slug', v_c.slug,
      'name', v_c.name,
      'game_type', v_c.game_type,
      'status', v_c.status,
      'rules', jsonb_build_object(
        'pass_threshold_percentage', v_c.game_logic_config->'pass_threshold_percentage',
        'quiz_seconds_per_question', v_c.game_logic_config->'quiz_seconds_per_question',
        'win_threshold', v_c.game_logic_config->'win_threshold',
        'hit_it_duration_seconds', v_c.game_logic_config->'hit_it_duration_seconds')),
    'prizes', COALESCE((
      SELECT jsonb_agg(
               jsonb_build_object('id', p.id, 'name', p.name, 'win_message', p.win_message)
               ORDER BY p.created_at, p.id)
        FROM public.prizes p
       WHERE p.campaign_id = v_c.id AND p.is_active), '[]'::jsonb),
    'quiz', COALESCE((
      SELECT jsonb_agg(
               jsonb_build_object('id', q.id, 'question', q.question, 'options', to_jsonb(q.options))
               ORDER BY q.position)
        FROM public.quiz_questions q
       WHERE q.campaign_id = v_c.id AND q.is_active), '[]'::jsonb),
    'availability', CASE
      WHEN v_reason IS NULL THEN jsonb_build_object('open', true)
      ELSE jsonb_build_object('open', false, 'reason', v_reason)
    END,
    -- null when the Studio was never opened for this campaign: the page uses the defaults.
    'experience', (SELECT ce.config FROM public.campaign_experiences ce WHERE ce.campaign_id = v_c.id));
END;
$$;

REVOKE ALL ON FUNCTION public.get_public_experience(text) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_public_experience(text) TO anon, authenticated, service_role;
