import { describe, expect, it } from "vitest";
import { createDefaultExperience } from "../domain/defaults";
import { createLocalExperienceRepository } from "../services/local/localExperienceRepository";
import { THEME_PRESETS } from "../presets/themePresets";
import { loadIntoStudio } from "./loadIntoStudio";
import { createStudioStore, DEFAULT_VIEWPORT, HISTORY_LIMIT } from "./store";

// A clock that moves one second per call, so every edit gets its own updatedAt.
function ticking(start = Date.parse("2026-09-23T10:00:00.000Z")) {
  let at = start;
  return () => new Date((at += 1000)).toISOString();
}

function memoryStorage(): Storage {
  const items = new Map<string, string>();
  return {
    get length() {
      return items.size;
    },
    clear: () => items.clear(),
    getItem: (key) => items.get(key) ?? null,
    key: (index) => [...items.keys()][index] ?? null,
    removeItem: (key) => void items.delete(key),
    setItem: (key, value) => void items.set(key, value),
  };
}

const newStore = () =>
  createStudioStore({
    config: createDefaultExperience({ gameType: "lucky_wheel" }),
    now: ticking(),
  });

describe("studio store", () => {
  it("starts on a valid default configuration, the template panel and a common phone", () => {
    const store = createStudioStore();
    const { config, ui, issues, saveStatus } = store.getState();
    expect(config.game.type).toBe("lucky_wheel");
    expect(ui).toMatchObject({
      panel: "template",
      screen: "welcome",
      locale: config.locales.default,
      mode: "static",
    });
    expect(ui.viewport).toEqual(DEFAULT_VIEWPORT);
    expect(issues.filter((issue) => issue.level === "error")).toEqual([]);
    expect(saveStatus).toBe("idle");
  });

  it("stamps updatedAt on every edit, in each domain", () => {
    const store = newStore();
    const stamps = new Set([store.getState().config.updatedAt]);
    const { getState } = store;
    getState().updateTheme({ radius: "sharp" });
    stamps.add(getState().config.updatedAt);
    getState().updateBrand({ name: "Zeta Market" });
    stamps.add(getState().config.updatedAt);
    getState().updateScreen("welcome", { title: { fr: "Bonjour" } });
    stamps.add(getState().config.updatedAt);
    getState().updateSection({
      jackpot: { ...getState().config.sections.jackpot, enabled: false },
    });
    stamps.add(getState().config.updatedAt);
    getState().updateForm({
      consent: { ...getState().config.form.consent, policyVersion: "v2" },
    });
    stamps.add(getState().config.updatedAt);
    getState().updateGame({ teaser: { ...getState().config.game.teaser } });
    stamps.add(getState().config.updatedAt);
    getState().updateLegal({ organizerName: "Zeta" });
    stamps.add(getState().config.updatedAt);

    expect(stamps.size).toBe(8);
    const { config } = getState();
    expect(config.theme.radius).toBe("sharp");
    expect(config.brand.name).toBe("Zeta Market");
    expect(config.screens.welcome.title).toEqual({ fr: "Bonjour" });
    expect(config.sections.jackpot.enabled).toBe(false);
    expect(config.form.consent.policyVersion).toBe("v2");
    expect(config.legal.organizerName).toBe("Zeta");
  });

  it("re-runs the design checks on every edit", () => {
    const store = newStore();
    const consent = store.getState().config.form.consent;
    store.getState().updateForm({ consent: { ...consent, text: {} } });
    expect(store.getState().issues.map((issue) => issue.id)).toContain(
      "consent-empty",
    );
    store.getState().updateForm({ consent });
    expect(store.getState().issues.map((issue) => issue.id)).not.toContain(
      "consent-empty",
    );
  });

  it("undoes and redoes edits, and re-runs the checks on each step", () => {
    const store = newStore();
    const original = store.getState().config;
    store.getState().updateForm({
      consent: { ...original.form.consent, text: {} },
    });
    const emptied = store.getState().config;

    store.temporal.getState().undo();
    expect(store.getState().config).toBe(original);
    expect(store.getState().issues.map((issue) => issue.id)).not.toContain(
      "consent-empty",
    );

    store.temporal.getState().redo();
    expect(store.getState().config).toBe(emptied);
    expect(store.getState().issues.map((issue) => issue.id)).toContain(
      "consent-empty",
    );
  });

  it("never records the preview, the panel or the save status in the history", () => {
    const store = newStore();
    const { getState } = store;
    getState().setPanel("brand");
    getState().setScreen("win");
    getState().setLocale("ar");
    getState().setMode("scripted", "duplicate");
    getState().setViewport({ width: 1366, height: 657, deviceId: null });
    getState().setSaveStatus("saving");
    getState().setLayoutIssues([]);
    expect(store.temporal.getState().pastStates).toHaveLength(0);

    getState().updateBrand({ name: "Zeta" });
    expect(store.temporal.getState().pastStates).toHaveLength(1);
    // Undo walks the configuration back, and leaves the preview where the user put it.
    store.temporal.getState().undo();
    expect(getState().ui).toMatchObject({
      panel: "brand",
      screen: "win",
      locale: "ar",
      mode: "scripted",
      scenario: "duplicate",
    });
    expect(getState().ui.viewport.width).toBe(1366);
  });

  it("keeps at most fifty steps of history", () => {
    const store = newStore();
    for (let step = 0; step < HISTORY_LIMIT + 10; step++) {
      store.getState().updateBrand({ name: `Brand ${step}` });
    }
    expect(store.temporal.getState().pastStates).toHaveLength(HISTORY_LIMIT);
  });

  it("applies a preset to the style only, and keeps the brand's texts", () => {
    const store = newStore();
    store.getState().updateScreen("welcome", { title: { fr: "Mon titre" } });
    const preset = THEME_PRESETS.find((item) => item.id !== "midnight-gold")!;
    store.getState().applyPreset(preset.id);
    const { config } = store.getState();
    expect(config.theme.presetId).toBe(preset.id);
    expect(config.screens.welcome.title).toEqual({ fr: "Mon titre" });
  });

  it("replaces and resets the configuration without changing its identity", () => {
    const store = newStore();
    const { id, campaignId } = store.getState().config;
    store
      .getState()
      .replaceConfig(createDefaultExperience({ gameType: "quiz" }));
    expect(store.getState().config).toMatchObject({ id, campaignId });
    expect(store.getState().config.game.type).toBe("quiz");

    store.getState().updateBrand({ name: "Zeta" });
    store.getState().resetToDefaults();
    expect(store.getState().config).toMatchObject({ id, campaignId });
    expect(store.getState().config.brand.name).toBe("");
    // Both are edits: one undo each.
    expect(store.temporal.getState().pastStates).toHaveLength(3);
  });

  it("hydrates from storage as the starting point, with nothing to undo", () => {
    const store = newStore();
    store.getState().updateBrand({ name: "Before" });
    const stored = {
      ...createDefaultExperience({ gameType: "scratch_card" }),
      locales: {
        default: "ar" as const,
        enabled: ["fr", "ar"] as ["fr", "ar"],
      },
    };
    store.getState().hydrate(stored, stored.updatedAt);
    expect(store.getState().config).toBe(stored);
    expect(store.getState().storedUpdatedAt).toBe(stored.updatedAt);
    expect(store.getState().ui.locale).toBe("ar");
    expect(store.temporal.getState().pastStates).toHaveLength(0);
  });

  it("gives back, on reload, the configuration that was saved", async () => {
    const storage = memoryStorage();
    const shared = createLocalExperienceRepository({
      getStorage: () => storage,
    });

    const first = newStore();
    first.getState().updateBrand({ name: "Zeta Market" });
    const saved = await shared.save(first.getState().config);
    expect(saved.ok).toBe(true);

    const reopened = createStudioStore({ now: ticking() });
    const loaded = await loadIntoStudio(reopened, shared);
    expect(loaded?.recovered).toBe(false);
    expect(reopened.getState().config.brand.name).toBe("Zeta Market");
    expect(reopened.getState().config.id).toBe(first.getState().config.id);
    expect(reopened.getState().saveStatus).toBe("saved");
  });

  it("keeps its defaults when nothing is stored", async () => {
    const storage = memoryStorage();
    const store = newStore();
    const before = store.getState().config;
    const loaded = await loadIntoStudio(
      store,
      createLocalExperienceRepository({ getStorage: () => storage }),
    );
    expect(loaded).toBeNull();
    expect(store.getState().config).toBe(before);
  });

  it("re-runs the checks when the campaign is refreshed, without a history step", () => {
    const store = newStore();
    store.getState().setCampaign(null);
    expect(store.temporal.getState().pastStates).toHaveLength(0);
  });
});
