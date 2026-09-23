import { Info, Wand2 } from "lucide-react";
import {
  buildDefaultWheelSegments,
  MAX_WHEEL_SEGMENTS,
  MIN_WHEEL_SEGMENTS,
} from "../../../domain/defaults";
import { resolvePrizeDisplay } from "../../../domain/display";
import type { GameSettings, WheelSegment } from "../../../domain/types";
import { createUuid } from "../../../domain/uuid";
import { IconPicker } from "../../fields/IconPicker";
import { ListEditor } from "../../fields/ListEditor";
import { LocalizedTextField } from "../../fields/LocalizedTextField";
import { SelectField } from "../../fields/SelectField";
import { useStudio } from "../../StudioContext";
import { PanelIssues, PanelSection } from "../PanelLayout";
import { useTextLocale } from "../useTextLocale";
import { OptionalColorField } from "./OptionalColorField";
import { useCampaignView } from "./useCampaignView";

// The wheel's segments (plan §6.6): which prize each one shows, or "lose", its label, color and
// icon, from 4 to 12. All segments have the same size: the odds are the campaign's, drawn by
// the server — a bigger segment would be a lie, so there is no such setting.

const LOSE = "";

type Wheel = NonNullable<GameSettings["wheel"]>;

export function WheelSegmentsEditor({ wheel }: { wheel: Wheel }) {
  const { campaign } = useCampaignView();
  const config = useStudio((state) => state.config);
  const updateGame = useStudio((state) => state.updateGame);
  const textLocale = useTextLocale();
  const setWheel = (patch: Partial<Wheel>) =>
    updateGame({ wheel: { ...wheel, ...patch } });

  const prizeLabel = (prizeId: string | null) =>
    prizeId
      ? resolvePrizeDisplay(prizeId, config, campaign, textLocale.locale).label
      : "";
  const options = [
    ...campaign.prizes.map((prize) => ({
      value: prize.id,
      label: prize.name || "Unnamed prize",
    })),
    { value: LOSE, label: "Lose segment (no prize)" },
  ];

  return (
    <PanelSection title="Wheel">
      <PanelIssues prefixes={["game.wheel"]} />
      <p className="flex gap-2 rounded-xl bg-blue-50 px-3 py-2.5 text-xs leading-relaxed text-blue-900 dark:bg-blue-500/10 dark:text-blue-100">
        <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
        Segment size does not reflect odds — odds are set in campaign settings.
      </p>
      <button
        type="button"
        onClick={() => setWheel(buildDefaultWheelSegments(campaign.prizes))}
        className="flex min-h-10 items-center gap-1.5 rounded-xl border border-card-border px-3 text-xs font-bold text-brand-text transition hover:bg-card-hover active:scale-95"
      >
        <Wand2 className="size-3.5" aria-hidden />
        Generate from prizes
      </button>
      <ListEditor<WheelSegment>
        label="Segments"
        path="game.wheel.segments"
        items={wheel.segments}
        onChange={(segments) => setWheel({ segments })}
        min={MIN_WHEEL_SEGMENTS}
        max={MAX_WHEEL_SEGMENTS}
        addLabel="Add a segment"
        getKey={(segment) => segment.id}
        itemLabel={(segment, index) =>
          `Segment ${index + 1}${segment.prizeId ? "" : " · lose"}`
        }
        createItem={() => ({
          id: createUuid(),
          prizeId: null,
          label: {},
          color: null,
          icon: null,
        })}
        renderItem={(segment, index, update) => (
          <div className="space-y-3">
            <SelectField
              label="Prize"
              path={`game.wheel.segments.${index}.prizeId`}
              value={segment.prizeId ?? LOSE}
              options={options}
              onChange={(prizeId) =>
                update({ ...segment, prizeId: prizeId || null })
              }
            />
            <LocalizedTextField
              label="Label"
              path={`game.wheel.segments.${index}.label`}
              value={segment.label}
              onChange={(label) => update({ ...segment, label })}
              placeholder={
                segment.prizeId
                  ? { [textLocale.locale]: prizeLabel(segment.prizeId) }
                  : undefined
              }
              maxChars={14}
              hint={segment.prizeId ? "Empty: the prize name." : undefined}
              {...textLocale}
            />
            <IconPicker
              label="Icon"
              allowNone
              value={segment.icon}
              onChange={(icon) => update({ ...segment, icon })}
            />
            <OptionalColorField
              label="Color"
              value={segment.color}
              fallback={
                index % 2 === 0
                  ? config.theme.colors.primary
                  : config.theme.colors.secondary
              }
              onChange={(color) => update({ ...segment, color })}
            />
          </div>
        )}
      />
      <LocalizedTextField
        label="Center button"
        path="game.wheel.hubLabel"
        value={wheel.hubLabel}
        onChange={(hubLabel) => setWheel({ hubLabel })}
        maxChars={8}
        {...textLocale}
      />
    </PanelSection>
  );
}
