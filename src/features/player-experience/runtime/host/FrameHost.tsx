import { useEffect, useMemo, useRef, useState } from "react";
import type { CampaignSnapshot } from "../../domain/campaign";
import { createDefaultExperience } from "../../domain/defaults";
import type { Locale } from "../../domain/locale";
import type { ExperienceConfig } from "../../domain/types";
import { createDemoCampaign } from "../../presets/demoCampaign";
import { ensureViewportFitCover } from "../layout/safeArea";
import { FrameExperience, frameScreen } from "./FrameExperience";
import { FIXTURE_NAMES, getFixture, readFixtureLocale } from "./fixtures";
import { exposeLayoutAudit, useLayoutReport } from "./layoutReport";
import { openPopoutChannel } from "./popoutChannel";
import {
  createFrameBridge,
  type Bridge,
  type FromFrameMessage,
  type ToFrameMessage,
} from "./previewBridge";
import { frameServices, Message, Stage } from "./Stage";

// /xp-frame: the runtime in a document of its own, at the exact size of the simulated device
// (plan, principle 10). Four sources of configuration, chosen by the URL:
//   ?source=bridge (default)        the Studio preview sends it with postMessage
//   ?source=popout&campaignId=…     a separate tab, fed live by the Studio that opened it
//   ?source=local&campaignId=…      a separate tab reads it from the local repository, live
//   ?fixture=<name>[&locale=ar]     control pages for the responsive sweep (fixtures.ts)
// The route reads no server data and always runs on demo services (DEMO badge).

function FixtureFrame({ name, locale }: { name: string; locale: Locale }) {
  const fixture = useMemo(() => getFixture(name), [name]);
  if (!fixture) {
    return (
      <Message title={`Unknown fixture "${name}"`}>
        <p className="text-sm">Available: {FIXTURE_NAMES.join(", ")}</p>
      </Message>
    );
  }
  if (fixture.view === "flow") {
    return (
      <FrameExperience
        config={fixture.config}
        campaign={fixture.campaign}
        locale={locale}
        {...fixture.flow}
      />
    );
  }
  return <Stage content={{ ...fixture, locale }} />;
}

type UiMessage = Extract<ToFrameMessage, { type: "xp:ui" }>;

// What a player does with a screen: nothing of it reaches the preview of the Studio (below).
// Touch events are only stopped, never cancelled, so the preview still scrolls under a finger.
const INERT_EVENTS = [
  "pointerdown",
  "pointerup",
  "mousedown",
  "mouseup",
  "dblclick",
  "contextmenu",
  "keydown",
  "keyup",
  "submit",
  "dragstart",
] as const;
const INERT_TOUCH_EVENTS = ["touchstart", "touchend", "touchcancel"] as const;

// Studio preview: waits for the configuration sent by the Studio, then shows the screen its
// preview bar says, as a still picture: nothing a player does works here (no button moves the
// journey on, no game plays, no field takes text). The one thing a click does is point the
// Studio at the field that holds the clicked element (data-xp-edit). The journey itself is
// played in the tab "Open in window" (PopoutFrame). A new restartKey draws the screen again.
export function BridgeFrame({
  bridge: injected,
}: {
  bridge?: Bridge<FromFrameMessage, ToFrameMessage>;
}) {
  // Created once: a new bridge on each render would subscribe and say "ready" again.
  const bridge = useMemo(
    () => injected ?? createFrameBridge(window),
    [injected],
  );
  const [data, setData] = useState<{
    config: ExperienceConfig;
    campaign: CampaignSnapshot;
  } | null>(null);
  const [ui, setUi] = useState<Omit<UiMessage, "type">>({
    screen: null,
    locale: "fr",
    mode: "demo",
    restartKey: 0,
  });

  useEffect(() => {
    const unsubscribe = bridge.subscribe((message) => {
      if (message.type === "xp:config") {
        setData({ config: message.config, campaign: message.campaign });
      } else {
        const { type: _type, ...next } = message;
        setUi(next);
      }
    });
    // Sent after subscribing: the Studio only posts once it has heard from the frame.
    bridge.post({ type: "xp:ready" });
    return unsubscribe;
  }, [bridge]);

  // The preview is a picture: every gesture is stopped on its way down, before the screen
  // can hear it. A click on an editable element opens the matching field in the Studio.
  const root = useRef<HTMLDivElement>(null);
  const shown = data !== null;
  useEffect(() => {
    const element = root.current;
    if (!element) return;
    const stop = (event: Event) => {
      event.stopPropagation();
      if (event.cancelable) event.preventDefault();
    };
    const stopTouch = (event: Event) => event.stopPropagation();
    const onClick = (event: MouseEvent) => {
      const target = (event.target as Element).closest("[data-xp-edit]");
      const path = target?.getAttribute("data-xp-edit");
      if (path) bridge.post({ type: "xp:edit-target", path });
      stop(event);
    };
    for (const type of INERT_EVENTS) element.addEventListener(type, stop, true);
    for (const type of INERT_TOUCH_EVENTS) {
      element.addEventListener(type, stopTouch, true);
    }
    element.addEventListener("click", onClick, true);
    return () => {
      for (const type of INERT_EVENTS) {
        element.removeEventListener(type, stop, true);
      }
      for (const type of INERT_TOUCH_EVENTS) {
        element.removeEventListener(type, stopTouch, true);
      }
      element.removeEventListener("click", onClick, true);
    };
  }, [bridge, shown]);

  // The live layout audit, once there is something to audit (plan §9.3, T6.10).
  useLayoutReport(
    data
      ? (report) => bridge.post({ type: "xp:layout-report", ...report })
      : null,
  );

  if (!data) return <Message title="Waiting for the Studio…" />;
  return (
    <div ref={root}>
      <FrameExperience
        key={ui.restartKey}
        config={data.config}
        campaign={data.campaign}
        locale={ui.locale}
        safeArea={ui.safeArea}
        gateway={ui.mode === "demo" ? "demo" : "scripted"}
        scenario={ui.scenario}
        initialScreen={frameScreen(
          ui.mode === "static" ? (ui.screen ?? "welcome") : ui.screen,
          ui.scenario,
        )}
        onFlowEvent={(screen) => bridge.post({ type: "xp:flow-event", screen })}
      />
    </div>
  );
}

