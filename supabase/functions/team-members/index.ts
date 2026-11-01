// Team management for an organization: invite a teammate, change a role, remove a member. The
// caller's own token is checked here, and only an owner or admin of the organization gets
// through. The owner's row cannot be changed, and nobody changes their own.
import { serve } from "https://deno.land/std@0.224.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.57.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const ASSIGNABLE_ROLES = ["admin", "manager", "viewer"];
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const reply = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });

const fail = (status: number, error: string) =>
  reply(status, { ok: false, error });

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }
  if (req.method !== "POST") {
    return fail(405, "Method not allowed");
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");
  if (!supabaseUrl || !serviceRoleKey) {
    return fail(500, "Server configuration is missing.");
  }

  const admin = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const token = req.headers.get("Authorization")?.replace(/^Bearer\s+/i, "");
  const { data: authData, error: authError } = token
    ? await admin.auth.getUser(token)
    : { data: { user: null }, error: true };
  if (authError || !authData.user) {
    return fail(401, "Please sign in again.");
  }

  const { data: caller } = await admin
    .from("profiles")
    .select("id, organization_id, full_name, role")
    .eq("id", authData.user.id)
    .single();
  if (!caller || !["owner", "admin"].includes(caller.role)) {
    return fail(403, "Only an owner or an admin can manage the team.");
  }

  const logTeamChange = (verb: string, objectName: string, detail?: string) =>
    admin.from("activity_log").insert({
      organization_id: caller.organization_id,
      actor_id: caller.id,
      actor_name: caller.full_name,
      category: "team",
      verb,
      object_name: objectName,
      detail: detail ?? null,
    });

  // The member a change applies to: in the caller's organization, and neither them nor the owner.
  const findMember = async (memberId: unknown) => {
    if (typeof memberId !== "string" || memberId === caller.id) return null;
    const { data } = await admin
      .from("profiles")
      .select("id, full_name, email, role")
      .eq("id", memberId)
      .eq("organization_id", caller.organization_id)
      .maybeSingle();
    return data && data.role !== "owner" ? data : null;
  };

  try {
    const body = await req.json();

    if (body?.action === "invite") {
      const email = String(body.email ?? "")
        .trim()
        .toLowerCase();
      if (!EMAIL.test(email)) return fail(400, "Enter a valid email address.");
      if (!ASSIGNABLE_ROLES.includes(body.role))
        return fail(400, "Choose a role.");

      const { data: invited, error: inviteError } =
        await admin.auth.admin.inviteUserByEmail(email, {
          redirectTo: `${req.headers.get("origin") ?? ""}/account?tab=Security&invited=1`,
        });
      if (inviteError || !invited.user) {
        const message = inviteError?.message?.toLowerCase() ?? "";
        return message.includes("already")
          ? fail(409, "This email already has an account.")
          : fail(400, "The invitation could not be sent. Please try again.");
      }

      const { error: profileError } = await admin.from("profiles").insert({
        id: invited.user.id,
        organization_id: caller.organization_id,
        full_name: email.split("@")[0],
        email,
        role: body.role,
        invited_at: new Date().toISOString(),
      });
      if (profileError) {
        // No half-made account left behind: the email stays free for another try.
        await admin.auth.admin.deleteUser(invited.user.id);
        return fail(400, "The invitation could not be sent. Please try again.");
      }

      await logTeamChange("invited", email);
      return reply(200, { ok: true });
    }

    if (body?.action === "update_role") {
      if (!ASSIGNABLE_ROLES.includes(body.role))
        return fail(400, "Choose a role.");
      const member = await findMember(body.memberId);
      if (!member) return fail(403, "This member cannot be changed.");

      const { error } = await admin
        .from("profiles")
        .update({ role: body.role })
        .eq("id", member.id);
      if (error)
        return fail(400, "The role could not be changed. Please try again.");

      await logTeamChange(
        "changed the role of",
        member.full_name,
        `Role: ${member.role} → ${body.role}`,
      );
      return reply(200, { ok: true });
    }

    if (body?.action === "remove") {
      const member = await findMember(body.memberId);
      if (!member) return fail(403, "This member cannot be removed.");

      // The account goes with the profile, so the email can be invited again later.
      const { error } = await admin.auth.admin.deleteUser(member.id);
      if (error)
        return fail(400, "This member could not be removed. Please try again.");

      await logTeamChange("removed", member.full_name);
      return reply(200, { ok: true });
    }

    return fail(400, "Unknown action.");
  } catch {
    return fail(500, "Something went wrong. Please try again.");
  }
});
