import { Film, Image } from "lucide-react";
import { LOCALES, type LocalizedText } from "../../../domain/locale";
import { autoCaption } from "../../../runtime/games/autoCaption";
import { LocalizedTextField } from "../../fields/LocalizedTextField";
import { SegmentedControl } from "../../fields/SegmentedControl";
import { useStudio } from "../../StudioContext";
import { PanelIssues, PanelSection } from "../PanelLayout";
import { useTextLocale } from "../useTextLocale";
import { useCampaignView } from "./useCampaignView";

// The pregame teaser of the welcome screen (plan §8.7): the game playing by itself, or a still
// image of it, and its caption. Left empty, the caption is written from the campaign's rules
// ("8 hits in 10 s"), shown here as the placeholder. It must never promise a win.
export function TeaserSettings() {
  const teaser = useStudio((state) => state.config.game.teaser);
  const updateGame = useStudio((state) => state.updateGame);
  const { campaign } = useCampaignView();
  const textLocale = useTextLocale();
  const set = (patch: Partial<typeof teaser>) =>
    updateGame({ teaser: { ...teaser, ...patch } });

  const automatic = Object.fromEntries(
    LOCALES.map((locale) => [locale, autoCaption(campaign, locale)]),
  ) as LocalizedText;

  return (
    <PanelSection
      title="Welcome teaser"
      description="The game on the welcome screen, before anyone plays. It never shows a prize."
    >
      <PanelIssues prefixes={["game.teaser"]} />
      <SegmentedControl
        label="Motion"
        path="game.teaser.mode"
        value={teaser.mode}
        onChange={(mode) => set({ mode })}
        options={[
          {
            value: "attract",
            label: "Animated",
            icon: <Film className="size-3.5" aria-hidden />,
          },
          {
            value: "static",
            label: "Still",
            icon: <Image className="size-3.5" aria-hidden />,
          },
        ]}
      />
      <LocalizedTextField
        label="Caption"
        path="game.teaser.caption"
        value={teaser.caption ?? {}}
        // Emptied in every language: back to the automatic caption.
        onChange={(caption) =>
          set({ caption: Object.keys(caption).length > 0 ? caption : null })
        }
        placeholder={automatic}
        maxChars={40}
        hint="Empty: written from the campaign rules."
        {...textLocale}
      />
    </PanelSection>
  );
}
