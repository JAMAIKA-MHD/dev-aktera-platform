// Client support: the choices of a ticket, their labels, and the checks made before a ticket is
// sent. The database checks the same rules again (create_support_ticket); these only give an
// answer before the round trip.
import type {
  SupportPlatformSection,
  SupportSeverity,
  SupportTicket,
  SupportTicketComment,
  SupportTicketState,
  SupportTicketType,
} from "../types";

export const SUPPORT_DESCRIPTION_MIN = 10;
export const SUPPORT_DESCRIPTION_MAX = 2000;
export const SUPPORT_COMMENT_MAX = 2000;

interface Option<T extends string> {
  value: T;
  label: string;
}

export const SUPPORT_SECTIONS: readonly Option<SupportPlatformSection>[] = [
  { value: "campaign_creation", label: "Campaign creation" },
  { value: "analytics", label: "Analytics" },
  { value: "inventory", label: "Inventory" },
  { value: "player_screen_editor", label: "Player screen editor" },
  // A problem that belongs to none of the parts above.
  { value: "other", label: "Other" },
];

export const SUPPORT_TYPES: readonly Option<SupportTicketType>[] = [
  { value: "platform_error", label: "Error in the platform" },
  { value: "platform_slowness", label: "Platform slowness" },
  { value: "other", label: "Other" },
];

export const SUPPORT_SEVERITIES: readonly Option<SupportSeverity>[] = [
  { value: "low", label: "Low" },
  { value: "medium", label: "Medium" },
  { value: "high", label: "High" },
  { value: "urgent", label: "Urgent" },
];

export const SUPPORT_STATES: readonly Option<SupportTicketState>[] = [
  { value: "new", label: "New" },
  { value: "open", label: "Open" },
  { value: "on_hold", label: "On hold" },
  { value: "cancelled", label: "Cancelled" },
  { value: "resolved", label: "Resolved" },
];

const labelOf = <T extends string>(options: readonly Option<T>[], value: T) =>
  options.find((option) => option.value === value)?.label ?? value;

export const sectionLabel = (value: SupportPlatformSection) =>
  labelOf(SUPPORT_SECTIONS, value);
export const typeLabel = (value: SupportTicketType) =>
  labelOf(SUPPORT_TYPES, value);
export const severityLabel = (value: SupportSeverity) =>
  labelOf(SUPPORT_SEVERITIES, value);
export const stateLabel = (value: SupportTicketState) =>
  labelOf(SUPPORT_STATES, value);

const PLAN_LABELS: Record<SupportTicket["plan"], string> = {
  free: "Free",
  starter: "Starter",
  pro: "Pro",
  enterprise: "Enterprise",
};

export const planLabel = (plan: SupportTicket["plan"]) => PLAN_LABELS[plan];

/** "SUP-0042": the reference a client quotes to the support team. */
export function formatTicketNumber(ticketNumber: number): string {
  return `SUP-${String(ticketNumber).padStart(4, "0")}`;
}

/** What the client fills in; everything else about the ticket comes from the account. */
export interface SupportTicketInput {
  platformSection: SupportPlatformSection | "";
  type: SupportTicketType | "";
  severity: SupportSeverity | "";
  description: string;
}

export type SupportTicketErrors = Partial<
  Record<keyof SupportTicketInput, string>
>;

const isOneOf = <T extends string>(
  options: readonly Option<T>[],
  value: string,
): value is T => options.some((option) => option.value === value);

/** The problems of a ticket before it is sent, by field; empty when it can be sent. */
export function validateSupportTicketInput(
  input: SupportTicketInput,
): SupportTicketErrors {
  const errors: SupportTicketErrors = {};
  if (!isOneOf(SUPPORT_SECTIONS, input.platformSection)) {
    errors.platformSection = "Choose the part of the platform concerned.";
  }
  if (!isOneOf(SUPPORT_TYPES, input.type)) {
    errors.type = "Choose the type of problem.";
  }
  if (!isOneOf(SUPPORT_SEVERITIES, input.severity)) {
    errors.severity = "Choose how severe it is.";
  }
  const length = input.description.trim().length;
  if (length < SUPPORT_DESCRIPTION_MIN) {
    errors.description = `Describe the problem in at least ${SUPPORT_DESCRIPTION_MIN} characters.`;
  } else if (length > SUPPORT_DESCRIPTION_MAX) {
    errors.description = `The description is limited to ${SUPPORT_DESCRIPTION_MAX} characters.`;
  }
  return errors;
}

