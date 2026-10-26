import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { CodeStockSummary } from "./CodeStockSummary";

const base = {
  counts: { available: 5, used: 2, expired: 0 },
  remainingToWin: 3,
};

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
  });

  // The date of all the codes is set from the reward form: see CodesExpiryFields.test.tsx.
  it("has no expiry field of its own", () => {
    render(<CodeStockSummary {...base} />);
    expect(screen.queryByLabelText("Expiry date for all codes")).toBeNull();
  });
});
