import { supabase } from "../lib/supabase";

export interface TemplateItemRow {
  id: string;
  prize_template_id: string;
  item_index: number;
  item_value: string | null;
  source_type: "manual" | "bulk";
}

export async function fetchTemplateItemsService(
  prizeTemplateId: string,
): Promise<TemplateItemRow[]> {
  const { data, error } = await supabase
    .from("prize_template_items")
    .select("id, prize_template_id, item_index, item_value, source_type")
    .eq("prize_template_id", prizeTemplateId)
    .order("item_index", { ascending: true });

  if (error) throw error;
  return ((data ?? []) as TemplateItemRow[]).sort(
    (a, b) => a.item_index - b.item_index,
  );
}

export async function createMissingTemplateItemsService(
  missingRows: {
    prize_template_id: string;
    organization_id: string;
    item_index: number;
    item_value: string | null;
    source_type: "manual";
  }[],
): Promise<void> {
  if (missingRows.length === 0) return;
  const { error } = await supabase
    .from("prize_template_items")
    .insert(missingRows);
  if (error) throw error;
}

export async function updateSingleTemplateItemService(
  id: string,
  itemValue: string | null,
): Promise<void> {
  const { error } = await supabase
    .from("prize_template_items")
    .update({
      item_value: itemValue,
      source_type: "manual",
    })
    .eq("id", id);

  if (error) throw error;
}

export async function bulkUpdateTemplateItemsService(
  items: { id: string; item_value: string | null }[],
): Promise<void> {
  if (items.length === 0) return;

  const updates = items.map((item) =>
    supabase
      .from("prize_template_items")
      .update({
        item_value: item.item_value,
        source_type: "bulk",
      })
      .eq("id", item.id),
  );

  await Promise.all(updates);
}
