import { create, type StoreApi, type UseBoundStore } from "zustand";
import { temporal, type TemporalState } from "zundo";
import type { CampaignSnapshot } from "../domain/campaign";
import { createDefaultExperience, DEFAULT_GAME_TYPE } from "../domain/defaults";
import type { GameType } from "../domain/gameTypes";
import type { Locale } from "../domain/locale";
import type {
  ExperienceConfig,
  FormConfig,
  GameSettings,
  LegalConfig,
  ScreenContent,
  ScreenKey,
  ThemeTokens,
} from "../domain/types";
import { validateExperience, type DesignIssue } from "../domain/validation";
import { defaultScreens } from "../presets/contentDefaults";
import { createDemoCampaign } from "../presets/demoCampaign";
import { themeFromPreset } from "../presets/themePresets";
import type { LayoutIssue } from "../runtime/layout/layoutAudit";
import type { ScriptedScenario } from "../services/createLocalServices";
import { screenForPath } from "./screenForPath";

// The Studio's own state (plan §9.4, tasks.md T6.1). One rule shapes the whole thing: the
// history follows the **configuration** and nothing else. Changing the preview's screen,
// language or device is not an edit of the experience, so it must never be something the
// user of Ctrl+Z has to walk back through.

export type StudioPanel =
  | "template"
  | "brand"
  | "sections" // every screen, one at a time: texts, form, game, jackpot...
  | "legal"
  | "share"
  | "validation"; // the list of issues (T6.8), not a part of the configuration

// The settings panels, in menu order.
export const STUDIO_PANELS: readonly StudioPanel[] = [
  "template",
  "brand",
  "sections",
  "legal",
  "share",
];

// How the preview plays: the demo gateway from end to end, a chosen outcome, or a still screen.
export type PreviewFlowMode = "demo" | "scripted" | "static";

// The preview's screen tabs, and the menu of the Sections panel: the five editable screens, plus the status screens (already
// played, closed, network error), shown by the scripted scenario.
export type PreviewScreen = ScreenKey | "status";

export interface ViewportState {
  deviceId: string | null; // null = a free size ("responsive")
  width: number;
  height: number;
  orientation: "portrait" | "landscape";
  zoom: number | "fit";
  chrome: boolean; // the device shell around the iframe
}

export interface StudioUi {
  panel: StudioPanel;
  screen: PreviewScreen;
  locale: Locale;
  mode: PreviewFlowMode;
  scenario: ScriptedScenario;
  viewport: ViewportState;
  // A field to bring into view, set when the preview or the validation panel points at one.
  focusPath: string | null;
}

export type SaveStatus = "idle" | "saving" | "saved" | "error";

// Until the device bar of T6.9 remembers a choice, the preview opens on a common phone.
export const DEFAULT_VIEWPORT: ViewportState = {
  deviceId: "iphone-12",
  width: 390,
  height: 844,
  orientation: "portrait",
  zoom: "fit",
  chrome: true,
};

export interface StudioState {
  config: ExperienceConfig;
  campaign: CampaignSnapshot | null;
  campaignId: string | null;
  // updatedAt of the version in storage: what the next save expects to overwrite (CONFLICT
  // otherwise). The config's own updatedAt moves on every edit, so it cannot serve.
  storedUpdatedAt: string | null;
  ui: StudioUi;
  saveStatus: SaveStatus;
  issues: DesignIssue[]; // design checks (T1.11), recomputed whenever the config changes
  layoutIssues: LayoutIssue[]; // what the frame reports back from the preview (T6.10)
  layoutSize: { width: number; height: number } | null; // the size they were found at

  // Edits. Each one is one step of the history, refreshes `updatedAt` and the design issues.
  updateTheme(patch: Partial<ThemeTokens>): void;
  updateBrand(patch: Partial<ExperienceConfig["brand"]>): void;
  updateScreen(key: ScreenKey, patch: Partial<ScreenContent>): void;
  updateSection(patch: Partial<ExperienceConfig["sections"]>): void;
  updateForm(patch: Partial<FormConfig>): void;
  updateGame(patch: Partial<GameSettings>): void;
  updateLegal(patch: Partial<LegalConfig>): void;
  updateConfig(patch: Partial<ExperienceConfig>): void; // locales, prizeDisplay, features
  applyPreset(presetId: string): void;
  // The game presentation rebuilt from the campaign (after its game changed in the Wizard).
  resetGame(): void;
  // Without a campaign only: another game for the demo campaign.
  setStandaloneGameType(type: GameType): void;
  replaceConfig(config: ExperienceConfig): void;
  resetToDefaults(): void;

