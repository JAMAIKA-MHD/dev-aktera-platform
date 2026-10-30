import { Info } from "lucide-react";
import { getThemeManifest } from "../../presets/themeManifests";
import { SelectField } from "../fields/SelectField";
import { ToggleField } from "../fields/ToggleField";
import type { PreviewScreen } from "../store";
import { useStudio } from "../StudioContext";
import { FormSections } from "./FormSections";
import { GameSections } from "./game/GameSections";
import { LanguagesSection } from "./LanguagesSection";
import { PanelBody, PanelHeader, PanelSection } from "./PanelLayout";
import { ScreenTextFields } from "./ScreenTextFields";
import { WelcomeSections } from "./WelcomeSections";

// Sections (plan §9.2): everything a player sees on one screen, in one place. A menu at the top
// picks the screen; below it come the texts of that screen and the blocks that belong to it —
// the jackpot card, prize chips and teaser on Welcome, the form and the consent on Register, the
// game on Play. The screen picked is the screen previewed: the menu and the preview's screen
// tabs are two ways to change the same thing, and a click on a text in the preview lands here.

const SCREENS: readonly { value: PreviewScreen; label: string }[] = [
  { value: "welcome", label: "Welcome" },
  { value: "register", label: "Register" },
  { value: "play", label: "Play" },
  { value: "win", label: "Win" },
  { value: "lose", label: "Lose" },
  { value: "status", label: "Status (already played, closed, error)" },
];

// A template with its own scene before a win: the brand may go straight to the win page.
function WinIntroSection() {
  const templateId = useStudio((state) => state.config.templateId);
  const features = useStudio((state) => state.config.features);
  const updateConfig = useStudio((state) => state.updateConfig);
  if (!getThemeManifest(templateId)?.motion.winIntro) return null;
  return (
    <PanelSection title="Before the win">
      <ToggleField
        label="Intro animation"
        description="A 10-second scene before the win page, shown here each time you open Win. Players can skip it."
        checked={features.winIntro}
        onChange={(winIntro) =>
          updateConfig({ features: { ...features, winIntro } })
        }
        path="features.winIntro"
      />
    </PanelSection>
  );
}

export function SectionsPanel() {
  const screen = useStudio((state) => state.ui.screen);
  const setScreen = useStudio((state) => state.setScreen);

  return (
    <>
      <PanelHeader
        title="Sections"
        description="Pick a screen, then edit everything it shows."
      />
      <PanelBody>
        <SelectField
          label="Screen to edit"
          path="ui.screen"
          value={screen}
          options={SCREENS}
          onChange={setScreen}
        />
        <LanguagesSection />

        {screen === "status" ? (
          <PanelSection title="Status screens">
            <p className="flex gap-2 text-xs leading-relaxed text-brand-text-muted">
              <Info className="mt-0.5 size-4 shrink-0" aria-hidden />
              These screens tell a player they already played, that the campaign
              is closed, or that something went wrong. They use standard texts
              in every language and have nothing to edit yet.
            </p>
          </PanelSection>
        ) : (
          <>
            <ScreenTextFields screenKey={screen} />
            {screen === "welcome" && <WelcomeSections />}
            {screen === "register" && <FormSections />}
            {screen === "play" && <GameSections />}
            {screen === "win" && <WinIntroSection />}
          </>
        )}
      </PanelBody>
    </>
  );
}
