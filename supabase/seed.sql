-- ==============================================================================
-- DZENGAGE LOCAL SEED SCRIPT (Deterministic & Idempotent)
-- ==============================================================================
--
-- Populates complete, realistic sample data for:
-- 1. All existing local developer organizations (e.g. "dz" or active user orgs).
-- 2. Two standalone demo organizations ("Ooredoo Algeria Demo" & "Yassir SuperApp Demo").
--
-- Unified Franchise Naming:
-- All campaigns within an organization share the same cohesive campaign franchise name
-- (e.g. "DZ Mega Campaign - Lucky Spin Wheel", "DZ Mega Campaign - Football & Tech Quiz", etc.)
--
-- Full Relational Integrity:
-- organizations -> prize_templates -> prize_template_items -> campaigns -> prizes
--               -> prize_inventory -> quiz_questions -> entries -> coupon_redemptions
--
-- Safety: Hard-fails if run against any non-local/non-Docker database network.
-- ==============================================================================

DO $$
DECLARE
  v_demo_org1_id uuid := '00000000-0000-0000-0000-000000000001'::uuid;
  v_demo_org2_id uuid := '00000000-0000-0000-0000-000000000002'::uuid;
  v_target_org RECORD;

  -- Helper procedure to seed a complete, realistic dataset for any organization
  -- with unified campaign franchise naming and full voucher/entry graphs.
