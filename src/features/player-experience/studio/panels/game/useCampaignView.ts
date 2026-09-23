import { useMemo } from "react";
import type { CampaignSnapshot } from "../../../domain/campaign";
import { createDemoCampaign } from "../../../presets/demoCampaign";
import {
  buildStandaloneDemoRules,
  type DemoCampaignRules,
} from "../../../services/createLocalServices";
import { useStudio, useStudioContext } from "../../StudioContext";

// The campaign the Game panel shows: the linked one with the rules the app passed, or, in
// standalone, the demo campaign of the configured game with its demo rules — the same pair
// the preview's demo gateway plays with.
export function useCampaignView(): {
  campaign: CampaignSnapshot;
  rules: DemoCampaignRules | null;
  standalone: boolean;
} {
  const linked = useStudio((state) => state.campaign);
  const gameType = useStudio((state) => state.config.game.type);
  const { rules } = useStudioContext();
  return useMemo(() => {
    if (linked)
      return { campaign: linked, rules: rules ?? null, standalone: false };
    const demo = createDemoCampaign(gameType);
    return {
      campaign: demo,
      rules: buildStandaloneDemoRules(demo),
      standalone: true,
    };
  }, [linked, gameType, rules]);
}
