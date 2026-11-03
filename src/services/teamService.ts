// Changes to the team go through the team-members Edge Function: it checks the caller's role and
// holds the rights to create and delete accounts, which the browser must never have.
import { supabase } from "../lib/supabase";
import type { TeamRole } from "../types";

async function callTeamMembers(body: Record<string, unknown>): Promise<void> {
  const { data, error } = await supabase.functions.invoke("team-members", {
    body,
  });
  if (data && data.ok === false) throw new Error(data.error);
  if (error) {
    // A refusal arrives as an error, with the reason in the response.
    const answer = await error.context?.json?.().catch(() => null);
    throw new Error(
      answer?.error ?? "This could not be done. Please try again.",
    );
  }
}

export const inviteTeamMember = (email: string, role: TeamRole) =>
  callTeamMembers({ action: "invite", email, role });

export const updateTeamMemberRole = (memberId: string, role: TeamRole) =>
  callTeamMembers({ action: "update_role", memberId, role });

export const removeTeamMember = (memberId: string) =>
  callTeamMembers({ action: "remove", memberId });
