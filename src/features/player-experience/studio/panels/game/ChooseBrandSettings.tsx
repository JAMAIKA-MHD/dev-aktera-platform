import { ArrowDown, ArrowUp, ChevronDown, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import {
  MAX_CHOICE_ROUNDS,
  MIN_CHOICE_ROUNDS,
  emptyChoiceRound,
} from "../../../domain/defaults";
import { resolveText } from "../../../domain/locale";
import type {
  ChoiceOption,
  ChoiceRound,
  GameSettings,
} from "../../../domain/types";
import { ICON_COMPONENTS } from "../../../presets/icons";
import { IconPicker } from "../../fields/IconPicker";
import { ImageField } from "../../fields/ImageField";
import { LocalizedTextField } from "../../fields/LocalizedTextField";
import { useStudio, useStudioContext } from "../../StudioContext";
import { PanelSection } from "../PanelLayout";
import { useTextLocale } from "../useTextLocale";

// The rounds of Choose Your Brand (2 to 8): what players see, in the order they play it.
// No side is "right": the picks are a preference saved with each entry, and the prize draw
// is the campaign's (Wizard), never here.

type ChooseBrand = NonNullable<GameSettings["chooseBrand"]>;
type Side = "left" | "right";

const SIDE_LABEL: Record<Side, string> = { left: "Left", right: "Right" };
const ROUND_PATH = /^game\.chooseBrand\.rounds\.(\d+)/;

const iconButton =
  "grid size-8 place-items-center rounded-lg border border-card-border text-brand-text-muted transition-colors hover:text-brand-text disabled:cursor-not-allowed disabled:opacity-40 focus-visible:outline-2 focus-visible:outline-blue-500";

function SideThumb({ option }: { option: ChoiceOption }) {
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

export function ChooseBrandSettings({
  chooseBrand,
}: {
  chooseBrand: ChooseBrand;
}) {
  const updateGame = useStudio((state) => state.updateGame);
  const defaultLocale = useStudio((state) => state.config.locales.default);
  const textLocale = useTextLocale();
  const { rounds } = chooseBrand;

  // A round the brand opened, or the one an issue or a click in the preview points at: it is
  // opened during the render itself, so its fields are drawn before the panel scrolls to them.
  const focusPath = useStudio((state) => state.ui.focusPath);
  const focusedIndex = Number(
    ROUND_PATH.exec(focusPath ?? "")?.[1] ?? Number.NaN,
  );
  const focusedId = Number.isInteger(focusedIndex)
    ? rounds[focusedIndex]?.id
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

  const setRounds = (next: ChoiceRound[]) =>
    updateGame({ chooseBrand: { ...chooseBrand, rounds: next } });
  const patchRound = (index: number, patch: Partial<ChoiceRound>) =>
    setRounds(
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
  const move = (index: number, by: -1 | 1) => {
    const target = index + by;
    if (target < 0 || target >= rounds.length) return;
    const next = [...rounds];
    [next[index], next[target]] = [next[target], next[index]];
    setRounds(next);
  };
  const remove = (index: number) => {
    if (rounds.length <= MIN_CHOICE_ROUNDS) return;
    setRounds(rounds.filter((_, i) => i !== index));
  };
  const add = () => {
    if (rounds.length >= MAX_CHOICE_ROUNDS) return;
    const round = emptyChoiceRound();
    setRounds([...rounds, round]);
    toggle(round.id, true);
  };

  const sideName = (option: ChoiceOption, side: Side) =>
    resolveText(option.label, textLocale.locale, defaultLocale) ||
    SIDE_LABEL[side];

  return (
    <PanelSection
      title="Rounds"
      description={`Players pick the left or the right side of each round, in this order (${MIN_CHOICE_ROUNDS} to ${MAX_CHOICE_ROUNDS} rounds). There is no wrong answer: the picks are saved with each entry, and the prize draw is set in the campaign.`}
    >
      <ol className="space-y-2">
        {rounds.map((round, index) => {
          const path = `game.chooseBrand.rounds.${index}`;
          return (
            <li key={round.id}>
              <details
                open={opened.has(round.id)}
                onToggle={(event) => toggle(round.id, event.currentTarget.open)}
                className="group rounded-xl border border-card-border bg-card-bg-subtle"
              >
                <summary className="flex cursor-pointer list-none items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold text-brand-text focus-visible:outline-2 focus-visible:outline-blue-500">
                  <span className="flex shrink-0 items-center gap-1">
                    <SideThumb option={round.left} />
                    <span className="text-[10px] font-black text-brand-text-muted">
                      VS
                    </span>
                    <SideThumb option={round.right} />
                  </span>
                  <span className="min-w-0 flex-1">
                    Round {index + 1}
                    <span
                      dir="auto"
                      className="block truncate text-xs font-normal text-brand-text-muted"
                    >
                      {sideName(round.left, "left")} ·{" "}
                      {sideName(round.right, "right")}
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
                      aria-label={`Move round ${index + 1} up`}
                      disabled={index === 0}
                      onClick={() => move(index, -1)}
                    >
                      <ArrowUp aria-hidden className="size-4" />
                    </button>
                    <button
                      type="button"
                      className={iconButton}
                      aria-label={`Move round ${index + 1} down`}
                      disabled={index === rounds.length - 1}
                      onClick={() => move(index, 1)}
                    >
                      <ArrowDown aria-hidden className="size-4" />
                    </button>
                    <button
                      type="button"
                      className={iconButton}
                      aria-label={`Remove round ${index + 1}`}
                      disabled={rounds.length <= MIN_CHOICE_ROUNDS}
                      title={
                        rounds.length <= MIN_CHOICE_ROUNDS
                          ? `At least ${MIN_CHOICE_ROUNDS} rounds`
                          : undefined
                      }
                      onClick={() => remove(index)}
                    >
                      <Trash2 aria-hidden className="size-4" />
                    </button>
                  </div>
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
                      <LocalizedTextField
                        label="Label"
                        path={`${path}.${side}.label`}
                        value={round[side].label}
                        onChange={(label) => patchSide(index, side, { label })}
                        maxChars={40}
                        {...textLocale}
                      />
                      <ImageField
                        label="Picture"
                        path={`${path}.${side}.image`}
                        purpose="logo"
                        value={round[side].image}
                        onChange={(image) => patchSide(index, side, { image })}
                        hint="Your product, your brand or an offer. Without a picture, the icon is shown."
                      />
                      <IconPicker
                        label="Icon (without a picture)"
                        path={`${path}.${side}.icon`}
                        value={round[side].icon}
                        onChange={(icon) =>
                          icon && patchSide(index, side, { icon })
                        }
                      />
                    </fieldset>
                  ))}
                </div>
              </details>
            </li>
          );
        })}
      </ol>
      <button
        type="button"
        onClick={add}
        disabled={rounds.length >= MAX_CHOICE_ROUNDS}
        className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-card-border px-3 py-2.5 text-sm font-semibold text-brand-text transition-colors hover:bg-card-bg-subtle disabled:cursor-not-allowed disabled:opacity-50 focus-visible:outline-2 focus-visible:outline-blue-500"
      >
        <Plus aria-hidden className="size-4" />
        {rounds.length >= MAX_CHOICE_ROUNDS
          ? `${MAX_CHOICE_ROUNDS} rounds at most`
          : "Add a round"}
      </button>
    </PanelSection>
  );
}
