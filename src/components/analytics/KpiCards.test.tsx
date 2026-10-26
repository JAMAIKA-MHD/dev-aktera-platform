import { render, screen } from "@testing-library/react";
import { Gift } from "lucide-react";
import { describe, expect, it } from "vitest";

import { DayRuler, KpiCard, percentOf, roundedShare } from "./KpiCards";

describe("KpiCard", () => {
  it("renders the value, suffix and a clamped segmented meter", () => {
    render(
      <KpiCard
        label="Entries this month"
        kind="Usage"
        tone="teal"
        icon={Gift}
        value="1,200"
        suffix="/ 1,000"
        description="Over the allowance"
        meter={{
          type: "seg",
          pct: 120,
          left: "Monthly allowance",
          right: "120%",
        }}
      />,
    );
    expect(screen.getByText("/ 1,000")).toBeTruthy();
    const meter = screen.getByRole("meter", { name: "Monthly allowance" });
    expect(meter.getAttribute("aria-valuenow")).toBe("100");
    expect(screen.getByText("120%")).toBeTruthy();
  });

  it("draws one block per item and fills the used ones", () => {
    const { container } = render(
      <KpiCard
        label="Active campaigns"
        kind="Capacity"
        tone="amber"
        icon={Gift}
        value="2"
        description="3 more can run at once"
        meter={{
          type: "blocks",
          on: 2,
          total: 5,
          left: "Slots in use",
          right: "2 of 5",
        }}
      />,
    );
    expect(container.querySelectorAll(".kx-blocks b")).toHaveLength(5);
    expect(container.querySelectorAll(".kx-blocks b.on")).toHaveLength(2);
  });

  it("leaves the meter out when there is none", () => {
    render(
      <KpiCard
        label="Current plan"
        kind="Plan"
        tone="blue"
        icon={Gift}
        value="Free"
        description="No billing period running"
      />,
    );
    expect(screen.queryByRole("meter")).toBeNull();
  });
});

describe("DayRuler", () => {
  it("marks past days and raises today", () => {
    const { container } = render(
      <DayRuler
        today={25}
        daysInMonth={31}
        startLabel="Oct 1"
        todayLabel="Today · Oct 25"
        endLabel="Oct 31"
      />,
    );
    expect(screen.getByRole("img", { name: "Day 25 of 31" })).toBeTruthy();
    expect(container.querySelectorAll(".kx-ruler b")).toHaveLength(31);
    expect(container.querySelectorAll(".kx-ruler b.done")).toHaveLength(24);
    expect(container.querySelectorAll(".kx-ruler b.now")).toHaveLength(1);
  });
});

describe("meter helpers", () => {
  it("returns zero or a dash without a total", () => {
    expect(percentOf(3, 0)).toBe(0);
    expect(roundedShare(3, 0)).toBe("—");
    expect(roundedShare(191, 240)).toBe("80%");
  });
});
