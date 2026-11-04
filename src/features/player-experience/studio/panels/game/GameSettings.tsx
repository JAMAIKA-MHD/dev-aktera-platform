import { ChevronDown } from "lucide-react";
import { useState } from "react";
import type { AssetRef, GameSettings } from "../../../domain/types";
import { ICON_COMPONENTS } from "../../../presets/icons";
import { getThemeManifest } from "../../../presets/themeManifests";
import { resolveThemeAssets } from "../../../theme/themeAssets";
import { IconPicker, iconLabel } from "../../fields/IconPicker";
import { ImageField } from "../../fields/ImageField";
import { LocalizedTextField } from "../../fields/LocalizedTextField";
import { NumberField } from "../../fields/NumberField";
import { useStudio, useStudioContext } from "../../StudioContext";
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
  const templateId = useStudio((state) => state.config.templateId);
  const { services } = useStudioContext();
  // A face the brand opened, or the one an issue or a click in the preview points at: its
  // fields must be in view (useRevealFocusPath).
  const focusPath = useStudio((state) => state.ui.focusPath);
  const focusedFace = Number(
    /^game\.memory\.(?:faces|faceImages)\.(\d+)/.exec(focusPath ?? "")?.[1] ??
      Number.NaN,
  );
  const [opened, setOpened] = useState<ReadonlySet<number>>(
    () => new Set(Number.isInteger(focusedFace) ? [focusedFace] : []),
  );
  // Opened during the render itself, so the field is drawn before the panel scrolls to it.
  const [lastFocused, setLastFocused] = useState(focusedFace);
  if (!Object.is(focusedFace, lastFocused)) {
    setLastFocused(focusedFace);
    if (Number.isInteger(focusedFace) && !opened.has(focusedFace))
      setOpened(new Set(opened).add(focusedFace));
  }
  const toggleFace = (index: number, open: boolean) =>
    setOpened((current) => {
      if (current.has(index) === open) return current;
      const next = new Set(current);
      if (open) next.add(index);
      else next.delete(index);
      return next;
    });
  // A themed template draws some icons in its own art: the brand's picture still comes first
  // (MemoryCard). The card back is the template's own (or the default icon): not edited here.
  const manifest = getThemeManifest(templateId);
  const themeAssets = manifest ? resolveThemeAssets(manifest) : null;
  const set = (patch: Partial<Memory>) =>
    updateGame({ memory: { ...memory, ...patch } });
  const setFace = (index: number, icon: Memory["faces"][number]) =>
    set({ faces: memory.faces.map((face, i) => (i === index ? icon : face)) });
  const setFaceImage = (index: number, image: AssetRef) =>
    set({
      faceImages: memory.faces.map((_, i) =>
        i === index ? image : (memory.faceImages?.[i] ?? null),
      ),
    });
  return (
    <PanelSection
      title="Card faces"
      description="Each pair shows one face. The number of pairs is set in the campaign: a board of N pairs uses the first N faces. Upload a picture to replace a face's icon, e.g. your products."
    >
      <ol className="space-y-2">
        {memory.faces.map((face, index) => {
          const image = memory.faceImages?.[index] ?? null;
          const src = services.assets.resolveUrl(image);
          const art = src ? null : (themeAssets?.memoryFaces[face] ?? null);
          const Icon = ICON_COMPONENTS[face];
          return (
            <li key={index}>
              <details
                open={opened.has(index)}
                onToggle={(event) =>
                  toggleFace(index, event.currentTarget.open)
                }
                className="group rounded-xl border border-card-border bg-card-bg-subtle"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-brand-text focus-visible:outline-2 focus-visible:outline-blue-500">
                  <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-card-border bg-card-bg">
                    {src || art ? (
                      <img
                        src={src ?? art ?? undefined}
                        alt=""
                        className={
                          src
                            ? "size-full object-cover"
                            : "size-[80%] object-contain"
                        }
                      />
                    ) : (
                      <Icon aria-hidden className="size-5" />
                    )}
                  </span>
                  <span className="min-w-0 flex-1">
                    Face {index + 1}
                    <span className="block text-xs font-normal text-brand-text-muted">
                      {src
                        ? "Your picture"
                        : art
                          ? `${iconLabel(face)}, in the template's art`
                          : iconLabel(face)}
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden
                    className="size-4 shrink-0 text-brand-text-muted transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="space-y-4 border-t border-card-border p-3">
                  <IconPicker
                    label="Icon"
                    path={`game.memory.faces.${index}`}
                    value={face}
                    onChange={(icon) => icon && setFace(index, icon)}
                  />
                  <ImageField
                    label="Picture"
                    path={`game.memory.faceImages.${index}`}
                    purpose="logo"
                    value={image}
                    onChange={(next) => setFaceImage(index, next)}
                    hint="Replaces the icon on this face. Use a picture unlike the other faces."
                  />
                </div>
              </details>
            </li>
          );
        })}
      </ol>
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
