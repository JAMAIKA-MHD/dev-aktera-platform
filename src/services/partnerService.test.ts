import { beforeEach, describe, expect, it, vi } from "vitest";

// A chainable stand-in for a Supabase query: every method records its call and returns the same
// chain; awaiting it gives the configured result.
type Call = { method: string; args: unknown[] };
const mock = vi.hoisted(() => ({
  calls: [] as Call[],
  result: { data: null, error: null } as { data: unknown; error: unknown },
}));

vi.mock("../lib/supabase", () => ({
  supabase: {
    from: () => {
      const chain: unknown = new Proxy(
        {},
        {
          get: (_target, method: string) => {
            if (method === "then") {
              return (resolve: (value: unknown) => void) =>
                resolve(mock.result);
            }
            return (...args: unknown[]) => {
              mock.calls.push({ method, args });
              return chain;
            };
          },
        },
      );
      return chain;
    },
  },
}));

import { createPartner, deletePartner, fetchPartners } from "./partnerService";

const row = {
  id: "p1",
  name: "Acme Gifts",
  description: "Gift cards",
  website_url: "https://acme.example",
  contact_name: null,
  contact_email: "hello@acme.example",
  contact_phone: null,
  created_at: "2026-10-13T10:00:00Z",
};

const input = {
  name: "  Acme Gifts ",
  description: "",
  websiteUrl: "https://acme.example",
  contactName: "",
  contactEmail: "hello@acme.example",
  contactPhone: "",
};

const sent = (method: string) =>
  mock.calls.find((c) => c.method === method)?.args[0];

beforeEach(() => {
  mock.calls.length = 0;
  mock.result = { data: null, error: null };
});

describe("partnerService", () => {
  it("lists the partners of the organization, mapped", async () => {
    mock.result = { data: [row], error: null };
    const partners = await fetchPartners("org1");
    expect(partners).toEqual([
      {
        id: "p1",
        name: "Acme Gifts",
        description: "Gift cards",
        websiteUrl: "https://acme.example",
        contactName: null,
        contactEmail: "hello@acme.example",
        contactPhone: null,
        createdAt: "2026-10-13T10:00:00Z",
      },
    ]);
    expect(mock.calls).toContainEqual({
      method: "eq",
      args: ["organization_id", "org1"],
    });
  });

  it("adds a partner with the organization and clean values", async () => {
    mock.result = { data: row, error: null };
    const created = await createPartner("org1", input);
    expect(created.name).toBe("Acme Gifts");
    expect(sent("insert")).toEqual({
      organization_id: "org1",
      name: "Acme Gifts",
      description: null,
      website_url: "https://acme.example",
      contact_name: null,
      contact_email: "hello@acme.example",
      contact_phone: null,
    });
  });

  it("explains a duplicate name", async () => {
    mock.result = {
      data: null,
      error: {
        code: "23505",
        message: 'duplicate key value violates unique constraint "x"',
      },
    };
    await expect(createPartner("org1", input)).rejects.toThrow(
      "A partner with this name is already in your list.",
    );
  });

  it("explains a refusal for lack of rights", async () => {
    mock.result = {
      data: null,
      error: { code: "42501", message: "row-level security" },
    };
    await expect(createPartner("org1", input)).rejects.toThrow(
      "You are not allowed to add a partner.",
    );
  });

  it("never shows a technical error as is", async () => {
    mock.result = {
      data: null,
      error: { code: "XX000", message: "connection to postgres lost" },
    };
    await expect(createPartner("org1", input)).rejects.toThrow(
      /could not add this partner/i,
    );
  });

  it("removes a partner", async () => {
    mock.result = { data: [{ id: "p1" }], error: null };
    await expect(deletePartner("p1")).resolves.toBeUndefined();
    expect(mock.calls).toContainEqual({ method: "eq", args: ["id", "p1"] });
  });

  it("says so when nothing was removed (a viewer, or already gone)", async () => {
    mock.result = { data: [], error: null };
    await expect(deletePartner("p1")).rejects.toThrow(
      "You are not allowed to remove this partner.",
    );
  });
});
