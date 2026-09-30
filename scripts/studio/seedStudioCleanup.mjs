// Removes the Player Studio seed, and nothing else: every filter is on the seed ids (5eed…),
// in foreign-key order (rules §6 bis, SD2).
import { CAMPAIGNS, TEMPLATE_ID, campaignId } from "./seedStudioData.mjs";

export const SEED_CAMPAIGN_IDS = CAMPAIGNS.map((c) => campaignId(c.n));

export async function must(label, promise) {
  const { data, error } = await promise;
  if (error) throw new Error(`${label}: ${error.message}`);
  return data;
}

export async function removeSeed(admin) {
  const ids = SEED_CAMPAIGN_IDS;
  const byCampaign = (table) =>
    admin.from(table).delete().in("campaign_id", ids);
  // Participants first: their coupon_redemptions go with them (ON DELETE CASCADE).
  await must("entries", byCampaign("entries"));
  await must("impressions", byCampaign("campaign_impressions"));
  await must("inventory", byCampaign("prize_inventory"));
  await must("questions", byCampaign("quiz_questions"));
  await must("prizes", byCampaign("prizes"));
  await must("designs", byCampaign("campaign_experiences"));
  const owners = await must(
    "campaign owners",
    admin.from("campaigns").select("id, organization_id").in("id", ids),
  );
  await must("campaigns", admin.from("campaigns").delete().in("id", ids));
  await must(
    "codes",
    admin
      .from("prize_template_items")
      .delete()
      .eq("prize_template_id", TEMPLATE_ID),
  );
  await must(
    "template",
    admin.from("prize_templates").delete().eq("id", TEMPLATE_ID),
  );
  // Images uploaded in the Studio for seed campaigns while trying it.
  const bucket = admin.storage.from("campaign-media");
  for (const { id, organization_id: org } of owners) {
    const folder = `${org}/experience/${id}`;
    const { data: files } = await bucket.list(folder);
    if (files?.length) {
      await bucket.remove(files.map((file) => `${folder}/${file.name}`));
    }
  }
}