BEGIN
  -- ============================================================================
  -- 0. SAFETY GUARDRAIL
  -- ============================================================================
  IF inet_server_addr() IS NOT NULL
     AND NOT (
       inet_server_addr() << '127.0.0.0/8'::inet
       OR inet_server_addr() << '172.16.0.0/12'::inet
       OR inet_server_addr() << '10.0.0.0/8'::inet
       OR inet_server_addr() << '192.168.0.0/16'::inet
       OR inet_server_addr() = '::1'::inet
     ) THEN
    RAISE EXCEPTION 'SAFETY GUARD TRIGGERED: Refusing to seed database on non-local host (%). This seed script is strictly restricted to local development.', inet_server_addr();
  END IF;

  -- Ensure deterministic randomness
  PERFORM setseed(0.42);

  RAISE NOTICE '🌱 Starting deterministic local database seeding for all organizations...';

  -- ============================================================================
  -- 1. ENSURE DEMO ORGANIZATIONS EXIST
  -- ============================================================================
  INSERT INTO organizations (id, name, slug, contact_email, phone_number, plan, is_active, created_at, updated_at)
  VALUES
    (v_demo_org1_id, 'Ooredoo Algeria (Demo)', 'ooredoo-demo', 'contact@ooredoo-demo.dz', '0550000000', 'enterprise', true, now() - interval '30 days', now()),
    (v_demo_org2_id, 'Yassir SuperApp (Demo)', 'yassir-demo', 'developer@yassir-demo.dz', '0770000000', 'pro', true, now() - interval '30 days', now())
  ON CONFLICT (id) DO UPDATE
  SET name = EXCLUDED.name, slug = EXCLUDED.slug, plan = EXCLUDED.plan;

  -- ============================================================================
  -- 2. LOOP & SEED EVERY ORGANIZATION (Current Dev Org + Demo Orgs)
  -- ============================================================================
  FOR v_target_org IN
    SELECT id, name, slug FROM organizations ORDER BY created_at ASC
  LOOP
    DECLARE
      v_org_id uuid := v_target_org.id;
      v_org_name text := v_target_org.name;
      v_franchise_name text;
      v_slug_base text := v_target_org.slug;

      -- Template IDs
      v_t_voucher500 uuid := gen_random_uuid();
      v_t_data10gb   uuid := gen_random_uuid();
      v_t_voucher1k  uuid := gen_random_uuid();
      v_t_mug        uuid := gen_random_uuid();

      -- Campaign IDs
      v_c_wheel_active uuid := gen_random_uuid();
      v_c_quiz_active  uuid := gen_random_uuid();
      v_c_wheel_paused uuid := gen_random_uuid();
      v_c_wheel_draft  uuid := gen_random_uuid();

      -- Prize IDs
      v_p_w1 uuid := gen_random_uuid();
      v_p_w2 uuid := gen_random_uuid();
      v_p_w3 uuid := gen_random_uuid();
      v_p_q1 uuid := gen_random_uuid();
      v_p_q2 uuid := gen_random_uuid();

      i integer;
      v_carrier text;
      v_prefix text;
      v_phone text;
      v_participant_name text;
      v_entry_time timestamptz;
      v_is_win boolean;
      v_entry_id uuid;
      v_selected_prize uuid;
      v_selected_item_id uuid;
      v_coupon_code text;
      v_confirmed boolean;
      v_dwell integer;
      v_user_agent text;

      v_names text[] := ARRAY[
        'Amine Benali', 'Yasmine Khelifi', 'Karim Mansouri', 'Sara Boumedienne',
        'Mohamed Belhadj', 'Rania Zerrouki', 'Walid Saidi', 'Anis Chaabane',
        'Meriem Tebboune', 'Farid Hamidi', 'Nour El Houda', 'Lyes Benaissa',
        'Chaima Guellati', 'Bilel Mebarki', 'Souhila Brahimi', 'Mehdi Louafi',
        'Khadidja Haddad', 'Sofiane Amrani', 'Fatima Zohra', 'Oussama Cherif'
      ];

      v_user_agents text[] := ARRAY[
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
        'Mozilla/5.0 (Linux; Android 14; SM-S928B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Linux; Android 13; Redmi Note 12) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.0.0 Mobile Safari/537.36',
        'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
        'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36'
      ];
    BEGIN
      -- Build unified franchise name based on org name
      IF v_org_name ILIKE '%ooredoo%' THEN
        v_franchise_name := 'Ooredoo Summer Mega Challenge';
      ELSIF v_org_name ILIKE '%yassir%' THEN
        v_franchise_name := 'Yassir Mega Express Challenge';
      ELSE
        v_franchise_name := UPPER(v_org_name) || ' Mega Grand Challenge';
      END IF;

      RAISE NOTICE '⚡ Seeding organization "%" (ID: %) with franchise "%"...', v_org_name, v_org_id, v_franchise_name;

      -- A. Dependency-Ordered Cleanup for this organization
      DELETE FROM coupon_redemptions WHERE entry_id IN (SELECT id FROM entries WHERE organization_id = v_org_id);
      DELETE FROM entries WHERE organization_id = v_org_id;
      DELETE FROM prize_inventory_items WHERE organization_id = v_org_id;
      DELETE FROM prize_inventory WHERE organization_id = v_org_id;
      DELETE FROM prizes WHERE organization_id = v_org_id;
      DELETE FROM quiz_questions WHERE organization_id = v_org_id;
      DELETE FROM campaigns WHERE organization_id = v_org_id;
      DELETE FROM prize_template_items WHERE organization_id = v_org_id;
      DELETE FROM prize_templates WHERE organization_id = v_org_id;
      DELETE FROM billing WHERE organization_id = v_org_id;

      -- B. Insert Billing
      INSERT INTO billing (organization_id, plan, billing_cycle, amount, status, period_start, period_end)
      VALUES (v_org_id, 'enterprise', 'monthly', 35000.00, 'paid', now() - interval '15 days', now() + interval '15 days');

      -- C. Insert Prize Templates (Rewards & Inventory)
      INSERT INTO prize_templates (id, organization_id, name, description, category, value, stock_quantity, created_at)
      VALUES
        (v_t_voucher500, v_org_id, '500 DA Recharge Voucher', 'Top-up voucher valid across all mobile lines', 'voucher', 500.00, 100, now() - interval '20 days'),
        (v_t_data10gb,   v_org_id, '10 GB High-Speed Data Pass', '10 GB 4G/LTE mobile internet valid for 30 days', 'voucher', 1200.00, 50, now() - interval '20 days'),
        (v_t_voucher1k,  v_org_id, '1,000 DA Discount Coupon', 'Exclusive discount voucher on partner stores & orders', 'voucher', 1000.00, 60, now() - interval '20 days'),
        (v_t_mug,        v_org_id, 'Official Branded Premium Mug', 'Official branded ceramic coffee mug', 'physical', 800.00, 30, now() - interval '20 days');

      -- D. Populate Pre-loaded Voucher Codes in prize_template_items (Stock Room)
      -- 500 DA codes
      FOR i IN 1..100 LOOP
        INSERT INTO prize_template_items (id, prize_template_id, organization_id, item_index, item_value, source_type)
        VALUES (
          gen_random_uuid(),
          v_t_voucher500,
          v_org_id,
          i,
          UPPER(SUBSTRING(REGEXP_REPLACE(v_org_name, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 3)) || '-500-' || LPAD(i::text, 4, '0') || '-' || SUBSTRING(MD5(i::text || v_org_id::text || '500') FROM 1 FOR 4),
          'bulk'
        );
      END LOOP;

      -- 10 GB Data codes
      FOR i IN 1..50 LOOP
        INSERT INTO prize_template_items (id, prize_template_id, organization_id, item_index, item_value, source_type)
        VALUES (
          gen_random_uuid(),
          v_t_data10gb,
          v_org_id,
          i,
          UPPER(SUBSTRING(REGEXP_REPLACE(v_org_name, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 3)) || '-10GB-' || LPAD(i::text, 3, '0') || '-' || SUBSTRING(MD5(i::text || v_org_id::text || 'data') FROM 1 FOR 4),
          'bulk'
        );
      END LOOP;

      -- 1,000 DA codes
      FOR i IN 1..60 LOOP
        INSERT INTO prize_template_items (id, prize_template_id, organization_id, item_index, item_value, source_type)
        VALUES (
          gen_random_uuid(),
          v_t_voucher1k,
          v_org_id,
          i,
          UPPER(SUBSTRING(REGEXP_REPLACE(v_org_name, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 3)) || '-1K-' || LPAD(i::text, 3, '0') || '-' || SUBSTRING(MD5(i::text || v_org_id::text || '1k') FROM 1 FOR 4),
          'bulk'
        );
      END LOOP;

      -- E. Insert Campaigns (All referring to the same cohesive Franchise Name)
      INSERT INTO campaigns (id, organization_id, name, arabic_name, slug, description, status, start_date, end_date, win_probability, max_entries, require_phone, require_quiz, created_at)
      VALUES
        (v_c_wheel_active, v_org_id, v_franchise_name || ' — Lucky Spin Wheel', 'عجلة الحظ الكبرى', v_slug_base || '-spin-wheel', 'Spin the grand prize wheel daily to win vouchers, data passes, and exclusive gifts.', 'active', now() - interval '14 days', now() + interval '16 days', 0.65, 1, true, false, now() - interval '14 days'),
        (v_c_quiz_active,  v_org_id, v_franchise_name || ' — Trivia & Culture Quiz', 'مسابقة الثقافة والتحدي', v_slug_base || '-trivia-quiz', 'Answer 3 fast trivia questions to qualify for instant recharge vouchers.', 'active', now() - interval '8 days', now() + interval '22 days', 0.80, 1, true, true, now() - interval '8 days'),
        (v_c_wheel_paused, v_org_id, v_franchise_name || ' — Weekend Flash Special', 'عروض نهاية الأسبوع الخاصة', v_slug_base || '-weekend-flash', 'Special weekend promotional wheel (currently paused for maintenance).', 'paused', now() - interval '20 days', now() + interval '10 days', 0.50, 1, true, false, now() - interval '20 days'),
        (v_c_wheel_draft,  v_org_id, v_franchise_name || ' — Ramadan Night Rewards (Draft)', 'جوائز سهرات رمضان (مسودة)', v_slug_base || '-ramadan-draft', 'Upcoming festive season campaign scheduled for next month.', 'draft', now() + interval '5 days', now() + interval '35 days', 0.70, 1, true, false, now() - interval '2 days');

      -- F. Insert Prizes & Atomic Prize Inventory Quotas
      -- Active Wheel Prizes (Allocations: 40, 20, 10 -> Won: 18, 9, 3 -> Remaining: 22, 11, 7)
      INSERT INTO prizes (id, campaign_id, organization_id, prize_template_id, name, quantity, quantity_won, weight, probability, is_active)
      VALUES
        (v_p_w1, v_c_wheel_active, v_org_id, v_t_voucher500, '500 DA Recharge', 40, 18, 60.00, 0.60, true),
        (v_p_w2, v_c_wheel_active, v_org_id, v_t_data10gb,   '10 GB Data Pass', 20,  9, 30.00, 0.30, true),
        (v_p_w3, v_c_wheel_active, v_org_id, v_t_mug,        'Branded Mug',     10,  3, 10.00, 0.10, true);

      INSERT INTO prize_inventory (prize_id, campaign_id, organization_id, initial_quantity, remaining, claimed)
      VALUES
        (v_p_w1, v_c_wheel_active, v_org_id, 40, 22, 18),
        (v_p_w2, v_c_wheel_active, v_org_id, 20, 11,  9),
        (v_p_w3, v_c_wheel_active, v_org_id, 10,  7,  3);

      -- Active Quiz Prizes (Allocations: 30, 15 -> Won: 12, 6 -> Remaining: 18, 9)
      INSERT INTO prizes (id, campaign_id, organization_id, prize_template_id, name, quantity, quantity_won, weight, probability, is_active)
      VALUES
        (v_p_q1, v_c_quiz_active, v_org_id, v_t_voucher500, '500 DA Recharge', 30, 12, 70.00, 0.70, true),
        (v_p_q2, v_c_quiz_active, v_org_id, v_t_voucher1k,  '1,000 DA Coupon', 15,  6, 30.00, 0.30, true);

      INSERT INTO prize_inventory (prize_id, campaign_id, organization_id, initial_quantity, remaining, claimed)
      VALUES
        (v_p_q1, v_c_quiz_active, v_org_id, 30, 18, 12),
        (v_p_q2, v_c_quiz_active, v_org_id, 15,  9,  6);

      -- G. Insert Quiz Questions
      INSERT INTO quiz_questions (campaign_id, organization_id, question, options, correct_option_index, position, is_active)
      VALUES
        (v_c_quiz_active, v_org_id, 'Which historic Algerian monument stands high overlooking the Bay of Algiers?', ARRAY['Maqam Echahid', 'Santa Cruz', 'Timgad Arch', 'Beni Hammad Fort'], 0, 1, true),
        (v_c_quiz_active, v_org_id, 'What is the national currency of Algeria?', ARRAY['Dinar (DZD)', 'Dirham', 'Riyal', 'Franc'], 0, 2, true),
        (v_c_quiz_active, v_org_id, 'Which famous national park is located in the Sahara Desert near Djanet?', ARRAY['Djurdjura', 'Tassili n-Ajjer', 'Gouraya', 'Chrea'], 1, 3, true);

      -- H. Insert Participant Entries & Coupon Redemptions (60 Entries spread across 14 days)
      FOR i IN 1..60 LOOP
        -- Carrier selection with real Algerian prefixes
        IF i % 10 < 4 THEN
          v_carrier := 'Mobilis'; v_prefix := '06' || LPAD((60 + (i % 30))::text, 2, '0');
        ELSIF i % 10 < 7 THEN
          v_carrier := 'Djezzy'; v_prefix := '07' || LPAD((70 + (i % 25))::text, 2, '0');
        ELSE
          v_carrier := 'Ooredoo'; v_prefix := '05' || LPAD((50 + (i % 40))::text, 2, '0');
        END IF;

        v_phone := v_prefix || LPAD((100000 + (i * 739) % 899999)::text, 6, '0');
        v_participant_name := v_names[1 + (i % array_length(v_names, 1))];
        v_entry_time := now() - (interval '14 days' * (1.0 - (i::numeric / 60.0))) + (interval '1 hour' * ((i * 3) % 24));
        -- Dwell Time for Lucky Wheel: between 6s and 20s
        v_dwell := 6 + ((i * 7 + 1) % 15);
        v_user_agent := v_user_agents[1 + (i % array_length(v_user_agents, 1))];

        -- First 30 are winners (18 Voucher 500, 9 Data 10GB, 3 Mug), remaining 30 are non-winners
        IF i <= 30 THEN
          v_is_win := true;
          IF i <= 18 THEN
            v_selected_prize := v_p_w1;
            v_coupon_code := UPPER(SUBSTRING(REGEXP_REPLACE(v_org_name, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 3)) || '-500-' || LPAD(i::text, 4, '0') || '-' || SUBSTRING(MD5(i::text || v_org_id::text || '500') FROM 1 FOR 4);
          ELSIF i <= 27 THEN
            v_selected_prize := v_p_w2;
            v_coupon_code := UPPER(SUBSTRING(REGEXP_REPLACE(v_org_name, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 3)) || '-10GB-' || LPAD((i - 18)::text, 3, '0') || '-' || SUBSTRING(MD5((i - 18)::text || v_org_id::text || 'data') FROM 1 FOR 4);
          ELSE
            v_selected_prize := v_p_w3;
            v_coupon_code := NULL;
          END IF;
          v_confirmed := (i % 4 != 0);
        ELSE
          v_is_win := false;
          v_selected_prize := NULL;
          v_coupon_code := NULL;
          v_confirmed := false;
        END IF;

        v_entry_id := gen_random_uuid();

        INSERT INTO entries (
          id, campaign_id, organization_id, phone_number, participant_name,
          quiz_passed, is_winner, prize_id, redeemed_coupon_value, dwell_time_seconds, metadata, user_agent, created_at
        ) VALUES (
          v_entry_id,
          v_c_wheel_active,
          v_org_id,
          v_phone,
          v_participant_name,
          NULL,
          v_is_win,
          v_selected_prize,
          v_coupon_code,
          v_dwell,
          jsonb_build_object(
            'carrier', v_carrier,
            'dwell_time_seconds', v_dwell,
            'coupon_confirmed', v_confirmed,
            'ip_city', CASE WHEN i % 3 = 0 THEN 'Algiers' WHEN i % 3 = 1 THEN 'Oran' ELSE 'Constantine' END
          ),
          v_user_agent,
          v_entry_time
        );

        -- Insert redemption record
        IF v_is_win AND v_coupon_code IS NOT NULL THEN
          SELECT id INTO v_selected_item_id
          FROM prize_template_items
          WHERE item_value = v_coupon_code LIMIT 1;

          IF v_selected_item_id IS NOT NULL THEN
            INSERT INTO coupon_redemptions (entry_id, prize_template_item_id, coupon_value, redeemed_at, redeemed_by_player)
            VALUES (v_entry_id, v_selected_item_id, v_coupon_code, v_entry_time + interval '2 minutes', v_confirmed)
            ON CONFLICT DO NOTHING;
          END IF;
        END IF;
      END LOOP;

      -- I. Insert Quiz Entries (25 Entries: Dwell Time between 15s and 60s)
      FOR i IN 1..25 LOOP
        IF i % 2 = 0 THEN
          v_carrier := 'Ooredoo'; v_prefix := '05' || LPAD((51 + (i % 35))::text, 2, '0');
        ELSE
          v_carrier := 'Mobilis'; v_prefix := '06' || LPAD((65 + (i % 25))::text, 2, '0');
        END IF;

        v_phone := v_prefix || LPAD((300000 + (i * 619) % 699999)::text, 6, '0');
        v_participant_name := v_names[1 + ((i + 3) % array_length(v_names, 1))];
        v_entry_time := now() - (interval '7 days' * (1.0 - (i::numeric / 25.0))) + (interval '1 hour' * ((i * 4) % 24));
        -- Dwell Time for Quiz: between 15s and 60s
        v_dwell := 15 + ((i * 11 + 3) % 46);
        v_user_agent := v_user_agents[1 + ((i + 1) % array_length(v_user_agents, 1))];

        -- 18 passed quiz (12 won voucher, 6 won coupon), 7 failed quiz
        IF i <= 18 THEN
          v_is_win := true;
          IF i <= 12 THEN
            v_selected_prize := v_p_q1;
            v_coupon_code := UPPER(SUBSTRING(REGEXP_REPLACE(v_org_name, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 3)) || '-500-' || LPAD((50 + i)::text, 4, '0') || '-' || SUBSTRING(MD5((50 + i)::text || v_org_id::text || '500') FROM 1 FOR 4);
          ELSE
            v_selected_prize := v_p_q2;
            v_coupon_code := UPPER(SUBSTRING(REGEXP_REPLACE(v_org_name, '[^a-zA-Z0-9]', '', 'g') FROM 1 FOR 3)) || '-1K-' || LPAD((30 + i - 12)::text, 3, '0') || '-' || SUBSTRING(MD5((30 + i - 12)::text || v_org_id::text || '1k') FROM 1 FOR 4);
          END IF;
          v_confirmed := true;
        ELSE
          v_is_win := false;
          v_selected_prize := NULL;
          v_coupon_code := NULL;
          v_confirmed := false;
        END IF;

        v_entry_id := gen_random_uuid();

        INSERT INTO entries (
          id, campaign_id, organization_id, phone_number, participant_name,
          quiz_passed, is_winner, prize_id, redeemed_coupon_value, dwell_time_seconds, metadata, user_agent, created_at
        ) VALUES (
          v_entry_id,
          v_c_quiz_active,
          v_org_id,
          v_phone,
          v_participant_name,
          (i <= 18), -- quiz_passed: true for first 18, false for remaining 7
          v_is_win,
          v_selected_prize,
          v_coupon_code,
          v_dwell,
          jsonb_build_object(
            'carrier', v_carrier,
            'dwell_time_seconds', v_dwell,
            'quiz_score', CASE WHEN i <= 18 THEN '3/3' ELSE '1/3' END,
            'coupon_confirmed', v_confirmed
          ),
          v_user_agent,
          v_entry_time
        );

        IF v_is_win AND v_coupon_code IS NOT NULL THEN
          SELECT id INTO v_selected_item_id
          FROM prize_template_items
          WHERE item_value = v_coupon_code LIMIT 1;

          IF v_selected_item_id IS NOT NULL THEN
            INSERT INTO coupon_redemptions (entry_id, prize_template_item_id, coupon_value, redeemed_at, redeemed_by_player)
            VALUES (v_entry_id, v_selected_item_id, v_coupon_code, v_entry_time + interval '2 minutes', v_confirmed)
            ON CONFLICT DO NOTHING;
          END IF;
        END IF;
      END LOOP;

    END;
  END LOOP;

  RAISE NOTICE '================================================================';
  RAISE NOTICE '🎉 ALL LOCAL ORGANIZATIONS SEEDED WITH UNIFIED FRANCHISE CAMPAIGNS & VOUCHERS!';
  RAISE NOTICE '================================================================';
END;
$$;
