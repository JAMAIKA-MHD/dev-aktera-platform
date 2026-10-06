import { useEffect } from "react";
import { createDemoCampaign } from "../../presets/demoCampaign";
import {
  openPopoutChannel,
  type PopoutMessage,
} from "../../runtime/host/popoutChannel";
import type { StudioState } from "../store";
import { useStudioContext } from "../StudioContext";
import { CONFIG_DEBOUNCE_MS } from "./usePreviewBridge";

// The Studio side of "Open in window": gives the tab opened for this campaign the design as the
// Studio holds it now, when it asks and again a moment after every edit. See popoutChannel.ts.
// Without a campaign, the tab plays the demo one of the configured game, like the preview.

function stateMessage(state: StudioState): PopoutMessage {
  return {
    type: "xp:popout-state",
    campaignId: state.campaignId,
    config: state.config,
    campaign: state.campaign ?? createDemoCampaign(state.config.game.type),
    locale: state.ui.locale,
  };
}

export function usePopoutPublisher(): void {
  const { store } = useStudioContext();
  useEffect(() => {
    const channel = openPopoutChannel();
    if (!channel) return;
    const publish = () => channel.post(stateMessage(store.getState()));

    const unsubscribeChannel = channel.subscribe((message) => {
      if (
        message.type === "xp:popout-hello" &&
        message.campaignId === store.getState().campaignId
      ) {
        publish();
      }
    });

    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribeStore = store.subscribe((state, previous) => {
      if (
        state.config === previous.config &&
        state.campaign === previous.campaign &&
        state.ui.locale === previous.ui.locale
      ) {
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(publish, CONFIG_DEBOUNCE_MS);
    });

    return () => {
      clearTimeout(timer);
      unsubscribeStore();
      unsubscribeChannel();
      channel.close();
    };
  }, [store]);
}