// "Open in window": the design as the Studio holds it, live, whatever its storage (Supabase for
// a real campaign, the browser for the standalone one). The tab asks the Studio for it, so the
// Studio must stay open; the tab plays the demo journey on the demo services.
export function PopoutFrame({ campaignId }: { campaignId: string | null }) {
  const [data, setData] = useState<{
    config: ExperienceConfig;
    campaign: CampaignSnapshot;
    locale: Locale;
  } | null>(null);
  const [unsupported, setUnsupported] = useState(false);

  useEffect(() => {
    const channel = openPopoutChannel();
    if (!channel) {
      setUnsupported(true);
      return;
    }
    const unsubscribe = channel.subscribe((message) => {
      if (
        message.type === "xp:popout-state" &&
        message.campaignId === campaignId
      ) {
        setData({
          config: message.config,
          campaign: message.campaign,
          locale: message.locale,
        });
      }
    });
    channel.post({ type: "xp:popout-hello", campaignId });
    return () => {
      unsubscribe();
      channel.close();
    };
  }, [campaignId]);

  if (unsupported) {
    return (
      <Message title="This browser cannot follow the Studio">
        <p className="text-sm">Use the preview inside the Studio instead.</p>
      </Message>
    );
  }
  if (!data) {
    return (
      <Message title="Waiting for the Studio…">
        <p className="text-sm">
          Keep the Studio open: this window shows its design, live.
        </p>
      </Message>
    );
  }
  return (
    <FrameExperience
      config={data.config}
      campaign={data.campaign}
      locale={data.locale}
      gateway="demo"
    />
  );
}

// Older "Open in new window": reads the saved configuration, follows its changes live, and plays
// the demo journey.
export function LocalFrame({ campaignId }: { campaignId: string | null }) {
  const [config, setConfig] = useState<ExperienceConfig | null>(null);
  useEffect(() => {
    const { repository } = frameServices();
    let active = true;
    const load = async () => {
      const loaded = await repository.load({ campaignId });
      if (active) {
        setConfig(
          loaded?.config ??
            createDefaultExperience({ gameType: "lucky_wheel" }),
        );
      }
    };
    const onStorage = (event: StorageEvent) => {
      if (event.key === null || event.key.startsWith("xp:experience:"))
        void load();
    };
    void load();
    window.addEventListener("storage", onStorage);
    return () => {
      active = false;
      window.removeEventListener("storage", onStorage);
    };
  }, [campaignId]);

  if (!config) return <Message title="Loading…" />;
  return (
    <FrameExperience
      config={config}
      campaign={createDemoCampaign(config.game.type)}
      locale={config.locales.default}
      gateway="demo"
    />
  );
}

export function FrameHost() {
  const params = useMemo(() => new URLSearchParams(window.location.search), []);

  useEffect(() => {
    ensureViewportFitCover(document);
    document.title = "Player Experience preview";
    const robots = document.createElement("meta");
    robots.name = "robots";
    robots.content = "noindex";
    document.head.appendChild(robots);
    // For the responsive sweep: the same audit as the Studio, run in Chrome.
    const hideAudit = exposeLayoutAudit(window);
    return () => {
      robots.remove();
      hideAudit();
    };
  }, []);

  const fixture = params.get("fixture");
  if (fixture !== null) {
    return (
      <FixtureFrame
        name={fixture}
        locale={readFixtureLocale(params.get("locale"))}
      />
    );
  }
  if (params.get("source") === "popout") {
    return <PopoutFrame campaignId={params.get("campaignId")} />;
  }
  if (params.get("source") === "local") {
    return <LocalFrame campaignId={params.get("campaignId")} />;
  }
  return <BridgeFrame />;
}
