import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  DEFAULT_EXPIRY_POLICY,
  type ExpiryPolicyForm,
} from "../../lib/expiryPolicy";
import { ExpiryPolicyFields } from "./ExpiryPolicyFields";

// The component is controlled: a tiny host keeps the state, as the forms do.
function Host({
  initial = DEFAULT_EXPIRY_POLICY,
  onChange,
  disabled,
}: {
  initial?: ExpiryPolicyForm;
  onChange?: (value: ExpiryPolicyForm) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(initial);
  return (
    <ExpiryPolicyFields
      value={value}
      disabled={disabled}
      onChange={(next) => {
        setValue(next);
        onChange?.(next);
      }}
    />
  );
}

describe("ExpiryPolicyFields", () => {
  it("is a group of three choices, one selected", () => {
    render(<Host />);
    expect(
      screen.getByRole("group", { name: "Expiry of the codes" }),
    ).toBeTruthy();
    expect(screen.getAllByRole("radio")).toHaveLength(3);
    expect(
      (screen.getByLabelText(/No expiry/) as HTMLInputElement).checked,
    ).toBe(true);
  });

  it("reports the choice and keeps what was typed for the other kinds", () => {
    const onChange = vi.fn();
    render(<Host onChange={onChange} />);
    fireEvent.click(screen.getByLabelText(/On a fixed date/));
    fireEvent.change(screen.getByLabelText("Expiry date"), {
      target: { value: "2099-12-31" },
    });
    fireEvent.click(screen.getByLabelText(/After delivery/));
    fireEvent.click(screen.getByLabelText(/On a fixed date/));
    // Going back shows the date again.
    expect(
      (screen.getByLabelText("Expiry date") as HTMLInputElement).value,
    ).toBe("2099-12-31");
    expect(onChange).toHaveBeenLastCalledWith(
      expect.objectContaining({ mode: "date", day: "2099-12-31" }),
    );
  });

  it("offers days, weeks and months, and flags an amount that is not a whole number", () => {
    render(
      <Host initial={{ ...DEFAULT_EXPIRY_POLICY, mode: "after_delivery" }} />,
    );
    const options = Array.from(
      (screen.getByLabelText("Validity unit") as HTMLSelectElement).options,
    ).map((o) => o.value);
    expect(options).toEqual(["days", "weeks", "months"]);

    const amount = screen.getByLabelText("Validity period");
    expect(amount.getAttribute("aria-invalid")).toBe("false");
    fireEvent.change(amount, { target: { value: "1.5" } });
    expect(amount.getAttribute("aria-invalid")).toBe("true");
    expect(
      screen.getByText(/Enter a whole number, up to 3650 days/),
    ).toBeTruthy();
    fireEvent.change(amount, { target: { value: "45" } });
    expect(amount.getAttribute("aria-invalid")).toBe("false");
  });

  it("explains that the countdown starts when the code is given", () => {
    render(
      <Host initial={{ ...DEFAULT_EXPIRY_POLICY, mode: "after_delivery" }} />,
    );
    expect(
      screen.getByText(/countdown starts when the code is given/),
    ).toBeTruthy();
  });

  it("can be disabled while a save is running", () => {
    render(<Host disabled />);
    for (const radio of screen.getAllByRole("radio")) {
      expect(radio.matches(":disabled")).toBe(true);
    }
  });
});
