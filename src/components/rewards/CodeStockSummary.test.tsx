import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { CodeStockSummary } from "./CodeStockSummary";

const base = {
  counts: { available: 5, used: 2, expired: 0 },
  remainingToWin: 3,
  canEdit: true,
  onApplyExpiry: vi.fn().mockResolvedValue(4),
};

const pickDay = (day: string) =>
  fireEvent.change(screen.getByLabelText("Expiry for all codes"), {
    target: { value: day },
  });
const applyButton = () =>
  screen.getByRole("button", {
    name: "Apply to all codes",
  }) as HTMLButtonElement;

describe("CodeStockSummary", () => {
  it("shows available, used and expired", () => {
    render(
      <CodeStockSummary
        {...base}
        counts={{ available: 5, used: 2, expired: 1 }}
      />,
    );
    expect(screen.getByText(/available ·/).textContent).toBe(
      "5 available · 2 used · 1 expired",
    );
  });

  it("is calm when there are enough codes", () => {
    render(<CodeStockSummary {...base} />);
    expect(screen.queryByRole("status")).toBeNull();
  });

  it("warns that the reward stops being drawn when no code is left", () => {
    render(
      <CodeStockSummary
        {...base}
        counts={{ available: 0, used: 4, expired: 1 }}
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(
      /No code left to give.*stops being drawn/,
    );
  });

  it("warns when campaigns expect more winners than there are codes", () => {
    render(
      <CodeStockSummary
        {...base}
        counts={{ available: 2, used: 0, expired: 0 }}
        remainingToWin={5}
      />,
    );
    expect(screen.getByRole("status").textContent).toMatch(
      /still expect 5 winners but only 2 codes are available/,
    );
  });

  it("does not warn about a reward that has no code at all", () => {
    render(
      <CodeStockSummary
        {...base}
        counts={{ available: 0, used: 0, expired: 0 }}
        remainingToWin={5}
      />,
    );
    expect(screen.queryByRole("status")).toBeNull();
    expect(screen.queryByText("Apply to all codes")).toBeNull();
  });

  it("applies one date to all codes, keeping dates already set by default", async () => {
    const onApplyExpiry = vi.fn().mockResolvedValue(4);
    render(<CodeStockSummary {...base} onApplyExpiry={onApplyExpiry} />);
    expect(applyButton().disabled).toBe(true);

    pickDay("2099-12-31");
    fireEvent.click(applyButton());
    await waitFor(() =>
      expect(onApplyExpiry).toHaveBeenCalledWith(
        "2099-12-31T22:59:59.000Z",
        true,
      ),
    );
    expect(await screen.findByText("Expiry set on 4 codes.")).toBeTruthy();
  });

  it("replaces dates already set only when the box is ticked", async () => {
    const onApplyExpiry = vi.fn().mockResolvedValue(1);
    render(<CodeStockSummary {...base} onApplyExpiry={onApplyExpiry} />);
    fireEvent.click(screen.getByLabelText("Replace dates already set"));
    pickDay("2099-12-31");
    fireEvent.click(applyButton());
    await waitFor(() =>
      expect(onApplyExpiry).toHaveBeenCalledWith(
        "2099-12-31T22:59:59.000Z",
        false,
      ),
    );
  });

  it("warns, without blocking, about a date in the past", () => {
    render(<CodeStockSummary {...base} />);
    pickDay("2020-01-01");
    expect(screen.getByText(/in the past/)).toBeTruthy();
    expect(applyButton().disabled).toBe(false);
  });

  it("reports a failure", async () => {
    render(
      <CodeStockSummary
        {...base}
        onApplyExpiry={vi.fn().mockResolvedValue(null)}
      />,
    );
    pickDay("2099-12-31");
    fireEvent.click(applyButton());
    expect(await screen.findByText(/could not be set/)).toBeTruthy();
  });

  it("is read-only for a viewer", () => {
    render(<CodeStockSummary {...base} canEdit={false} />);
    expect(screen.queryByLabelText("Expiry for all codes")).toBeNull();
  });
});
