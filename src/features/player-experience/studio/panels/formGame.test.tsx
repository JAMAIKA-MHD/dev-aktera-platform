import { act, fireEvent, render, screen, within } from "@testing-library/react";
import type { ComponentType } from "react";
import { describe, expect, it, vi } from "vitest";
import type { CampaignSnapshot } from "../../domain/campaign";
import { createDemoCampaign } from "../../presets/demoCampaign";
import {
  buildStandaloneDemoRules,
  createLocalServices,
} from "../../services/createLocalServices";
import { createStudioStore, type StudioStore } from "../store";
import { StudioProvider, type StudioContextValue } from "../StudioContext";
import { FormPanel } from "./FormPanel";
import { GamePanel } from "./game/GamePanel";

const linked = (gameType: CampaignSnapshot["gameType"]): CampaignSnapshot => ({
  ...createDemoCampaign(gameType),
  id: "campaign-1",
  name: "Rentrée Zeta",
});

function renderPanel(
  Panel: ComponentType,
  options: {
    campaign?: CampaignSnapshot | null;
    context?: Partial<StudioContextValue>;
  } = {},
): StudioStore {
  const store = createStudioStore({ campaign: options.campaign ?? null });
  render(
    <StudioProvider
      value={{ store, services: createLocalServices(), ...options.context }}
    >
      <Panel />
    </StudioProvider>,
  );
  return store;
}

describe("FormPanel", () => {
  it("lets the brand show, require and hide the phone number like any field", () => {
    renderPanel(FormPanel);
    const card = screen
      .getByText("Phone number")
      .closest("[data-studio-path]")!;
    expect(within(card as HTMLElement).queryByText("Locked")).toBeNull();
    for (const name of ["Shown", "Required"]) {
      const toggle = within(card as HTMLElement).getByRole("switch", { name });
      expect(toggle).toHaveProperty("disabled", false);
    }
  });

  it("shows, requires and hides a field", () => {
    const store = renderPanel(FormPanel);
    const email = () =>
      store
        .getState()
        .config.form.fields.find((field) => field.key === "email")!;
    const card = screen
      .getByText("Email")
      .closest("[data-studio-path]") as HTMLElement;
    fireEvent.click(within(card).getByRole("switch", { name: "Shown" }));
    fireEvent.click(within(card).getByRole("switch", { name: "Required" }));
    expect(email()).toMatchObject({ enabled: true, required: true });
    fireEvent.click(within(card).getByRole("switch", { name: "Shown" }));
    // A hidden field is never required.
    expect(email()).toMatchObject({ enabled: false, required: false });
  });

  it("cannot empty the consent without a blocking error", () => {
    const store = renderPanel(FormPanel);
    const consent = store.getState().config.form.consent.text;
    for (const locale of Object.keys(consent)) {
      act(() => store.getState().setLocale(locale as "fr"));
      fireEvent.change(screen.getByRole("textbox", { name: /^Consent text/ }), {
        target: { value: "" },
      });
    }
    const issue = store
      .getState()
      .issues.find((candidate) => candidate.id === "consent-empty");
    expect(issue?.level).toBe("error");
    expect(
      screen
        .getAllByRole("list", { name: "Issues in this section" })
        .map((list) => list.textContent)
        .join(" "),
    ).toContain(issue!.message);
  });
});

