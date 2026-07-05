import { serve } from 'https://deno.land/std@0.224.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.57.4';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

interface CreateOrganizationBody {
  orgName: string;
  fullName: string;
  email: string;
  phone?: string;
  password: string;
}

interface DbErrorLike {
  message?: string;
  code?: string;
}

const mapCreateOrganizationError = (error: DbErrorLike | null | undefined): string => {
  const message = error?.message?.toLowerCase() ?? '';
  const code = error?.code ?? '';

  if (
    code === '23505' ||
    message.includes('duplicate key') ||
    message.includes('already exists') ||
    message.includes('already registered')
  ) {
    return 'An account with these details already exists.';
  }

  return 'We could not complete organization setup. Please verify your information and try again.';
};

const normalizeText = (value: string): string => value.trim().toLowerCase();

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ ok: false, error: 'Method not allowed' }), {
      status: 405,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await req.json() as CreateOrganizationBody;
    const { orgName, fullName, email, phone, password } = body ?? {};

    if (!orgName || !fullName || !email || !password) {
      return new Response(JSON.stringify({ ok: false, error: 'Organization name, full name, email, and password are required.' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !serviceRoleKey) {
      return new Response(JSON.stringify({ ok: false, error: 'Server configuration is missing.' }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    const normalizedOrgName = normalizeText(orgName);
    const normalizedEmail = normalizeText(email);

    const { data: existingByName, error: existingByNameError } = await admin
      .from('organizations')
      .select('id')
      .ilike('name', orgName.trim())
      .limit(1);

    if (existingByNameError) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'We could not verify organization name availability. Please try again.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    if ((existingByName ?? []).length > 0) {
      return new Response(
        JSON.stringify({ ok: false, error: 'This organization name is already in use. Please choose another name.' }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: orgsByEmail, error: orgsByEmailError } = await admin
      .from('organizations')
      .select('id, contact_email')
      .limit(200);

    if (orgsByEmailError) {
      return new Response(
        JSON.stringify({
          ok: false,
          error: 'We could not verify email availability. Please try again.',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const emailExistsInOrganizations = (orgsByEmail ?? []).some(
      (organization) =>
        typeof organization.contact_email === 'string' &&
        normalizeText(organization.contact_email) === normalizedEmail,
    );

    if (emailExistsInOrganizations) {
      return new Response(
        JSON.stringify({ ok: false, error: 'This email is already linked to an organization account.' }),
        {
          status: 409,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        },
      );
    }

    const { data: userData, error: signUpError } = await admin.auth.admin.createUser({
      email: normalizedEmail,
      password,
      email_confirm: true,
      user_metadata: { full_name: fullName },
    });

    if (signUpError || !userData.user) {
      const signUpMessage = signUpError?.message?.toLowerCase() ?? '';
      if (signUpMessage.includes('already') || signUpMessage.includes('registered')) {
        return new Response(
          JSON.stringify({ ok: false, error: 'This email is already registered. Please sign in instead.' }),
          {
            status: 409,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          },
        );
      }
      return new Response(JSON.stringify({ ok: false, error: mapCreateOrganizationError(signUpError as DbErrorLike) }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    const { data: onboardingData, error: onboardingError } = await admin.rpc('create_organization_onboarding', {
      p_user_id: userData.user.id,
      p_org_name: normalizedOrgName === orgName ? orgName : orgName.trim(),
      p_full_name: fullName,
      p_email: normalizedEmail,
      p_phone: phone || null,
      p_plan: 'free',
    });

    if (onboardingError) {
      await admin.auth.admin.deleteUser(userData.user.id);
      return new Response(JSON.stringify({ ok: false, error: mapCreateOrganizationError(onboardingError as DbErrorLike) }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    return new Response(JSON.stringify({ ok: true, userId: userData.user.id, organizationId: onboardingData }), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Unexpected server error';
    return new Response(JSON.stringify({ ok: false, error: message }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });
  }
});
