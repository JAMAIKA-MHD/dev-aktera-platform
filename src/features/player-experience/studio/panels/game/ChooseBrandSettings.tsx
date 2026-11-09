import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import {
  MAX_CHOICE_CONTENDERS,
  MIN_CHOICE_CONTENDERS,
  defaultChoiceContenderAt,
} from "../../../domain/defaults";
import { resolveText } from "../../../domain/locale";
import type {
  ChoiceContender,
  ChoiceOption,
  GameSettings,
} from "../../../domain/types";
import { ICON_COMPONENTS } from "../../../presets/icons";
import { IconPicker } from "../../fields/IconPicker";
import { ImageField } from "../../fields/ImageField";
import { LocalizedTextField } from "../../fields/LocalizedTextField";
import { ToggleField } from "../../fields/ToggleField";
import { useStudio, useStudioContext } from "../../StudioContext";
import { PanelSection } from "../PanelLayout";
import { useTextLocale } from "../useTextLocale";

// Pick Your Favorite, "winner stays": the products, in the order they come in. Product 1 meets
// product 2; the one picked stays and meets product 3, and so on. With a campaign, its Wizard
// sets how many products play: the panel shows exactly those. Without one (the standalone
// Studio), the brand adds or removes products here (3 to 8). No pick is "right": the picks are
// a preference saved with each entry, and the prize draw is the campaign's, never here.

type ChooseBrand = NonNullable<GameSettings["chooseBrand"]>;

const CONTENDER_PATH = /^game\.chooseBrand\.contenders\.(\d+)/;

const iconButton =
  "grid size-8 place-items-center rounded-lg border border-card-border text-brand-text-muted transition-colors hover:text-brand-text disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-blue-500";

function Thumb({ option }: { option: ChoiceOption }) {
  const { services } = useStudioContext();
  const src = services.assets.resolveUrl(option.image);
  const Icon = ICON_COMPONENTS[option.icon];
  return (
    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-lg border border-card-border bg-card-bg">
      {src ? (
        <img src={src} alt="" className="size-full object-cover" />
      ) : (
        <Icon aria-hidden className="size-5" />
      )}
    </span>
  );
}

// The products a brand opened, and the one an issue or a click in the preview points at: it
// is opened during the render itself, so its fields are drawn before the panel scrolls to it.
function useOpenedItems(ids: readonly string[]) {
  const focusPath = useStudio((state) => state.ui.focusPath);
  const focusedIndex = Number(
    CONTENDER_PATH.exec(focusPath ?? "")?.[1] ?? Number.NaN,
  );
  const focusedId = Number.isInteger(focusedIndex)
    ? ids[focusedIndex]
    : undefined;
  const [opened, setOpened] = useState<ReadonlySet<string>>(
    () => new Set(focusedId ? [focusedId] : []),
  );
  const [lastFocused, setLastFocused] = useState(focusedId);
  if (focusedId !== lastFocused) {
    setLastFocused(focusedId);
    if (focusedId && !opened.has(focusedId))
      setOpened(new Set(opened).add(focusedId));
  }
  const toggle = (id: string, open: boolean) =>
    setOpened((current) => {
      if (current.has(id) === open) return current;
      const next = new Set(current);
      if (open) next.add(id);
      else next.delete(id);
      return next;
    });
  return { opened, toggle };
}

// The list grown with default products up to `size`, never cut: what is past it stays aside.
function padded(list: readonly ChoiceContender[], size: number) {
  if (list.length >= size) return [...list];
  return [
    ...list,
    ...Array.from({ length: size - list.length }, (_, i) =>
      defaultChoiceContenderAt(list.length + i),
    ),
  ];
}

