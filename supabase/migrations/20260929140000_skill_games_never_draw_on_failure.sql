-- B1.3 — Skill games (quiz, Hit It) never draw a prize after a failed game.
--
-- resolve_game_outcome scored the game, then always called draw_and_claim_campaign_prize with
-- the result. That function only honours a failure when the campaign has require_quiz = true,
-- which is set for some quiz campaigns only: a Hit It player below win_threshold, or a quiz
-- player below the pass threshold, could still win and consume stock.
--
-- Fix: a failed skill game returns a losing outcome without drawing. A passed one draws with
-- p_quiz_passed = true, so the require_quiz gate can never block it. Everything else is
-- unchanged (wheel segment, mystery boxes, response shape). Same rule as the Studio's demo
-- draw engine (src/features/player-experience/services/local/demoDrawEngine.ts).
-- Idempotent: safe to run twice.

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
  v_score NUMERIC := 0;
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
