import { useEffect, useRef, type RefObject } from "react";
import type { CampaignSnapshot } from "../../domain/campaign";
import type { FlowScreen } from "../../domain/flow";
import { createDemoCampaign } from "../../presets/demoCampaign";
import {
  createStudioBridge,
  type Bridge,
  type FromFrameMessage,
  type ToFrameMessage,
} from "../../runtime/host/previewBridge";
import type { SafeAreaInsets } from "../../runtime/layout/safeArea";
import { panelForPath } from "../panelForPath";
import type { StudioState } from "../store";
import { useStudio, useStudioContext } from "../StudioContext";

// The Studio side of the preview bridge (plan §9.3, T3.3). Nothing is sent before the frame
// says it is ready, and everything is sent again whenever it says so (the frame reloaded).
// The configuration goes whole every time, never as a diff: it is plain JSON.

export const CONFIG_DEBOUNCE_MS = 100;

export interface PreviewBridgeOptions {
  safeArea: SafeAreaInsets;
  restartKey: number;
  onFlowScreen?: (screen: FlowScreen) => void;
}

// Without a campaign, the frame plays the demo one of the configured game.
function campaignOf(state: StudioState): CampaignSnapshot {
  return state.campaign ?? createDemoCampaign(state.config.game.type);
}

function configMessage(state: StudioState): ToFrameMessage {
  return {
    type: "xp:config",
    config: state.config,
    campaign: campaignOf(state),
  };
}

function uiMessage(
  state: StudioState,
  { safeArea, restartKey }: PreviewBridgeOptions,
): ToFrameMessage {
  const { screen, locale, mode, scenario } = state.ui;
  return {
    type: "xp:ui",
    screen,
    locale,
    mode,
    scenario: mode === "demo" ? undefined : scenario,
    safeArea,
    restartKey,
  };
}

export function usePreviewBridge(
  iframe: RefObject<HTMLIFrameElement | null>,
  options: PreviewBridgeOptions,
): void {
  const { store } = useStudioContext();
  const bridge = useRef<Bridge<ToFrameMessage, FromFrameMessage> | null>(null);
  const ready = useRef(false);
  const latest = useRef(options);
  useEffect(() => {
    latest.current = options;
  });

  // Listening: ready, clicks on editable elements, the live layout audit, the journey.
  useEffect(() => {
    if (!iframe.current) return;
    const current = createStudioBridge(iframe.current);
    bridge.current = current;
    const unsubscribe = current.subscribe((message) => {
      const state = store.getState();
      switch (message.type) {
        case "xp:ready":
          ready.current = true;
          current.post(configMessage(state));
          current.post(uiMessage(state, latest.current));
          break;
        case "xp:edit-target": {
          const panel = panelForPath(message.path);
          if (panel) state.setPanel(panel, message.path);
          break;
        }
        case "xp:layout-report":
          state.setLayoutIssues(message.issues);
          break;
        case "xp:flow-event":
          latest.current.onFlowScreen?.(message.screen);
          break;
      }
    });
    return () => {
      unsubscribe();
      bridge.current = null;
      ready.current = false;
    };
  }, [iframe, store]);

  // The configuration, a moment after the last edit: typing never floods the frame.
  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const unsubscribe = store.subscribe((state, previous) => {
      if (
        state.config === previous.config &&
        state.campaign === previous.campaign
      ) {
        return;
      }
      clearTimeout(timer);
      timer = setTimeout(() => {
        if (ready.current)
          bridge.current?.post(configMessage(store.getState()));
      }, CONFIG_DEBOUNCE_MS);
    });
    return () => {
      clearTimeout(timer);
      unsubscribe();
    };
  }, [store]);

  // What to show, at once: screen, language, mode, device insets, restart.
  const { screen, locale, mode, scenario } = useStudio((state) => state.ui);
  const safeKey = JSON.stringify(options.safeArea);
  const { restartKey } = options;
  useEffect(() => {
    if (ready.current) {
      bridge.current?.post(uiMessage(store.getState(), latest.current));
    }
  }, [store, safeKey, restartKey, screen, locale, mode, scenario]);
}
