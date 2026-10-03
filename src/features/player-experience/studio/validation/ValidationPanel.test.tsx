import { act, fireEvent, render, screen, within } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { createLocalServices } from "../../services/createLocalServices";
import { PanelArea } from "../layout/PanelArea";
import { StudioNav, useStudioMenu } from "../layout/StudioNav";
import { createStudioStore } from "../store";
import { StudioProvider } from "../StudioContext";

function Nav() {
  return <StudioNav menu={useStudioMenu()} />;
}

// The validation panel (T6.8), inside the real menu and panel area, as the brand uses it.
function renderStudio() {
  const store = createStudioStore({
    config: createDefaultExperience({ gameType: "lucky_wheel" }),
  });
  render(
    <StudioProvider value={{ store, services: createLocalServices() }}>
      <Nav />
      <main style={{ overflowY: "auto" }}>
        <PanelArea />
      </main>
    </StudioProvider>,
  );
  return store;
}

describe("ValidationPanel", () => {
  it("says the experience is ready when nothing blocks it", () => {
    const store = renderStudio();
    act(() => store.getState().setPanel("validation"));
    expect(screen.getByText("Ready to share.")).toBeTruthy();
    expect(screen.queryByRole("alert")).toBeNull();
  });

  it("shows an empty consent as a blocking error, and its link opens the field", () => {
    const store = renderStudio();
    act(() => {
      store.getState().updateForm({
        consent: { ...store.getState().config.form.consent, text: {} },
      });
      store.getState().setPanel("validation");
    });
    expect(screen.getByRole("alert").textContent).toMatch(
      /Fix required issues before sharing/,
    );
    const errors = screen.getByRole("region", { name: "Errors" });
    const row = within(errors).getByRole("button", {
      name: /consent text is empty/,
    });
    expect(row.textContent).toMatch(/Form/);
    // The menu counts it too, in red.
    expect(
      screen.getByRole("button", { name: /Validation/ }).textContent,
    ).toMatch(/1/);

    fireEvent.click(row);
    expect(store.getState().ui).toMatchObject({
      panel: "form",
      focusPath: "form.consent.text",
    });
    const field = document.querySelector<HTMLElement>(
      '[data-studio-path="form.consent.text"]',
    )!;
    expect(field.dataset.studioFlash).toBe("true");
    expect(field.contains(document.activeElement)).toBe(true);
  });

  it("lists errors before warnings, each leading to its panel", () => {
    const store = renderStudio();
    act(() => {
      store.getState().updateScreen("welcome", {
        title: {
          fr: "Un titre beaucoup trop long pour tenir sur deux lignes d'un petit téléphone",
        },
      });
      store.getState().updateForm({
        consent: { ...store.getState().config.form.consent, text: {} },
      });
      store.getState().setPanel("validation");
    });
    const groups = screen
      .getAllByRole("region")
      .map((region) => region.getAttribute("aria-label"));
    expect(groups).toEqual(["Errors", "Warnings", "All sizes"]);
    const warnings = screen.getByRole("region", { name: "Warnings" });
    fireEvent.click(
      within(warnings).getAllByRole("button", { name: /Content/ })[0],
    );
    expect(store.getState().ui.panel).toBe("content");
    expect(store.getState().ui.focusPath).toMatch(/^screens\.welcome/);
  });
});
