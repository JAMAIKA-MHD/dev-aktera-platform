import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useMemo, useState, type ReactNode } from "react";
import {
  CHOICE_BRACKET_SIZES,
  MAX_CHOICE_CONTENDERS,
  MAX_CHOICE_ROUNDS,
  MIN_CHOICE_ROUNDS,
  MIN_LADDER_CONTENDERS,
  defaultChoiceContenderAt,
  defaultChoiceRoundAt,
  emptyChoiceRound,
} from "../../../domain/defaults";
import { resolveText } from "../../../domain/locale";
import type {
  ChoiceContender,
  ChoiceMode,
  ChoiceOption,
  ChoiceRound,
  GameSettings,
} from "../../../domain/types";
import { ICON_COMPONENTS } from "../../../presets/icons";
import { IconPicker } from "../../fields/IconPicker";
import { ImageField } from "../../fields/ImageField";
import { LocalizedTextField } from "../../fields/LocalizedTextField";
import { SegmentedControl } from "../../fields/SegmentedControl";
import { ToggleField } from "../../fields/ToggleField";
import { useStudio, useStudioContext } from "../../StudioContext";
import { PanelSection } from "../PanelLayout";
import { useTextLocale } from "../useTextLocale";

// Choose Your Brand, in one of three modes: fixed duels (2 to 8 rounds, each pair set here),
// a tournament (4 or 8 products, knockout) or "winner stays" (3 to 8 products, the one picked
// meets the next). With a campaign, its Wizard sets the mode and how many items play: the
// panel shows exactly those, and the brand sets what each one shows. Without one (the
// standalone Studio), the mode is picked here. No side is "right": the picks are a
// preference saved with each entry, and the prize draw is the campaign's, never here.

type ChooseBrand = NonNullable<GameSettings["chooseBrand"]>;
type Side = "left" | "right";

const SIDE_LABEL: Record<Side, string> = { left: "Left", right: "Right" };
const ROUND_PATH = /^game\.chooseBrand\.rounds\.(\d+)/;
const CONTENDER_PATH = /^game\.chooseBrand\.contenders\.(\d+)/;

const MODE_OPTIONS = [
  { value: "duels", label: "Duels" },
  { value: "bracket", label: "Tournament" },
  { value: "ladder", label: "Winner stays" },
] as const satisfies readonly { value: ChoiceMode; label: string }[];

const MODE_HINTS: Record<ChoiceMode, string> = {
  duels:
    "You set each pair. Every player sees the same duels, in the same order.",
  bracket:
    "4 or 8 products in a knockout: the product picked goes on to the next stage (quarter-finals, semi-finals, final). The last one is the player's champion.",
  ladder:
    "3 to 8 products: the product picked stays and meets the next one. The last one standing is the player's champion.",
};

const ORDER_HINTS: Record<Exclude<ChoiceMode, "duels">, string> = {
  bracket: "They meet in pairs, in this order: 1 vs 2, 3 vs 4, and so on.",
  ladder:
    "Product 1 meets product 2; the one picked meets product 3, and so on.",
};

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

