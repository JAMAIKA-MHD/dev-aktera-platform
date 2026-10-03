// The menu opens in two ways at once: hover (over the page) and click (pinned, remembered).
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { MemoryRouter } from "react-router-dom";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { LanguageProvider } from "../contexts/LanguageContext";
import {
  DashboardMenuToggle,
  DashboardSidebar,
  useDashboardMenu,
} from "./DashboardSidebar";

vi.mock("../contexts/AuthContext", () => ({
  useAuth: () => ({ signOut: vi.fn() }),
}));

const PINNED_KEY = "dashboard-sidebar-pinned";

// What the shell does: one menu state, shared by the menu and the top bar's button.
function Harness() {
  const menu = useDashboardMenu();
  return (
    <>
      <DashboardMenuToggle menu={menu} />
      <DashboardSidebar menu={menu} />
    </>
  );
}

function setup() {
  const user = userEvent.setup();
  const view = render(
    <LanguageProvider>
      <MemoryRouter initialEntries={["/studio/c1"]}>
        <Harness />
      </MemoryRouter>
    </LanguageProvider>,
  );
  const aside = view.container.querySelector("aside") as HTMLElement;
  const toggle = () =>
    screen.getByRole("button", {
      name: /Keep the menu open|Collapse the menu/,
    });
  const open = () => aside.getAttribute("data-expanded") === "true";
  return { user, aside, toggle, open, view };
}

beforeEach(() => localStorage.clear());

describe("DashboardSidebar", () => {
  it("rests as a rail", () => {
    const { open, toggle } = setup();
    expect(open()).toBe(false);
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
  });

  it("marks the open screen and links to the others", () => {
    setup();
    const nav = screen.getByRole("navigation", { name: "Dashboard" });
    expect(
      nav.querySelector('a[href="/studio"]')?.getAttribute("aria-current"),
    ).toBe("page");
    expect(nav.querySelector('a[href="/prizes"]')).not.toBeNull();
  });

  it("hover mode: opens while the pointer is on the menu, closes when it leaves", async () => {
    const { user, aside, open, toggle } = setup();
    await user.hover(aside);
    expect(open()).toBe(true);
    // Hovering is not pinning: the page keeps its room.
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
    await user.unhover(aside);
    expect(open()).toBe(false);
  });

  it("click mode: stays open after the pointer left, and is remembered", async () => {
    const { user, aside, open, toggle } = setup();
    await user.click(toggle());
    expect(toggle().getAttribute("aria-pressed")).toBe("true");
    await user.unhover(aside);
    expect(open()).toBe(true);
    expect(localStorage.getItem(PINNED_KEY)).toBe("true");
  });

  it("starts open when it was left pinned", () => {
    localStorage.setItem(PINNED_KEY, "true");
    const { open } = setup();
    expect(open()).toBe(true);
  });

  it("closing with the top bar button closes it, and hover opens it again", async () => {
    const { user, aside, open, toggle } = setup();
    await user.click(toggle()); // pinned
    await user.click(toggle()); // closed
    expect(open()).toBe(false);
    expect(localStorage.getItem(PINNED_KEY)).toBe("false");
    await user.hover(aside);
    expect(open()).toBe(true);
  });

  it("opens with the keyboard focus too", async () => {
    const { user, open } = setup();
    await user.tab(); // the top bar button
    expect(open()).toBe(false);
    await user.tab(); // the first entry of the menu
    expect(open()).toBe(true);
  });
});
