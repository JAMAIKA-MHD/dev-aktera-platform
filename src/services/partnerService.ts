import { supabase } from "../lib/supabase";
import { toFriendlyErrorMessage } from "../lib/errorMessages";
import { normalizePartner } from "../lib/partnerValidation";
import type { RewardPartner, RewardPartnerInput } from "../types";

// The partners a brand registered (table reward_partners). Reads go through the RLS of the
// organization; the database refuses a viewer, a duplicate name and malformed data.

interface DbPartner {
  id: string;
  name: string;
  description: string | null;
  website_url: string | null;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  created_at: string;
}

const COLUMNS =
  "id, name, description, website_url, contact_name, contact_email, contact_phone, created_at";

const toPartner = (row: DbPartner): RewardPartner => ({
  id: row.id,
  name: row.name,
  description: row.description,
  websiteUrl: row.website_url,
  contactName: row.contact_name,
  contactEmail: row.contact_email,
  contactPhone: row.contact_phone,
  createdAt: row.created_at,
});

export async function fetchPartners(
  organizationId: string,
): Promise<RewardPartner[]> {
  const { data, error } = await supabase
    .from("reward_partners")
    .select(COLUMNS)
    .eq("organization_id", organizationId)
    .order("created_at", { ascending: true });
  if (error) throw error;
  return ((data ?? []) as DbPartner[]).map(toPartner);
}

/** Throws an Error with a message fit for the brand. */
export async function createPartner(
  organizationId: string,
  input: RewardPartnerInput,
): Promise<RewardPartner> {
  const { data, error } = await supabase
    .from("reward_partners")
    .insert({ organization_id: organizationId, ...normalizePartner(input) })
    .select(COLUMNS)
    .single();

  if (error) {
    if (error.code === "23505") {
      throw new Error("A partner with this name is already in your list.");
    }
    if (error.code === "42501") {
      throw new Error("You are not allowed to add a partner.");
    }
    throw new Error(
      toFriendlyErrorMessage(
        error.message,
        "We could not add this partner. Please try again.",
      ),
    );
  }
  return toPartner(data as DbPartner);
}

export async function deletePartner(id: string): Promise<void> {
  const { data, error } = await supabase
    .from("reward_partners")
    .delete()
    .eq("id", id)
    .select("id");
  if (error) {
    throw new Error(
      toFriendlyErrorMessage(
        error.message,
        "We could not remove this partner. Please try again.",
      ),
    );
  }
  // Row-level security answers "0 rows" instead of an error when the caller may not delete.
  if (!data || data.length === 0) {
    throw new Error("You are not allowed to remove this partner.");
  }
}
