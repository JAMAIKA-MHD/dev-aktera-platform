// Writes of the Organization page: the company profile, its logo, its notification settings, and
// the signed-in person's own account (password, email).
import type { DbOrganization } from "../contexts/AuthContext";
import { supabase } from "../lib/supabase";
import type { NotificationSettings } from "../types";

const MEDIA_BUCKET = "campaign-media";
const LOGO_TYPES = ["image/png", "image/jpeg", "image/webp"];
const LOGO_MAX_BYTES = 2 * 1024 * 1024;

export type OrganizationProfilePatch = Pick<
  DbOrganization,
  | "name"
  | "contact_email"
  | "phone_number"
  | "nif"
  | "nis"
  | "rc"
  | "ai"
  | "address"
  | "wilaya"
  | "commune"
  | "postal_code"
  | "website"
  | "industry"
  | "language"
  | "time_zone"
  | "currency"
>;

export async function saveOrganizationProfile(
  organizationId: string,
  patch: OrganizationProfilePatch,
): Promise<void> {
  const { error } = await supabase
    .from("organizations")
    .update(patch)
    .eq("id", organizationId);
  if (error) throw error;
}

export async function saveRepresentative(
  userId: string,
  patch: { full_name: string; job_title: string | null },
): Promise<void> {
  const { error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId);
  if (error) throw error;
}

export async function saveNotificationSettings(
  organizationId: string,
  settings: NotificationSettings,
): Promise<void> {
  const { error } = await supabase
    .from("organizations")
    .update({ notification_settings: settings })
    .eq("id", organizationId);
  if (error) throw error;
}

/** Checks the file, stores it and saves its address on the organization. Returns the address. */
export async function uploadOrganizationLogo(
  organizationId: string,
  file: File,
): Promise<string> {
  if (!LOGO_TYPES.includes(file.type)) {
    throw new Error("Please upload a PNG, JPEG or WebP image.");
  }
  if (file.size > LOGO_MAX_BYTES) {
    throw new Error("The image must be 2 MB or smaller.");
  }

  const extension = file.type.split("/")[1];
  const path = `${organizationId}/branding/logo-${Date.now()}.${extension}`;
  const { error: uploadError } = await supabase.storage
    .from(MEDIA_BUCKET)
    .upload(path, file, { contentType: file.type });
  if (uploadError) throw uploadError;

  const url = supabase.storage.from(MEDIA_BUCKET).getPublicUrl(path)
    .data.publicUrl;
  const { error } = await supabase
    .from("organizations")
    .update({ logo_url: url })
    .eq("id", organizationId);
  if (error) throw error;
  return url;
}

export async function removeOrganizationLogo(
  organizationId: string,
): Promise<void> {
  const { error } = await supabase
    .from("organizations")
    .update({ logo_url: null })
    .eq("id", organizationId);
  if (error) throw error;
}

async function confirmPassword(email: string, password: string): Promise<void> {
  const { error } = await supabase.auth.signInWithPassword({ email, password });
  if (error) throw new Error("Your current password is not correct.");
}

export async function changePassword(
  email: string,
  newPassword: string,
  /** Empty only for someone arriving from an invitation, who has no password yet. */
  currentPassword: string | null,
): Promise<void> {
  if (currentPassword !== null) await confirmPassword(email, currentPassword);
  const { error } = await supabase.auth.updateUser({ password: newPassword });
  if (error) throw error;
}

export async function requestEmailChange(
  currentEmail: string,
  newEmail: string,
  password: string,
): Promise<void> {
  await confirmPassword(currentEmail, password);
  const { error } = await supabase.auth.updateUser({ email: newEmail });
  if (error) throw error;
}

export async function signOutOtherDevices(): Promise<void> {
  const { error } = await supabase.auth.signOut({ scope: "others" });
  if (error) throw error;
}