describe("GamePanel", () => {
  it("offers no way to change who wins: the store has no action on the rules", () => {
    const store = createStudioStore({ campaign: linked("quiz") });
    const actions = Object.entries(store.getState())
      .filter(([, value]) => typeof value === "function")
      .map(([name]) => name)
      .sort();
    expect(actions).toEqual(
      [
        "applyPreset",
        "hydrate",
        "replaceConfig",
        "resetGame",
        "resetToDefaults",
        "setCampaign",
        "setLayoutIssues",
        "setLiveScreen",
        "setLocale",
        "setMode",
        "setPanel",
        "setSaveStatus",
        "setScreen",
        "setStandaloneGameType",
        "setStoredUpdatedAt",
        "setViewport",
        "updateBrand",
        "updateConfig",
        "updateForm",
        "updateGame",
        "updateLegal",
        "updateScreen",
        "updateSection",
        "updateTheme",
      ].sort(),
    );
    // …and the configuration has nowhere to put weights, stock, odds or answers.
    const json = JSON.stringify(store.getState().config);
    expect(json).not.toMatch(
      /"(weight|remaining|winProbability|correctIndex|passThresholdPercent|winThreshold|durationSeconds)"/,
    );
  });

  it("shows the campaign rules read-only, with the right answers and the stock", () => {
    const campaign = linked("quiz");
    const rules = { ...buildStandaloneDemoRules(campaign), winProbability: 35 };
    renderPanel(GamePanel, { campaign, context: { rules } });
    const card = screen.getByRole("region", { name: "Campaign rules" });
    expect(within(card).getByText("35 %")).toBeTruthy();
    expect(within(card).getAllByLabelText("Correct answer")).toHaveLength(
      campaign.quiz.length,
    );
    expect(within(card).getAllByText("100").length).toBe(
      campaign.prizes.length,
    );
    // No input in the rules: nothing there can be edited.
    expect(within(card).queryByRole("textbox")).toBeNull();
    // Without the app's callback, no button to the Wizard.
    expect(within(card).queryByText("Edit in campaign settings")).toBeNull();
  });

  it("sends the brand to the right Wizard step, then refreshes the campaign", async () => {
    const onEditCampaignSettings = vi.fn(async () => {});
    const onRefreshCampaign = vi.fn();
    renderPanel(GamePanel, {
      campaign: linked("lucky_wheel"),
      context: { onEditCampaignSettings, onRefreshCampaign },
    });
    const buttons = screen.getAllByRole("button", {
      name: "Edit in campaign settings",
    });
    await act(async () => fireEvent.click(buttons[1]));
    expect(onEditCampaignSettings).toHaveBeenCalledWith("campaign-1", "prizes");
    expect(onRefreshCampaign).toHaveBeenCalledTimes(1);
  });

  it("edits the wheel within 4 to 12 segments, and flags an incoherent one", () => {
    const campaign = linked("lucky_wheel");
    const store = renderPanel(GamePanel, { campaign });
    const segments = () => store.getState().config.game.wheel!.segments;
    const first = segments().findIndex((segment) => segment.prizeId !== null);
    fireEvent.change(screen.getAllByLabelText("Prize")[first], {
      target: { value: "" },
    });
    // Its prize now has no segment: a blocking error, shown in the wheel section.
    expect(
      store
        .getState()
        .issues.some((issue) => issue.id.startsWith("wheel-prize-missing")),
    ).toBe(true);
    expect(screen.getByText(/has no segment on the wheel/)).toBeTruthy();
    fireEvent.click(
      screen.getByRole("button", { name: "Generate from prizes" }),
    );
    expect(
      store
        .getState()
        .issues.some((issue) => issue.id.startsWith("wheel-prize-missing")),
    ).toBe(false);
    while (segments().length > 4) {
      fireEvent.click(
        screen.getByRole("button", { name: /^Remove Segment 1/ }),
      );
    }
    expect(
      screen.getByRole("button", { name: /^Remove Segment 1/ }),
    ).toHaveProperty("disabled", true);
    expect(screen.getByText(/Segment size does not reflect odds/)).toBeTruthy();
    // Many segment edits, each re-rendering the panel: slow under a full parallel run.
  }, 20_000);

  it("rewords a prize for players and cleans up removed ones", () => {
    const campaign = linked("mystery_box");
    const store = renderPanel(GamePanel, { campaign });
    fireEvent.change(screen.getAllByLabelText("Shown as")[0], {
      target: { value: "Bon d'achat" },
    });
    const id = campaign.prizes[0].id;
    expect(store.getState().config.prizeDisplay[id].label.fr).toBe(
      "Bon d'achat",
    );
    act(() =>
      store.getState().updateConfig({
        prizeDisplay: {
          ...store.getState().config.prizeDisplay,
          gone: { label: {}, winMessage: {}, icon: null, image: null },
        },
      }),
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Clean up 1 removed prize/ }),
    );
    expect(Object.keys(store.getState().config.prizeDisplay)).toEqual([id]);
  });

  it("goes back to the automatic teaser caption when it is emptied", () => {
    const store = renderPanel(GamePanel, { campaign: linked("hit_it") });
    const caption = screen.getByLabelText("Caption");
    expect(caption.getAttribute("placeholder")).toMatch(/touche/);
    fireEvent.change(caption, { target: { value: "Tapez vite !" } });
    expect(store.getState().config.game.teaser.caption).toEqual({
      fr: "Tapez vite !",
    });
    fireEvent.change(caption, { target: { value: "" } });
    expect(store.getState().config.game.teaser.caption).toBeNull();
  });

  it("switches the game of the demo campaign in standalone, texts included", () => {
    const store = renderPanel(GamePanel);
    expect(
      screen.getByText("Link a campaign to use real prizes and questions."),
    ).toBeTruthy();
    fireEvent.change(screen.getByLabelText("Game type"), {
      target: { value: "scratch_card" },
    });
    const { config } = store.getState();
    expect(config.game.type).toBe("scratch_card");
    expect(config.game.scratch).toBeDefined();
    expect(screen.getByText("Scratch card")).toBeTruthy();
    expect(config.screens.welcome.title.fr).not.toMatch(/roue/i);
  });

  it("offers to reset the game when the campaign changed its game", () => {
    const store = createStudioStore({ campaign: linked("lucky_wheel") });
    act(() => store.getState().setCampaign(linked("hit_it")));
    render(
      <StudioProvider value={{ store, services: createLocalServices() }}>
        <GamePanel />
      </StudioProvider>,
    );
    fireEvent.click(
      screen.getByRole("button", { name: /Reset the game settings/ }),
    );
    expect(store.getState().config.game.type).toBe("hit_it");
    expect(
      store
        .getState()
        .issues.some((issue) => issue.id === "game-type-mismatch"),
    ).toBe(false);
  });
});
