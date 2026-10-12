import { supabase } from "../lib/supabase";
import { toFriendlyErrorMessage } from "../lib/errorMessages";
import type { DeliveryStatus, PhysicalWinner } from "../types";

// Delivery of physical rewards: the brand hands them over itself, AKTERA only records the
// status. Reads go through the entries RLS (one organization); the only write is the
// set_entry_delivery_status RPC, which checks the role and the kind of reward.

const MAX_WINNERS = 500;

interface DbPrizeRef {
  name: string;
  prize_template_id: string;
}

interface DbWinnerRow {
  id: string;
  phone_number: string | null;
  participant_name: string | null;
  created_at: string;
  delivery_status: string | null;
  delivered_at: string | null;
  prizes: DbPrizeRef | DbPrizeRef[] | null;
}

const toStatus = (value: string | null): DeliveryStatus =>
  value === "delivered" ? "delivered" : "not_delivered";

/** Winners of physical rewards, newest first (all rewards, or one reward template). */
export async function fetchPhysicalWinners(
  organizationId: string,
  templateId?: string,
): Promise<PhysicalWinner[]> {
  let query = supabase
    .from("entries")
    .select(
      "id, phone_number, participant_name, created_at, delivery_status, delivered_at, prizes!inner(name, prize_template_id, prize_templates!inner(category))",
    )
    .eq("organization_id", organizationId)
    .eq("is_winner", true)
    .eq("prizes.prize_templates.category", "physical")
    .order("created_at", { ascending: false })
    .limit(MAX_WINNERS);
  if (templateId) query = query.eq("prizes.prize_template_id", templateId);

  const { data, error } = await query;
  if (error) throw error;

  return ((data ?? []) as unknown as DbWinnerRow[]).map((row) => {
    const prize = Array.isArray(row.prizes) ? row.prizes[0] : row.prizes;
    return {
      entryId: row.id,
      phoneNumber: row.phone_number,
      participantName: row.participant_name,
      prizeName: prize?.name ?? "Reward",
      wonAt: row.created_at,
      deliveryStatus: toStatus(row.delivery_status),
      deliveredAt: row.delivered_at,
    };
  });
}

/** Records that a physical reward was (or was not yet) handed over. Throws a readable message. */
export async function setDeliveryStatus(
  entryId: string,
  status: DeliveryStatus,
): Promise<void> {
  const { error } = await supabase.rpc("set_entry_delivery_status", {
    p_entry_id: entryId,
    p_status: status,
  });
  if (error) {
    throw new Error(
      toFriendlyErrorMessage(
        error.message,
        "We could not update the delivery status. Please try again.",
      ),
    );
  }
}
