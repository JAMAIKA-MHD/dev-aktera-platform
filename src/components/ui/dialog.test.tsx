import { fireEvent, render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "./dialog";

function Example({
  onOpenChange,
  showCloseButton,
}: {
  onOpenChange?: (open: boolean) => void;
  showCloseButton?: boolean;
}) {
  const [open, setOpen] = useState(false);
  const change = (next: boolean) => {
    setOpen(next);
    onOpenChange?.(next);
  };
  return (
    <>
      <button type="button" onClick={() => setOpen(true)}>
        Open it
      </button>
      <Dialog open={open} onOpenChange={change}>
        <DialogContent showCloseButton={showCloseButton}>
          <DialogHeader>
            <DialogTitle>Export the file</DialogTitle>
            <DialogDescription>What the file holds.</DialogDescription>
          </DialogHeader>
          <input aria-label="First field" />
          <DialogFooter>
            <button type="button">Cancel</button>
            <button type="button">Go</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("renders nothing while closed", () => {
    render(<Example />);
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("is a modal labelled by its title and described by its text", async () => {
    render(<Example />);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Open it" }));
    const dialog = screen.getByRole("dialog", { name: "Export the file" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-describedby")).toBe(
      screen.getByText("What the file holds.").id,
    );
  });

  it("is rendered on the body, outside the page it was opened from", async () => {
    const { container } = render(<Example />);
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Open it" }));
    expect(container.querySelector('[role="dialog"]')).toBeNull();
    expect(document.body.querySelector('[role="dialog"]')).not.toBeNull();
  });

  it("puts the focus inside, and gives it back when it closes", async () => {
    const user = userEvent.setup();
    render(<Example />);
    const opener = screen.getByRole("button", { name: "Open it" });
    await user.click(opener);
    // The cross comes first in the tab order of the content.
    expect(screen.getByRole("dialog").contains(document.activeElement)).toBe(
      true,
    );
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("closes with Escape, with the cross and with a click outside", async () => {
    const onOpenChange = vi.fn();
    const user = userEvent.setup();
    render(<Example onOpenChange={onOpenChange} />);

    await user.click(screen.getByRole("button", { name: "Open it" }));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Open it" }));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByRole("button", { name: "Open it" }));
    const overlay = document.body.querySelector(
      '[data-slot="dialog-overlay"]',
    )!;
    fireEvent.mouseDown(overlay);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(onOpenChange).toHaveBeenLastCalledWith(false);
  });

  it("stays open when the click is inside the dialog", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open it" }));
    await user.click(screen.getByText("What the file holds."));
    expect(screen.getByRole("dialog")).toBeTruthy();
  });

  it("keeps the focus going round inside with Tab and Shift+Tab", async () => {
    const user = userEvent.setup();
    render(<Example showCloseButton={false} />);
    await user.click(screen.getByRole("button", { name: "Open it" }));
    const field = screen.getByLabelText("First field");
    const go = screen.getByRole("button", { name: "Go" });
    expect(document.activeElement).toBe(field);

    go.focus();
    await user.tab();
    expect(document.activeElement).toBe(field);

    await user.tab({ shift: true });
    expect(document.activeElement).toBe(go);
  });

  it("stops the page behind from scrolling while open", async () => {
    const user = userEvent.setup();
    render(<Example />);
    await user.click(screen.getByRole("button", { name: "Open it" }));
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(document.body.style.overflow).not.toBe("hidden");
  });

  it("can do without the cross", async () => {
    const user = userEvent.setup();
    render(<Example showCloseButton={false} />);
    await user.click(screen.getByRole("button", { name: "Open it" }));
    expect(screen.queryByRole("button", { name: "Close" })).toBeNull();
  });
});
