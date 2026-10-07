import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SupportTicket, SupportTicketComment } from "../../types";

const rpc = vi.fn();
vi.mock("../../lib/supabase", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({
    organization: {
      id: "org-1",
      contact_email: "contact@brand.dz",
      phone_number: "0557882828",
      plan: "pro",
    },
    profile: { id: "user-1", email: "ops@brand.dz" },
  }),
}));

const hook = {
  tickets: [] as SupportTicket[],
  loading: false,
  error: null as string | null,
  refetch: vi.fn(),
};
vi.mock("../../hooks/useSupportTickets", () => ({
  useSupportTickets: () => hook,
}));

// The thread of the ticket opened in the detail window.
const commentsHook = {
  comments: [] as SupportTicketComment[],
  loading: false,
  error: null as string | null,
  refetch: vi.fn(),
};
vi.mock("../../hooks/useSupportComments", () => ({
  useSupportComments: () => commentsHook,
}));

import { ClientSupport } from "./ClientSupport";

function ticket(
  patch: Partial<SupportTicket> & { ticketNumber: number },
): SupportTicket {
  return {
    id: `t${patch.ticketNumber}`,
    organizationId: "org-1",
    contactEmail: "ops@brand.dz",
    contactPhone: "0557882828",
    plan: "pro",
    platformSection: "analytics",
    type: "platform_error",
    severity: "medium",
    description: "Something is wrong.",
    state: "new",
    resolvedAt: null,
    createdAt: "2026-10-01T10:00:00Z",
    updatedAt: "2026-10-01T10:00:00Z",
    commentsCount: 0,
    ...patch,
  };
}

const TICKETS: SupportTicket[] = [
  ticket({
    ticketNumber: 1,
    platformSection: "campaign_creation",
    type: "platform_slowness",
    severity: "low",
    state: "resolved",
    resolvedAt: "2026-10-03T09:00:00Z",
    createdAt: "2026-09-28T10:00:00Z",
    description: "The wizard takes ten seconds to open.",
  }),
  ticket({
    ticketNumber: 2,
    platformSection: "inventory",
    severity: "urgent",
    state: "open",
    commentsCount: 3,
    createdAt: "2026-10-04T10:00:00Z",
    description: "Importing a voucher list never ends.\nTried three times.",
  }),
  ticket({
    ticketNumber: 3,
    platformSection: "player_screen_editor",
    type: "other",
    severity: "high",
    state: "on_hold",
    createdAt: "2026-10-02T10:00:00Z",
    description: "How do I change the font of the welcome screen?",
  }),
];

const CREATED_ROW = {
  id: "t9",
  ticket_number: 9,
  organization_id: "org-1",
  contact_email: "ops@brand.dz",
  contact_phone: "0557882828",
  plan: "pro",
  platform_section: "analytics",
  type: "platform_error",
  severity: "high",
  description: "The analytics page stays empty after a campaign ends.",
  state: "new",
  resolved_at: null,
  created_at: "2026-10-05T10:00:00Z",
  updated_at: "2026-10-05T10:00:00Z",
};

const table = () => screen.getByRole("table", { name: "Your support tickets" });
const bodyRows = () => within(table()).getAllByRole("row").slice(1);

