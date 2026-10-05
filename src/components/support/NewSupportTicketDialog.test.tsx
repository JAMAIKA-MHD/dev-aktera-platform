import {
  fireEvent,
  render,
  screen,
  waitFor,
  within,
} from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi } from "vitest";

const rpc = vi.fn();
vi.mock("../../lib/supabase", () => ({
  supabase: { rpc: (...args: unknown[]) => rpc(...args) },
}));

import {
  NewSupportTicketDialog,
  type SupportAccount,
} from "./NewSupportTicketDialog";

const ACCOUNT: SupportAccount = {
  email: "ops@brand.dz",
  clientId: "11111111-2222-3333-4444-555555555555",
  plan: "pro",
  phoneNumber: "0557882828",
};

const ROW = {
  id: "t1",
  ticket_number: 12,
  organization_id: ACCOUNT.clientId,
  contact_email: ACCOUNT.email,
  contact_phone: ACCOUNT.phoneNumber,
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

function setup(account: SupportAccount = ACCOUNT) {
  const onOpenChange = vi.fn();
  const onCreated = vi.fn();
  const user = userEvent.setup();
  render(
    <NewSupportTicketDialog
      open
      onOpenChange={onOpenChange}
      account={account}
      onCreated={onCreated}
    />,
  );
  return { user, onOpenChange, onCreated };
}

async function fillValid(user: ReturnType<typeof userEvent.setup>) {
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
}

beforeEach(() => {
  rpc.mockReset();
  vi.spyOn(console, "error").mockImplementation(() => {});
});

describe("NewSupportTicketDialog", () => {
  it("shows the account details, read-only: the client does not type them", () => {
    setup();
    const dialog = screen.getByRole("dialog", {
      name: "Open a new support ticket",
    });
    const details = within(dialog).getByLabelText("Account details");
    expect(within(details).getByText("ops@brand.dz")).toBeTruthy();
    expect(within(details).getByText(ACCOUNT.clientId)).toBeTruthy();
    expect(within(details).getByText("Pro")).toBeTruthy();
    expect(within(details).getByText("0557882828")).toBeTruthy();
    expect(within(details).queryByRole("textbox")).toBeNull();
  });

  it("says when the account has no phone number", () => {
    setup({ ...ACCOUNT, phoneNumber: null });
    expect(
      within(screen.getByLabelText("Account details")).getByText("Not set"),
    ).toBeTruthy();
  });

  it("offers the platform sections, the types and the severities of the issue", () => {
    setup();
    const options = (label: string) =>
      within(screen.getByLabelText(label))
        .getAllByRole("option")
        .map((option) => option.textContent);
    expect(options("Platform section")).toEqual([
      "Choose a section…",
      "Campaign creation",
      "Analytics",
      "Inventory",
      "Player screen editor",
    ]);
    expect(options("Type")).toEqual([
      "Choose a type…",
      "Error in the platform",
      "Platform slowness",
      "Other",
    ]);
    expect(
      within(screen.getByRole("radiogroup", { name: "Severity" }))
        .getAllByRole("radio")
        .map((radio) => radio.textContent),
    ).toEqual(["Low", "Medium", "High", "Urgent"]);
  });

  it("points at every missing field, sends nothing, and focuses the first to fix", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Send ticket" }));
    expect(rpc).not.toHaveBeenCalled();
    const alerts = screen
      .getAllByRole("alert")
      .map((alert) => alert.textContent);
    expect(alerts).toEqual([
      "Choose the part of the platform concerned.",
      "Choose the type of problem.",
      "Choose how severe it is.",
      expect.stringContaining("at least 10"),
    ]);
    expect(document.activeElement).toBe(
      screen.getByLabelText("Platform section"),
    );
    expect(
      screen.getByLabelText("Platform section").getAttribute("aria-invalid"),
    ).toBe("true");
  });

  it("clears the error of a field once it is fixed", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("button", { name: "Send ticket" }));
    expect(screen.getByText("Choose the type of problem.")).toBeTruthy();
    await user.selectOptions(screen.getByLabelText("Type"), "other");
    expect(screen.queryByText("Choose the type of problem.")).toBeNull();
    expect(
      screen.getByText("Choose the part of the platform concerned."),
    ).toBeTruthy();
  });

  it("sends the ticket, hands it back, and closes", async () => {
    rpc.mockResolvedValue({ data: ROW, error: null });
    const { user, onCreated, onOpenChange } = setup();
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Send ticket" }));

    await waitFor(() => expect(onCreated).toHaveBeenCalledTimes(1));
    expect(rpc).toHaveBeenCalledWith("create_support_ticket", {
      p_platform_section: "analytics",
      p_type: "platform_error",
      p_severity: "high",
      p_description: "The analytics page stays empty after a campaign ends.",
    });
    expect(onCreated.mock.calls[0][0]).toMatchObject({
      ticketNumber: 12,
      state: "new",
    });
    expect(onOpenChange).toHaveBeenCalledWith(false);
  });

  it("keeps the form and says why when the ticket is refused", async () => {
    rpc.mockResolvedValue({
      data: null,
      error: {
        message: "SUPPORT_RATE_LIMITED: too many tickets in the last hour",
      },
    });
    const { user, onCreated, onOpenChange } = setup();
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Send ticket" }));

    expect((await screen.findByRole("alert")).textContent).toMatch(/last hour/);
    expect(onCreated).not.toHaveBeenCalled();
    expect(onOpenChange).not.toHaveBeenCalled();
    // What was typed is still there, and the client can try again.
    expect(
      (screen.getByLabelText("Description") as HTMLTextAreaElement).value,
    ).toMatch(/analytics page/);
    expect(
      (screen.getByRole("button", { name: "Send ticket" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("cannot be sent twice while it is on its way", async () => {
    let resolve!: (value: unknown) => void;
    rpc.mockReturnValue(new Promise((done) => (resolve = done)));
    const { user } = setup();
    await fillValid(user);
    await user.click(screen.getByRole("button", { name: "Send ticket" }));

    const sending = screen.getByRole("button", {
      name: "Sending…",
    }) as HTMLButtonElement;
    expect(sending.disabled).toBe(true);
    expect(
      (screen.getByRole("button", { name: "Cancel" }) as HTMLButtonElement)
        .disabled,
    ).toBe(true);
    await user.click(sending);
    expect(rpc).toHaveBeenCalledTimes(1);
    resolve({ data: ROW, error: null });
  });

  it("counts the characters of the description, and warns past the limit", async () => {
    const { user } = setup();
    const description = screen.getByLabelText("Description");
    expect(screen.getByText("0 / 2000")).toBeTruthy();
    await user.type(description, "hello there");
    expect(screen.getByText("11 / 2000")).toBeTruthy();
    // Past the limit, the counter turns red and the ticket is refused with the reason.
    fireEvent.change(description, { target: { value: "x".repeat(2001) } });
    expect(screen.getByText("2001 / 2000").className).toMatch(/destructive/);
    await user.click(screen.getByRole("button", { name: "Send ticket" }));
    expect(screen.getByText(/limited to 2000/)).toBeTruthy();
  });

  it("moves through the severities with the arrow keys", async () => {
    const { user } = setup();
    await user.click(screen.getByRole("radio", { name: "Low" }));
    await user.keyboard("{ArrowRight}");
    expect(
      screen
        .getByRole("radio", { name: "Medium" })
        .getAttribute("aria-checked"),
    ).toBe("true");
    expect(document.activeElement).toBe(
      screen.getByRole("radio", { name: "Medium" }),
    );
    await user.keyboard("{ArrowLeft}{ArrowLeft}");
    // From Low, back to the last one.
    expect(
      screen
        .getByRole("radio", { name: "Urgent" })
        .getAttribute("aria-checked"),
    ).toBe("true");
  });

  it("closes with Cancel, without sending", async () => {
    const { user, onOpenChange, onCreated } = setup();
    await user.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onOpenChange).toHaveBeenCalledWith(false);
    expect(onCreated).not.toHaveBeenCalled();
    expect(rpc).not.toHaveBeenCalled();
  });

  it("starts from an empty form each time it opens", async () => {
    const user = userEvent.setup();
    const props = {
      onOpenChange: vi.fn(),
      account: ACCOUNT,
      onCreated: vi.fn(),
    };
    const { rerender } = render(<NewSupportTicketDialog open {...props} />);
    await user.type(screen.getByLabelText("Description"), "something typed");
    rerender(<NewSupportTicketDialog open={false} {...props} />);
    rerender(<NewSupportTicketDialog open {...props} />);
    expect(
      (screen.getByLabelText("Description") as HTMLTextAreaElement).value,
    ).toBe("");
  });
});
