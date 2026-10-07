import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("../lib/supabase", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

import {
  addSupportCommentService,
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

  it("accepts a problem that belongs to no part of the platform", async () => {
    rpc.mockResolvedValue({
      data: { ...ROW, platform_section: "other" },
      error: null,
    });
    const ticket = await createSupportTicketService({
      ...INPUT,
      platformSection: "other",
    });
    expect(rpc).toHaveBeenCalledWith(
      "create_support_ticket",
      expect.objectContaining({ p_platform_section: "other" }),
    );
    expect(ticket.platformSection).toBe("other");
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

describe("addSupportCommentService", () => {
  const COMMENT_ROW = {
    id: "c1",
    ticket_id: "t1",
    author_id: "user-1",
    author_name: "Ops",
    author_type: "client",
    body: "It still happens.",
    created_at: "2026-10-06T08:00:00Z",
  };

  it("sends only the ticket and the words, and returns the comment the database made", async () => {
    rpc.mockResolvedValue({ data: COMMENT_ROW, error: null });
    const comment = await addSupportCommentService(
      "t1",
      "  It still happens.  ",
    );

    expect(rpc).toHaveBeenCalledWith("add_support_ticket_comment", {
      p_ticket_id: "t1",
      p_body: "It still happens.",
    });
    // No author, organization or type in the request: the database takes them from the account,
    // so a client cannot sign a comment as another person or as the support team.
    const sent = rpc.mock.calls[0][1] as Record<string, unknown>;
    expect(Object.keys(sent).sort()).toEqual(["p_body", "p_ticket_id"]);
    expect(comment).toMatchObject({
      id: "c1",
      ticketId: "t1",
      authorType: "client",
      body: "It still happens.",
    });
  });

  it("refuses an empty or too long comment before any request", async () => {
    await expect(addSupportCommentService("t1", "   ")).rejects.toBeInstanceOf(
      SupportTicketError,
    );
    await expect(addSupportCommentService("t1", "")).rejects.toThrow(
      /Write your comment/,
    );
    await expect(
      addSupportCommentService("t1", "x".repeat(2001)),
    ).rejects.toThrow(/limited to 2000/);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("tells the client in words when the ticket is closed", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: { message: "SUPPORT_TICKET_CLOSED: this ticket is closed" },
    });
    await expect(addSupportCommentService("t1", "Hello there")).rejects.toThrow(
      /closed.*new ticket/,
    );
  });

  it("never shows a raw error, whatever the database says", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: {
        message: 'permission denied for table "support_ticket_comments"',
      },
    });
    await expect(addSupportCommentService("t1", "Hello there")).rejects.toThrow(
      "We could not send your comment. Please try again.",
    );
  });

  it("treats an empty answer as a failure", async () => {
    rpc.mockResolvedValue({ data: null, error: null });
    await expect(
      addSupportCommentService("t1", "Hello there"),
    ).rejects.toBeInstanceOf(SupportTicketError);
  });
});
