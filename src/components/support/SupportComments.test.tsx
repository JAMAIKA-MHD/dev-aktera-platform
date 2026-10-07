import { render, screen, waitFor, within } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

import type { SupportTicket, SupportTicketComment } from "../../types";

const rpc = vi.fn();
vi.mock("../../lib/supabase", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));
vi.mock("../../contexts/AuthContext", () => ({
  useAuth: () => ({ profile: { id: "user-1", email: "ops@brand.dz" } }),
}));

const thread = {
  comments: [] as SupportTicketComment[],
  loading: false,
  error: null as string | null,
  refetch: vi.fn(),
};
vi.mock("../../hooks/useSupportComments", () => ({
  useSupportComments: () => thread,
}));

import { SupportComments } from "./SupportComments";

const TICKET: SupportTicket = {
  id: "t1",
  ticketNumber: 1,
  organizationId: "org-1",
  contactEmail: "ops@brand.dz",
  contactPhone: null,
  plan: "pro",
  platformSection: "analytics",
  type: "platform_error",
  severity: "high",
  description: "The analytics page stays empty.",
  state: "open",
  resolvedAt: null,
  createdAt: "2026-10-01T10:00:00Z",
  updatedAt: "2026-10-01T10:00:00Z",
  commentsCount: 0,
};

const comment = (
  patch: Partial<SupportTicketComment> & { id: string },
): SupportTicketComment => ({
  ticketId: "t1",
  authorId: "user-1",
  authorName: "Ops",
  authorType: "client",
  body: "A comment.",
  createdAt: "2026-10-06T08:00:00Z",
  ...patch,
});

const ROW = {
  id: "c9",
  ticket_id: "t1",
  author_id: "user-1",
  author_name: "Ops",
  author_type: "client",
  body: "Still broken.",
  created_at: "2026-10-06T10:00:00Z",
};

function setup(ticket: SupportTicket = TICKET) {
  const onPosted = vi.fn();
  const onDirtyChange = vi.fn();
  const user = userEvent.setup();
  render(
    <SupportComments
      ticket={ticket}
      onPosted={onPosted}
      onDirtyChange={onDirtyChange}
    />,
  );
  return { user, onPosted, onDirtyChange };
}

