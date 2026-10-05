import { describe, expect, it } from "vitest";

import {
  formatTicketNumber,
  mapSupportTicket,
  planLabel,
  SUPPORT_DESCRIPTION_MAX,
  SUPPORT_SECTIONS,
  SUPPORT_SEVERITIES,
  SUPPORT_STATES,
  SUPPORT_TYPES,
  toSupportErrorMessage,
  validateSupportTicketInput,
  type DbSupportTicketRow,
  type SupportTicketInput,
} from "./support";

const VALID: SupportTicketInput = {
  platformSection: "analytics",
  type: "platform_error",
  severity: "high",
  description: "The analytics page stays empty after a campaign ends.",
};

describe("the choices of a ticket", () => {
  it("offers exactly what the issue asks for", () => {
    expect(SUPPORT_SECTIONS.map((o) => o.label)).toEqual([
      "Campaign creation",
      "Analytics",
      "Inventory",
      "Player screen editor",
    ]);
    expect(SUPPORT_TYPES.map((o) => o.value)).toEqual([
      "platform_error",
      "platform_slowness",
      "other",
    ]);
    expect(SUPPORT_SEVERITIES.map((o) => o.label)).toEqual([
      "Low",
      "Medium",
      "High",
      "Urgent",
    ]);
    expect(SUPPORT_STATES.map((o) => o.value)).toEqual([
      "new",
      "open",
      "on_hold",
      "cancelled",
      "resolved",
    ]);
  });

  it("formats the reference a client quotes, and the plan", () => {
    expect(formatTicketNumber(7)).toBe("SUP-0007");
    expect(formatTicketNumber(1234)).toBe("SUP-1234");
    expect(formatTicketNumber(12345)).toBe("SUP-12345");
    expect(planLabel("enterprise")).toBe("Enterprise");
  });
});

describe("validateSupportTicketInput", () => {
  it("accepts a complete ticket", () => {
    expect(validateSupportTicketInput(VALID)).toEqual({});
  });

  it("asks for every choice and for a description", () => {
    const errors = validateSupportTicketInput({
      platformSection: "",
      type: "",
      severity: "",
      description: "",
    });
    expect(Object.keys(errors).sort()).toEqual([
      "description",
      "platformSection",
      "severity",
      "type",
    ]);
  });

  it("refuses a value that is not one of the choices", () => {
    const errors = validateSupportTicketInput({
      ...VALID,
      severity: "critical" as never,
    });
    expect(errors.severity).toBeDefined();
    expect(errors.type).toBeUndefined();
  });

  it("counts the description without its surrounding spaces", () => {
    expect(
      validateSupportTicketInput({ ...VALID, description: "   short   " })
        .description,
    ).toMatch(/at least 10/);
    expect(
      validateSupportTicketInput({ ...VALID, description: "ten chars!" }),
    ).toEqual({});
    expect(
      validateSupportTicketInput({
        ...VALID,
        description: "x".repeat(SUPPORT_DESCRIPTION_MAX),
      }),
    ).toEqual({});
    expect(
      validateSupportTicketInput({
        ...VALID,
        description: "x".repeat(SUPPORT_DESCRIPTION_MAX + 1),
      }).description,
    ).toMatch(/limited to 2000/);
  });
});

describe("toSupportErrorMessage", () => {
  it("turns what the database answers into a sentence for the client", () => {
    expect(
      toSupportErrorMessage(
        new Error("SUPPORT_RATE_LIMITED: too many tickets in the last hour"),
      ),
    ).toMatch(/last hour/);
    expect(
      toSupportErrorMessage({ message: "SUPPORT_NO_ORGANIZATION: none" }),
    ).toMatch(/organization/);
    expect(
      toSupportErrorMessage({ message: "SUPPORT_UNAUTHENTICATED: sign in" }),
    ).toMatch(/Sign in again/);
    expect(
      toSupportErrorMessage({ message: "SUPPORT_INVALID_INPUT: severity" }),
    ).toMatch(/not valid/);
    expect(
      toSupportErrorMessage({ message: "TypeError: Failed to fetch" }),
    ).toMatch(/Connection issue/);
  });

  it("never lets a raw database message through", () => {
    const message = toSupportErrorMessage({
      message:
        'new row violates check constraint "support_tickets_state_check"',
    });
    expect(message).toBe("We could not send your ticket. Please try again.");
    expect(toSupportErrorMessage(null)).toBe(message);
  });
});

describe("mapSupportTicket", () => {
  it("maps the row of the table to a ticket", () => {
    const row: DbSupportTicketRow = {
      id: "t1",
      ticket_number: "42" as unknown as number, // a bigint can arrive as text
      organization_id: "org-1",
      contact_email: "ops@brand.dz",
      contact_phone: null,
      plan: "pro",
      platform_section: "inventory",
      type: "platform_slowness",
      severity: "urgent",
      description: "Importing 5000 vouchers never ends.",
      state: "on_hold",
      resolved_at: null,
      created_at: "2026-10-05T10:00:00Z",
      updated_at: "2026-10-05T11:00:00Z",
    };
    expect(mapSupportTicket(row)).toEqual({
      id: "t1",
      ticketNumber: 42,
      organizationId: "org-1",
      contactEmail: "ops@brand.dz",
      contactPhone: null,
      plan: "pro",
      platformSection: "inventory",
      type: "platform_slowness",
      severity: "urgent",
      description: "Importing 5000 vouchers never ends.",
      state: "on_hold",
      resolvedAt: null,
      createdAt: "2026-10-05T10:00:00Z",
      updatedAt: "2026-10-05T11:00:00Z",
    });
  });
});