/** A ticket that is resolved or cancelled takes no more comments: a new ticket starts afresh. */
export const isTicketClosed = (state: SupportTicketState): boolean =>
  state === "resolved" || state === "cancelled";

/** The problem of a comment before it is sent, or null when it can be sent. */
export function validateSupportComment(body: string): string | null {
  const length = body.trim().length;
  if (length < 1) return "Write your comment first.";
  if (length > SUPPORT_COMMENT_MAX) {
    return `A comment is limited to ${SUPPORT_COMMENT_MAX} characters.`;
  }
  return null;
}

/**
 * A message for the client from what the database answered (see the migrations): for a ticket
 * that is being opened, or for a comment on one.
 */
export function toSupportErrorMessage(
  error: unknown,
  subject: "ticket" | "comment" = "ticket",
): string {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === "object" && error !== null && "message" in error
        ? String((error as { message: unknown }).message)
        : "";
  if (message.includes("SUPPORT_RATE_LIMITED")) {
    return subject === "comment"
      ? "You have sent many comments in the last hour. Please wait a little."
      : "You have sent several tickets in the last hour. Please wait a little: we have received them.";
  }
  if (message.includes("SUPPORT_TICKET_CLOSED")) {
    return "This ticket is closed. Open a new ticket if the problem is back.";
  }
  if (message.includes("SUPPORT_TICKET_NOT_FOUND")) {
    return "This ticket could not be found. Reload the page and try again.";
  }
  if (message.includes("SUPPORT_NO_ORGANIZATION")) {
    return "Finish setting up your organization before contacting support.";
  }
  if (message.includes("SUPPORT_UNAUTHENTICATED")) {
    return "Your session has expired. Sign in again to contact support.";
  }
  if (message.includes("SUPPORT_INVALID_INPUT")) {
    return subject === "comment"
      ? "Your comment is not valid. Check it and try again."
      : "Some information of the ticket is not valid. Check the fields and try again.";
  }
  if (/network|fetch/i.test(message)) {
    return "Connection issue. Please check your internet and try again.";
  }
  return subject === "comment"
    ? "We could not send your comment. Please try again."
    : "We could not send your ticket. Please try again.";
}

// ── DB row shape (snake_case, 1:1 with `support_tickets`) and its mapping ────

export interface DbSupportTicketRow {
  id: string;
  ticket_number: number;
  organization_id: string;
  contact_email: string;
  contact_phone: string | null;
  plan: SupportTicket["plan"];
  platform_section: SupportTicket["platformSection"];
  type: SupportTicket["type"];
  severity: SupportTicket["severity"];
  description: string;
  state: SupportTicket["state"];
  resolved_at: string | null;
  created_at: string;
  updated_at: string;
  // PostgREST's embedded count of the comments: `support_ticket_comments(count)`.
  support_ticket_comments?: { count: number }[];
}

export function mapSupportTicket(row: DbSupportTicketRow): SupportTicket {
  return {
    id: row.id,
    // bigint identity: PostgREST sends it as a number.
    ticketNumber: Number(row.ticket_number),
    organizationId: row.organization_id,
    contactEmail: row.contact_email,
    contactPhone: row.contact_phone,
    plan: row.plan,
    platformSection: row.platform_section,
    type: row.type,
    severity: row.severity,
    description: row.description,
    state: row.state,
    resolvedAt: row.resolved_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    commentsCount: Number(row.support_ticket_comments?.[0]?.count ?? 0),
  };
}

export interface DbSupportCommentRow {
  id: string;
  ticket_id: string;
  author_id: string | null;
  author_name: string;
  author_type: SupportTicketComment["authorType"];
  body: string;
  created_at: string;
}

export function mapSupportComment(
  row: DbSupportCommentRow,
): SupportTicketComment {
  return {
    id: row.id,
    ticketId: row.ticket_id,
    authorId: row.author_id,
    authorName: row.author_name,
    authorType: row.author_type,
    body: row.body,
    createdAt: row.created_at,
  };
}
