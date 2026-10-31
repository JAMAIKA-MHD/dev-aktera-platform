// The first-run tour and checklist: what is saved on the person's own profile.
import type { DbProfile } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";

export type OnboardingPatch = Partial<
  Pick<
    DbProfile,
    | "onboarding_status"
    | "onboarding_step"
    | "onboarding_completed_at"
    | "onboarding_checklist"
  >
>;

export async function saveOnboardingProgress(
  userId: string,
  patch: OnboardingPatch,
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId);
  if (error) throw error;
}

export async function countOrganizationMembers(
  organizationId: string,
): Promise<number> {
  const { count, error } = await supabase
    .from("profiles")
    .select("id", { count: "exact", head: true })
    .eq("organization_id", organizationId);
  if (error) throw error;
  return count ?? 0;
}