beforeEach(() => {
  rpc.mockReset();
  thread.comments = [];
  thread.loading = false;
  thread.error = null;
  thread.refetch = vi.fn();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("the thread", () => {
  it("invites the client to write when there is nothing yet", () => {
    setup();
    expect(screen.getByText(/No comments yet\./)).toBeTruthy();
    expect(screen.getByLabelText("Add a comment")).toBeTruthy();
  });

  it("shows each comment with who wrote it, in order, with the time", () => {
    thread.comments = [
      comment({ id: "a", body: "First, from me.", authorId: "user-1" }),
      comment({
        id: "b",
        body: "Second, from a colleague.\nOn two lines.",
        authorId: "user-2",
        authorName: "Amina Benali",
        createdAt: "2026-10-06T09:30:00Z",
      }),
      comment({
        id: "c",
        body: "We are on it.",
        authorId: null,
        authorName: "Support",
        authorType: "support",
        createdAt: "2026-10-06T11:15:00Z",
      }),
    ];
    setup();
    const items = within(screen.getByLabelText("Comments")).getAllByRole(
      "listitem",
    );
    expect(items.map((item) => item.getAttribute("data-author-type"))).toEqual([
      "client",
      "client",
      "support",
    ]);
    expect(within(items[0]).getByText("You")).toBeTruthy();
    expect(within(items[1]).getByText("Amina Benali")).toBeTruthy();
    expect(within(items[2]).getByText("Support team")).toBeTruthy();
    // Line breaks are kept, and the time is there.
    expect(
      within(items[1]).getByText(/Second, from a colleague/).textContent,
    ).toBe("Second, from a colleague.\nOn two lines.");
    expect(items[0].querySelector("time")!.getAttribute("dateTime")).toBe(
      "2026-10-06T08:00:00Z",
    );
    expect(screen.getByText("(3)")).toBeTruthy();
  });

  it("shows when it is loading, and lets the client retry when it failed", async () => {
    thread.loading = true;
    const { user } = setup();
    expect(screen.getByText("Loading comments…")).toBeTruthy();
    expect(screen.queryByText(/No comments yet/)).toBeNull();
    thread.loading = false;

    // A failed read: the message, a Retry, and no false "no comments".
    thread.error = "Failed to load the comments.";
    const { unmount } = render(<SupportComments ticket={TICKET} />);
    const alert = screen.getByRole("alert");
    expect(alert.textContent).toContain("Failed to load the comments.");
    await user.click(within(alert).getByRole("button", { name: "Retry" }));
    expect(thread.refetch).toHaveBeenCalledTimes(1);
    unmount();
  });
});

describe("adding a comment", () => {
  it("sends it trimmed, empties the box, reloads the thread and tells the page", async () => {
    rpc.mockResolvedValue({ data: ROW, error: null });
    const { user, onPosted } = setup();
    await user.type(
      screen.getByLabelText("Add a comment"),
      "  Still broken.  ",
    );
    await user.click(screen.getByRole("button", { name: "Add comment" }));

    await waitFor(() => expect(onPosted).toHaveBeenCalledTimes(1));
    expect(rpc).toHaveBeenCalledWith("add_support_ticket_comment", {
      p_ticket_id: "t1",
      p_body: "Still broken.",
    });
    expect(thread.refetch).toHaveBeenCalledTimes(1);
    expect(
      (screen.getByLabelText("Add a comment") as HTMLTextAreaElement).value,
    ).toBe("");
  });

  it("sends with Ctrl+Enter too", async () => {
    rpc.mockResolvedValue({ data: ROW, error: null });
    const { user } = setup();
    await user.type(
      screen.getByLabelText("Add a comment"),
      "Sent from the keyboard",
    );
    await user.keyboard("{Control>}{Enter}{/Control}");
    await waitFor(() => expect(rpc).toHaveBeenCalledTimes(1));
  });

  it("refuses an empty comment before any request, and says so", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Add comment" }));
    expect(screen.getByRole("alert").textContent).toBe(
      "Write your comment first.",
    );
    expect(
      screen.getByLabelText("Add a comment").getAttribute("aria-invalid"),
    ).toBe("true");
    expect(rpc).not.toHaveBeenCalled();
    // Typing clears the message.
    await user.type(screen.getByLabelText("Add a comment"), "x");
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("keeps what was typed and says why when the comment is refused", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: {
        message: "SUPPORT_RATE_LIMITED: too many comments in the last hour",
      },
    });
    const { user, onPosted } = setup();
    await user.type(
      screen.getByLabelText("Add a comment"),
      "Please look again",
    );
    await user.click(screen.getByRole("button", { name: "Add comment" }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/last hour/);
    expect(onPosted).not.toHaveBeenCalled();
    expect(
      (screen.getByLabelText("Add a comment") as HTMLTextAreaElement).value,
    ).toBe("Please look again");
    expect(
      (screen.getByRole("button", { name: "Add comment" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("cannot be sent twice while it is on its way", async () => {
    let resolve!: (value: unknown) => void;
    rpc.mockReturnValue(new Promise((done) => (resolve = done)));
    const { user } = setup();
    await user.type(screen.getByLabelText("Add a comment"), "Only once please");
    await user.click(screen.getByRole("button", { name: "Add comment" }));

    const sending = screen.getByRole("button", {
      name: "Sending…",
    }) as HTMLButtonElement;
    expect(sending.disabled).toBe(true);
    await user.click(sending);
    await user.keyboard("{Control>}{Enter}{/Control}");
    expect(rpc).toHaveBeenCalledTimes(1);
    resolve({ data: ROW, error: null });
    await waitFor(() => expect(thread.refetch).toHaveBeenCalled());
  });

  it("counts the characters, and refuses a comment that is too long", async () => {
    const { user } = setup();
    expect(screen.getByText("0 / 2000")).toBeTruthy();
    const box = screen.getByLabelText("Add a comment");
    await user.type(box, "hello");
    expect(screen.getByText("5 / 2000")).toBeTruthy();

    const longText = "x".repeat(2001);
    await user.clear(box);
    await user.click(box);
    await user.paste(longText);
    expect(screen.getByText("2001 / 2000").className).toMatch(/destructive/);
    await user.click(screen.getByRole("button", { name: "Add comment" }));
    expect(screen.getByRole("alert").textContent).toMatch(/limited to 2000/);
    expect(rpc).not.toHaveBeenCalled();
  });
});

describe("a ticket that is closed", () => {
  it.each(["resolved", "cancelled"] as const)(
    "shows its thread but takes no comment when it is %s",
    (state) => {
      thread.comments = [comment({ id: "a", body: "Earlier remark." })];
      setup({ ...TICKET, state });
      expect(screen.getByText("Earlier remark.")).toBeTruthy();
      expect(screen.queryByLabelText("Add a comment")).toBeNull();
      expect(screen.queryByRole("button", { name: "Add comment" })).toBeNull();
      expect(screen.getByRole("note").textContent).toMatch(
        /closed.*Open a new ticket/,
      );
    },
  );

  it.each(["new", "open", "on_hold"] as const)(
    "takes comments while it is %s",
    (state) => {
      setup({ ...TICKET, state });
      expect(screen.getByLabelText("Add a comment")).toBeTruthy();
      expect(screen.queryByRole("note")).toBeNull();
    },
  );
});

describe("the draft", () => {
  it("tells whether a comment is being written, and is quiet once the window goes", async () => {
    const { user, onDirtyChange } = setup();
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    await user.type(screen.getByLabelText("Add a comment"), "a");
    expect(onDirtyChange).toHaveBeenLastCalledWith(true);
    await user.clear(screen.getByLabelText("Add a comment"));
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
    // Only spaces: nothing worth protecting.
    await user.type(screen.getByLabelText("Add a comment"), "   ");
    expect(onDirtyChange).toHaveBeenLastCalledWith(false);
  });
});
