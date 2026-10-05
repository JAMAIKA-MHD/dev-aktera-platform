import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("../lib/supabase", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

import {
  createSupportTicketService,
  SupportTicketError,
} from "./supportService";

const INPUT = {
  platformSection: "campaign_creation" as const,
  type: "other" as const,
  severity: "low" as const,
  description: "  How do I duplicate a finished campaign?  ",
};

const ROW = {
  id: "t1",
  ticket_number: 3,
  organization_id: "org-1",
  contact_email: "ops@brand.dz",
  contact_phone: "0557882828",
  plan: "free",
  platform_section: "campaign_creation",
  type: "other",
  severity: "low",
  description: "How do I duplicate a finished campaign?",
  state: "new",
  resolved_at: null,
  created_at: "2026-10-05T10:00:00Z",
  updated_at: "2026-10-05T10:00:00Z",
};

beforeEach(() => {
  rpc.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("createSupportTicketService", () => {
  it("sends only what the client said, and returns the ticket the database made", async () => {
    rpc.mockResolvedValue({ data: ROW, error: null });
    const ticket = await createSupportTicketService(INPUT);

    expect(rpc).toHaveBeenCalledWith("create_support_ticket", {
      p_platform_section: "campaign_creation",
      p_type: "other",
      p_severity: "low",
      // Trimmed.
      p_description: "How do I duplicate a finished campaign?",
    });
    // No organization, email, plan or phone in the request: the database takes them from the
    // account, so a client cannot write another client's details on a ticket.
    const sent = rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(sent).sort()).toEqual([
      "p_description",
      "p_platform_section",
      "p_severity",
      "p_type",
    ]);
    expect(ticket).toMatchObject({
      id: "t1",
      ticketNumber: 3,
      state: "new",
      contactEmail: "ops@brand.dz",
    });
  });

  it("refuses an invalid ticket before any request", async () => {
    const attempt = createSupportTicketService({
      ...INPUT,
      description: "short",
      severity: "" as never,
    });
    await expect(attempt).rejects.toBeInstanceOf(SupportTicketError);
    await expect(attempt).rejects.toMatchObject({
      fieldErrors: {
        description: expect.stringContaining("at least 10"),
        severity: expect.any(String),
      },
    });
    expect(rpc).not.toHaveBeenCalled();
  });

  it("tells the client in words when the database refuses", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: {
        message: "SUPPORT_RATE_LIMITED: too many tickets in the last hour",
      },
    });
    await expect(createSupportTicketService(INPUT)).rejects.toThrow(
      /last hour/,
    );
  });

  it("never shows a raw error, whatever the database says", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: 'permission denied for table "support_tickets"' },
    });
    await expect(createSupportTicketService(INPUT)).rejects.toThrow(
      "We could not send your ticket. Please try again.",
    );
  });

  it("treats an empty answer as a failure", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(createSupportTicketService(INPUT)).rejects.toBeInstanceOf(
      SupportTicketError,
    );
  });
});
