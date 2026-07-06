CREATE OR REPLACE FUNCTION public.create_organization_onboarding(
  p_user_id uuid,
  p_org_name text,
  p_full_name text,
  p_email text,
  p_phone text DEFAULT NULL,
  p_plan text DEFAULT 'free'
)
RETURNS uuid
LANGUAGE plpgsql
AS $$
DECLARE
  v_org_id uuid;
  v_slug text;
BEGIN
  v_slug := regexp_replace(lower(p_org_name), '[^a-z0-9]+', '-', 'g');
  v_slug := regexp_replace(v_slug, '(^-+|-+$)', '', 'g');
  IF v_slug = '' THEN
    v_slug := 'organization';
  END IF;
  v_slug := v_slug || '-' || substr(replace(gen_random_uuid()::text, '-', ''), 1, 8);

  INSERT INTO public.organizations (
    name,
    slug,
    contact_email,
    phone_number,
    plan,
    is_active
  )
  VALUES (
    p_org_name,
    v_slug,
    p_email,
    p_phone,
    p_plan,
    true
  )
  RETURNING id INTO v_org_id;

  INSERT INTO public.profiles (
    id,
    organization_id,
    full_name,
    email,
    role
  )
  VALUES (
    p_user_id,
    v_org_id,
    p_full_name,
    p_email,
    'owner'
  );

  INSERT INTO public.billing (
    organization_id,
    plan,
    billing_cycle,
    amount,
    status,
    period_start,
    period_end
  )
  VALUES (
    v_org_id,
    p_plan,
    'yearly',
    0,
    'paid',
    now(),
    now() + interval '1 year'
  );

  RETURN v_org_id;
END;
$$;
