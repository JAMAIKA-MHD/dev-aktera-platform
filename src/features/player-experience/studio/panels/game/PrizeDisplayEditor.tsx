import { Eraser } from "lucide-react";
import type { PrizeDisplay } from "../../../domain/types";
import { IconPicker } from "../../fields/IconPicker";
import { ImageField } from "../../fields/ImageField";
import { LocalizedTextField } from "../../fields/LocalizedTextField";
import { useStudio } from "../../StudioContext";
import { PanelIssues, PanelSection } from "../PanelLayout";
import { useTextLocale } from "../useTextLocale";
import { useCampaignView } from "./useCampaignView";

// How each prize of the campaign is shown to players, per language (plan §6.6): the name the
// Wizard gave it stays in the database and appears as the placeholder; the brand may word it
// better, translate it, and add an icon or a picture. Nothing here changes what can be won.

const EMPTY: PrizeDisplay = {
  label: {},
  winMessage: {},
  icon: null,
  image: null,
};

export function PrizeDisplayEditor() {
  const { campaign } = useCampaignView();
  const prizeDisplay = useStudio((state) => state.config.prizeDisplay);
  const updateConfig = useStudio((state) => state.updateConfig);
  const textLocale = useTextLocale();

  const ids = new Set(campaign.prizes.map((prize) => prize.id));
  const orphans = Object.keys(prizeDisplay).filter((id) => !ids.has(id));
  const set = (prizeId: string, patch: Partial<PrizeDisplay>) =>
    updateConfig({
      prizeDisplay: {
        ...prizeDisplay,
        [prizeId]: { ...(prizeDisplay[prizeId] ?? EMPTY), ...patch },
      },
    });
  const cleanUp = () =>
    updateConfig({
      prizeDisplay: Object.fromEntries(
        Object.entries(prizeDisplay).filter(([id]) => ids.has(id)),
      ),
    });

  return (
    <PanelSection
      title="How prizes look"
      description="The names come from the campaign; reword or translate them for players."
    >
      <PanelIssues prefixes={["prizeDisplay"]} />
      {orphans.length > 0 && (
        <button
          type="button"
          onClick={cleanUp}
          className="flex min-h-10 items-center gap-1.5 rounded-xl border border-card-border px-3 text-xs font-bold text-brand-text transition hover:bg-card-hover active:scale-95"
        >
          <Eraser className="size-3.5" aria-hidden />
          Clean up {orphans.length} removed prize{orphans.length > 1 ? "s" : ""}
        </button>
      )}
      {campaign.prizes.map((prize) => {
        const display = prizeDisplay[prize.id] ?? EMPTY;
        const base = { fr: prize.name, ar: prize.name, en: prize.name };
        return (
          <div
            key={prize.id}
            className="space-y-3 rounded-2xl border border-card-border bg-card-bg p-3 shadow-sm"
            data-studio-path={`prizeDisplay.${prize.id}`}
          >
            <p className="text-sm font-bold text-brand-text" dir="auto">
              {prize.name || "Unnamed prize"}
            </p>
            <LocalizedTextField
              label="Shown as"
              path={`prizeDisplay.${prize.id}.label`}
              value={display.label}
              onChange={(label) => set(prize.id, { label })}
              placeholder={base}
              maxChars={24}
              hint="Empty: the campaign name is used."
              {...textLocale}
            />
            <LocalizedTextField
              label="Win message"
              path={`prizeDisplay.${prize.id}.winMessage`}
              value={display.winMessage}
              onChange={(winMessage) => set(prize.id, { winMessage })}
              placeholder={
                prize.winMessage
                  ? {
                      fr: prize.winMessage,
                      ar: prize.winMessage,
                      en: prize.winMessage,
                    }
                  : undefined
              }
              multiline
              maxChars={160}
              {...textLocale}
            />
            <IconPicker
              label="Icon"
              allowNone
              value={display.icon}
              onChange={(icon) => set(prize.id, { icon })}
            />
            <ImageField
              label="Picture"
              purpose="logo"
              value={display.image}
              onChange={(image) => set(prize.id, { image })}
              hint="Shown on the win ticket."
            />
          </div>
        );
      })}
    </PanelSection>
  );
}