  // Not edits: none of these is recorded in the history.
  hydrate(config: ExperienceConfig, storedUpdatedAt: string | null): void;
  setCampaign(campaign: CampaignSnapshot | null): void;
  setStoredUpdatedAt(updatedAt: string | null): void;
  setPanel(panel: StudioPanel, focusPath?: string | null): void;
  setScreen(screen: PreviewScreen): void;
  setLocale(locale: Locale): void;
  setMode(mode: PreviewFlowMode, scenario?: ScriptedScenario): void;
  setViewport(patch: Partial<ViewportState>): void;
  setSaveStatus(status: SaveStatus): void;
  setLayoutIssues(
    issues: LayoutIssue[],
    size?: { width: number; height: number } | null,
  ): void;
}

export interface StudioStoreOptions {
  config?: ExperienceConfig;
  campaign?: CampaignSnapshot | null;
  storedUpdatedAt?: string | null;
  viewport?: ViewportState;
  now?: () => string; // the clock, for tests
}

export const HISTORY_LIMIT = 50;

type HistoryEntry = Pick<StudioState, "config">;

export type StudioStore = UseBoundStore<StoreApi<StudioState>> & {
  temporal: StoreApi<TemporalState<HistoryEntry>>;
};

// Without a campaign, the preview plays the demo campaign of the configured game: the checks
// look at that same campaign, so a prize left without a wheel segment is flagged there too.
function checkDesign(
  config: ExperienceConfig,
  campaign: CampaignSnapshot | null,
): DesignIssue[] {
  return validateExperience(
    config,
    campaign ?? createDemoCampaign(config.game.type),
  );
}

