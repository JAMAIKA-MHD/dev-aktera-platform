import {
  act,
  fireEvent,
  render,
  screen,
  waitFor,
} from "@testing-library/react";
import type { ComponentType } from "react";
import { beforeEach, describe, expect, it } from "vitest";
import { createDefaultExperience } from "../../domain/defaults";
import { DEMO_ENTRIES_KEY } from "../../services/local/demoEntryStore";
import { createLocalServices } from "../../services/createLocalServices";
import { exportFileName, readImportedConfig } from "../shareFile";
import { createStudioStore, type StudioStore } from "../store";
import { StudioProvider } from "../StudioContext";
import { LegalPanel } from "./LegalPanel";
import { SharePanel } from "./SharePanel";

function renderPanel(Panel: ComponentType): StudioStore {
  const store = createStudioStore({
    config: createDefaultExperience({ gameType: "lucky_wheel" }),
  });
  render(
    <StudioProvider value={{ store, services: createLocalServices() }}>
      <Panel />
    </StudioProvider>,
  );
  return store;
}

const upload = (text: string, name = "config.json") =>
  fireEvent.change(screen.getByLabelText("Configuration file"), {
    target: { files: [new File([text], name, { type: "application/json" })] },
  });

describe("shareFile", () => {
  it("names the export file after the campaign and the day", () => {
    const day = new Date("2026-09-23T10:00:00Z");
    expect(exportFileName("Rentrée Zeta !", day)).toBe(
      "player-experience-rentree-zeta-2026-09-23.json",
    );
    expect(exportFileName(null, day)).toBe(
      "player-experience-standalone-2026-09-23.json",
    );
    expect(exportFileName("عرض", day)).toBe(
      "player-experience-campaign-2026-09-23.json",
    );
  });

  it("accepts a valid configuration and refuses anything else, with reasons", () => {
    const valid = createDefaultExperience({ gameType: "quiz" });
    expect(readImportedConfig(JSON.stringify(valid))).toMatchObject({
      ok: true,
      config: { game: { type: "quiz" } },
    });
    expect(readImportedConfig("{ nope")).toMatchObject({
      ok: false,
      message: "This file is not valid JSON.",
    });
    const damaged = readImportedConfig(
      JSON.stringify({ ...valid, theme: { mode: "neon" } }),
    );
    expect(damaged.ok).toBe(false);
    if (damaged.ok === false) {
      expect(damaged.details.length).toBeGreaterThan(0);
      expect(damaged.details.join(" ")).toMatch(/theme/);
    }
  });
});

describe("LegalPanel", () => {
  it("edits the organizer and the links, and flags an unsafe address", () => {
    const store = renderPanel(LegalPanel);
    fireEvent.change(screen.getByLabelText("Organizer name"), {
      target: { value: "Zeta Market SARL" },
    });
    expect(store.getState().config.legal.organizerName).toBe(
      "Zeta Market SARL",
    );

    fireEvent.change(screen.getAllByLabelText("Address")[0], {
      target: { value: "http://zeta.example/rules" },
    });
    expect(
      store.getState().issues.some((issue) => issue.id === "link-url:0"),
    ).toBe(true);
    expect(screen.getByText(/must start with https:/)).toBeTruthy();
    fireEvent.change(screen.getAllByLabelText("Address")[0], {
      target: { value: "" },
    });
    // Emptied: no url key left, the link opens the legal text again.
    expect(store.getState().config.legal.links[0]).not.toHaveProperty("url");

    fireEvent.click(screen.getByRole("button", { name: "Add a link" }));
    const added = store.getState().config.legal.links.at(-1)!;
    expect(added.kind).toBe("url");
    expect(
      store.getState().issues.some((issue) => issue.path.endsWith(".url")),
    ).toBe(true);
  });
});

describe("SharePanel", () => {
  beforeEach(() => localStorage.clear());

  it("refuses an invalid file with a clear message, and changes nothing", async () => {
    const store = renderPanel(SharePanel);
    const before = store.getState().config;
    upload('{"schemaVersion": 1, "theme": 42}', "broken.json");
    expect((await screen.findByRole("alert")).textContent).toMatch(
      /not a Player Experience configuration/,
    );
    expect(store.getState().config).toBe(before);
    expect(store.temporal.getState().pastStates).toHaveLength(0);
  });

  it("imports a valid file as one undoable step, keeping this experience's identity", async () => {
    const store = renderPanel(SharePanel);
    const { id, campaignId } = store.getState().config;
    const incoming = createDefaultExperience({ gameType: "scratch_card" });
    upload(JSON.stringify(incoming), "zeta.json");
    await waitFor(() =>
      expect(store.getState().config.game.type).toBe("scratch_card"),
    );
    expect(store.getState().config).toMatchObject({ id, campaignId });
    expect(screen.getByRole("status").textContent).toMatch(/zeta\.json/);
    act(() => store.temporal.getState().undo());
    expect(store.getState().config.game.type).toBe("lucky_wheel");
  });

  it("blocks the export while a required issue remains", () => {
    const store = renderPanel(SharePanel);
    expect(screen.getByRole("button", { name: "Export JSON" })).toHaveProperty(
      "disabled",
      false,
    );
    act(() =>
      store.getState().updateForm({
        consent: { ...store.getState().config.form.consent, text: {} },
      }),
    );
    expect(screen.getByRole("button", { name: "Export JSON" })).toHaveProperty(
      "disabled",
      true,
    );
    expect(
      screen.getByText("Fix required issues before sharing."),
    ).toBeTruthy();
  });

  it("clears the demo participations of this campaign", () => {
    localStorage.setItem(
      DEMO_ENTRIES_KEY,
      JSON.stringify([
        {
          entryId: "e1",
          campaignId: "demo-campaign",
          phone: "0555123456",
          clientRequestId: "r1",
          outcome: { kind: "lose" },
          couponConfirmed: false,
          createdAt: "2026-09-23T10:00:00.000Z",
        },
      ]),
    );
    renderPanel(SharePanel);
    fireEvent.click(screen.getByRole("button", { name: "Reset demo data" }));
    const left = JSON.parse(localStorage.getItem(DEMO_ENTRIES_KEY) ?? "[]");
    expect(left).toEqual([]);
    expect(screen.getByRole("status").textContent).toMatch(/can play again/);
  });
});
