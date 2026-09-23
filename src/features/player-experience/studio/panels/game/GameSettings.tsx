import type { GameSettings } from "../../../domain/types";
import { IconPicker } from "../../fields/IconPicker";
import { ImageField } from "../../fields/ImageField";
import { LocalizedTextField } from "../../fields/LocalizedTextField";
import { NumberField } from "../../fields/NumberField";
import { useStudio } from "../../StudioContext";
import { PanelSection } from "../PanelLayout";
import { useTextLocale } from "../useTextLocale";
import { OptionalColorField } from "./OptionalColorField";

// The look of the scratch card, the mystery boxes and the Hit It target (plan §6.6). Durations
// and thresholds that decide a win are the campaign's (shown in the rules card), never here;
// the scratch reveal threshold only says when the card uncovers itself, not what is under it.

type Scratch = NonNullable<GameSettings["scratch"]>;
type Boxes = NonNullable<GameSettings["boxes"]>;
type HitIt = NonNullable<GameSettings["hitIt"]>;

export function ScratchSettings({ scratch }: { scratch: Scratch }) {
  const updateGame = useStudio((state) => state.updateGame);
  const textLocale = useTextLocale();
  const set = (patch: Partial<Scratch>) =>
    updateGame({ scratch: { ...scratch, ...patch } });
  return (
    <PanelSection title="Scratch card">
      <ImageField
        label="Cover image"
        path="game.scratch.coverImage"
        purpose="scratchCover"
        value={scratch.coverImage}
        onChange={(coverImage) => set({ coverImage })}
        hint="Without an image, the card is silver, holographic."
      />
      <LocalizedTextField
        label="Text on the cover"
        path="game.scratch.coverText"
        value={scratch.coverText}
        onChange={(coverText) => set({ coverText })}
        maxChars={24}
        {...textLocale}
      />
      <NumberField
        label="Reveal after scratching"
        path="game.scratch.revealThresholdPercent"
        value={scratch.revealThresholdPercent}
        onChange={(revealThresholdPercent) => set({ revealThresholdPercent })}
        min={20}
        max={90}
        step={5}
        unit="%"
        slider
        hint="The card uncovers itself once this share is scratched."
      />
    </PanelSection>
  );
}

export function BoxesSettings({ boxes }: { boxes: Boxes }) {
  const updateGame = useStudio((state) => state.updateGame);
  const secondary = useStudio((state) => state.config.theme.colors.secondary);
  const set = (patch: Partial<Boxes>) =>
    updateGame({ boxes: { ...boxes, ...patch } });
  return (
    <PanelSection title="Mystery boxes" description="Three boxes, always.">
      <IconPicker
        label="Icon on the boxes"
        path="game.boxes.icon"
        value={boxes.icon}
        onChange={(icon) => icon && set({ icon })}
      />
      <OptionalColorField
        label="Box color"
        path="game.boxes.color"
        value={boxes.color}
        fallback={secondary}
        onChange={(color) => set({ color })}
      />
    </PanelSection>
  );
}

export function HitItSettings({ hitIt }: { hitIt: HitIt }) {
  const updateGame = useStudio((state) => state.updateGame);
  const set = (patch: Partial<HitIt>) =>
    updateGame({ hitIt: { ...hitIt, ...patch } });
  return (
    <PanelSection
      title="Hit It target"
      description="The number of hits and the time allowed are campaign rules (above)."
    >
      <IconPicker
        label="Target icon"
        path="game.hitIt.targetIcon"
        value={hitIt.targetIcon}
        onChange={(targetIcon) => targetIcon && set({ targetIcon })}
      />
      <ImageField
        label="Target image"
        path="game.hitIt.targetImage"
        purpose="logo"
        value={hitIt.targetImage}
        onChange={(targetImage) => set({ targetImage })}
        hint="Replaces the icon, e.g. your product."
      />
    </PanelSection>
  );
}
