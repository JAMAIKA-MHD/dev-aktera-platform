import type { SupabaseClient } from "@supabase/supabase-js";
import {
  parsePublicExperience,
  type PublicExperience,
} from "../../domain/publicCampaign";

// Reads what a player may see of a campaign (backend task B5.2): get_public_experience returns
// safe fields only (no odds, stock, answers or coupons), then the domain validates the answer.
// Throws when the server cannot be reached or answers something unexpected: the page shows a
// technical error with a way to retry.

export const PUBLIC_EXPERIENCE_FUNCTION = "get_public_experience";

export async function loadPublicExperience(
  client: SupabaseClient,
  slug: string,
): Promise<PublicExperience> {
  const { data, error } = await client.rpc(PUBLIC_EXPERIENCE_FUNCTION, {
    p_slug: slug,
  });
  if (error) {
    throw new Error(`Could not load the campaign: ${error.message}`);
  }
  return parsePublicExperience(data);
}
