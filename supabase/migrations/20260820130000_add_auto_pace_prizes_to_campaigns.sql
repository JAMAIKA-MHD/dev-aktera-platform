-- Migration: add_auto_pace_prizes_to_campaigns & atomic draw RPC
-- Supports auto-paced daily voucher distribution and self-correcting daily quotas in Algeria timezone (Africa/Algiers)

-- 1. Add auto-pacing columns to campaigns
ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS auto_pace_prizes boolean NOT NULL DEFAULT false;

ALTER TABLE public.campaigns
ADD COLUMN IF NOT EXISTS auto_pace_enabled_at timestamptz NULL;

-- 2. Update save_campaign_full_in_place RPC with auto_pace_prizes support
CREATE OR REPLACE FUNCTION save_campaign_full_in_place(
  p_campaign_id UUID,
  p_organization_id UUID,
  p_name TEXT,
  p_slug TEXT,
  p_arabic_name TEXT DEFAULT NULL,
  p_hero_image_url TEXT DEFAULT NULL,
  p_description TEXT DEFAULT NULL,
  p_status TEXT DEFAULT 'active',
  p_start_date TIMESTAMPTZ DEFAULT now(),
  p_end_date TIMESTAMPTZ DEFAULT (now() + interval '30 days'),
  p_win_probability NUMERIC DEFAULT 0.60,
  p_max_entries INTEGER DEFAULT 1,
  p_require_quiz BOOLEAN DEFAULT false,
  p_prizes JSONB DEFAULT '[]'::jsonb,
  p_questions JSONB DEFAULT '[]'::jsonb,
  p_auto_pace_prizes BOOLEAN DEFAULT false
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_errors JSONB := '[]'::jsonb;
  v_target_campaign_id UUID := p_campaign_id;
  v_prize_elem JSONB;
  v_template_id UUID;
  v_req_qty INT;
  v_req_weight NUMERIC;
  v_template_record RECORD;
  v_other_allocated INT;
  v_max_available INT;
  v_existing_prize RECORD;
  v_new_prize_id UUID;
  v_total_weight NUMERIC := 0;
  v_retained_prize_ids UUID[] := ARRAY[]::UUID[];
  v_q_elem JSONB;
  v_q_id_text TEXT;
  v_q_id UUID;
  v_retained_q_ids UUID[] := ARRAY[]::UUID[];
  v_q_idx INT := 1;
  v_has_quiz_answers BOOLEAN := false;
  v_current_auto_pace BOOLEAN := false;
  v_auto_pace_enabled_at TIMESTAMPTZ := NULL;
BEGIN
  -- 1. Slug Uniqueness Check
  IF EXISTS (
    SELECT 1 FROM campaigns
    WHERE organization_id = p_organization_id
      AND slug = p_slug
      AND (p_campaign_id IS NULL OR id <> p_campaign_id)
  ) THEN
    v_errors := v_errors || jsonb_build_object(
      'field', 'slug',
      'message', 'The campaign portal slug "' || p_slug || '" is already in use by another campaign. Please choose a unique slug.'
    );
  END IF;

  -- 2. Prizes Array Validation
  IF jsonb_array_length(p_prizes) = 0 THEN
    v_errors := v_errors || jsonb_build_object(
      'field', 'prizes',
      'message', 'At least one reward allocation is required before saving this campaign.'
    );
  END IF;

  -- 3. Live Stock & Floor Constraints Check for Each Prize
  FOR v_prize_elem IN SELECT * FROM jsonb_array_elements(p_prizes)
  LOOP
    v_template_id := (v_prize_elem->>'template_id')::UUID;
    v_req_qty := COALESCE((v_prize_elem->>'quantity')::INT, 0);
    v_req_weight := COALESCE((v_prize_elem->>'weight')::NUMERIC, 0);
    v_total_weight := v_total_weight + v_req_weight;

    IF v_req_qty <= 0 THEN
      v_errors := v_errors || jsonb_build_object(
        'field', 'prizes',
        'message', 'Reward quantity must be at least 1 unit.'
      );
    END IF;

    -- Fetch template from database
    SELECT id, name, stock_quantity, category
    INTO v_template_record
    FROM prize_templates
    WHERE id = v_template_id AND organization_id = p_organization_id;

    IF NOT FOUND THEN
      v_errors := v_errors || jsonb_build_object(
        'field', 'prizes',
        'message', 'Selected reward template (' || v_template_id || ') is no longer available in inventory.'
      );
    ELSE
      -- Calculate total allocation from other active campaigns
      SELECT COALESCE(SUM(quantity), 0)
      INTO v_other_allocated
      FROM prizes
      WHERE prize_template_id = v_template_id
        AND is_active = true
        AND (p_campaign_id IS NULL OR campaign_id <> p_campaign_id);

      v_max_available := GREATEST(0, COALESCE(v_template_record.stock_quantity, 100) - v_other_allocated);

      IF v_req_qty > v_max_available THEN
        v_errors := v_errors || jsonb_build_object(
          'field', 'prizes',
          'message', 'Requested allocation (' || v_req_qty || ') for "' || v_template_record.name || '" exceeds available inventory stock (' || v_max_available || '). Total stock pool: ' || v_template_record.stock_quantity
        );
      END IF;

      -- Live quantity_won Floor Check on In-Place Edit
      IF p_campaign_id IS NOT NULL THEN
        SELECT id, quantity, quantity_won
        INTO v_existing_prize
        FROM prizes
        WHERE campaign_id = p_campaign_id
          AND prize_template_id = v_template_id
        LIMIT 1;

        IF FOUND THEN
          v_retained_prize_ids := array_append(v_retained_prize_ids, v_existing_prize.id);
          IF v_req_qty < COALESCE(v_existing_prize.quantity_won, 0) THEN
            v_errors := v_errors || jsonb_build_object(
              'field', 'prizes',
              'message', 'Cannot reduce allocation for "' || v_template_record.name || '" to ' || v_req_qty || ' because ' || v_existing_prize.quantity_won || ' units have already been won by players.'
            );
          END IF;
        END IF;
      END IF;
    END IF;
  END LOOP;

  -- 4. Total Weight Check
  IF jsonb_array_length(p_prizes) > 0 AND v_total_weight <= 0 THEN
    v_errors := v_errors || jsonb_build_object(
      'field', 'weights',
      'message', 'Total prize weights must be greater than 0.'
    );
  END IF;

  -- 5. Quiz Questions Check
  IF p_require_quiz AND jsonb_array_length(p_questions) = 0 THEN
    v_errors := v_errors || jsonb_build_object(
      'field', 'quiz',
      'message', 'Quiz campaigns require at least one question.'
    );
  END IF;

  -- If any validation errors accumulated, abort and return structured errors
  IF jsonb_array_length(v_errors) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', v_errors
    );
  END IF;

  -- 6. Calculate Auto-Pace Enabled At transition
  IF p_campaign_id IS NOT NULL THEN
    SELECT auto_pace_prizes, auto_pace_enabled_at
    INTO v_current_auto_pace, v_auto_pace_enabled_at
    FROM campaigns
    WHERE id = p_campaign_id;

    IF p_auto_pace_prizes AND NOT COALESCE(v_current_auto_pace, false) THEN
      -- Transition from false -> true: anchor pacing from this moment
      v_auto_pace_enabled_at := now();
    ELSIF NOT p_auto_pace_prizes THEN
      v_auto_pace_enabled_at := NULL;
    END IF;
  ELSE
    IF p_auto_pace_prizes THEN
      v_auto_pace_enabled_at := now();
    ELSE
      v_auto_pace_enabled_at := NULL;
    END IF;
  END IF;

  -- 7. Apply In-Place Campaign Update or Insert
  IF p_campaign_id IS NOT NULL AND EXISTS (SELECT 1 FROM campaigns WHERE id = p_campaign_id) THEN
    UPDATE campaigns
    SET
      name = p_name,
      slug = p_slug,
      arabic_name = p_arabic_name,
      hero_image_url = p_hero_image_url,
      description = p_description,
      status = p_status,
      start_date = p_start_date,
      end_date = p_end_date,
      win_probability = p_win_probability,
      max_entries = p_max_entries,
      require_quiz = p_require_quiz,
      auto_pace_prizes = p_auto_pace_prizes,
      auto_pace_enabled_at = v_auto_pace_enabled_at,
      updated_at = now()
    WHERE id = p_campaign_id;

    v_target_campaign_id := p_campaign_id;
  ELSE
    INSERT INTO campaigns (
      organization_id,
      name,
      slug,
      arabic_name,
      hero_image_url,
      description,
      status,
      start_date,
      end_date,
      win_probability,
      max_entries,
      require_quiz,
      require_phone,
      auto_pace_prizes,
      auto_pace_enabled_at
    ) VALUES (
      p_organization_id,
      p_name,
      p_slug,
      p_arabic_name,
      p_hero_image_url,
      p_description,
      p_status,
      p_start_date,
      p_end_date,
      p_win_probability,
      p_max_entries,
      p_require_quiz,
      true,
      p_auto_pace_prizes,
      v_auto_pace_enabled_at
    )
    RETURNING id INTO v_target_campaign_id;
  END IF;

  -- 8. Synchronize Prizes & Inventory In-Place
  FOR v_prize_elem IN SELECT * FROM jsonb_array_elements(p_prizes)
  LOOP
    v_template_id := (v_prize_elem->>'template_id')::UUID;
    v_req_qty := (v_prize_elem->>'quantity')::INT;
    v_req_weight := (v_prize_elem->>'weight')::NUMERIC;

    SELECT name INTO v_template_record FROM prize_templates WHERE id = v_template_id;

    SELECT id, quantity_won
    INTO v_existing_prize
    FROM prizes
    WHERE campaign_id = v_target_campaign_id
      AND prize_template_id = v_template_id
    LIMIT 1;

    IF FOUND THEN
      UPDATE prizes
      SET
        name = v_template_record.name,
        quantity = v_req_qty,
        weight = v_req_weight,
        is_active = true,
        updated_at = now()
      WHERE id = v_existing_prize.id;

      UPDATE prize_inventory
      SET
        initial_quantity = v_req_qty,
        remaining = GREATEST(0, v_req_qty - COALESCE(v_existing_prize.quantity_won, 0)),
        updated_at = now()
      WHERE prize_id = v_existing_prize.id;
    ELSE
      INSERT INTO prizes (
        campaign_id,
        organization_id,
        prize_template_id,
        name,
        quantity,
        quantity_won,
        weight,
        probability,
        is_active
      ) VALUES (
        v_target_campaign_id,
        p_organization_id,
        v_template_id,
        v_template_record.name,
        v_req_qty,
        0,
        v_req_weight,
        0,
        true
      )
      RETURNING id INTO v_new_prize_id;

      INSERT INTO prize_inventory (
        prize_id,
        campaign_id,
        organization_id,
        initial_quantity,
        remaining,
        claimed
      ) VALUES (
        v_new_prize_id,
        v_target_campaign_id,
        p_organization_id,
        v_req_qty,
        v_req_qty,
        0
      );
    END IF;
  END LOOP;

  -- Handle removed prizes
  IF p_campaign_id IS NOT NULL THEN
    FOR v_existing_prize IN
      SELECT id, quantity_won FROM prizes
      WHERE campaign_id = v_target_campaign_id
        AND NOT (id = ANY(v_retained_prize_ids))
    LOOP
      IF COALESCE(v_existing_prize.quantity_won, 0) > 0 THEN
        UPDATE prizes
        SET
          is_active = false,
          weight = 0,
          quantity = v_existing_prize.quantity_won,
          updated_at = now()
        WHERE id = v_existing_prize.id;

        UPDATE prize_inventory
        SET remaining = 0, updated_at = now()
        WHERE prize_id = v_existing_prize.id;
      ELSE
        DELETE FROM prize_inventory WHERE prize_id = v_existing_prize.id;
        DELETE FROM prizes WHERE id = v_existing_prize.id;
      END IF;
    END LOOP;
  END IF;

  -- 9. Synchronize Quiz Questions
  IF p_require_quiz THEN
    SELECT EXISTS (
      SELECT 1 FROM entries
      WHERE campaign_id = v_target_campaign_id
        AND (quiz_passed IS NOT NULL OR metadata IS NOT NULL)
    ) INTO v_has_quiz_answers;

    v_q_idx := 1;
    FOR v_q_elem IN SELECT * FROM jsonb_array_elements(p_questions)
    LOOP
      v_q_id_text := v_q_elem->>'id';
      v_q_id := NULL;

      IF v_q_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_q_id := v_q_id_text::UUID;
      END IF;

      IF v_q_id IS NOT NULL AND EXISTS (SELECT 1 FROM quiz_questions WHERE id = v_q_id AND campaign_id = v_target_campaign_id) THEN
        UPDATE quiz_questions
        SET
          question = v_q_elem->>'question',
          options = ARRAY(SELECT jsonb_array_elements_text(v_q_elem->'options')),
          correct_option_index = COALESCE((v_q_elem->>'correct_index')::INT, 0),
          position = v_q_idx,
          is_active = true,
          updated_at = now()
        WHERE id = v_q_id;

        v_retained_q_ids := array_append(v_retained_q_ids, v_q_id);
      ELSE
        INSERT INTO quiz_questions (
          campaign_id,
          organization_id,
          question,
          options,
          correct_option_index,
          position,
          is_active
        ) VALUES (
          v_target_campaign_id,
          p_organization_id,
          v_q_elem->>'question',
          ARRAY(SELECT jsonb_array_elements_text(v_q_elem->'options')),
          COALESCE((v_q_elem->>'correct_index')::INT, 0),
          v_q_idx,
          true
        )
        RETURNING id INTO v_q_id;

        v_retained_q_ids := array_append(v_retained_q_ids, v_q_id);
      END IF;

      v_q_idx := v_q_idx + 1;
    END LOOP;

    IF v_has_quiz_answers THEN
      UPDATE quiz_questions
      SET is_active = false, position = 0, updated_at = now()
      WHERE campaign_id = v_target_campaign_id
        AND NOT (id = ANY(v_retained_q_ids));
    ELSE
      DELETE FROM quiz_questions
      WHERE campaign_id = v_target_campaign_id
        AND NOT (id = ANY(v_retained_q_ids));
    END IF;
  ELSE
    SELECT EXISTS (
      SELECT 1 FROM entries
      WHERE campaign_id = v_target_campaign_id
        AND (quiz_passed IS NOT NULL OR metadata IS NOT NULL)
    ) INTO v_has_quiz_answers;

    IF v_has_quiz_answers THEN
      UPDATE quiz_questions SET is_active = false, updated_at = now() WHERE campaign_id = v_target_campaign_id;
    ELSE
      DELETE FROM quiz_questions WHERE campaign_id = v_target_campaign_id;
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'success', true,
    'campaign_id', v_target_campaign_id,
    'errors', '[]'::jsonb
  );
