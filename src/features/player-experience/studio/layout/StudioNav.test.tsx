// The Studio's section menu: an icon rail that opens by hover (over the panel) and by click
// (pinned open, remembered). The sections stay reachable by name in both states.
import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it } from "vitest";

import { createDefaultExperience } from "../../domain/defaults";
import { createLocalServices } from "../../services/createLocalServices";
import { createStudioStore } from "../store";
import { StudioProvider } from "../StudioContext";
import { StudioMenuToggle, StudioNav, useStudioMenu } from "./StudioNav";

const PINNED_KEY = "studio-nav-pinned";

// What StudioShell does: one menu state, shared by the menu and the settings panel's button.
function Harness() {
  const menu = useStudioMenu();
  return (
    <>
      <StudioMenuToggle menu={menu} />
      <StudioNav menu={menu} />
    </>
  );
}

function setup() {
  const store = createStudioStore({
    config: createDefaultExperience({ gameType: "lucky_wheel" }),
  });
  const user = userEvent.setup();
  const view = render(
    <StudioProvider value={{ store, services: createLocalServices() }}>
      <Harness />
    </StudioProvider>,
  );
  const nav = screen.getByRole("navigation", { name: "Studio sections" });
  const toggle = () =>
    screen.getByRole("button", {
      name: /Keep the menu open|Collapse the menu/,
    });
  const open = () => nav.getAttribute("data-expanded") === "true";
  return { user, nav, toggle, open, store, view };
}

beforeEach(() => localStorage.clear());

describe("StudioNav", () => {
  it("rests as a rail, with every section still reachable by name", () => {
    const { open, toggle } = setup();
    expect(open()).toBe(false);
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
    for (const name of [
      "Template",
      "Brand Identity",
      "Content",
      "Validation",
    ]) {
      expect(screen.getByRole("button", { name })).toBeTruthy();
    }
  });

  it("still selects a section from the rail", async () => {
    const { user, store } = setup();
    await user.click(screen.getByRole("button", { name: "Brand Identity" }));
    expect(store.getState().ui.panel).toBe("brand");
  });

  it("hover mode: opens while the pointer is on it, without pinning", async () => {
    const { user, nav, open, toggle } = setup();
    await user.hover(nav);
    expect(open()).toBe(true);
    expect(toggle().getAttribute("aria-pressed")).toBe("false");
    await user.unhover(nav);
    expect(open()).toBe(false);
  });

  it("click mode: stays open after the pointer left, and is remembered", async () => {
    const { user, nav, open, toggle } = setup();
    await user.click(toggle());
    await user.unhover(nav);
    expect(open()).toBe(true);
    expect(localStorage.getItem(PINNED_KEY)).toBe("true");
  });

  it("starts open when it was left pinned", () => {
    localStorage.setItem(PINNED_KEY, "true");
    expect(setup().open()).toBe(true);
  });

  it("closing with the panel button closes it, then hover opens it again", async () => {
    const { user, nav, open, toggle } = setup();
    await user.click(toggle());
    await user.click(toggle());
    expect(open()).toBe(false);
    expect(localStorage.getItem(PINNED_KEY)).toBe("false");
    await user.hover(nav);
    expect(open()).toBe(true);
  });
});
