-- Three new skill games: memory_match, catch_it, spot_difference.
--
-- 1. campaigns.game_type accepts them.
-- 2. json_number: a number read from JSON that never raises (a payload is client input).
-- 3. resolve_game_outcome judges them before any draw, like hit_it and quiz: a failed game
--    returns a losing outcome without drawing, a passed one draws with p_quiz_passed = true.
--    The client reports what the player did and how long it took; the server only accepts
--    numbers that are plausible for the campaign's own goal and time limit. Rules come from
--    game_logic_config: win_threshold (items / pairs / differences) and hit_it_duration_seconds,
--    the two numbers the Wizard writes for every skill game.
-- Idempotent: safe to run twice.

ALTER TABLE public.campaigns DROP CONSTRAINT IF EXISTS campaigns_game_type_check;
ALTER TABLE public.campaigns
  ADD CONSTRAINT campaigns_game_type_check
  CHECK (game_type IN (
    'lucky_wheel', 'quiz', 'scratch_card', 'mystery_box', 'hit_it',
    'memory_match', 'catch_it', 'spot_difference'
  ));

CREATE OR REPLACE FUNCTION public.json_number(
  p_json JSONB,
  p_key TEXT,
  p_default NUMERIC
)
RETURNS NUMERIC
LANGUAGE sql
IMMUTABLE
SET search_path = public
AS $$
  SELECT CASE
    WHEN jsonb_typeof(p_json -> p_key) = 'number' THEN (p_json ->> p_key)::NUMERIC
    WHEN jsonb_typeof(p_json -> p_key) = 'string'
         AND (p_json ->> p_key) ~ '^\s*-?[0-9]+(\.[0-9]+)?\s*$' THEN (p_json ->> p_key)::NUMERIC
    ELSE p_default
  END;
$$;

REVOKE ALL ON FUNCTION public.json_number(jsonb, text, numeric) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.json_number(jsonb, text, numeric) TO service_role;

