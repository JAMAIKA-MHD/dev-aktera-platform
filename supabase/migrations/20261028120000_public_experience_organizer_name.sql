-- get_public_experience also returns the organizer's name (campaign.organization_name), so a
-- campaign whose design was never saved in the Studio still shows its brand in the player
-- page's header instead of an empty capsule. The name is public already: it is printed in the
-- page's footer and in the rules. Nothing else changes: same safe fields, same grants.
--
-- Deployment: the front reads the field as optional, so it can ship before or after this.

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
  v_organizer text;
BEGIN
  SELECT * INTO v_c FROM public.campaigns WHERE slug = p_slug;
  -- Drafts and archived campaigns are not published.
  IF NOT FOUND OR v_c.status IN ('draft', 'archived') THEN
    RETURN jsonb_build_object('found', false);
  END IF;

  -- The organizer's name only: players already read it in the footer ("Organisé par …").
  SELECT o.name INTO v_organizer FROM public.organizations o WHERE o.id = v_c.organization_id;

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
      'organization_name', v_organizer,
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
