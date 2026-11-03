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

export async function markJoined(userId: string): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update({ joined_at: new Date().toISOString() })
    .eq("id", userId);
  if (error) throw error;
}
