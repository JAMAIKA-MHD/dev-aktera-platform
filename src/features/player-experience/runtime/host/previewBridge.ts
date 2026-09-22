import type { CampaignSnapshot } from "../../domain/campaign";
import type { FlowScreen } from "../../domain/flow";
import type { Locale } from "../../domain/locale";
import type { ExperienceConfig, ScreenKey } from "../../domain/types";
import type { ScriptedScenario } from "../../services/createLocalServices";
import type { SafeAreaInsets } from "../layout/safeArea";

// Messages between the Studio and the /xp-frame iframe (plan §9.3). Both sides are on the
// same origin; a message is only handled when its origin is ours and its source is the
// expected window. Anything else is ignored, silently.

// Studio → frame
export type ToFrameMessage =
  | { type: "xp:config"; config: ExperienceConfig; campaign: CampaignSnapshot }
  | {
      type: "xp:ui";
      screen: ScreenKey | "status" | null;
      locale: Locale;
      mode: "demo" | "scripted" | "static";
      scenario?: ScriptedScenario;
      safeArea?: SafeAreaInsets;
      restartKey: number; // incremented to restart the journey
    };

// Frame → Studio ("xp:layout-report" is added in T3.8)
export type FromFrameMessage =
  | { type: "xp:ready" }
  | { type: "xp:flow-event"; screen: FlowScreen }
  | { type: "xp:edit-target"; path: string }; // click on a data-xp-edit element

const TO_FRAME = new Set<string>(["xp:config", "xp:ui"]);
const FROM_FRAME = new Set<string>([
  "xp:ready",
  "xp:flow-event",
  "xp:edit-target",
]);

function hasType(data: unknown, types: Set<string>): boolean {
  return (
    typeof data === "object" &&
    data !== null &&
    "type" in data &&
    typeof data.type === "string" &&
    types.has(data.type)
  );
}

export interface Bridge<Out, In> {
  post(message: Out): void;
  subscribe(listener: (message: In) => void): () => void;
}

// Listens on `win` for messages of `types` coming from `expectedSource()` on our origin.
function listen<In>(
  win: Window,
  types: Set<string>,
  expectedSource: () => Window | null,
  listener: (message: In) => void,
): () => void {
  const onMessage = (event: MessageEvent) => {
    if (event.origin !== win.location.origin) return;
    const source = expectedSource();
    if (!source || event.source !== source) return;
    if (!hasType(event.data, types)) return;
    listener(event.data as In);
  };
  win.addEventListener("message", onMessage);
  return () => win.removeEventListener("message", onMessage);
}

// Inside the frame: talks to the parent window (the Studio).
export function createFrameBridge(
  win: Window,
): Bridge<FromFrameMessage, ToFrameMessage> {
  return {
    post(message) {
      // Opened in its own tab (source=local), the frame is its own parent: nobody to tell.
      if (win.parent === win) return;
      win.parent.postMessage(message, win.location.origin);
    },
    subscribe: (listener) => listen(win, TO_FRAME, () => win.parent, listener),
  };
}

// In the Studio: talks to the preview iframe.
export function createStudioBridge(
  iframe: HTMLIFrameElement,
  win: Window = window,
): Bridge<ToFrameMessage, FromFrameMessage> {
  return {
    post(message) {
      iframe.contentWindow?.postMessage(message, win.location.origin);
    },
    subscribe: (listener) =>
      listen(win, FROM_FRAME, () => iframe.contentWindow, listener),
  };
}
