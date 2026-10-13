import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CodeExpiryCell } from "./CodeExpiryCell";

const base = {
  index: 3,
  value: null as string | null,
  hasCode: true,
  locked: false,
};

describe("CodeExpiryCell", () => {
  it("shows a dash for an empty slot", () => {
    render(<CodeExpiryCell {...base} hasCode={false} onChange={vi.fn()} />);
    expect(screen.queryByLabelText(/Expiry date/)).toBeNull();
    expect(screen.getByText("—")).toBeTruthy();
  });

  it("saves the picked day as the end of that day in Algiers (UTC)", async () => {
    const onChange = vi.fn().mockResolvedValue(true);
    render(<CodeExpiryCell {...base} onChange={onChange} />);
    fireEvent.change(screen.getByLabelText("Expiry date of code 3"), {
      target: { value: "2026-12-31" },
    });
    await waitFor(() =>
      expect(onChange).toHaveBeenCalledWith("2026-12-31T22:59:59.000Z"),
    );
  });

  it("clearing the date means the code never expires", async () => {
    const onChange = vi.fn().mockResolvedValue(true);
    render(
      <CodeExpiryCell
        {...base}
        value="2099-12-31T22:59:59.000Z"
        onChange={onChange}
      />,
    );
    const input = screen.getByLabelText<HTMLInputElement>(
      "Expiry date of code 3",
    );
    expect(input.value).toBe("2099-12-31");
    fireEvent.change(input, { target: { value: "" } });
    await waitFor(() => expect(onChange).toHaveBeenCalledWith(null));
  });

  it("marks a code whose date has passed, and keeps showing the date", () => {
    render(
      <CodeExpiryCell
        {...base}
        value="2020-01-01T22:59:59.000Z"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Expired")).toBeTruthy();
    expect(
      screen.getByLabelText<HTMLInputElement>("Expiry date of code 3").value,
    ).toBe("2020-01-01");
  });

  it("does not mark a code that expires later", () => {
    render(
      <CodeExpiryCell
        {...base}
        value="2099-12-31T22:59:59.000Z"
        onChange={vi.fn()}
      />,
    );
    expect(screen.queryByText("Expired")).toBeNull();
  });

  it("cannot be edited when locked (code already given, or read-only viewer)", () => {
    render(<CodeExpiryCell {...base} locked onChange={vi.fn()} />);
    expect(
      screen.getByLabelText<HTMLInputElement>("Expiry date of code 3").disabled,
    ).toBe(true);
  });

  it("shows the reward's date on a code that has none of its own", () => {
    render(
      <CodeExpiryCell
        {...base}
        inheritedValue="2099-12-31T22:59:59.000Z"
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByLabelText<HTMLInputElement>("Expiry date of code 3").value,
    ).toBe("2099-12-31");
    expect(screen.getByText("from reward")).toBeTruthy();
    expect(screen.queryByText("Expired")).toBeNull();
  });

  it("marks a code expired by its reward's date", () => {
    render(
      <CodeExpiryCell
        {...base}
        inheritedValue="2020-01-01T22:59:59.000Z"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Expired")).toBeTruthy();
    expect(screen.queryByText("from reward")).toBeNull();
  });

  it("lets a code's own date win over the reward's", () => {
    render(
      <CodeExpiryCell
        {...base}
        value="2099-06-30T22:59:59.000Z"
        inheritedValue="2020-01-01T22:59:59.000Z"
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByLabelText<HTMLInputElement>("Expiry date of code 3").value,
    ).toBe("2099-06-30");
    expect(screen.queryByText("Expired")).toBeNull();
    expect(screen.queryByText("from reward")).toBeNull();
  });

  it("shows the deadline fixed when the code was given, and does not call it the reward date", () => {
    render(
      <CodeExpiryCell
        {...base}
        locked
        deliveredValue="2099-08-01T22:59:59.000Z"
        periodDays={30}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByLabelText<HTMLInputElement>("Expiry date of code 3").value,
    ).toBe("2099-08-01");
    expect(screen.getByText("after delivery")).toBeTruthy();
    expect(screen.queryByText("from reward")).toBeNull();
  });

  it("marks a given code whose deadline has passed", () => {
    render(
      <CodeExpiryCell
        {...base}
        locked
        deliveredValue="2020-01-01T22:59:59.000Z"
        onChange={vi.fn()}
      />,
    );
    expect(screen.getByText("Expired")).toBeTruthy();
  });

  it("tells the period still to come for a code not given yet", () => {
    render(<CodeExpiryCell {...base} periodDays={30} onChange={vi.fn()} />);
    expect(
      screen.getByLabelText<HTMLInputElement>("Expiry date of code 3").value,
    ).toBe("");
    expect(screen.getByText("1 month after delivery")).toBeTruthy();
  });

  it("lets a code not given yet take a fixed date of its own instead of the period", () => {
    render(
      <CodeExpiryCell
        {...base}
        value="2099-06-30T22:59:59.000Z"
        periodDays={30}
        onChange={vi.fn()}
      />,
    );
    expect(
      screen.getByLabelText<HTMLInputElement>("Expiry date of code 3").value,
    ).toBe("2099-06-30");
    expect(screen.queryByText("1 month after delivery")).toBeNull();
  });
});
