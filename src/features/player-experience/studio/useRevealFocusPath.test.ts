import { describe, expect, it } from "vitest";
import { findFieldFor } from "./useRevealFocusPath";

// Which field a preview click or an issue leads to (T6.4): the exact one, else the closest.
describe("findFieldFor", () => {
  const root = document.createElement("div");
  root.innerHTML = `
    <div data-studio-path="theme.colors.primary"></div>
    <div data-studio-path="theme.colors.text"></div>
    <div data-studio-path="theme.background.kind"></div>
    <div data-studio-path="brand.name"></div>
    <div data-studio-path="brand.logo"></div>`;
  const pathOf = (path: string) =>
    findFieldFor(root, path)?.dataset.studioPath ?? null;

  it("finds the exact field", () => {
    expect(pathOf("theme.colors.text")).toBe("theme.colors.text");
  });

  it("finds the field that contains a deeper path", () => {
    expect(pathOf("theme.background.kind.extra")).toBe("theme.background.kind");
  });

  it("finds the first field of a broader path", () => {
    expect(pathOf("brand")).toBe("brand.name");
    expect(pathOf("theme.colors")).toBe("theme.colors.primary");
  });

  it("finds nothing for a path of another panel", () => {
    expect(pathOf("form.consent.text")).toBeNull();
  });
});
