import { render } from "@testing-library/react";
import { afterEach, describe, expect, it, vi } from "vitest";
import type { AssetRef } from "../../../domain/types";
import { createLocalServices } from "../../../services/createLocalServices";
import { ServicesProvider } from "../../../services/ServicesProvider";
import { resolveAppStorage } from "../../../services/storageUrl";
import { HitTarget } from "./HitTarget";

// The target draws the brand's image when it resolves to a URL (backend task B4.2): an image
// uploaded to Supabase Storage has no URL of its own, the services resolve it.

const stored: AssetRef = {
  kind: "storage",
  bucket: "campaign-media",
  path: "org/experience/c/logo-1.webp",
};
const inline: AssetRef = { kind: "dataUrl", url: "data:image/png;base64,AA" };

const imageSrc = (container: HTMLElement) =>
  container.querySelector("img")?.getAttribute("src") ?? null;

describe("HitTarget", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("draws a Storage image through the services", () => {
    const services = createLocalServices({
      resolveStorage: (bucket, path) => `https://cdn.test/${bucket}/${path}`,
    });
    const { container } = render(
      <ServicesProvider services={services}>
        <HitTarget icon="target" image={stored} x={50} y={50} />
      </ServicesProvider>,
    );
    expect(imageSrc(container)).toBe(
      "https://cdn.test/campaign-media/org/experience/c/logo-1.webp",
    );
  });

  it("falls back to the icon when the image cannot be resolved", () => {
    const { container } = render(
      <ServicesProvider services={createLocalServices()}>
        <HitTarget icon="target" image={stored} x={50} y={50} />
      </ServicesProvider>,
    );
    expect(imageSrc(container)).toBeNull();
    expect(container.querySelector("svg")).toBeTruthy();
  });

  it("still works without services for an image that carries its URL", () => {
    const { container } = render(
      <HitTarget icon="target" image={inline} x={50} y={50} />,
    );
    expect(imageSrc(container)).toBe("data:image/png;base64,AA");
  });

  it("shows the icon without an image", () => {
    const { container } = render(
      <HitTarget icon="target" image={null} x={50} y={50} />,
    );
    expect(imageSrc(container)).toBeNull();
  });
});

describe("resolveAppStorage", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("builds the public URL of the app's own project", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "http://127.0.0.1:54321");
    expect(resolveAppStorage("campaign-media", "org/x.webp")).toBe(
      "http://127.0.0.1:54321/storage/v1/object/public/campaign-media/org/x.webp",
    );
  });

  it("resolves nothing without a project URL", () => {
    vi.stubEnv("VITE_SUPABASE_URL", "");
    expect(resolveAppStorage("campaign-media", "org/x.webp")).toBeNull();
  });
});
