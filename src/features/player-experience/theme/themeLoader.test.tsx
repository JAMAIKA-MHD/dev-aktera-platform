import { render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import {
  themeManifestSchema,
  type ThemeManifest,
} from "../domain/themeManifest";
import { getThemeManifest } from "../presets/themeManifests";
import { themeFromPreset } from "../presets/themePresets";
import { GameButton } from "../runtime/shell/GameButton";
import { GameFrame } from "../runtime/shell/GameFrame";
import { Hud, HudChip } from "../runtime/shell/Hud";
import { Panel } from "../runtime/shell/Panel";
import { ResultScreen } from "../runtime/shell/ResultScreen";
import { RewardPopup } from "../runtime/shell/RewardPopup";
import { ThemeScope } from "./ThemeScope";

// The theme loader (ThemeScope) and the shell, checked with a theme made up on the spot: if
// the shell holds with this one, it holds with any theme.json the schema accepts — no
// component knows a theme by name.

function madeUpTheme(): ThemeManifest {
  const base = getThemeManifest("quiz-show")!;
  return themeManifestSchema.parse({
    ...base,
    id: "pixel-quest", // any id of the library: the content is what is checked
    label: "Made Up",
    palette: { ...base.palette, primary: "#00A86B", surface: "#101820" },
    panel: { ...base.panel, bg: "#101820", frame: null },
    card: { ...base.card, frame: null },
    button: {
      ...base.button,
      primary: { ...base.button.primary, bg: "@primary", shadow: "none" },
    },
    stage: { ...base.stage, decor: [] },
    sounds: {},
    characters: {},
  });
}

function shell() {
  return (
    <>
      <GameFrame gameType="lucky_wheel" screen="win" />
      <Hud label="Status">
        <HudChip>1 spin</HudChip>
      </Hud>
      <Panel framed>
        <p>Inside a card</p>
      </Panel>
      <GameButton label="Spin" />
      <GameButton variant="secondary" label="Share" />
      <ResultScreen tone="win" art={<span>art</span>}>
        <RewardPopup
          brandName="Zeta"
          prizeLabel="Free coffee"
          winMessage={null}
          code="DEMO-1234"
          codeLabel="Your code"
          copyLabel="Copy"
          copiedLabel="Copied"
          copied={false}
          onCopy={vi.fn()}
          pickupInstructions=""
          shimmer={false}
        />
      </ResultScreen>
    </>
  );
}

describe("ThemeScope · the theme loader", () => {
  it("sets the variables of any theme.json, and the shell renders on it", () => {
    const manifest = madeUpTheme();
    const { container } = render(
      <ThemeScope
        theme={themeFromPreset("pixel-quest")}
        locale="fr"
        templateId="pixel-quest"
        manifest={manifest}
      >
        {shell()}
      </ThemeScope>,
    );
    const root = container.querySelector<HTMLElement>(".xp-root")!;
    expect(root.dataset.xpThemed).toBe("pixel-quest");
    expect(root.style.getPropertyValue("--xp-btn-bg")).toBe("#00A86B");
    expect(root.style.getPropertyValue("--xp-panel-bg")).toBe("#101820");
    expect(root.style.getPropertyValue("--xp-font-display")).toContain(
      "Outfit",
    );
    // No frame in this theme: the panel and the cards are drawn flat, from their tokens.
    expect(root.hasAttribute("data-xp-panel-frame")).toBe(false);
    expect(root.hasAttribute("data-xp-card-frame")).toBe(false);
    expect(root.style.getPropertyValue("--xp-panel-frame")).toBe("");
    // The stage, without decorations, still shows the theme's background for a win.
    const stage = container.querySelector<HTMLElement>(".xp-stage")!;
    expect(stage.dataset.xpMood).toBe("win");
    expect(stage.querySelectorAll(".xp-decor")).toHaveLength(0);
    expect(screen.getByText("Free coffee")).toBeTruthy();
    expect(screen.getByText("DEMO-1234")).toBeTruthy();
    expect(screen.getByText("1 spin")).toBeTruthy();
  });

  it("gives every real theme the same shell, with its own files", () => {
    for (const id of [
      "comic-burst",
      "quiz-show",
      "arcade-night",
      "pixel-quest",
    ] as const) {
      const { container, unmount } = render(
        <ThemeScope theme={themeFromPreset(id)} locale="ar" templateId={id}>
          {shell()}
        </ThemeScope>,
      );
      const root = container.querySelector<HTMLElement>(".xp-root")!;
      expect(root.dataset.xpThemed, id).toBe(id);
      expect(root.getAttribute("dir"), id).toBe("rtl");
      // A panel drawn from the theme's files: a 9-slice frame or a shape (the cloud).
      expect(
        root.hasAttribute("data-xp-panel-frame") ||
          root.hasAttribute("data-xp-panel-shape"),
        id,
      ).toBe(true);
      expect(
        container
          .querySelector<HTMLElement>(".xp-stage-image")
          ?.style.getPropertyValue("--xp-stage-image"),
        id,
      ).toContain("url(");
      unmount();
    }
  });

  it("sets nothing of the shell on the classic template", () => {
    const { container } = render(
      <ThemeScope theme={themeFromPreset("midnight-gold")} locale="fr">
        {shell()}
      </ThemeScope>,
    );
    const root = container.querySelector<HTMLElement>(".xp-root")!;
    expect(root.dataset.xpThemed).toBeUndefined();
    expect(root.style.getPropertyValue("--xp-btn-bg")).toBe("");
    expect(container.querySelector(".xp-stage")).toBeNull(); // the brand's background
    expect(screen.getByText("Spin")).toBeTruthy();
  });
});
