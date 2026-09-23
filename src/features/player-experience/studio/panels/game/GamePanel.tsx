import { Link2, RotateCcw } from "lucide-react";
import { GAME_LABELS, type GameType } from "../../../domain/gameTypes";
import { SelectField } from "../../fields/SelectField";
import { useStudio } from "../../StudioContext";
import {
  PanelBody,
  PanelHeader,
  PanelIssues,
  PanelSection,
} from "../PanelLayout";
import { CampaignRulesCard } from "./CampaignRulesCard";
import { BoxesSettings, HitItSettings, ScratchSettings } from "./GameSettings";
import { PrizeDisplayEditor } from "./PrizeDisplayEditor";
import { QuizTranslationsEditor } from "./QuizTranslationsEditor";
import { TeaserSettings } from "./TeaserSettings";
import { WheelSegmentsEditor } from "./WheelSegmentsEditor";

// Game (plan §6.6): the rules on top, read-only, from the campaign; below them, everything
// that is presentation and belongs to the brand. Nothing in this panel can change who wins.

const GAME_OPTIONS = (Object.keys(GAME_LABELS) as GameType[]).map((type) => ({
  value: type,
  label: GAME_LABELS[type],
}));

export function GamePanel() {
  const game = useStudio((state) => state.config.game);
  const campaign = useStudio((state) => state.campaign);
  const setStandaloneGameType = useStudio(
    (state) => state.setStandaloneGameType,
  );
  const resetGame = useStudio((state) => state.resetGame);
  const mismatch = campaign !== null && campaign.gameType !== game.type;

  return (
    <>
      <PanelHeader
        title="Game"
        description="How your game looks. Its rules stay in the campaign settings."
      />
      <PanelBody>
        {campaign === null && (
          <PanelSection title="Game">
            <p className="flex gap-2 rounded-xl bg-amber-50 px-3 py-2.5 text-xs leading-relaxed text-amber-900 dark:bg-amber-500/10 dark:text-amber-100">
              <Link2 className="mt-0.5 size-4 shrink-0" aria-hidden />
              Link a campaign to use real prizes and questions.
            </p>
            <SelectField
              label="Game type"
              path="game.type"
              value={game.type}
              options={GAME_OPTIONS}
              onChange={setStandaloneGameType}
              hint="With a campaign, the game is the one chosen in the campaign settings."
            />
          </PanelSection>
        )}
        {mismatch && (
          <div className="space-y-2">
            <PanelIssues prefixes={["game.type"]} />
            <button
              type="button"
              onClick={resetGame}
              className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-red-600 text-sm font-bold text-white shadow-sm transition hover:bg-red-500 active:scale-[0.99]"
            >
              <RotateCcw className="size-4" aria-hidden />
              Reset the game settings for {GAME_LABELS[campaign.gameType]}
            </button>
          </div>
        )}

        <CampaignRulesCard />
        <PrizeDisplayEditor />

        {game.type === "lucky_wheel" && game.wheel && (
          <WheelSegmentsEditor wheel={game.wheel} />
        )}
        {game.type === "scratch_card" && game.scratch && (
          <ScratchSettings scratch={game.scratch} />
        )}
        {game.type === "mystery_box" && game.boxes && (
          <BoxesSettings boxes={game.boxes} />
        )}
        {game.type === "hit_it" && game.hitIt && (
          <HitItSettings hitIt={game.hitIt} />
        )}
        {game.type === "quiz" && <QuizTranslationsEditor />}

        <TeaserSettings />
      </PanelBody>
    </>
  );
}