CREATE OR REPLACE FUNCTION public.resolve_game_outcome(
  p_campaign_id UUID,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_campaign RECORD;
  v_game_type TEXT;
  v_config JSONB;
  v_draw_result JSONB;
  v_is_winner BOOLEAN;
  v_prize_id UUID;
  v_prize_template_id UUID;

  -- Quiz vars
  v_q RECORD;
  v_answers JSONB;
  v_total_qs INT := 0;
  v_correct_qs INT := 0;
  v_pass_threshold NUMERIC := 0;
  v_passed BOOLEAN := false;

  -- Wheel vars
  v_segments JSONB;
  v_seg JSONB;
  v_idx INT := 0;
  v_matching_indexes INT[] := ARRAY[]::INT[];
  v_selected_segment_index INT := -1;

  -- Mystery Box vars
  v_selected_box INT;
  v_boxes JSONB := '[]'::jsonb;

  -- Hit It vars
  v_hits INT := 0;
  v_win_threshold INT := 0;

  -- Memory Match, Catch It, Spot the Difference vars
  v_required INT := 0;
  v_score NUMERIC := 0;
  v_moves NUMERIC := 0;
  v_elapsed_ms NUMERIC := 0;
  v_duration_ms NUMERIC := 0;

  -- The losing outcome of a failed skill game: no draw, nothing claimed.
  v_lost CONSTANT JSONB := jsonb_build_object(
    'ok', true,
    'is_winner', false,
    'prize_id', null,
    'prize_name', null,
    'win_message', null
  );
BEGIN
  -- 1. Fetch Campaign
  SELECT id, game_type, game_logic_config, status, require_quiz
  INTO v_campaign
  FROM public.campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Campaign not found.');
  END IF;

  IF v_campaign.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Campaign is not active.');
  END IF;

  v_game_type := v_campaign.game_type;
  v_config := COALESCE(v_campaign.game_logic_config, '{}'::jsonb);

  -- 2. Game-Specific Pre-Draw Logic (scoring)
  IF v_game_type = 'quiz' THEN
    v_answers := COALESCE(p_payload->'answers', '{}'::jsonb);
    v_pass_threshold := COALESCE((v_config->>'pass_threshold_percentage')::NUMERIC, 100);

    FOR v_q IN SELECT id, correct_option_index FROM public.quiz_questions WHERE campaign_id = p_campaign_id AND is_active = true
    LOOP
      v_total_qs := v_total_qs + 1;
      IF (v_answers->>(v_q.id::TEXT)) IS NOT NULL AND (v_answers->>(v_q.id::TEXT))::INT = v_q.correct_option_index THEN
        v_correct_qs := v_correct_qs + 1;
      END IF;
    END LOOP;

    IF v_total_qs > 0 THEN
      v_score := (v_correct_qs::NUMERIC / v_total_qs::NUMERIC) * 100;
    END IF;

    v_passed := v_score >= v_pass_threshold;

    -- A failed quiz never draws.
    IF v_passed THEN
      v_draw_result := public.draw_and_claim_campaign_prize(p_campaign_id, true);
    ELSE
      v_draw_result := v_lost;
    END IF;
    v_draw_result := v_draw_result || jsonb_build_object('score', v_score, 'passed', v_passed);

  ELSIF v_game_type = 'hit_it' THEN
    v_hits := COALESCE((p_payload->>'hits')::INT, 0);
    v_win_threshold := COALESCE((v_config->>'win_threshold')::INT, 1);
    v_passed := v_hits >= v_win_threshold;

    -- Below the threshold never draws.
    IF v_passed THEN
      v_draw_result := public.draw_and_claim_campaign_prize(p_campaign_id, true);
    ELSE
      v_draw_result := v_lost;
    END IF;
    v_draw_result := v_draw_result || jsonb_build_object('hits', v_hits, 'passed', v_passed);

  ELSIF v_game_type = 'catch_it' THEN
    -- Items caught before the clock ran out. The engine ends the round at the goal, so the
    -- numbers are checked for plausibility: nobody catches faster than items can appear
    -- (one every 300 ms at the very least) nor after the time limit.
    v_win_threshold := GREATEST(1, public.json_number(v_config, 'win_threshold', 10))::INT;
    v_duration_ms := GREATEST(1, public.json_number(v_config, 'hit_it_duration_seconds', 20)) * 1000;
    v_score := public.json_number(p_payload, 'caught', 0);
    v_elapsed_ms := public.json_number(p_payload, 'elapsed_ms', 0);
    v_passed := v_score >= v_win_threshold
      AND v_score <= CEIL(v_duration_ms / 300) + 2
      AND v_elapsed_ms >= (v_win_threshold - 1) * 300
      AND v_elapsed_ms <= v_duration_ms + 3000;

    IF v_passed THEN
      v_draw_result := public.draw_and_claim_campaign_prize(p_campaign_id, true);
    ELSE
      v_draw_result := v_lost;
    END IF;
    v_draw_result := v_draw_result || jsonb_build_object('caught', v_score, 'passed', v_passed);

  ELSIF v_game_type = 'memory_match' THEN
    -- Every pair of the board found, in at least one move per pair, no faster than a card can be
    -- turned (600 ms per pair) and within the time limit.
    v_required := LEAST(8, GREATEST(3, ROUND(public.json_number(v_config, 'win_threshold', 6))))::INT;
    v_duration_ms := GREATEST(1, public.json_number(v_config, 'hit_it_duration_seconds', 45)) * 1000;
    v_score := public.json_number(p_payload, 'pairs_matched', 0);
    v_moves := public.json_number(p_payload, 'moves', 0);
    v_elapsed_ms := public.json_number(p_payload, 'elapsed_ms', 0);
    v_passed := v_score >= v_required
      AND v_moves >= v_required
      AND v_elapsed_ms >= v_required * 600
      AND v_elapsed_ms <= v_duration_ms + 3000;

    IF v_passed THEN
      v_draw_result := public.draw_and_claim_campaign_prize(p_campaign_id, true);
    ELSE
      v_draw_result := v_lost;
    END IF;
    v_draw_result := v_draw_result || jsonb_build_object('pairs_matched', v_score, 'passed', v_passed);

  ELSIF v_game_type = 'spot_difference' THEN
    -- Every difference found, no faster than 800 ms each and within the time limit (a wrong tap
    -- only takes time off the player's clock, never off the wall clock checked here).
    v_required := LEAST(8, GREATEST(3, ROUND(public.json_number(v_config, 'win_threshold', 5))))::INT;
    v_duration_ms := GREATEST(1, public.json_number(v_config, 'hit_it_duration_seconds', 45)) * 1000;
    v_score := public.json_number(p_payload, 'found', 0);
    v_elapsed_ms := public.json_number(p_payload, 'elapsed_ms', 0);
    v_passed := v_score >= v_required
      AND v_elapsed_ms >= v_required * 800
      AND v_elapsed_ms <= v_duration_ms + 3000;

    IF v_passed THEN
      v_draw_result := public.draw_and_claim_campaign_prize(p_campaign_id, true);
    ELSE
      v_draw_result := v_lost;
    END IF;
    v_draw_result := v_draw_result || jsonb_build_object('found', v_score, 'passed', v_passed);

  ELSE
    -- Scratch, Mystery Box, Lucky Wheel (no skill game, just the draw)
    v_draw_result := public.draw_and_claim_campaign_prize(p_campaign_id, true);
  END IF;

  -- Extract draw outcome
  v_is_winner := COALESCE((v_draw_result->>'is_winner')::BOOLEAN, false);
  IF v_draw_result->>'prize_id' IS NOT NULL THEN
    v_prize_id := (v_draw_result->>'prize_id')::UUID;
  END IF;

  -- 3. Game-Specific Post-Draw Visual Payload
  IF v_game_type = 'lucky_wheel' THEN
    v_segments := COALESCE(v_config->'segments', '[]'::jsonb);

    IF v_is_winner AND v_prize_id IS NOT NULL THEN
      SELECT prize_template_id INTO v_prize_template_id FROM public.prizes WHERE id = v_prize_id;

      v_idx := 0;
      FOR v_seg IN SELECT * FROM jsonb_array_elements(v_segments)
      LOOP
        IF (v_seg->>'prize_template_id') IS NOT NULL AND (v_seg->>'prize_template_id')::UUID = v_prize_template_id THEN
          v_matching_indexes := array_append(v_matching_indexes, v_idx);
        END IF;
        v_idx := v_idx + 1;
      END LOOP;
    ELSE
      v_idx := 0;
      FOR v_seg IN SELECT * FROM jsonb_array_elements(v_segments)
      LOOP
        IF (v_seg->>'prize_template_id') IS NULL THEN
          v_matching_indexes := array_append(v_matching_indexes, v_idx);
        END IF;
        v_idx := v_idx + 1;
      END LOOP;
    END IF;

    IF array_length(v_matching_indexes, 1) > 0 THEN
      v_selected_segment_index := v_matching_indexes[1 + floor(random() * array_length(v_matching_indexes, 1))];
    ELSE
      v_selected_segment_index := 0; -- Fallback
    END IF;

    v_draw_result := v_draw_result || jsonb_build_object('segment_index', v_selected_segment_index);

  ELSIF v_game_type = 'mystery_box' THEN
    v_selected_box := COALESCE((p_payload->>'selected_box_index')::INT, 0);

    FOR v_idx IN 0..2 LOOP
      IF v_idx = v_selected_box THEN
        v_boxes := v_boxes || jsonb_build_object(
          'index', v_idx,
          'content', CASE WHEN v_is_winner THEN 'win' ELSE 'lose' END,
          'prize', CASE WHEN v_is_winner THEN v_draw_result ELSE null END
        );
      ELSE
        v_boxes := v_boxes || jsonb_build_object(
          'index', v_idx,
          'content', 'lose'
        );
      END IF;
    END LOOP;

    v_draw_result := v_draw_result || jsonb_build_object('boxes', v_boxes);
  END IF;

  RETURN v_draw_result;
END;
$$;

-- Same rights as B1.1: select-prize (service_role) only.
REVOKE ALL ON FUNCTION public.resolve_game_outcome(uuid, jsonb) FROM PUBLIC, anon, authenticated;
GRANT EXECUTE ON FUNCTION public.resolve_game_outcome(uuid, jsonb) TO service_role;
