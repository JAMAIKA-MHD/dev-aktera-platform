import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { Gift } from "lucide-react";
import { MemoryRouter } from "react-router-dom";
import { describe, expect, it, vi } from "vitest";

import { EmptyState, ErrorState, GhostChart } from "./EmptyState";

describe("EmptyState", () => {
  it("shows a real heading, and its icon stays out of the accessibility tree", () => {
    const { container } = render(
      <EmptyState icon={Gift} headingLevel={3} title="Nothing yet" />,
    );
    expect(
      screen.getByRole("heading", { level: 3, name: "Nothing yet" }),
    ).toBeTruthy();
    expect(
      container.querySelector(".es-icon")?.getAttribute("aria-hidden"),
    ).toBe("true");
  });

  it("makes an action a link when it has a destination, a button otherwise", async () => {
    const onClick = vi.fn();
    render(
      <MemoryRouter>
        <EmptyState
          icon={Gift}
          title="Nothing yet"
          primaryAction={{ label: "Create", to: "/create" }}
          secondaryAction={{ label: "Later", onClick }}
        />
      </MemoryRouter>,
    );
    expect(
      screen.getByRole("link", { name: "Create" }).getAttribute("href"),
    ).toBe("/create");
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Later" }));
    expect(onClick).toHaveBeenCalled();
  });
});

describe("ErrorState", () => {
  it("announces the failure and offers Retry", async () => {
    const onRetry = vi.fn();
    render(<ErrorState message="Network down" onRetry={onRetry} />);
    expect(screen.getByRole("alert").textContent).toContain("Network down");
    await userEvent
      .setup()
      .click(screen.getByRole("button", { name: "Retry" }));
    expect(onRetry).toHaveBeenCalled();
  });
});

describe("GhostChart", () => {
  it("always carries its label, so it cannot pass for real numbers", () => {
    render(<GhostChart label="Sample data" />);
    expect(screen.getByText("Sample data")).toBeTruthy();
  });
});
