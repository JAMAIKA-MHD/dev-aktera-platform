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
// and thresholds that decide a win are the campaign's, never here; the scratch reveal threshold
// only says when the card uncovers itself, not what is under it.

type Scratch = NonNullable<GameSettings["scratch"]>;
type Boxes = NonNullable<GameSettings["boxes"]>;
type HitIt = NonNullable<GameSettings["hitIt"]>;
type CatchIt = NonNullable<GameSettings["catchIt"]>;
type Memory = NonNullable<GameSettings["memory"]>;
type Spot = NonNullable<GameSettings["spot"]>;

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
    <PanelSection title="Hit It target">
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

export function CatchItSettings({ catchIt }: { catchIt: CatchIt }) {
  const updateGame = useStudio((state) => state.updateGame);
  const set = (patch: Partial<CatchIt>) =>
    updateGame({ catchIt: { ...catchIt, ...patch } });
  return (
    <PanelSection
      title="Catch It item"
      description="What falls through the field. Duration and number of catches are set in the campaign."
    >
      <IconPicker
        label="Item icon"
        path="game.catchIt.itemIcon"
        value={catchIt.itemIcon}
        onChange={(itemIcon) => itemIcon && set({ itemIcon })}
      />
      <ImageField
        label="Item image"
        path="game.catchIt.itemImage"
        purpose="logo"
        value={catchIt.itemImage}
        onChange={(itemImage) => set({ itemImage })}
        hint="Replaces the icon, e.g. your product."
      />
    </PanelSection>
  );
}

export function MemorySettings({ memory }: { memory: Memory }) {
  const updateGame = useStudio((state) => state.updateGame);
  const set = (patch: Partial<Memory>) =>
    updateGame({ memory: { ...memory, ...patch } });
  const setFace = (index: number, icon: Memory["faces"][number]) =>
    set({ faces: memory.faces.map((face, i) => (i === index ? icon : face)) });
  return (
    <PanelSection
      title="Memory cards"
      description="The number of pairs is set in the campaign: a board of N pairs uses the first N faces."
    >
      <IconPicker
        label="Card back icon"
        path="game.memory.backIcon"
        value={memory.backIcon}
        onChange={(backIcon) => backIcon && set({ backIcon })}
      />
      <ImageField
        label="Card back image"
        path="game.memory.backImage"
        purpose="logo"
        value={memory.backImage}
        onChange={(backImage) => set({ backImage })}
        hint="Replaces the icon on the back of every card, e.g. your logo."
      />
      {memory.faces.map((face, index) => (
        <IconPicker
          key={index}
          label={`Face ${index + 1}`}
          path={`game.memory.faces.${index}`}
          value={face}
          onChange={(icon) => icon && setFace(index, icon)}
        />
      ))}
    </PanelSection>
  );
}

export function SpotSettings({ spot }: { spot: Spot }) {
  const updateGame = useStudio((state) => state.updateGame);
  const setIcon = (index: number, icon: Spot["icons"][number]) =>
    updateGame({
      spot: { icons: spot.icons.map((it, i) => (i === index ? icon : it)) },
    });
  return (
    <PanelSection
      title="Spot the Difference pictures"
      description="Both pictures are drawn with these icons. The number of differences and the time are set in the campaign."
    >
      {spot.icons.map((icon, index) => (
        <IconPicker
          key={index}
          label={`Icon ${index + 1}`}
          path={`game.spot.icons.${index}`}
          value={icon}
          onChange={(next) => next && setIcon(index, next)}
        />
      ))}
    </PanelSection>
  );
}
