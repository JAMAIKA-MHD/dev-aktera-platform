import type { ScreenContent, ScreenKey } from "../../domain/types";
import { TITLE_MAX_CHARS } from "../../domain/validation";
import { LocalizedTextField } from "../fields/LocalizedTextField";
import { SegmentedControl } from "../fields/SegmentedControl";
import { SelectField } from "../fields/SelectField";
import { ToggleField } from "../fields/ToggleField";
import { useStudio } from "../StudioContext";
import { PanelIssues, PanelSection } from "./PanelLayout";
import { useTextLocale } from "./useTextLocale";

// The texts and the dressing of one screen (plan §9.2), in every language offered: title,
// subtitle, buttons, header, visual, encouragement. The screen edited is the one the Sections
// panel shows, which is the one previewed.

const HEROES = [
  { value: "none", label: "None" },
  { value: "badge", label: "Badge" },
  { value: "trophy", label: "Trophy" },
  { value: "gift", label: "Gift" },
  { value: "timer", label: "Timer" },
] as const;

const REINFORCEMENTS = [
  { value: "none", label: "None" },
  { value: "attempts", label: "Attempts left" },
  { value: "timer", label: "Time left" },
  { value: "progress", label: "Progress" },
  { value: "hint", label: "Hint" },
] as const;

export function ScreenTextFields({ screenKey: key }: { screenKey: ScreenKey }) {
  const screens = useStudio((state) => state.config.screens);
  const updateScreen = useStudio((state) => state.updateScreen);
  const textLocale = useTextLocale();

  const screen = screens[key];
  const update = (patch: Partial<ScreenContent>) => updateScreen(key, patch);
  const path = (field: string) => `screens.${key}.${field}`;

  return (
    <>
      <PanelSection title="Texts">
        <PanelIssues prefixes={[`screens.${key}`]} />
        <LocalizedTextField
          label="Title"
          path={path("title")}
          value={screen.title}
          onChange={(title) => update({ title })}
          maxChars={TITLE_MAX_CHARS}
          hint="Two lines at most on a small phone."
          {...textLocale}
        />
        <LocalizedTextField
          label="Subtitle"
          path={path("subtitle")}
          value={screen.subtitle}
          onChange={(subtitle) => update({ subtitle })}
          multiline
          maxChars={140}
          {...textLocale}
        />
        <LocalizedTextField
          label="Main button"
          path={path("primaryCta")}
          value={screen.primaryCta}
          onChange={(primaryCta) => update({ primaryCta })}
          maxChars={28}
          {...textLocale}
        />
        <ToggleField
          label="Second button"
          description="A quieter link under the main button."
          checked={screen.secondaryCta !== null}
          onChange={(on) => update({ secondaryCta: on ? {} : null })}
          path={path("secondaryCta")}
        />
        {screen.secondaryCta !== null && (
          <LocalizedTextField
            label="Second button text"
            path={`${path("secondaryCta")}.text`}
            value={screen.secondaryCta}
            onChange={(secondaryCta) => update({ secondaryCta })}
            maxChars={28}
            {...textLocale}
          />
        )}
      </PanelSection>

      <PanelSection title="Around the text">
        <ToggleField
          label="Show header"
          description="Logo and brand name at the top."
          checked={screen.showHeader}
          onChange={(showHeader) => update({ showHeader })}
          path={path("showHeader")}
        />
        <SegmentedControl
          label="Visual above the title"
          path={path("hero")}
          value={screen.hero}
          onChange={(hero) => update({ hero })}
          options={HEROES}
        />
        <SelectField
          label="Encouragement"
          path={path("reinforcement.kind")}
          value={screen.reinforcement.kind}
          onChange={(kind) =>
            update({ reinforcement: { ...screen.reinforcement, kind } })
          }
          options={REINFORCEMENTS}
          hint="A short line under the game, e.g. “1 try left”."
        />
        {screen.reinforcement.kind !== "none" && (
          <LocalizedTextField
            label="Encouragement text"
            path={path("reinforcement.text")}
            value={screen.reinforcement.text}
            onChange={(text) =>
              update({ reinforcement: { ...screen.reinforcement, text } })
            }
            maxChars={48}
            {...textLocale}
          />
        )}
      </PanelSection>
    </>
  );
}