function swap<T>(items: readonly T[], index: number, by: -1 | 1): T[] {
  const target = index + by;
  if (target < 0 || target >= items.length) return [...items];
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

export function ChooseBrandSettings({
  chooseBrand,
}: {
  chooseBrand: ChooseBrand;
}) {
  const updateGame = useStudio((state) => state.updateGame);
  const campaign = useStudio((state) => state.campaign);
  const defaultLocale = useStudio((state) => state.config.locales.default);
  const textLocale = useTextLocale();
  const set = (patch: Partial<ChooseBrand>) =>
    updateGame({ chooseBrand: { ...chooseBrand, ...patch } });

  // The campaign's count (Wizard): exactly that many products are shown. The list is padded
  // once per list, so the new products keep their ids until the brand edits one.
  const fixedCount = campaign?.rules.choice?.count;
  const fixed = fixedCount !== undefined;
  const all = useMemo(
    () =>
      fixedCount === undefined
        ? [...chooseBrand.contenders]
        : padded(chooseBrand.contenders, fixedCount),
    [chooseBrand.contenders, fixedCount],
  );
  const contenders = fixed ? all.slice(0, fixedCount) : all;
  const setContenders = (next: ChoiceContender[]) =>
    set({ contenders: fixed ? [...next, ...all.slice(fixedCount)] : next });
  const patchContender = (index: number, patch: Partial<ChoiceOption>) =>
    setContenders(
      contenders.map((contender, i) =>
        i === index ? { ...contender, ...patch } : contender,
      ),
    );
  const { opened, toggle } = useOpenedItems(
    contenders.map((contender) => contender.id),
  );

  const canRemove = !fixed && contenders.length > MIN_CHOICE_CONTENDERS;
  const full = contenders.length >= MAX_CHOICE_CONTENDERS;
  const add = () => {
    if (fixed || full) return;
    const contender = defaultChoiceContenderAt(contenders.length);
    setContenders([...contenders, contender]);
    toggle(contender.id, true);
  };

  return (
    <PanelSection
      title="Products"
      description={`Winner stays: product 1 meets product 2; the one picked stays and meets product 3, and so on. The last one standing is the player's champion. ${
        fixed
          ? `The campaign plays ${fixedCount} products (set in its Engagement step).`
          : `${MIN_CHOICE_CONTENDERS} to ${MAX_CHOICE_CONTENDERS} products.`
      }`}
    >
      <LocalizedTextField
        label="Question"
        path="game.chooseBrand.prompt"
        value={chooseBrand.prompt}
        onChange={(prompt) => set({ prompt })}
        maxChars={60}
        {...textLocale}
      />
      <ToggleField
        label="Shuffle for each player"
        description="Each player meets the products in another order, so none is favored by its place in the list."
        path="game.chooseBrand.shuffle"
        checked={chooseBrand.shuffle}
        onChange={(shuffle) => set({ shuffle })}
      />
      <ol className="space-y-2">
        {contenders.map((contender, index) => {
          const path = `game.chooseBrand.contenders.${index}`;
          const name = `product ${index + 1}`;
          return (
            <li key={contender.id}>
              <details
                open={opened.has(contender.id)}
                onToggle={(event) =>
                  toggle(contender.id, event.currentTarget.open)
                }
                className="group rounded-xl border border-card-border bg-card-bg-subtle"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-brand-text focus-visible:outline-2 focus-visible:outline-blue-500">
                  <Thumb option={contender} />
                  <span className="min-w-0 flex-1">
                    Product {index + 1}
                    <span
                      dir="auto"
                      className="block truncate text-xs font-normal text-brand-text-muted"
                    >
                      {resolveText(
                        contender.label,
                        textLocale.locale,
                        defaultLocale,
                      ) || "No label"}
                    </span>
                  </span>
                  <ChevronDown
                    aria-hidden
                    className="size-4 shrink-0 text-brand-text-muted transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="space-y-4 border-t border-card-border p-3">
                  <div className="flex items-center justify-end gap-1.5">
                    <button
                      type="button"
                      className={iconButton}
                      aria-label={`Move ${name} up`}
                      disabled={index === 0}
                      onClick={() => setContenders(swap(contenders, index, -1))}
                    >
                      <ArrowUp aria-hidden className="size-4" />
                    </button>
                    <button
                      type="button"
                      className={iconButton}
                      aria-label={`Move ${name} down`}
                      disabled={index === contenders.length - 1}
                      onClick={() => setContenders(swap(contenders, index, 1))}
                    >
                      <ArrowDown aria-hidden className="size-4" />
                    </button>
                    <button
                      type="button"
                      className={iconButton}
                      aria-label={`Remove ${name}`}
                      disabled={!canRemove}
                      title={
                        canRemove
                          ? undefined
                          : fixed
                            ? "The number of products is set in the campaign settings"
                            : `At least ${MIN_CHOICE_CONTENDERS} products`
                      }
                      onClick={() =>
                        setContenders(contenders.filter((_, i) => i !== index))
                      }
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </div>
                  <LocalizedTextField
                    label="Label"
                    path={`${path}.label`}
                    value={contender.label}
                    onChange={(label) => patchContender(index, { label })}
                    maxChars={40}
                    {...textLocale}
                  />
                  <ImageField
                    label="Picture"
                    path={`${path}.image`}
                    purpose="logo"
                    value={contender.image}
                    onChange={(image) => patchContender(index, { image })}
                    hint="Your product, your brand or an offer. Without a picture, the icon is shown."
                  />
                  <IconPicker
                    label="Icon (without a picture)"
                    path={`${path}.icon`}
                    value={contender.icon}
                    onChange={(icon) => icon && patchContender(index, { icon })}
                  />
                </div>
              </details>
            </li>
          );
        })}
      </ol>
      {!fixed && (
        <button
          type="button"
          onClick={add}
          disabled={full}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-card-border px-3 py-2.5 text-sm font-semibold text-brand-text transition-colors hover:bg-card-bg-subtle disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-blue-500"
        >
          <Plus aria-hidden className="size-4" />
          {full ? `${MAX_CHOICE_CONTENDERS} products at most` : "Add a product"}
        </button>
      )}
    </PanelSection>
  );
}
