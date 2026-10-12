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
});