END;
$$;

-- 3. Atomic Prize Draw & Inventory Claim Function with Auto-Pacing & Timezone Support
CREATE OR REPLACE FUNCTION public.draw_and_claim_campaign_prize(
  p_campaign_id UUID,
  p_quiz_passed BOOLEAN DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_campaign RECORD;
  v_now_dz TIMESTAMPTZ;
  v_day_start_dz TIMESTAMPTZ;
  v_pacing_start TIMESTAMPTZ;
  v_total_days INT;
  v_elapsed_days INT;
  v_remaining_days INT;
  v_eligible_prizes RECORD;
  v_candidates JSONB := '[]'::jsonb;
  v_total_weight NUMERIC := 0;
  v_prize RECORD;
  v_remaining_qty INT;
  v_daily_limit_today INT;
  v_won_today INT;
  v_roll NUMERIC;
  v_accum NUMERIC := 0;
  v_selected_prize_id UUID := NULL;
  v_selected_prize_name TEXT := NULL;
  v_selected_win_message TEXT := NULL;
  v_claimed_inv_id UUID := NULL;
  v_cand JSONB;
BEGIN
  -- 1. Fetch campaign
  SELECT id, organization_id, status, start_date, end_date, win_probability, require_quiz, auto_pace_prizes, auto_pace_enabled_at
  INTO v_campaign
  FROM public.campaigns
  WHERE id = p_campaign_id;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Campaign not found.');
  END IF;

  IF v_campaign.status <> 'active' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'Campaign is not active.');
  END IF;

  -- 2. Quiz Gate
  IF v_campaign.require_quiz AND COALESCE(p_quiz_passed, false) = false THEN
    -- Quiz failed -> Guaranteed non-winner
    RETURN jsonb_build_object(
      'ok', true,
      'is_winner', false,
      'prize_id', null,
      'prize_name', null,
      'win_message', null
    );
  END IF;

  -- Time calculations in Algeria timezone (Africa/Algiers / UTC+1)
  v_now_dz := now() AT TIME ZONE 'Africa/Algiers';
  v_day_start_dz := (date_trunc('day', v_now_dz)) AT TIME ZONE 'Africa/Algiers';

  -- 3. Determine Eligibility & Daily Pacing
  IF v_campaign.auto_pace_prizes THEN
    -- Effective pacing start (forward-only if toggled mid-campaign)
    v_pacing_start := GREATEST(v_campaign.start_date, COALESCE(v_campaign.auto_pace_enabled_at, v_campaign.start_date));
    v_total_days := GREATEST(1, CEIL(EXTRACT(EPOCH FROM (v_campaign.end_date - v_pacing_start)) / 86400));
    v_elapsed_days := GREATEST(0, FLOOR(EXTRACT(EPOCH FROM (v_now_dz - (v_pacing_start AT TIME ZONE 'Africa/Algiers'))) / 86400));
    v_remaining_days := GREATEST(1, v_total_days - v_elapsed_days);

    -- Build candidate pool among active prizes with available daily quota
    FOR v_prize IN
      SELECT p.id, p.name, p.weight, p.win_message, p.quantity, p.quantity_won
      FROM public.prizes p
      WHERE p.campaign_id = p_campaign_id
        AND p.is_active = true
      ORDER BY p.id
    LOOP
      v_remaining_qty := GREATEST(0, v_prize.quantity - COALESCE(v_prize.quantity_won, 0));
      -- Self-correcting daily quota: remaining_quantity / remaining_days
      v_daily_limit_today := FLOOR(v_remaining_qty::numeric / v_remaining_days::numeric);

      -- Query how many won today in Algeria timezone
      SELECT COUNT(*) INTO v_won_today
      FROM public.entries e
      WHERE e.prize_id = v_prize.id
        AND e.created_at >= v_day_start_dz;

      -- Prize is eligible if remaining stock exists AND today's won count is under daily quota
      IF v_remaining_qty > 0 AND v_won_today < v_daily_limit_today THEN
        v_candidates := v_candidates || jsonb_build_object(
          'id', v_prize.id,
          'name', v_prize.name,
          'weight', v_prize.weight,
          'win_message', v_prize.win_message
        );
        v_total_weight := v_total_weight + COALESCE(v_prize.weight, 1);
      END IF;
    END LOOP;

    -- If no prizes eligible today -> standard non-winner outcome
    IF jsonb_array_length(v_candidates) = 0 OR v_total_weight <= 0 THEN
      RETURN jsonb_build_object(
        'ok', true,
        'is_winner', false,
        'prize_id', null,
        'prize_name', null,
        'win_message', null
      );
    END IF;

    -- Weighted random selection among eligible candidates (prevents FCFS exploit)
    v_roll := random() * v_total_weight;
    FOR v_cand IN SELECT * FROM jsonb_array_elements(v_candidates)
    LOOP
      v_accum := v_accum + (v_cand->>'weight')::NUMERIC;
      IF v_roll <= v_accum THEN
        v_selected_prize_id := (v_cand->>'id')::UUID;
        v_selected_prize_name := v_cand->>'name';
        v_selected_win_message := v_cand->>'win_message';
        EXIT;
      END IF;
    END LOOP;

  ELSE
    -- Manual Win Probability Mode (0 - 1)
    IF random() > COALESCE(v_campaign.win_probability, 0) THEN
      RETURN jsonb_build_object(
        'ok', true,
        'is_winner', false,
        'prize_id', null,
        'prize_name', null,
        'win_message', null
      );
    END IF;

    -- Fetch active prizes with stock remaining
    FOR v_prize IN
      SELECT p.id, p.name, p.weight, p.win_message, p.quantity, p.quantity_won
      FROM public.prizes p
      WHERE p.campaign_id = p_campaign_id
        AND p.is_active = true
        AND (p.quantity - COALESCE(p.quantity_won, 0)) > 0
      ORDER BY p.id
    LOOP
      v_candidates := v_candidates || jsonb_build_object(
        'id', v_prize.id,
        'name', v_prize.name,
        'weight', v_prize.weight,
        'win_message', v_prize.win_message
      );
      v_total_weight := v_total_weight + COALESCE(v_prize.weight, 1);
    END LOOP;

    IF jsonb_array_length(v_candidates) = 0 OR v_total_weight <= 0 THEN
      RETURN jsonb_build_object(
        'ok', true,
        'is_winner', false,
        'prize_id', null,
        'prize_name', null,
        'win_message', null
      );
    END IF;

    v_roll := random() * v_total_weight;
    FOR v_cand IN SELECT * FROM jsonb_array_elements(v_candidates)
    LOOP
      v_accum := v_accum + (v_cand->>'weight')::NUMERIC;
      IF v_roll <= v_accum THEN
        v_selected_prize_id := (v_cand->>'id')::UUID;
        v_selected_prize_name := v_cand->>'name';
        v_selected_win_message := v_cand->>'win_message';
        EXIT;
      END IF;
    END LOOP;
  END IF;

  -- 4. Atomic Inventory Claim & Winner Counter Increment (Single Transaction)
  IF v_selected_prize_id IS NOT NULL THEN
    -- Attempt atomic inventory claim with SKIP LOCKED
    WITH target AS (
      SELECT pi.id
      FROM public.prize_inventory pi
      WHERE pi.prize_id = v_selected_prize_id
        AND pi.remaining > 0
      ORDER BY pi.created_at
      LIMIT 1
      FOR UPDATE SKIP LOCKED
    ),
    updated AS (
      UPDATE public.prize_inventory pi
      SET
        remaining = pi.remaining - 1,
        claimed = pi.claimed + 1,
        updated_at = now()
      FROM target
      WHERE pi.id = target.id
      RETURNING pi.id
    )
    SELECT updated.id INTO v_claimed_inv_id FROM updated;

    IF v_claimed_inv_id IS NOT NULL THEN
      -- Increment quantity_won atomically
      UPDATE public.prizes
      SET quantity_won = quantity_won + 1, updated_at = now()
      WHERE id = v_selected_prize_id;

      RETURN jsonb_build_object(
        'ok', true,
        'is_winner', true,
        'prize_id', v_selected_prize_id,
        'prize_name', v_selected_prize_name,
        'win_message', v_selected_win_message
      );
    ELSE
      -- Stock was claimed by concurrent caller -> graceful non-winner
      RETURN jsonb_build_object(
        'ok', true,
        'is_winner', false,
        'prize_id', null,
        'prize_name', null,
        'win_message', null
      );
    END IF;
  END IF;

  RETURN jsonb_build_object(
    'ok', true,
    'is_winner', false,
    'prize_id', null,
    'prize_name', null,
    'win_message', null
  );
END;
$$;
