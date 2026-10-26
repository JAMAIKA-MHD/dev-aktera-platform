import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { describe, expect, it } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { themeFromPreset } from "../../presets/themePresets";
import { createLocalServices } from "../../services/createLocalServices";
import { createStudioStore, type StudioStore } from "../store";
import { StudioProvider } from "../StudioContext";
import { BrandPanel } from "./BrandPanel";
import { isCustomized, TemplatePanel } from "./TemplatePanel";

function renderPanel(Panel: ComponentType, store?: StudioStore) {
  const studio =
    store ??
    createStudioStore({
      config: createDefaultExperience({ gameType: "lucky_wheel" }),
    });
  render(
    <StudioProvider value={{ store: studio, services: createLocalServices() }}>
      <Panel />
    </StudioProvider>,
  );
  return studio;
}

describe("TemplatePanel", () => {
  it("offers the style presets only: no layout card to choose", () => {
    renderPanel(TemplatePanel);
    expect(screen.queryByText("Eight zones")).toBeNull();
    expect(screen.queryByRole("heading", { name: "Layout" })).toBeNull();
    expect(screen.getByRole("heading", { name: "Style" })).toBeTruthy();
    expect(
      screen.getByRole("radiogroup", { name: "Style presets" }),
    ).toBeTruthy();
  });

  it("knows when the style was changed after its preset", () => {
    const theme = themeFromPreset("clean-light");
    expect(isCustomized(theme)).toBe(false);
    expect(isCustomized({ ...theme, radius: "sharp" })).toBe(true);
    expect(isCustomized({ ...theme, presetId: null })).toBe(true);
  });

  it("applies a preset at once while the style is untouched, keeping the texts", () => {
    const store = renderPanel(TemplatePanel);
    const title = store.getState().config.screens.welcome.title;
    fireEvent.click(screen.getByRole("radio", { name: /Retail Blue/ }));
    expect(store.getState().config.theme.presetId).toBe("retail-blue");
    expect(store.getState().config.screens.welcome.title).toEqual(title);
    expect(screen.queryByRole("alertdialog")).toBeNull();
  });

  it("asks before replacing style changes, and resets to the preset", () => {
    const store = renderPanel(TemplatePanel);
    act(() => store.getState().updateTheme({ radius: "sharp" }));
    fireEvent.click(screen.getByRole("radio", { name: /Telecom Red/ }));
    const dialog = screen.getByRole("alertdialog");
    fireEvent.click(
      within(dialog).getByRole("button", { name: /Keep my changes/ }),
    );
    expect(store.getState().config.theme.radius).toBe("sharp");

    fireEvent.click(screen.getByRole("radio", { name: /Telecom Red/ }));
    fireEvent.click(screen.getByRole("button", { name: "Apply Telecom Red" }));
    expect(store.getState().config.theme.presetId).toBe("telecom-red");

    act(() => store.getState().updateTheme({ font: "plus-jakarta" }));
    fireEvent.click(
      screen.getByRole("button", { name: "Reset to Telecom Red" }),
    );
    expect(store.getState().config.theme).toEqual(
      themeFromPreset("telecom-red"),
    );
    expect(
      screen.getByRole("button", { name: "Reset to preset" }),
    ).toHaveProperty("disabled", true);
  });
});

describe("TemplatePanel · template library", () => {
  it("lists every template of the library, the classic one selected", () => {
    renderPanel(TemplatePanel);
    const library = screen.getByRole("radiogroup", {
      name: "Template library",
    });
    const names = within(library)
      .getAllByRole("radio")
      .map((radio) => radio.textContent);
    expect(names).toHaveLength(5);
    expect(
      within(library).getByRole("radio", { name: /Classic/ }),
    ).toHaveProperty("ariaChecked", "true");
  });

  it("applies a template with its palette, keeps the texts, and hides the classic presets", () => {
    const store = renderPanel(TemplatePanel);
    const title = store.getState().config.screens.welcome.title;
    fireEvent.click(screen.getByRole("radio", { name: /Cartoon Pop/ }));
    const { config } = store.getState();
    expect(config.templateId).toBe("comic-burst");
    expect(config.theme).toEqual(themeFromPreset("comic-burst"));
    expect(config.screens.welcome.title).toEqual(title);
    expect(
      screen.queryByRole("radiogroup", { name: "Style presets" }),
    ).toBeNull();

    // Undo brings the classic template and its style back in one step.
    act(() => store.temporal.getState().undo());
    expect(store.getState().config.templateId).toBe("eight-slot");
    expect(store.getState().config.theme.presetId).toBe("midnight-gold");
  });

  it("asks before a template replaces style changes", () => {
    const store = renderPanel(TemplatePanel);
    act(() => store.getState().updateTheme({ radius: "sharp" }));
    fireEvent.click(screen.getByRole("radio", { name: /Pixel Quest/ }));
    expect(store.getState().config.templateId).toBe("eight-slot");
    fireEvent.click(screen.getByRole("button", { name: "Apply Pixel Quest" }));
    expect(store.getState().config.templateId).toBe("pixel-quest");
    expect(store.getState().config.theme.presetId).toBe("pixel-quest");
  });

  it("goes back to the classic template with the classic style the brand had", () => {
    const store = renderPanel(TemplatePanel);
    fireEvent.click(screen.getByRole("radio", { name: /Retail Blue/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Quiz Show/ }));
    fireEvent.click(screen.getByRole("radio", { name: /Classic/ }));
    expect(store.getState().config.templateId).toBe("eight-slot");
    expect(store.getState().config.theme.presetId).toBe("midnight-gold");
  });
});