// The items a brand opened, and the one an issue or a click in the preview points at: it is
// opened during the render itself, so its fields are drawn before the panel scrolls to them.
function useOpenedItems(pattern: RegExp, ids: readonly string[]) {
  const focusPath = useStudio((state) => state.ui.focusPath);
  const focusedIndex = Number(pattern.exec(focusPath ?? "")?.[1] ?? Number.NaN);
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

// Move up, move down, remove: the same three buttons for a round and for a product.
function ItemActions({
  name,
  index,
  count,
  canRemove,
  removeHint,
  onMove,
  onRemove,
}: {
  name: string; // "round 2", "product 3"
  index: number;
  count: number;
  canRemove: boolean;
  removeHint?: string;
  onMove: (by: -1 | 1) => void;
  onRemove: () => void;
}) {
  return (
    <div className="flex items-center justify-end gap-1.5">
      <button
        type="button"
        className={iconButton}
        aria-label={`Move ${name} up`}
        disabled={index === 0}
        onClick={() => onMove(-1)}
      >
        <ArrowUp aria-hidden className="size-4" />
      </button>
      <button
        type="button"
        className={iconButton}
        aria-label={`Move ${name} down`}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
      >
        <ArrowDown aria-hidden className="size-4" />
      </button>
      <button
        type="button"
        className={iconButton}
        aria-label={`Remove ${name}`}
        disabled={!canRemove}
        title={canRemove ? undefined : removeHint}
        onClick={onRemove}
      >
        <Trash2 aria-hidden className="size-4" />
      </button>
    </div>
  );
}

// A collapsible item of a list: its look in the summary, its fields inside.
function ItemDetails({
  open,
  onToggle,
  thumbs,
  title,
  subtitle,
  children,
}: {
  open: boolean;
  onToggle: (open: boolean) => void;
  thumbs: ReactNode;
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <details
      open={open}
      onToggle={(event) => onToggle(event.currentTarget.open)}
      className="group rounded-xl border border-card-border bg-card-bg-subtle"
    >
      <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-brand-text focus-visible:outline-2 focus-visible:outline-blue-500">
        <span className="flex shrink-0 items-center gap-1">{thumbs}</span>
        <span className="min-w-0 flex-1">
          {title}
          <span
            dir="auto"
            className="block truncate text-xs font-normal text-brand-text-muted"
          >
            {subtitle}
          </span>
        </span>
        <ChevronDown
          aria-hidden
          className="size-4 shrink-0 text-brand-text-muted transition-transform group-open:rotate-180"
        />
      </summary>
      <div className="space-y-4 border-t border-card-border p-3">
        {children}
      </div>
    </details>
  );
}

// What a side of a duel or a product shows: its label, its picture, else its icon.
function OptionFields({
  path,
  option,
  onChange,
}: {
  path: string;
  option: ChoiceOption;
  onChange: (patch: Partial<ChoiceOption>) => void;
}) {
  const textLocale = useTextLocale();
  return (
    <>
      <LocalizedTextField
        label="Label"
        path={`${path}.label`}
        value={option.label}
        onChange={(label) => onChange({ label })}
        maxChars={40}
        {...textLocale}
      />
      <ImageField
        label="Picture"
        path={`${path}.image`}
        purpose="logo"
        value={option.image}
        onChange={(image) => onChange({ image })}
        hint="Your product, your brand or an offer. Without a picture, the icon is shown."
      />
      <IconPicker
        label="Icon (without a picture)"
        path={`${path}.icon`}
        value={option.icon}
        onChange={(icon) => icon && onChange({ icon })}
      />
    </>
  );
}

function swap<T>(items: readonly T[], index: number, by: -1 | 1): T[] {
  const target = index + by;
  if (target < 0 || target >= items.length) return [...items];
  const next = [...items];
  [next[index], next[target]] = [next[target], next[index]];
  return next;
}

// The list grown with default items up to `size`, never cut: what is past it stays aside.
function padded<T>(
  list: readonly T[],
  size: number,
  at: (index: number) => T,
): T[] {
  if (list.length >= size) return [...list];
  return [
    ...list,
    ...Array.from({ length: size - list.length }, (_, i) =>
      at(list.length + i),
    ),
  ];
}

// The first `count` items of a list, padded, and how to write them back with the rest.
// Padded once per list, so the new items keep their ids until the brand edits one.
function useFixedList<T>(
  list: readonly T[],
  count: number | undefined,
  at: (index: number) => T,
) {
  const all = useMemo(
    () => (count === undefined ? [...list] : padded(list, count, at)),
    [list, count, at],
  );
  const shown = count === undefined ? all : all.slice(0, count);
  const merge = (next: T[]) =>
    count === undefined ? next : [...next, ...all.slice(count)];
  return { shown, merge };
}

// Default items, built the same way on every render (useFixedList's memo depends on them).
const roundAt = (index: number) => defaultChoiceRoundAt(index);
const contenderAt = (index: number) => defaultChoiceContenderAt(index);

// The list grown with the default products, or cut, to `size`.
function sized(list: readonly ChoiceContender[], size: number) {
  if (list.length >= size) return list.slice(0, size);
  return [
    ...list,
    ...Array.from({ length: size - list.length }, (_, i) =>
      defaultChoiceContenderAt(list.length + i),
    ),
  ];
}

export function ChooseBrandSettings({
  chooseBrand,
}: {
  chooseBrand: ChooseBrand;
}) {
  const updateGame = useStudio((state) => state.updateGame);
  const campaign = useStudio((state) => state.campaign);
  // The campaign's mode and count (Wizard); a campaign saved before they existed plays the
  // design's own mode.
  const rules = campaign?.rules.choice;
  const mode = rules?.mode ?? chooseBrand.mode;
  const set = (patch: Partial<ChooseBrand>) =>
    updateGame({ chooseBrand: { ...chooseBrand, ...patch } });

  // A tournament always gets a list its mode can play: a bracket of 4 or 8, a ladder of 3+.
  const switchMode = (mode: ChoiceMode) => {
    if (mode === chooseBrand.mode) return;
    const { contenders } = chooseBrand;
    if (mode === "bracket") {
      set({
        mode,
        contenders: sized(contenders, contenders.length > 4 ? 8 : 4),
      });
    } else if (mode === "ladder") {
      set({
        mode,
        contenders: sized(
          contenders,
          Math.max(MIN_LADDER_CONTENDERS, contenders.length),
        ),
      });
    } else {
      set({ mode });
    }
  };

  const modeLabel = MODE_OPTIONS.find((option) => option.value === mode)!.label;
  const unit = mode === "duels" ? "rounds" : "products";

  return (
    <>
      <PanelSection
        title="Game mode"
        description={
          campaign
            ? "Set in the campaign settings (Engagement step), with how many items play. Here you set what each one shows."
            : "How the duels follow one another. Whatever the mode, no pick is right or wrong: the picks are saved with each entry."
        }
      >
        {campaign ? (
          <p
            className="flex flex-wrap items-baseline gap-x-2 rounded-xl bg-card-bg-subtle px-3 py-2.5 text-sm font-bold text-brand-text ring-1 ring-card-border"
            data-studio-path="game.chooseBrand.mode"
          >
            {modeLabel}
            <span className="text-xs font-semibold text-brand-text-muted">
              {rules
                ? `${rules.count} ${unit}`
                : "Choose the mode in the campaign settings"}
            </span>
          </p>
        ) : (
          <SegmentedControl
            label="Mode"
            path="game.chooseBrand.mode"
            value={chooseBrand.mode}
            options={MODE_OPTIONS}
            onChange={switchMode}
          />
        )}
        <p className="text-xs leading-relaxed text-brand-text-muted">
          {MODE_HINTS[mode]}
        </p>
      </PanelSection>
      {mode === "duels" ? (
        <RoundsSection
          rounds={chooseBrand.rounds}
          fixedCount={rules?.count}
          onChange={(rounds) => set({ rounds })}
        />
      ) : (
        <TournamentSection
          chooseBrand={chooseBrand}
          mode={mode}
          fixedCount={rules?.count}
          set={set}
        />
      )}
    </>
  );
}

function RoundsSection({
  rounds: saved,
  fixedCount,
  onChange: save,
}: {
  rounds: ChoiceRound[];
  fixedCount?: number; // the campaign's count: no round added or removed here
  onChange: (rounds: ChoiceRound[]) => void;
}) {
  const defaultLocale = useStudio((state) => state.config.locales.default);
  const textLocale = useTextLocale();
  const { shown: rounds, merge } = useFixedList(saved, fixedCount, roundAt);
  const onChange = (next: ChoiceRound[]) => save(merge(next));
  const fixed = fixedCount !== undefined;
  const { opened, toggle } = useOpenedItems(
    ROUND_PATH,
    rounds.map((round) => round.id),
  );

  const patchRound = (index: number, patch: Partial<ChoiceRound>) =>
    onChange(
      rounds.map((round, i) => (i === index ? { ...round, ...patch } : round)),
    );
  const patchSide = (
    index: number,
    side: Side,
    patch: Partial<ChoiceOption>,
  ) => {
    const option = { ...rounds[index][side], ...patch };
    patchRound(index, side === "left" ? { left: option } : { right: option });
  };
  const add = () => {
    if (fixed || rounds.length >= MAX_CHOICE_ROUNDS) return;
    const round = emptyChoiceRound();
    onChange([...rounds, round]);
    toggle(round.id, true);
  };

  const sideName = (option: ChoiceOption, side: Side) =>
    resolveText(option.label, textLocale.locale, defaultLocale) ||
    SIDE_LABEL[side];

  return (
    <PanelSection
      title="Rounds"
      description={
        fixed
          ? `Players pick the left or the right side of each round, in this order. The campaign plays ${fixedCount} rounds.`
          : `Players pick the left or the right side of each round, in this order (${MIN_CHOICE_ROUNDS} to ${MAX_CHOICE_ROUNDS} rounds).`
      }
    >
      <ol className="space-y-2">
        {rounds.map((round, index) => {
          const path = `game.chooseBrand.rounds.${index}`;
          return (
            <li key={round.id}>
              <ItemDetails
                open={opened.has(round.id)}
                onToggle={(open) => toggle(round.id, open)}
                thumbs={
                  <>
                    <Thumb option={round.left} />
                    <span className="text-[10px] font-black text-brand-text-muted">
                      VS
                    </span>
                    <Thumb option={round.right} />
                  </>
                }
                title={`Round ${index + 1}`}
                subtitle={`${sideName(round.left, "left")} · ${sideName(round.right, "right")}`}
              >
                <ItemActions
                  name={`round ${index + 1}`}
                  index={index}
                  count={rounds.length}
                  canRemove={!fixed && rounds.length > MIN_CHOICE_ROUNDS}
                  removeHint={
                    fixed
                      ? "The number of rounds is set in the campaign settings"
                      : `At least ${MIN_CHOICE_ROUNDS} rounds`
                  }
                  onMove={(by) => onChange(swap(rounds, index, by))}
                  onRemove={() =>
                    onChange(rounds.filter((_, i) => i !== index))
                  }
                />
                <LocalizedTextField
                  label="Question"
                  path={`${path}.prompt`}
                  value={round.prompt}
                  onChange={(prompt) => patchRound(index, { prompt })}
                  maxChars={60}
                  {...textLocale}
                />
                {(["left", "right"] as const).map((side) => (
                  <fieldset
                    key={side}
                    className="space-y-3 rounded-xl border border-card-border p-3"
                  >
                    <legend className="px-1 text-xs font-bold uppercase tracking-wide text-brand-text-muted">
                      {SIDE_LABEL[side]} side
                    </legend>
                    <OptionFields
                      path={`${path}.${side}`}
                      option={round[side]}
                      onChange={(patch) => patchSide(index, side, patch)}
                    />
                  </fieldset>
                ))}
              </ItemDetails>
            </li>
          );
        })}
      </ol>
      {!fixed && (
        <AddButton
          full={rounds.length >= MAX_CHOICE_ROUNDS}
          fullLabel={`${MAX_CHOICE_ROUNDS} rounds at most`}
          label="Add a round"
          onClick={add}
        />
      )}
    </PanelSection>
  );
}

function TournamentSection({
  chooseBrand,
  mode,
  fixedCount,
  set,
}: {
  chooseBrand: ChooseBrand;
  mode: Exclude<ChoiceMode, "duels">;
  fixedCount?: number; // the campaign's count: no product added or removed here
  set: (patch: Partial<ChooseBrand>) => void;
}) {
  const defaultLocale = useStudio((state) => state.config.locales.default);
  const textLocale = useTextLocale();
  const { shown: contenders, merge } = useFixedList(
    chooseBrand.contenders,
    fixedCount,
    contenderAt,
  );
  const fixed = fixedCount !== undefined;
  const { opened, toggle } = useOpenedItems(
    CONTENDER_PATH,
    contenders.map((contender) => contender.id),
  );
  const setContenders = (next: ChoiceContender[]) =>
    set({ contenders: merge(next) });
  const patchContender = (index: number, patch: Partial<ChoiceOption>) =>
    setContenders(
      contenders.map((contender, i) =>
        i === index ? { ...contender, ...patch } : contender,
      ),
    );
  // A bracket has a fixed size; a ladder grows and shrinks one product at a time.
  const ladder = mode === "ladder";
  const resizable = ladder && !fixed;
  const canRemove = resizable && contenders.length > MIN_LADDER_CONTENDERS;
  const add = () => {
    if (!resizable || contenders.length >= MAX_CHOICE_CONTENDERS) return;
    const contender = defaultChoiceContenderAt(contenders.length);
    setContenders([...contenders, contender]);
    toggle(contender.id, true);
  };
  const size = String(contenders.length > 4 ? 8 : 4) as "4" | "8";

  return (
    <PanelSection
      title="Products"
      description={`${ORDER_HINTS[mode]} ${
        fixed
          ? `The campaign plays ${fixedCount} products.`
          : ladder
            ? `${MIN_LADDER_CONTENDERS} to ${MAX_CHOICE_CONTENDERS} products.`
            : `${CHOICE_BRACKET_SIZES.join(" or ")} products.`
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
      {!ladder && !fixed && (
        <SegmentedControl
          label="Products in the tournament"
          path="game.chooseBrand.contenders"
          value={size}
          options={CHOICE_BRACKET_SIZES.map((count) => ({
            value: String(count) as "4" | "8",
            label: `${count} products`,
          }))}
          onChange={(value) => setContenders(sized(contenders, Number(value)))}
        />
      )}
      <ToggleField
        label="Shuffle for each player"
        description="Each player meets the products in another order, so none is favored by its place in the list."
        path="game.chooseBrand.shuffle"
        checked={chooseBrand.shuffle}
        onChange={(shuffle) => set({ shuffle })}
      />
      <ol className="space-y-2">
        {contenders.map((contender, index) => (
          <li key={contender.id}>
            <ItemDetails
              open={opened.has(contender.id)}
              onToggle={(open) => toggle(contender.id, open)}
              thumbs={<Thumb option={contender} />}
              title={`Product ${index + 1}`}
              subtitle={
                resolveText(
                  contender.label,
                  textLocale.locale,
                  defaultLocale,
                ) || "No label"
              }
            >
              <ItemActions
                name={`product ${index + 1}`}
                index={index}
                count={contenders.length}
                canRemove={canRemove}
                removeHint={
                  fixed
                    ? "The number of products is set in the campaign settings"
                    : ladder
                      ? `At least ${MIN_LADDER_CONTENDERS} products`
                      : "A tournament keeps 4 or 8 products: change its size above"
                }
                onMove={(by) => setContenders(swap(contenders, index, by))}
                onRemove={() =>
                  setContenders(contenders.filter((_, i) => i !== index))
                }
              />
              <OptionFields
                path={`game.chooseBrand.contenders.${index}`}
                option={contender}
                onChange={(patch) => patchContender(index, patch)}
              />
            </ItemDetails>
          </li>
        ))}
      </ol>
      {resizable && (
        <AddButton
          full={contenders.length >= MAX_CHOICE_CONTENDERS}
          fullLabel={`${MAX_CHOICE_CONTENDERS} products at most`}
          label="Add a product"
          onClick={add}
        />
      )}
    </PanelSection>
  );
}

function AddButton({
  full,
  fullLabel,
  label,
  onClick,
}: {
  full: boolean;
  fullLabel: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={full}
      className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-card-border px-3 py-2.5 text-sm font-semibold text-brand-text transition-colors hover:bg-card-bg-subtle disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-blue-500"
    >
      <Plus aria-hidden className="size-4" />
      {full ? fullLabel : label}
    </button>
  );
}
