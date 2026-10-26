import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import {
  CodesExpiryFields,
  EMPTY_CODES_EXPIRY,
  type CodesExpiryForm,
} from "./CodesExpiryFields";

// The reward form holds the value; this harness plays that part and reports every change.
function Harness({
  onChange,
  disabled,
}: {
  onChange: (next: CodesExpiryForm) => void;
  disabled?: boolean;
}) {
  const [value, setValue] = useState(EMPTY_CODES_EXPIRY);
  return (
    <CodesExpiryFields
      value={value}
      disabled={disabled}
      onChange={(next) => {
        setValue(next);
        onChange(next);
      }}
    />
  );
}

const pickDay = (day: string) =>
  fireEvent.change(screen.getByLabelText("Expiry date for all codes"), {
    target: { value: day },
  });

describe("CodesExpiryFields", () => {
  it("keeps the dates already set by default", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    pickDay("2099-12-31");
    expect(onChange).toHaveBeenLastCalledWith({
      day: "2099-12-31",
      replaceExisting: false,
    });
  });

  it("replaces dates already set only when the box is ticked", () => {
    const onChange = vi.fn();
    render(<Harness onChange={onChange} />);
    fireEvent.click(screen.getByLabelText("Replace dates already set"));
    pickDay("2099-12-31");
    expect(onChange).toHaveBeenLastCalledWith({
      day: "2099-12-31",
      replaceExisting: true,
    });
  });

  it("warns, without blocking, about a date in the past", () => {
    render(<Harness onChange={vi.fn()} />);
    expect(screen.queryByText(/in the past/)).toBeNull();
    pickDay("2020-01-01");
    expect(screen.getByText(/in the past/)).toBeTruthy();
  });

  it("cannot be changed when disabled", () => {
    render(<Harness onChange={vi.fn()} disabled />);
    // The fieldset disables its fields: the input's own `disabled` stays false.
    expect(
      screen.getByLabelText("Expiry date for all codes").matches(":disabled"),
    ).toBe(true);
  });
});