describe("BrandPanel", () => {
  it("leaves the background to a template that draws its own", () => {
    const store = renderPanel(BrandPanel);
    expect(screen.getByRole("radiogroup", { name: "Style" })).toBeTruthy();
    act(() => store.getState().applyTemplate("arcade-night"));
    expect(
      screen.getByText(/Arcade Night template draws its own background/),
    ).toBeTruthy();
    // Only primary and accent are the brand's: the panels and the page are the theme's.
    expect(screen.getByLabelText("Primary")).toBeTruthy();
    expect(screen.getByLabelText("Accent")).toBeTruthy();
    expect(screen.queryByLabelText("Secondary")).toBeNull();
    expect(screen.queryByLabelText("Background")).toBeNull();
    expect(screen.queryByLabelText("Text")).toBeNull();
    expect(screen.queryByRole("radiogroup", { name: "Style" })).toBeNull();
  });

  it("edits the name, the tagline in the preview's language, and the colors", () => {
    const store = renderPanel(BrandPanel);
    fireEvent.change(screen.getByLabelText("Brand name"), {
      target: { value: "Zeta Market" },
    });
    expect(store.getState().config.brand.name).toBe("Zeta Market");

    act(() => store.getState().setLocale("ar"));
    fireEvent.change(screen.getByLabelText("Tagline"), {
      target: { value: "أفضل الأسعار" },
    });
    expect(store.getState().config.brand.tagline).toEqual({
      ar: "أفضل الأسعار",
    });

    fireEvent.change(screen.getByLabelText("Accent"), {
      target: { value: "#22c55e" },
    });
    expect(store.getState().config.theme.colors.accent).toBe("#22c55e");
    // The theme mode comes from the template: Brand Identity does not offer it.
    expect(screen.queryByRole("radio", { name: "Light" })).toBeNull();
    expect(screen.queryByRole("radio", { name: "Dark" })).toBeNull();
  });

  it("never lets a preset plus a color change break contrast without a warning", () => {
    const store = createStudioStore({
      config: createDefaultExperience({ gameType: "lucky_wheel" }),
    });
    store.getState().applyPreset("clean-light");
    renderPanel(BrandPanel, store);
    // Light grey text on the white page of Clean Light.
    fireEvent.change(screen.getByLabelText("Text"), {
      target: { value: "#e2e8f0" },
    });
    const issues = store
      .getState()
      .issues.filter((issue) => issue.path.startsWith("theme.colors"));
    expect(issues.length).toBeGreaterThan(0);
    // Said twice: on the field itself, and in the list of the section.
    expect(screen.getAllByText(/Low contrast/).length).toBeGreaterThan(0);
    expect(
      screen.getByRole("list", { name: "Issues in this section" }).textContent,
    ).toContain(issues[0].message);
  });

  it("shows the photo, its veil and its point of interest for an image background only", () => {
    const store = renderPanel(BrandPanel);
    expect(screen.queryByText("Photo")).toBeNull();
    fireEvent.click(screen.getByRole("radio", { name: "Image" }));
    expect(store.getState().config.theme.background.kind).toBe("image");
    expect(screen.getByText("Photo")).toBeTruthy();
    const veil = screen.getByLabelText("Veil over the photo");
    fireEvent.change(veil, { target: { value: "40" } });
    fireEvent.blur(veil);
    expect(store.getState().config.theme.background.overlayOpacity).toBe(0.4);
  });
});