beforeEach(() => {
  rpc.mockReset();
  hook.tickets = TICKETS;
  hook.loading = false;
  hook.error = null;
  hook.refetch = vi.fn();
  commentsHook.comments = [];
  commentsHook.loading = false;
  commentsHook.error = null;
  commentsHook.refetch = vi.fn();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("ClientSupport: the history", () => {
  it("lists the tickets, the most recent first", () => {
    render(<ClientSupport />);
    expect(
      screen.getByRole("heading", { name: "Client support" }),
    ).toBeTruthy();
    expect(
      bodyRows().map((row) => within(row).getAllByRole("cell")[0].textContent),
    ).toEqual(["SUP-0002", "SUP-0003", "SUP-0001"]);
    expect(screen.getByText("3 tickets")).toBeTruthy();
  });

  it("shows for each ticket where it stands and how pressing it is", () => {
    render(<ClientSupport />);
    const [first] = bodyRows();
    expect(within(first).getByText("Inventory")).toBeTruthy();
    expect(within(first).getByText("Urgent")).toBeTruthy();
    expect(within(first).getByText("Open")).toBeTruthy();
    const last = bodyRows()[2];
    expect(within(last).getByText("Resolved")).toBeTruthy();
    expect(within(last).getByText("Low")).toBeTruthy();
  });

  it("sorts by severity from the header: the most pressing first, then the reverse", async () => {
    const user = userEvent.setup();
    render(<ClientSupport />);
    const references = () =>
      bodyRows().map((row) => within(row).getAllByRole("cell")[0].textContent);
    const header = within(table()).getByRole("button", { name: /Severity/ });
    await user.click(header);
    // Urgent, high, low.
    expect(references()).toEqual(["SUP-0002", "SUP-0003", "SUP-0001"]);
    await user.click(header);
    expect(references()).toEqual(["SUP-0001", "SUP-0003", "SUP-0002"]);
  });

  it("finds a ticket by its reference, its words, or its section", async () => {
    const user = userEvent.setup();
    render(<ClientSupport />);
    const search = screen.getByLabelText("Search tickets");

    await user.type(search, "sup-0003");
    expect(bodyRows()).toHaveLength(1);
    expect(within(bodyRows()[0]).getByText("SUP-0003")).toBeTruthy();

    await user.clear(search);
    await user.type(search, "voucher");
    expect(bodyRows()).toHaveLength(1);
    expect(within(bodyRows()[0]).getByText("SUP-0002")).toBeTruthy();

    await user.clear(search);
    await user.type(search, "creation");
    expect(within(bodyRows()[0]).getByText("SUP-0001")).toBeTruthy();
  });

  it("filters by state, and tells when nothing matches", async () => {
    const user = userEvent.setup();
    render(<ClientSupport />);
    await user.selectOptions(
      screen.getByLabelText("Filter by state"),
      "on_hold",
    );
    expect(bodyRows()).toHaveLength(1);
    expect(within(bodyRows()[0]).getByText("SUP-0003")).toBeTruthy();

    await user.selectOptions(
      screen.getByLabelText("Filter by state"),
      "cancelled",
    );
    expect(screen.getByText("No ticket matches your filters")).toBeTruthy();
    await user.click(screen.getByRole("button", { name: "Clear filters" }));
    expect(bodyRows()).toHaveLength(3);
    expect(
      (screen.getByLabelText("Filter by state") as HTMLSelectElement).value,
    ).toBe("all");
  });

  it("offers every state of a ticket in the filter", () => {
    render(<ClientSupport />);
    expect(
      within(screen.getByLabelText("Filter by state"))
        .getAllByRole("option")
        .map((option) => option.textContent),
    ).toEqual([
      "All states",
      "New",
      "Open",
      "On hold",
      "Cancelled",
      "Resolved",
    ]);
  });

  it("says so, and offers to open one, when there is no ticket yet", async () => {
    hook.tickets = [];
    const user = userEvent.setup();
    render(<ClientSupport />);
    expect(screen.getByText("No support tickets yet")).toBeTruthy();
    expect(screen.getByText("0 tickets")).toBeTruthy();
    const buttons = screen.getAllByRole("button", {
      name: "Open new support ticket",
    });
    // The one of the header, and the one of the empty state.
    expect(buttons).toHaveLength(2);
    await user.click(buttons[1]);
    expect(
      screen.getByRole("dialog", { name: "Open a new support ticket" }),
    ).toBeTruthy();
  });

  it("shows a loading state while the tickets come", () => {
    hook.tickets = [];
    hook.loading = true;
    render(<ClientSupport />);
    expect(screen.getByText("Loading…")).toBeTruthy();
    expect(screen.queryByText("No support tickets yet")).toBeNull();
    expect(table().getAttribute("aria-busy")).toBe("true");
  });

  it("shows the error and lets the client try again", async () => {
    hook.tickets = [];
    hook.error = "Failed to load your support tickets.";
    const user = userEvent.setup();
    render(<ClientSupport />);
    expect(
      screen.getByText("Failed to load your support tickets."),
    ).toBeTruthy();
    expect(screen.queryByRole("table")).toBeNull();
    await user.click(screen.getByRole("button", { name: "Retry" }));
    expect(hook.refetch).toHaveBeenCalledTimes(1);
  });
});

describe("ClientSupport: opening a ticket", () => {
  it("opens the form from the header button", async () => {
    const user = userEvent.setup();
    render(<ClientSupport />);
    await user.click(
      screen.getByRole("button", { name: "Open new support ticket" }),
    );
    const dialog = screen.getByRole("dialog", {
      name: "Open a new support ticket",
    });
    // The form shows the account of the client, as the ticket will carry it.
    const details = within(dialog).getByLabelText("Account details");
    expect(within(details).getByText("ops@brand.dz")).toBeTruthy();
    expect(within(details).getByText("org-1")).toBeTruthy();
    expect(within(details).getByText("Pro")).toBeTruthy();
    expect(within(details).getByText("0557882828")).toBeTruthy();
  });

  it("confirms the ticket with its reference and reloads the history", async () => {
    rpc.mockResolvedValue({ data: CREATED_ROW, error: null });
    const user = userEvent.setup();
    render(<ClientSupport />);
    await user.click(
      screen.getByRole("button", { name: "Open new support ticket" }),
    );
    await user.selectOptions(
      screen.getByLabelText("Platform section"),
      "analytics",
    );
    await user.selectOptions(screen.getByLabelText("Type"), "platform_error");
    await user.click(screen.getByRole("radio", { name: "High" }));
    await user.type(
      screen.getByLabelText("Description"),
      "The analytics page stays empty after a campaign ends.",
    );
    await user.click(screen.getByRole("button", { name: "Send ticket" }));

    await waitFor(() => expect(screen.queryByRole("dialog")).toBeNull());
    const confirmation = screen.getByRole("status");
    expect(confirmation.textContent).toMatch(/SUP-0009/);
    expect(confirmation.textContent).toMatch(/ops@brand\.dz/);
    expect(hook.refetch).toHaveBeenCalledTimes(1);

    await user.click(screen.getByRole("button", { name: "Dismiss" }));
    expect(screen.queryByRole("status")).toBeNull();
  });
});

describe("ClientSupport: reading a ticket", () => {
  it("opens the detail of a ticket from its View button", async () => {
    const user = userEvent.setup();
    render(<ClientSupport />);
    await user.click(
      within(table()).getByRole("button", { name: "View ticket SUP-0002" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Ticket SUP-0002" });
    expect(within(dialog).getByText("Inventory")).toBeTruthy();
    expect(within(dialog).getByText("Urgent")).toBeTruthy();
    expect(within(dialog).getByText("Open")).toBeTruthy();
    // The whole description, line breaks kept.
    const description = within(dialog).getByText(/Importing a voucher list/);
    expect(description.textContent).toBe(
      "Importing a voucher list never ends.\nTried three times.",
    );
    // The account details the ticket was sent with.
    const details = within(dialog).getByLabelText("Account details");
    expect(within(details).getByText("ops@brand.dz")).toBeTruthy();
    expect(within(details).getByText("org-1")).toBeTruthy();
    expect(within(dialog).queryByText("Resolved on")).toBeNull();
  });

  it("opens it from a click on the row too, and shows when it was resolved", async () => {
    const user = userEvent.setup();
    render(<ClientSupport />);
    await user.click(
      within(table()).getByText("The wizard takes ten seconds to open."),
    );
    const dialog = screen.getByRole("dialog", { name: "Ticket SUP-0001" });
    expect(within(dialog).getByText("Resolved on")).toBeTruthy();
    expect(within(dialog).getByText("03 Oct 2026")).toBeTruthy();
    await user.click(within(dialog).getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
  });
});

describe("ClientSupport: commenting on a ticket", () => {
  const COMMENT_ROW = {
    id: "c1",
    ticket_id: "t2",
    author_id: "user-1",
    author_name: "Ops",
    author_type: "client",
    body: "It still happens this morning.",
    created_at: "2026-10-06T08:00:00Z",
  };

  it("shows how many comments each ticket holds", () => {
    render(<ClientSupport />);
    const counts = bodyRows().map((row) =>
      within(row)
        .getByLabelText(/comments?$/)
        .getAttribute("aria-label"),
    );
    // Newest first: SUP-0002 (3), SUP-0003 (0), SUP-0001 (0).
    expect(counts).toEqual(["3 comments", "0 comments", "0 comments"]);
  });

  it("shows the conversation of a ticket in its detail window", async () => {
    commentsHook.comments = [
      {
        id: "c1",
        ticketId: "t2",
        authorId: "user-1",
        authorName: "Ops",
        authorType: "client",
        body: "It still happens this morning.",
        createdAt: "2026-10-06T08:00:00Z",
      },
      {
        id: "c2",
        ticketId: "t2",
        authorId: null,
        authorName: "Support",
        authorType: "support",
        body: "We are looking into it.",
        createdAt: "2026-10-06T09:00:00Z",
      },
    ];
    const user = userEvent.setup();
    render(<ClientSupport />);
    await user.click(
      within(table()).getByRole("button", { name: "View ticket SUP-0002" }),
    );
    const comments = within(screen.getByRole("dialog")).getByLabelText(
      "Comments",
    );
    const items = within(comments).getAllByRole("listitem");
    expect(items).toHaveLength(2);
    // The client's own words are "You"; the support team is named as such.
    expect(within(items[0]).getByText("You")).toBeTruthy();
    expect(within(items[1]).getByText("Support team")).toBeTruthy();
    expect(within(items[1]).getByText("We are looking into it.")).toBeTruthy();
  });

  it("adds a comment to an open ticket, then reloads the thread and the history", async () => {
    rpc.mockResolvedValue({ data: COMMENT_ROW, error: null });
    const user = userEvent.setup();
    render(<ClientSupport />);
    await user.click(
      within(table()).getByRole("button", { name: "View ticket SUP-0002" }),
    );
    await user.type(
      screen.getByLabelText("Add a comment"),
      "  It still happens this morning.  ",
    );
    await user.click(screen.getByRole("button", { name: "Add comment" }));

    await waitFor(() => expect(commentsHook.refetch).toHaveBeenCalledTimes(1));
    expect(rpc).toHaveBeenCalledWith("add_support_ticket_comment", {
      p_ticket_id: "t2",
      p_body: "It still happens this morning.",
    });
    // The history shows the new count.
    expect(hook.refetch).toHaveBeenCalledTimes(1);
    // The box is empty again, ready for the next one.
    expect(
      (screen.getByLabelText("Add a comment") as HTMLTextAreaElement).value,
    ).toBe("");
  });

  it("takes no comment on a ticket that is resolved, but still shows its thread", async () => {
    const user = userEvent.setup();
    render(<ClientSupport />);
    await user.click(
      within(table()).getByRole("button", { name: "View ticket SUP-0001" }),
    );
    const dialog = screen.getByRole("dialog", { name: "Ticket SUP-0001" });
    expect(within(dialog).getByLabelText("Comments")).toBeTruthy();
    expect(within(dialog).queryByLabelText("Add a comment")).toBeNull();
    expect(within(dialog).getByRole("note").textContent).toMatch(
      /closed.*Open a new ticket/,
    );
  });

  it("does not throw away a comment being written when the window is closed", async () => {
    const confirm = vi.spyOn(window, "confirm");
    const user = userEvent.setup();
    render(<ClientSupport />);
    await user.click(
      within(table()).getByRole("button", { name: "View ticket SUP-0002" }),
    );
    await user.type(screen.getByLabelText("Add a comment"), "Half a thought");

    // Asked first: "No" keeps the window and the draft.
    confirm.mockReturnValueOnce(false);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(confirm).toHaveBeenCalledWith("Discard your unsent comment?");
    expect(screen.getByRole("dialog")).toBeTruthy();
    expect(
      (screen.getByLabelText("Add a comment") as HTMLTextAreaElement).value,
    ).toBe("Half a thought");

    // "Yes" closes it.
    confirm.mockReturnValueOnce(true);
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();
    confirm.mockRestore();
  });

  it("closes at once, without asking, when nothing is being written", async () => {
    const confirm = vi.spyOn(window, "confirm");
    const user = userEvent.setup();
    render(<ClientSupport />);
    await user.click(
      within(table()).getByRole("button", { name: "View ticket SUP-0002" }),
    );
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(confirm).not.toHaveBeenCalled();
    expect(screen.queryByRole("dialog")).toBeNull();
    confirm.mockRestore();
  });
});
