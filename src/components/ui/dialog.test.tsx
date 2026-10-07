import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { useState } from "react";
import { describe, expect, it } from "vitest";

import { Dialog } from "./dialog";

function Harness() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button onClick={() => setOpen(true)}>Open</button>
      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Edit thing"
        description="Change the thing."
      >
        <input aria-label="First" />
        <button>Second</button>
        <input aria-label="Third" data-autofocus />
      </Dialog>
    </>
  );
}

describe("Dialog", () => {
  it("is a named modal window, described, and hidden while closed", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(screen.queryByRole("dialog")).toBeNull();
    await user.click(screen.getByText("Open"));
    const dialog = screen.getByRole("dialog", { name: "Edit thing" });
    expect(dialog.getAttribute("aria-modal")).toBe("true");
    expect(dialog.getAttribute("aria-describedby")).not.toBeNull();
    expect(screen.getByText("Change the thing.")).toBeTruthy();
  });

  it("puts the focus on the field marked for it, and gives it back on close", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    const opener = screen.getByText("Open");
    await user.click(opener);
    expect(document.activeElement).toBe(screen.getByLabelText("Third"));
    await user.keyboard("{Escape}");
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(document.activeElement).toBe(opener);
  });

  it("keeps the Tab key inside the window, both ways", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("Open"));
    const close = screen.getByRole("button", { name: "Close" });
    const third = screen.getByLabelText("Third");
    // Third is the last control: Tab goes back to the first (the close button).
    third.focus();
    await user.tab();
    expect(document.activeElement).toBe(close);
    // Shift+Tab from the first goes to the last.
    await user.tab({ shift: true });
    expect(document.activeElement).toBe(third);
  });

  it("closes with the close button and with a click on the dim background", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    await user.click(screen.getByText("Open"));
    await user.click(screen.getByRole("button", { name: "Close" }));
    expect(screen.queryByRole("dialog")).toBeNull();

    await user.click(screen.getByText("Open"));
    // A click inside the window does not close it.
    await user.click(screen.getByText("Edit thing"));
    expect(screen.getByRole("dialog")).toBeTruthy();
    // A click on the background does.
    await user.click(
      document.querySelector('[data-slot="dialog-overlay"]') as HTMLElement,
    );
    expect(screen.queryByRole("dialog")).toBeNull();
  });

  it("locks the scroll of the page behind it, and unlocks it on close", async () => {
    const user = userEvent.setup();
    render(<Harness />);
    expect(document.body.style.overflow).not.toBe("hidden");
    await user.click(screen.getByText("Open"));
    expect(document.body.style.overflow).toBe("hidden");
    await user.keyboard("{Escape}");
    expect(document.body.style.overflow).not.toBe("hidden");
  });
});
