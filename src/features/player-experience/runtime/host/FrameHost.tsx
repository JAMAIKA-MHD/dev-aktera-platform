import {
  useEffect,
  useMemo,
  useState,
  type MouseEvent,
  type ReactNode,
} from "react";
import type { CampaignSnapshot } from "../../domain/campaign";
import { createDefaultExperience } from "../../domain/defaults";
import type { Locale } from "../../domain/locale";
import type { ExperienceConfig } from "../../domain/types";
import { createDemoCampaign } from "../../presets/demoCampaign";
import { createLocalServices } from "../../services/createLocalServices";
import type { ExperienceServices } from "../../services/ports";
import { ensureFontStylesheet } from "../../theme/fonts";
import { tint } from "../../theme/recipes";
import { ThemeScope } from "../../theme/ThemeScope";
import {
  ensureViewportFitCover,
  safeAreaStyle,
  type SafeAreaInsets,
} from "../layout/safeArea";
import { LayoutDebugView, ThemePresetsView } from "./DebugViews";
import {
  FIXTURE_NAMES,
  getFixture,
  readFixtureLocale,
  type FixtureView,
} from "./fixtures";
import {
  createFrameBridge,
  type Bridge,
  type FromFrameMessage,
  type ToFrameMessage,
} from "./previewBridge";

// /xp-frame: the runtime in a document of its own, at the exact size of the simulated device
// (plan, principle 10). Three sources of configuration, chosen by the URL:
//   ?source=bridge (default)        the Studio preview sends it with postMessage
//   ?source=local&campaignId=…      a separate tab reads it from the local repository, live
//   ?fixture=<name>[&locale=ar]     control pages for the responsive sweep (fixtures.ts)
// The route reads no server data and always runs on demo services (DEMO badge).

// One set of demo services for the whole frame (the journey will use them from T4.1).
let services: ExperienceServices | null = null;
const frameServices = () => (services ??= createLocalServices());

interface FrameContent {
  config: ExperienceConfig;
  campaign: CampaignSnapshot;
  locale: Locale;
  view: FixtureView;
  safeArea?: SafeAreaInsets;
}

// On the end side of the reading direction: in Arabic, the text starts on the right.
function DemoBadge() {
  return (
    <span
      className="pointer-events-none fixed top-[calc(var(--xp-safe-top)+0.5rem)] end-[calc(max(var(--xp-safe-left),var(--xp-safe-right))+0.5rem)] z-50 rounded-full border px-2 py-0.5 text-[0.65rem] font-black uppercase tracking-[0.2em]"
      style={{
        color: "var(--xp-text)",
        backgroundColor: tint("--xp-surface", 80),
        borderColor: tint("--xp-primary", 50),
      }}
    >
      Demo
    </span>
  );
}

// Until the player journey exists (T4.1), the frame shows the control views.
function Stage({ content }: { content: FrameContent }) {
  const { config, locale, view, safeArea } = content;
  const imageUrl = useMemo(
    () => frameServices().assets.resolveUrl(config.theme.background.image),
    [config.theme.background.image],
  );
  useEffect(() => {
    ensureFontStylesheet(document, config.theme.font);
  }, [config.theme.font]);
  return (
    <div style={safeAreaStyle(safeArea ?? null)}>
      <ThemeScope
        theme={config.theme}
        locale={locale}
        imageUrl={imageUrl}
        className="xp-runtime flex flex-col"
      >
        {view === "theme-presets" ? (
          <ThemePresetsView locale={locale} />
        ) : (
          <LayoutDebugView />
        )}
        <DemoBadge />
      </ThemeScope>
    </div>
  );
}

function Message({ title, children }: { title: string; children?: ReactNode }) {
  return (
    <main className="xp-runtime flex flex-col items-center justify-center gap-3 p-6 text-center">
      <p className="text-lg font-bold">{title}</p>
      {children}
    </main>
  );
}

function FixtureFrame({ name, locale }: { name: string; locale: Locale }) {
  const fixture = useMemo(() => getFixture(name), [name]);
  if (!fixture) {
    return (
      <Message title={`Unknown fixture "${name}"`}>
        <p className="text-sm">Available: {FIXTURE_NAMES.join(", ")}</p>
      </Message>
    );
  }
  return <Stage content={{ ...fixture, locale }} />;
}

// Studio preview: waits for the configuration sent by the Studio.
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
  const [ui, setUi] = useState<{ locale: Locale; safeArea?: SafeAreaInsets }>({
    locale: "fr",
  });

  useEffect(() => {
    const unsubscribe = bridge.subscribe((message) => {
      if (message.type === "xp:config") {
        setData({ config: message.config, campaign: message.campaign });
      } else {
        setUi({ locale: message.locale, safeArea: message.safeArea });
      }
    });
    // Sent after subscribing: the Studio only posts once it has heard from the frame.
    bridge.post({ type: "xp:ready" });
    return unsubscribe;
  }, [bridge]);

  // A click on an editable element opens the matching field in the Studio.
  const onClickCapture = (event: MouseEvent) => {
    const target = (event.target as Element).closest("[data-xp-edit]");
    const path = target?.getAttribute("data-xp-edit");
    if (path) bridge.post({ type: "xp:edit-target", path });
  };

  if (!data) return <Message title="Waiting for the Studio…" />;
  return (
    <div onClickCapture={onClickCapture}>
      <Stage content={{ ...data, ...ui, view: "layout-debug" }} />
    </div>
  );
}

// "Open in new window": reads the saved configuration and follows its changes live.
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
    <Stage
      content={{
        config,
        campaign: createDemoCampaign(config.game.type),
        locale: config.locales.default,
        view: "layout-debug",
      }}
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
    return () => robots.remove();
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
  if (params.get("source") === "local") {
    return <LocalFrame campaignId={params.get("campaignId")} />;
  }
  return <BridgeFrame />;
}