export function createStudioStore(
  options: StudioStoreOptions = {},
): StudioStore {
  const campaign = options.campaign ?? null;
  const config =
    options.config ??
    createDefaultExperience({
      gameType: campaign?.gameType ?? DEFAULT_GAME_TYPE,
      campaign: campaign ?? undefined,
    });
  const now = options.now ?? (() => new Date().toISOString());

  const store = create<StudioState>()(
    temporal(
      (set, get) => {
        // Every edit goes through here: one place that stamps the time, so no action can
        // forget it. The design checks follow in the subscription below.
        const edit = (change: (config: ExperienceConfig) => ExperienceConfig) =>
          set((state) => ({
            config: { ...change(state.config), updatedAt: now() },
          }));

        return {
          config,
          campaign,
          campaignId: campaign?.id ?? config.campaignId,
          storedUpdatedAt: options.storedUpdatedAt ?? null,
          ui: {
            panel: "template",
            screen: "welcome",
            locale: config.locales.default,
            mode: "static", // the preview is a still picture; the journey plays in "Open in window"
            scenario: "lose",
            viewport: options.viewport ?? DEFAULT_VIEWPORT,
            focusPath: null,
          },
          saveStatus: "idle",
          issues: checkDesign(config, campaign),
          layoutIssues: [],
          layoutSize: null,

          updateTheme: (patch) =>
            edit((current) => ({
              ...current,
              theme: { ...current.theme, ...patch },
            })),
          updateBrand: (patch) =>
            edit((current) => ({
              ...current,
              brand: { ...current.brand, ...patch },
            })),
          updateScreen: (key, patch) =>
            edit((current) => ({
              ...current,
              screens: {
                ...current.screens,
                [key]: { ...current.screens[key], ...patch },
              },
            })),
          updateSection: (patch) =>
            edit((current) => ({
              ...current,
              sections: { ...current.sections, ...patch },
            })),
          updateForm: (patch) =>
            edit((current) => ({
              ...current,
              form: { ...current.form, ...patch },
            })),
          updateGame: (patch) =>
            edit((current) => ({
              ...current,
              game: { ...current.game, ...patch },
            })),
          updateLegal: (patch) =>
            edit((current) => ({
              ...current,
              legal: { ...current.legal, ...patch },
            })),
          updateConfig: (patch) =>
            edit((current) => ({ ...current, ...patch })),
          // A preset changes the style only: the brand's texts, form and legal block stay.
          applyPreset: (presetId) =>
            edit((current) => ({
              ...current,
              theme: themeFromPreset(presetId),
            })),
          resetGame: () =>
            edit((current) => ({
              ...current,
              game: createDefaultExperience({
                gameType: get().campaign?.gameType ?? current.game.type,
                campaign: get().campaign ?? undefined,
              }).game,
            })),
          // The screens follow the new game only while they still hold the old game's
          // default texts: a brand's own wording is never replaced.
          setStandaloneGameType: (type) => {
            if (get().campaign || get().config.game.type === type) return;
            edit((current) => {
              const fresh = createDefaultExperience({ gameType: type });
              const untouched =
                JSON.stringify(current.screens) ===
                JSON.stringify(defaultScreens(current.game.type));
              return {
                ...current,
                game: fresh.game,
                screens: untouched ? fresh.screens : current.screens,
              };
            });
          },
          // An imported configuration replaces everything, and is one step of the history
          // like any other edit. It keeps the identity of the one being edited, so the
          // autosave writes it where this campaign's configuration lives.
          replaceConfig: (next) =>
            edit((current) => ({
              ...next,
              id: current.id,
              campaignId: current.campaignId,
            })),
          resetToDefaults: () =>
            edit((current) => ({
              ...createDefaultExperience({
                gameType: get().campaign?.gameType ?? current.game.type,
                campaign: get().campaign ?? undefined,
                presetId: current.theme.presetId ?? undefined,
                brandName: current.legal.organizerName || undefined,
              }),
              id: current.id,
              campaignId: current.campaignId,
            })),

          // What storage gave back: the starting point, so there is nothing to undo yet.
          hydrate: (next, storedUpdatedAt) => {
            set({
              config: next,
              campaignId: next.campaignId,
              storedUpdatedAt,
              saveStatus: storedUpdatedAt ? "saved" : "idle",
              ui: { ...get().ui, locale: next.locales.default },
            });
            store.temporal.getState().clear();
          },
          setCampaign: (next) =>
            set({
              campaign: next,
              issues: checkDesign(get().config, next),
            }),
          setStoredUpdatedAt: (storedUpdatedAt) => set({ storedUpdatedAt }),
          // A path that belongs to a screen opens that screen too, so the panel draws the right
          // one at once and the field is there to be brought into view.
          setPanel: (panel, focusPath = null) =>
            set((state) => ({
              ui: {
                ...state.ui,
                panel,
                focusPath,
                screen:
                  (focusPath ? screenForPath(focusPath) : null) ??
                  state.ui.screen,
              },
            })),
          setScreen: (screen) =>
            set((state) => ({ ui: { ...state.ui, screen } })),
          setLocale: (locale) =>
            set((state) => ({ ui: { ...state.ui, locale } })),
          setMode: (mode, scenario) =>
            set((state) => ({
              ui: {
                ...state.ui,
                mode,
                scenario: scenario ?? state.ui.scenario,
              },
            })),
          setViewport: (patch) =>
            set((state) => ({
              ui: { ...state.ui, viewport: { ...state.ui.viewport, ...patch } },
            })),
          setSaveStatus: (saveStatus) => set({ saveStatus }),
          setLayoutIssues: (layoutIssues, layoutSize = null) =>
            set({ layoutIssues, layoutSize }),
        };
      },
      {
        // The history is the configuration, and only the configuration (T6.1): resizing the
        // preview or switching language leaves nothing to undo.
        partialize: (state): HistoryEntry => ({ config: state.config }),
        limit: HISTORY_LIMIT,
        equality: (a, b) => a.config === b.config,
      },
    ),
  ) as StudioStore;

  // The design checks follow the configuration wherever it comes from: an edit, but also an
  // undo or a redo, which restore `config` alone.
  store.subscribe((state, previous) => {
    if (state.config !== previous.config) {
      store.setState({
        issues: checkDesign(state.config, state.campaign),
      });
    }
  });

  return store;
}
