import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { RewardExpiryPanel } from "./RewardExpiryPanel";

const base = {
  expiresAt: null as string | null,
  expiryDays: null as number | null,
  canEdit: true,
  onSave: vi.fn().mockResolvedValue(undefined),
};

describe("RewardExpiryPanel", () => {
  it("says how the codes expire", () => {
    const { rerender } = render(<RewardExpiryPanel {...base} />);
    expect(screen.getByText("no expiry")).toBeTruthy();
    rerender(
      <RewardExpiryPanel {...base} expiresAt="2099-06-30T22:59:59.000Z" />,
    );
    expect(screen.getByText("until 2099-06-30")).toBeTruthy();
    rerender(<RewardExpiryPanel {...base} expiryDays={14} />);
    expect(screen.getByText("2 weeks after delivery")).toBeTruthy();
  });

  it("saves a new expiry, then confirms and closes the editor", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RewardExpiryPanel {...base} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Change expiry" }));
    fireEvent.click(screen.getByLabelText(/On a fixed date/));
    fireEvent.change(screen.getByLabelText("Expiry date"), {
      target: { value: "2099-12-31" },
    });
    fireEvent.click(screen.getByRole("button", { name: "Save expiry" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        expiresAt: "2099-12-31T22:59:59.000Z",
        expiryDays: null,
      }),
    );
    expect(await screen.findByRole("status")).toBeTruthy();
    expect(screen.queryByRole("button", { name: "Save expiry" })).toBeNull();
  });

  it("can switch to no expiry", async () => {
    const onSave = vi.fn().mockResolvedValue(undefined);
    render(<RewardExpiryPanel {...base} expiryDays={30} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Change expiry" }));
    fireEvent.click(screen.getByLabelText(/No expiry/));
    fireEvent.click(screen.getByRole("button", { name: "Save expiry" }));
    await waitFor(() =>
      expect(onSave).toHaveBeenCalledWith({
        expiresAt: null,
        expiryDays: null,
      }),
    );
  });

  it("does not send an invalid setting, and says what is wrong", async () => {
    const onSave = vi.fn();
    render(<RewardExpiryPanel {...base} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Change expiry" }));
    fireEvent.click(screen.getByLabelText(/On a fixed date/));
    fireEvent.click(screen.getByRole("button", { name: "Save expiry" }));
    expect(await screen.findByText("Pick the expiry date.")).toBeTruthy();
    expect(onSave).not.toHaveBeenCalled();
  });

  it("starts from the current setting each time, and a cancel changes nothing", () => {
    const onSave = vi.fn();
    const { rerender } = render(
      <RewardExpiryPanel {...base} expiryDays={30} onSave={onSave} />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Change expiry" }));
    fireEvent.click(screen.getByLabelText(/No expiry/));
    fireEvent.click(screen.getByRole("button", { name: "Cancel" }));
    expect(onSave).not.toHaveBeenCalled();

    // The reward changed elsewhere meanwhile: the editor opens on the new value.
    rerender(
      <RewardExpiryPanel
        {...base}
        expiresAt="2099-06-30T22:59:59.000Z"
        onSave={onSave}
      />,
    );
    fireEvent.click(screen.getByRole("button", { name: "Change expiry" }));
    expect(
      (screen.getByLabelText(/On a fixed date/) as HTMLInputElement).checked,
    ).toBe(true);
    expect(
      (screen.getByLabelText("Expiry date") as HTMLInputElement).value,
    ).toBe("2099-06-30");
  });

  it("stays open and shows the reason when the save fails", async () => {
    const onSave = vi.fn().mockRejectedValue(new Error("You are not allowed."));
    render(<RewardExpiryPanel {...base} onSave={onSave} />);
    fireEvent.click(screen.getByRole("button", { name: "Change expiry" }));
    fireEvent.click(screen.getByLabelText(/After delivery/));
    fireEvent.click(screen.getByRole("button", { name: "Save expiry" }));
    expect(await screen.findByText("You are not allowed.")).toBeTruthy();
    expect(screen.getByRole("button", { name: "Save expiry" })).toBeTruthy();
  });

  it("offers no edit to a viewer", () => {
    render(<RewardExpiryPanel {...base} canEdit={false} />);
    expect(screen.queryByRole("button", { name: "Change expiry" })).toBeNull();
  });
});
