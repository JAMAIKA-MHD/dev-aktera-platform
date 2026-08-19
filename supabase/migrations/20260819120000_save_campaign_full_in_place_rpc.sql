-- Migration: save_campaign_full_in_place RPC
-- Atomic server-side in-place campaign creation and updates with live stock, prize floor & quiz question safeguards

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
  p_questions JSONB DEFAULT '[]'::jsonb
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
  v_existing_q RECORD;
  v_q_idx INT := 1;
  v_has_quiz_answers BOOLEAN := false;
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

  -- If any validation errors accumulated, abort and return structured errors (no mutations occur)
  IF jsonb_array_length(v_errors) > 0 THEN
    RETURN jsonb_build_object(
      'success', false,
      'errors', v_errors
    );
  END IF;

  -- 6. Apply In-Place Campaign Update or Insert
  IF p_campaign_id IS NOT NULL AND EXISTS (SELECT 1 FROM campaigns WHERE id = p_campaign_id) THEN
    -- In-place update of existing campaign
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
      updated_at = now()
    WHERE id = p_campaign_id;

    v_target_campaign_id := p_campaign_id;
  ELSE
    -- New campaign insert
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
      require_phone
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
      true
    )
    RETURNING id INTO v_target_campaign_id;
  END IF;

  -- 7. Synchronize Prizes & Inventory In-Place
  -- A. Handle retained / updated and newly added prizes
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
      -- In-place update of existing prize
      UPDATE prizes
      SET
        name = v_template_record.name,
        quantity = v_req_qty,
        weight = v_req_weight,
        is_active = true,
        updated_at = now()
      WHERE id = v_existing_prize.id;

      -- Update corresponding inventory remaining stock
      UPDATE prize_inventory
      SET
        initial_quantity = v_req_qty,
        remaining = GREATEST(0, v_req_qty - COALESCE(v_existing_prize.quantity_won, 0)),
        updated_at = now()
      WHERE prize_id = v_existing_prize.id;
    ELSE
      -- Insert brand new prize for this campaign
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

  -- B. Handle removed prizes (prizes in DB that were omitted from p_prizes)
  IF p_campaign_id IS NOT NULL THEN
    FOR v_existing_prize IN
      SELECT id, quantity_won FROM prizes
      WHERE campaign_id = v_target_campaign_id
        AND NOT (id = ANY(v_retained_prize_ids))
    LOOP
      IF COALESCE(v_existing_prize.quantity_won, 0) > 0 THEN
        -- Won prize: deactivate & set weight to 0 to preserve player history
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
        -- Never won: delete safely
        DELETE FROM prize_inventory WHERE prize_id = v_existing_prize.id;
        DELETE FROM prizes WHERE id = v_existing_prize.id;
      END IF;
    END LOOP;
  END IF;

  -- 8. Synchronize Quiz Questions with Answer Protection
  IF p_require_quiz THEN
    -- Check if campaign has recorded participant entries with quiz answers
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

      -- Check if valid UUID was supplied for existing question
      IF v_q_id_text ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' THEN
        v_q_id := v_q_id_text::UUID;
      END IF;

      IF v_q_id IS NOT NULL AND EXISTS (SELECT 1 FROM quiz_questions WHERE id = v_q_id AND campaign_id = v_target_campaign_id) THEN
        -- In-place update of existing question
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
        -- Insert new question
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

    -- Handle omitted/removed questions:
    -- If campaign has recorded answers, NEVER hard-delete: deactivate only!
    IF v_has_quiz_answers THEN
      UPDATE quiz_questions
      SET is_active = false, position = 0, updated_at = now()
      WHERE campaign_id = v_target_campaign_id
        AND NOT (id = ANY(v_retained_q_ids));
    ELSE
      -- No recorded player answers: safe to delete
      DELETE FROM quiz_questions
      WHERE campaign_id = v_target_campaign_id
        AND NOT (id = ANY(v_retained_q_ids));
    END IF;
  ELSE
    -- If campaign changed from quiz to wheel: deactivate questions if answers exist, or delete if no answers
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
