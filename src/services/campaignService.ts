import { supabase } from "../lib/supabase";
import { PrizeTemplate } from "../types";

export async function updateCampaignStatusService(
  campaignId: string,
  status: string,
): Promise<void> {
  const { error } = await supabase
    .from("campaigns")
    .update({ status })
    .eq("id", campaignId);

  if (error) throw error;
}

export async function archiveCampaignService(
  campaignId: string,
): Promise<void> {
  const { error } = await supabase
    .from("campaigns")
    .update({ status: "ended" })
    .eq("id", campaignId);

  if (error) throw error;
}

export async function deleteCampaignService(campaignId: string): Promise<void> {
  const { count: participationCount, error: participationError } =
    await supabase
      .from("entries")
      .select("id", { count: "exact", head: true })
      .eq("campaign_id", campaignId);

  if (participationError) throw participationError;

  if ((participationCount ?? 0) > 0) {
    throw new Error(
      "This campaign already has participant entries and cannot be deleted. Keep it archived for history.",
    );
  }

  await supabase.from("quiz_questions").delete().eq("campaign_id", campaignId);
  await supabase.from("prizes").delete().eq("campaign_id", campaignId);
  const { error } = await supabase
    .from("campaigns")
    .delete()
    .eq("id", campaignId);

  if (error) throw error;
}

export async function addPrizeTemplateService(
  prizeData: Partial<PrizeTemplate>,
  organizationId: string,
): Promise<string> {
  const numericValue =
    parseFloat((prizeData.itemValue ?? "").toString().replace(/[^\d.]/g, "")) ||
    0;

  const payload = {
    organization_id: organizationId,
    name: prizeData.name,
    category: prizeData.category || "voucher",
    stock_quantity: prizeData.totalStock || 100,
    value: numericValue,
    image_url: prizeData.image || null,
    description: prizeData.description || null,
  };

  const { data, error } = await supabase
    .from("prize_templates")
    .insert(payload)
    .select("id")
    .single();

  if (error) throw error;
  return data.id;
}

export async function updatePrizeTemplateService(
  id: string,
  prizeData: Partial<PrizeTemplate>,
): Promise<void> {
  const numericValue =
    parseFloat((prizeData.itemValue ?? "").toString().replace(/[^\d.]/g, "")) ||
    0;

  const payload = {
    name: prizeData.name,
    category: prizeData.category,
    stock_quantity: prizeData.totalStock,
    value: numericValue,
    image_url: prizeData.image || null,
    description: prizeData.description || null,
  };

  const { error } = await supabase
    .from("prize_templates")
    .update(payload)
    .eq("id", id);

  if (error) throw error;
}

export async function deletePrizeTemplateService(id: string): Promise<void> {
  const { error } = await supabase
    .from("prize_templates")
    .delete()
    .eq("id", id);

  if (error) throw error;
}

export async function updatePrizeTemplateStockService(
  id: string,
  newTotalStock: number,
): Promise<void> {
  const { error } = await supabase
    .from("prize_templates")
    .update({ stock_quantity: newTotalStock })
    .eq("id", id);

  if (error) throw error;
}

export interface SaveCampaignInput {
  orgId: string;
  newCamp: {
    id?: string;
    mode?: "create" | "edit" | "update" | "relaunch";
    name: string;
    arabicName?: string;
    heroImageUrl?: string;
    slug: string;
    type: "lucky_wheel" | "quiz";
    startDate: string;
    endDate: string;
    winProbability: number;
    maxEntries?: "1" | "2" | "unlimited";
    parentCampaignId?: string;
    prizes: { templateId?: string; quantity: number; weight: number }[];
    questions: {
      questionText: string;
      options: string[];
      correctIndex: number;
    }[];
  };
  submitStatus: "active" | "draft" | "paused" | "archived";
  isPublishingUpdate?: boolean;
}

