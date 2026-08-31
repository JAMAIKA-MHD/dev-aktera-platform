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
    gameType:
      "lucky_wheel" | "quiz" | "scratch_card" | "mystery_box" | "hit_it";
    gameLogicConfig?: any;
    startDate: string;
    endDate: string;
    winProbability: number;
    autoPacePrizes?: boolean;
    maxEntries?: "1" | "2" | "unlimited";
    parentCampaignId?: string;
    playerScreenConfig?: any;
    prizes: { templateId?: string; quantity: number; weight: number }[];
    questions: {
      questionText: string;
      options: string[];
      correctIndex: number;
    }[];
  };
  submitStatus: "active" | "draft" | "paused" | "archived";
}

export interface CampaignSaveResult {
  success: boolean;
  campaignId?: string;
  errors?: { field: string; message: string }[];
}

export async function createOrUpdateCampaignFullService(
  input: SaveCampaignInput,
  _prizes?: PrizeTemplate[],
): Promise<CampaignSaveResult> {
  const { orgId, newCamp, submitStatus } = input;
  const resolvedSlug =
    newCamp.slug.trim() ||
    newCamp.name
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "");

  const prizesPayload = (newCamp.prizes || [])
    .filter((p) => Boolean(p.templateId))
    .map((p) => ({
      template_id: p.templateId,
      quantity: Number(p.quantity) || 0,
      weight: Number(p.weight) || 0,
    }));

  const questionsPayload = (newCamp.questions || []).map((q: any) => ({
    id: q.id || null,
    question: q.questionText,
    options: q.options,
    correct_index: q.correctIndex,
  }));

  const isEditingExisting =
    (newCamp.mode === "edit" || newCamp.mode === "update") &&
    Boolean(newCamp.id);

  const rpcParams = {
    p_campaign_id: isEditingExisting ? newCamp.id : null,
    p_organization_id: orgId,
    p_name: newCamp.name.trim(),
    p_slug: resolvedSlug,
    p_arabic_name: newCamp.arabicName?.trim() || null,
    p_hero_image_url: newCamp.heroImageUrl || null,
    p_description: null,
    p_status: submitStatus || "active",
    p_start_date: new Date(newCamp.startDate + "T00:00:00Z").toISOString(),
    p_end_date: new Date(newCamp.endDate + "T23:59:59Z").toISOString(),
    p_win_probability: Number(newCamp.winProbability) / 100,
    p_max_entries:
      newCamp.maxEntries === "2"
        ? 2
        : newCamp.maxEntries === "unlimited"
          ? 0
          : 1,
    p_require_quiz: newCamp.gameType === "quiz",
    p_prizes: prizesPayload,
    p_questions: questionsPayload,
    p_auto_pace_prizes: Boolean(newCamp.autoPacePrizes),
    p_player_screen_config: newCamp.playerScreenConfig || null,
    p_game_type: newCamp.gameType,
    p_game_logic_config: newCamp.gameLogicConfig || {},
  };

  const { data, error } = await supabase.rpc(
    "save_campaign_full_in_place",
    rpcParams,
  );

  if (error) {
    return {
      success: false,
      errors: [{ field: "general", message: error.message }],
    };
  }

  const result = data as {
    success: boolean;
    campaign_id?: string;
    errors?: { field: string; message: string }[];
  };

  if (!result.success) {
    return {
      success: false,
      errors:
        result.errors && result.errors.length > 0
          ? result.errors
          : [{ field: "general", message: "Failed to save campaign." }],
    };
  }

  return {
    success: true,
    campaignId: result.campaign_id,
    errors: [],
  };
}
