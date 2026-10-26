-- The template library of the Player Experience (src/features/player-experience/domain/templates.ts).
--
-- A brand picks the look of its player screens from a closed library in the Studio; the
-- choice is saved with the rest of the design, in campaign_experiences.config->'templateId'.
-- This migration makes the database hold that promise:
--   1. template_id, a generated column: the template of each design, readable without
--      parsing the JSON (the Studio's campaigns table shows it);
--   2. a CHECK on it: no design can name a template outside the library, whether it is
--      written through save_experience_config or straight into the table (RLS lets members);
--   3. save_experience_config answers INVALID for such a design, instead of raising.
-- A design saved before templates existed has no templateId: it reads as the classic one.
-- Adding a template to the library means adding it to the list below, in a new migration.
-- Idempotent: safe to run twice.

-- 1–2. Column and check ----------------------------------------------------------------------

ALTER TABLE public.campaign_experiences
  ADD COLUMN IF NOT EXISTS template_id text
  GENERATED ALWAYS AS (COALESCE(config->>'templateId', 'eight-slot')) STORED;

ALTER TABLE public.campaign_experiences
  DROP CONSTRAINT IF EXISTS campaign_experiences_template_id_check;
ALTER TABLE public.campaign_experiences
  ADD CONSTRAINT campaign_experiences_template_id_check CHECK (
    template_id IN ('eight-slot', 'comic-burst', 'pixel-quest', 'arcade-night', 'quiz-show')
  );

-- 3. save_experience_config ------------------------------------------------------------------

-- Same function as 20260929130000_add_campaign_experiences.sql, with the template check.
-- SECURITY INVOKER: the table's policies apply. Returns { ok: true, config } or
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
  -- Only a template of the library (same list as the table's check).
  IF COALESCE(p_config->>'templateId', 'eight-slot')
       NOT IN ('eight-slot', 'comic-burst', 'pixel-quest', 'arcade-night', 'quiz-show') THEN
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

-- Same grants as before: members save through it, never anonymous visitors.
REVOKE ALL ON FUNCTION public.save_experience_config(uuid, jsonb, text) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.save_experience_config(uuid, jsonb, text) TO authenticated, service_role;
