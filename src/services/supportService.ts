import { supabase } from "../lib/supabase";
import {
  mapSupportTicket,
  toSupportErrorMessage,
  validateSupportTicketInput,
  type DbSupportTicketRow,
  type SupportTicketInput,
} from "../lib/support";
import type { SupportTicket } from "../types";

/** A ticket that could not be sent; `message` is fit to show to the client. */
export class SupportTicketError extends Error {
  constructor(
    message: string,
    readonly fieldErrors: ReturnType<typeof validateSupportTicketInput> = {},
  ) {
    super(message);
    this.name = "SupportTicketError";
  }
}

/**
 * Opens a support ticket for the signed-in client. The organization and the account details
 * (email, phone, plan) are taken from the account by the database, never from here: the
 * client only says what is wrong.
 */
export async function createSupportTicketService(
  input: SupportTicketInput,
): Promise<SupportTicket> {
  const fieldErrors = validateSupportTicketInput(input);
  if (Object.keys(fieldErrors).length > 0) {
    throw new SupportTicketError(
      "Check the fields of the ticket and try again.",
      fieldErrors,
    );
  }

  const { data, error } = await supabase.rpc("create_support_ticket", {
    p_platform_section: input.platformSection,
    p_type: input.type,
    p_severity: input.severity,
    p_description: input.description.trim(),
  });

  if (error || !data) {
    if (error) console.error("[createSupportTicketService]", error);
    throw new SupportTicketError(toSupportErrorMessage(error));
  }
  return mapSupportTicket(data as DbSupportTicketRow);
}
