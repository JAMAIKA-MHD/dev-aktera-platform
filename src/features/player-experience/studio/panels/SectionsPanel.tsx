import type { PrizeChip } from "../../domain/types";
import { createUuid } from "../../domain/uuid";
import { IconPicker } from "../fields/IconPicker";
import { ListEditor } from "../fields/ListEditor";
import { LocalizedTextField } from "../fields/LocalizedTextField";
import { SegmentedControl } from "../fields/SegmentedControl";
import { ToggleField } from "../fields/ToggleField";
import { useStudio } from "../StudioContext";
import {
  PanelBody,
  PanelHeader,
  PanelIssues,
  PanelSection,
} from "./PanelLayout";
import { useTextLocale } from "./useTextLocale";

// Sections (plan §9.2): the two optional blocks of the welcome screen that put the prizes
// forward — the jackpot card and the prize chips (1 to 4). They show presentation only:
// what the player can win is decided by the campaign, never by these texts.

export const MIN_CHIPS = 1;
export const MAX_CHIPS = 4;

const TONES = [
  { value: "primary", label: "Primary" },
  { value: "secondary", label: "Secondary" },
  { value: "accent", label: "Accent" },
] as const;

export function SectionsPanel() {
  const { jackpot, prizeChips } = useStudio((state) => state.config.sections);
  const updateSection = useStudio((state) => state.updateSection);
  const textLocale = useTextLocale();

  const setJackpot = (patch: Partial<typeof jackpot>) =>
    updateSection({ jackpot: { ...jackpot, ...patch } });
  const setChips = (patch: Partial<typeof prizeChips>) =>
    updateSection({ prizeChips: { ...prizeChips, ...patch } });

  return (
    <>
      <PanelHeader
        title="Sections"
        description="Two optional blocks that put your prizes forward on the welcome screen."
      />
      <PanelBody>
        <PanelSection title="Jackpot card">
          <ToggleField
            label="Show the jackpot card"
            description="A highlighted card under the game."
            checked={jackpot.enabled}
            onChange={(enabled) => setJackpot({ enabled })}
            path="sections.jackpot"
          />
          {jackpot.enabled && (
            <>
              <PanelIssues prefixes={["sections.jackpot"]} />
              <LocalizedTextField
                label="Small title"
                path="sections.jackpot.eyebrow"
                value={jackpot.eyebrow}
                onChange={(eyebrow) => setJackpot({ eyebrow })}
                maxChars={24}
                {...textLocale}
              />
              <LocalizedTextField
                label="Main text"
                path="sections.jackpot.title"
                value={jackpot.title}
                onChange={(title) => setJackpot({ title })}
                maxChars={48}
                {...textLocale}
              />
              <LocalizedTextField
                label="Badge"
                path="sections.jackpot.badge"
                value={jackpot.badge}
                onChange={(badge) => setJackpot({ badge })}
                maxChars={14}
                hint="Leave empty for no badge."
                {...textLocale}
              />
              <IconPicker
                label="Icon"
                path="sections.jackpot.icon"
                value={jackpot.icon}
                onChange={(icon) => icon && setJackpot({ icon })}
              />
            </>
          )}
        </PanelSection>

        <PanelSection title="Prize chips">
          <ToggleField
            label="Show the prize chips"
            description="Small labels under the jackpot card, 1 to 4."
            checked={prizeChips.enabled}
            onChange={(enabled) => setChips({ enabled })}
            path="sections.prizeChips"
          />
          {prizeChips.enabled && (
            <>
              <PanelIssues prefixes={["sections.prizeChips"]} />
              <ListEditor<PrizeChip>
                label="Chips"
                path="sections.prizeChips.items"
                items={prizeChips.items}
                onChange={(items) => setChips({ items })}
                min={MIN_CHIPS}
                max={MAX_CHIPS}
                addLabel="Add a chip"
                getKey={(chip) => chip.id}
                itemLabel={(_, index) => `Chip ${index + 1}`}
                createItem={() => ({
                  id: createUuid(),
                  icon: "gift",
                  value: {},
                  caption: {},
                  tone: "primary",
                })}
                renderItem={(chip, index, update) => (
                  <div className="space-y-3">
                    <LocalizedTextField
                      label="Value"
                      path={`sections.prizeChips.items.${index}.value`}
                      value={chip.value}
                      onChange={(value) => update({ ...chip, value })}
                      maxChars={16}
                      placeholder={{
                        fr: "5 000 DA",
                        ar: "5000 دج",
                        en: "5,000 DA",
                      }}
                      {...textLocale}
                    />
                    <LocalizedTextField
                      label="Caption"
                      path={`sections.prizeChips.items.${index}.caption`}
                      value={chip.caption}
                      onChange={(caption) => update({ ...chip, caption })}
                      maxChars={24}
                      {...textLocale}
                    />
                    <IconPicker
                      label="Icon"
                      value={chip.icon}
                      onChange={(icon) => icon && update({ ...chip, icon })}
                    />
                    <SegmentedControl
                      label="Color"
                      value={chip.tone}
                      onChange={(tone) => update({ ...chip, tone })}
                      options={TONES}
                    />
                  </div>
                )}
              />
            </>
          )}
        </PanelSection>
      </PanelBody>
    </>
  );
}