export async function createOrUpdateCampaignFullService(
  input: SaveCampaignInput,
  prizes: PrizeTemplate[],
): Promise<{ campaignId: string; isUpdateRelaunch: boolean }> {
  const { orgId, newCamp, submitStatus, isPublishingUpdate } = input;
  const resolvedSlug =
    newCamp.slug.trim() ||
    newCamp.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  // 1. Stock allocation checks
  const prizeAllocationByTemplate = new Map<string, number>();
  for (const allocation of newCamp.prizes) {
    const current = prizeAllocationByTemplate.get(allocation.templateId) ?? 0;
    prizeAllocationByTemplate.set(
      allocation.templateId,
      current + allocation.quantity,
    );
  }

  if (prizeAllocationByTemplate.size === 0) {
    throw new Error(
      "At least one reward allocation is required before saving this campaign.",
    );
  }

  const existingDraftAllocations = new Map<string, number>();
  const campaignIdsToCredit = new Set<string>();
  if (newCamp.mode === "edit" && newCamp.id) {
    campaignIdsToCredit.add(newCamp.id);
  }
  if (newCamp.parentCampaignId) {
    campaignIdsToCredit.add(newCamp.parentCampaignId);
  }

  if (campaignIdsToCredit.size > 0) {
    const { data: existingPrizes, error: existingPrizesError } = await supabase
      .from("prizes")
      .select("prize_template_id, quantity")
      .in("campaign_id", Array.from(campaignIdsToCredit))
      .eq("is_active", true);
    if (existingPrizesError) throw existingPrizesError;

    for (const prize of existingPrizes ?? []) {
      const current =
        existingDraftAllocations.get(prize.prize_template_id) ?? 0;
      existingDraftAllocations.set(
        prize.prize_template_id,
        current + prize.quantity,
      );
    }
  }

  for (const [
    templateId,
    requestedQuantity,
  ] of prizeAllocationByTemplate.entries()) {
    const template = prizes.find((pt) => pt.id === templateId);
    if (!template) {
      throw new Error(
        "One of the selected reward templates is no longer available. Please refresh and retry.",
      );
    }

    const editableExistingQuantity =
      existingDraftAllocations.get(templateId) ?? 0;
    // Real available stock is credited back with what this campaign / parent already had, capped at total stock ceiling
    const maxAllowedQuantity = Math.min(
      template.totalStock,
      template.availableStock + editableExistingQuantity,
    );
    if (requestedQuantity > maxAllowedQuantity) {
      throw new Error(
        `Reward allocation exceeds available stock for "${template.name}". Requested ${requestedQuantity}, available ${maxAllowedQuantity} (Total stock: ${template.totalStock}).`,
      );
    }
  }

  // 2. Unique slug check
  const slugConflictQuery = supabase
    .from("campaigns")
    .select("id, name")
    .eq("organization_id", orgId)
    .eq("slug", resolvedSlug)
    .limit(1);

  const { data: slugConflicts, error: slugConflictError } = newCamp.id
    ? await slugConflictQuery.neq("id", newCamp.id)
    : await slugConflictQuery;

  if (slugConflictError) throw slugConflictError;
  if ((slugConflicts?.length ?? 0) > 0) {
    throw new Error(
      `The portal slug "${resolvedSlug}" is already used by another campaign. Please choose a unique slug.`,
    );
  }

  // 3. Construct campaign payload
  const campaignPayload = {
    organization_id: orgId,
    name: newCamp.name,
    slug: resolvedSlug,
    arabic_name: newCamp.arabicName || null,
    hero_image_url: newCamp.heroImageUrl || null,
    description: null,
    status: isPublishingUpdate ? "draft" : submitStatus,
    start_date: new Date(newCamp.startDate + "T00:00:00Z").toISOString(),
    end_date: new Date(newCamp.endDate + "T23:59:59Z").toISOString(),
    win_probability: newCamp.winProbability / 100,
    max_entries:
      newCamp.maxEntries === "2"
        ? 2
        : newCamp.maxEntries === "unlimited"
          ? 0
          : 1,
    require_quiz: newCamp.type === "quiz",
    require_phone: true,
    source_campaign_id:
      newCamp.mode === "update" ||
      (newCamp.mode === "edit" && newCamp.parentCampaignId)
        ? newCamp.parentCampaignId || null
        : null,
  };

  const isEditingDraft = newCamp.mode === "edit" && Boolean(newCamp.id);
  let camp: { id: string } | null = null;

  if (isEditingDraft && newCamp.id) {
    const { data: existingCampaign, error: existingCampaignError } =
      await supabase
        .from("campaigns")
        .select("id, status, source_campaign_id")
        .eq("id", newCamp.id)
        .single();

    if (existingCampaignError) throw existingCampaignError;
    if (!existingCampaign || existingCampaign.status !== "draft") {
      throw new Error("Only draft campaigns can be edited directly right now.");
    }

    const primaryUpdatePayload = {
      ...campaignPayload,
      source_campaign_id:
        newCamp.parentCampaignId || existingCampaign.source_campaign_id || null,
    };

    const primaryUpdateResult = await supabase
      .from("campaigns")
      .update(primaryUpdatePayload)
      .eq("id", newCamp.id)
      .select()
      .single();

    if (primaryUpdateResult.error) throw primaryUpdateResult.error;
    camp = primaryUpdateResult.data;

    await supabase
      .from("quiz_questions")
      .delete()
      .eq("campaign_id", newCamp.id);
    await supabase.from("prizes").delete().eq("campaign_id", newCamp.id);
  } else {
    const primaryInsertResult = await supabase
      .from("campaigns")
      .insert(campaignPayload)
      .select()
      .single();

    if (primaryInsertResult.error) throw primaryInsertResult.error;
    camp = primaryInsertResult.data;
  }

  if (!camp) throw new Error("Failed to save campaign.");

  // 4. Insert prizes + prize_inventory
  for (const ap of newCamp.prizes) {
    const template = prizes.find((p) => p.id === ap.templateId);
    if (!template) continue;

    const { data: prize, error: prizeErr } = await supabase
      .from("prizes")
      .insert({
        campaign_id: camp.id,
        organization_id: orgId,
        prize_template_id: ap.templateId,
        name: template.name,
        quantity: ap.quantity,
        weight: ap.weight,
        probability: 0,
        is_active: true,
      })
      .select()
      .single();

    if (prizeErr) throw prizeErr;

    const { error: invErr } = await supabase.from("prize_inventory").insert({
      prize_id: prize.id,
      campaign_id: camp.id,
      organization_id: orgId,
      initial_quantity: ap.quantity,
      remaining: ap.quantity,
    });
    if (invErr) throw invErr;
  }

  // 5. Insert quiz questions if type is quiz
  if (newCamp.type === "quiz") {
    for (let i = 0; i < newCamp.questions.length; i++) {
      const q = newCamp.questions[i];
      const { error: qErr } = await supabase.from("quiz_questions").insert({
        campaign_id: camp.id,
        organization_id: orgId,
        question: q.questionText,
        options: q.options,
        correct_option_index: q.correctIndex,
        position: i + 1,
        is_active: true,
      });
      if (qErr) throw qErr;
    }
  }

  // 6. Relaunch/update handling
  let isUpdateRelaunch = false;
  if (isPublishingUpdate && newCamp.parentCampaignId) {
    const { data: sourceCampaign, error: sourceCampaignError } = await supabase
      .from("campaigns")
      .select("id, status")
      .eq("id", newCamp.parentCampaignId)
      .single();
    if (sourceCampaignError) throw sourceCampaignError;

    if (
      sourceCampaign &&
      ["active", "paused"].includes(sourceCampaign.status)
    ) {
      const { error: endError } = await supabase
        .from("campaigns")
        .update({ status: "ended" })
        .eq("id", newCamp.parentCampaignId);
      if (endError) throw endError;

      const { error: launchError } = await supabase
        .from("campaigns")
        .update({ status: "active" })
        .eq("id", camp.id);
      if (launchError) throw launchError;

      isUpdateRelaunch = true;
    }
  }

  return { campaignId: camp.id, isUpdateRelaunch };
}
