import { useMemo } from "react";
import type { CampaignSnapshot } from "../../../domain/campaign";
import { createDemoCampaign } from "../../../presets/demoCampaign";
import { useStudio } from "../../StudioContext";

// The campaign the game panels show: the linked one or, in standalone, the demo campaign of the
// configured game. Only what the runtime may see (names, labels): never the rules.
export function useCampaignView(): { campaign: CampaignSnapshot } {
  const linked = useStudio((state) => state.campaign);
  const gameType = useStudio((state) => state.config.game.type);
  return useMemo(() => {
    if (linked) return { campaign: linked };
    return { campaign: createDemoCampaign(gameType) };
  }, [linked, gameType]);
}
