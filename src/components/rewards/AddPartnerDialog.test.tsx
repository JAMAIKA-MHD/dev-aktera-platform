import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { AddPartnerDialog } from "./AddPartnerDialog";

const setup = (onSubmit = vi.fn().mockResolvedValue(undefined)) => {
  const onClose = vi.fn();
  render(<AddPartnerDialog onClose={onClose} onSubmit={onSubmit} />);
  return { onClose, onSubmit };
};

const type = (label: RegExp | string, value: string) =>
  fireEvent.change(screen.getByLabelText(label), { target: { value } });
const submit = () =>
  fireEvent.click(screen.getByRole("button", { name: "Add partner" }));

describe("AddPartnerDialog", () => {
  it("is a labelled dialog whose first field has the focus", () => {
    setup();
    const dialog = screen.getByRole("dialog", { name: "Add a partner" });
    expect(dialog).toBeTruthy();
    expect(document.activeElement).toBe(screen.getByLabelText(/Partner name/));
  });

  it("sends what was typed and closes", async () => {
    const { onSubmit, onClose } = setup();
    type(/Partner name/, "Gifty");
    type("What they offer", "Gift cards");
    type("Website", "https://acme.example");
    type("Contact person", "Sara");
    type("Contact phone", "0551234567");
    type("Contact email", "sara@acme.example");
    submit();

    await waitFor(() => expect(onClose).toHaveBeenCalled());
    expect(onSubmit).toHaveBeenCalledWith({
      name: "Gifty",
      description: "Gift cards",
      websiteUrl: "https://acme.example",
      contactName: "Sara",
      contactPhone: "0551234567",
      contactEmail: "sara@acme.example",
    });
  });

  it("asks for the name and sends nothing without it", async () => {
    const { onSubmit, onClose } = setup();
    submit();
    expect(await screen.findByText(/Enter the partner's name/)).toBeTruthy();
    expect(
      screen.getByLabelText(/Partner name/).getAttribute("aria-invalid"),
    ).toBe("true");
    expect(onSubmit).not.toHaveBeenCalled();
    expect(onClose).not.toHaveBeenCalled();
  });

  it("points at every wrong field at once", async () => {
    setup();
    type(/Partner name/, "Gifty");
    type("Website", "acme.example");
    type("Contact email", "nope");
    type("Contact phone", "call me");
    submit();
    expect(await screen.findByText(/full web address/)).toBeTruthy();
    expect(screen.getByText("Enter a valid email address.")).toBeTruthy();
    expect(screen.getByText("Enter a valid phone number.")).toBeTruthy();
  });

  it("clears a field's message as soon as it is edited", async () => {
    setup();
    submit();
    await screen.findByText(/Enter the partner's name/);
    type(/Partner name/, "Gifty");
    expect(screen.queryByText(/Enter the partner's name/)).toBeNull();
  });

  it("stays open and says why when the partner cannot be added", async () => {
    const onSubmit = vi
      .fn()
      .mockRejectedValue(
        new Error("A partner with this name is already in your list."),
      );
    const { onClose } = setup(onSubmit);
    type(/Partner name/, "Gifty");
    submit();
    expect(
      await screen.findByText(
        "A partner with this name is already in your list.",
      ),
    ).toBeTruthy();
    expect(onClose).not.toHaveBeenCalled();
    // The brand can fix it and try again.
    expect(
      (screen.getByRole("button", { name: "Add partner" }) as HTMLButtonElement)
        .disabled,
    ).toBe(false);
  });

  it("cannot be submitted twice while it is sending", async () => {
    let finish: () => void = () => {};
    const onSubmit = vi.fn(
      () => new Promise<void>((resolve) => (finish = resolve)),
    );
    setup(onSubmit);
    type(/Partner name/, "Gifty");
    submit();
    const busy = await screen.findByRole("button", { name: "Adding..." });
    expect((busy as HTMLButtonElement).disabled).toBe(true);
    finish();
  });

  it("closes with Cancel, the cross and Escape", () => {
    const { onClose } = setup();
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    fireEvent.click(screen.getByRole("button", { name: "Close" }));
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(3);
  });

  it("counts the description characters", () => {
    setup();
    type("What they offer", "Gift cards");
    expect(screen.getByText("10/300")).toBeTruthy();
  });
});
