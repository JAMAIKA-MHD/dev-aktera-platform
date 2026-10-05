import type { CampaignSnapshot } from "../../domain/campaign";
import type { Locale } from "../../domain/locale";
import type { ExperienceConfig } from "../../domain/types";

// "Open in window": the Studio's design shown in a tab of its own, live. The Studio and that tab
// are two documents of the same origin, so they talk over a BroadcastChannel: the tab asks for
// the design ("hello"), the Studio answers with what it holds right now — saved or not, in
// Supabase or in the browser — and sends it again after every edit. No server, no storage: the
// tab only plays what the Studio shows, on the demo services.

const POPOUT_CHANNEL = "xp-popout";

export type PopoutMessage =
  | { type: "xp:popout-hello"; campaignId: string | null }
  | {
      type: "xp:popout-state";
      campaignId: string | null;
      config: ExperienceConfig;
      campaign: CampaignSnapshot;
      locale: Locale;
    };

export interface PopoutChannel {
  post(message: PopoutMessage): void;
  subscribe(listener: (message: PopoutMessage) => void): () => void;
  close(): void;
}

const isPopoutMessage = (value: unknown): value is PopoutMessage =>
  typeof value === "object" &&
  value !== null &&
  ((value as { type?: unknown }).type === "xp:popout-hello" ||
    (value as { type?: unknown }).type === "xp:popout-state");

// Null where the browser has no BroadcastChannel: the tab then says it cannot follow the Studio.
export function openPopoutChannel(): PopoutChannel | null {
  if (typeof BroadcastChannel === "undefined") return null;
  const channel = new BroadcastChannel(POPOUT_CHANNEL);
  return {
    post: (message) => channel.postMessage(message),
    subscribe: (listener) => {
      const onMessage = (event: MessageEvent) => {
        if (isPopoutMessage(event.data)) listener(event.data);
      };
      channel.addEventListener("message", onMessage);
      return () => channel.removeEventListener("message", onMessage);
    },
    close: () => channel.close(),
  };
}
