import { useCallback, useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";
import {
  PlayerExperience,
  ServicesProvider,
  createPublicServices,
  loadPublicExperience,
  pickInitialLocale,
  type PublicExperience,
} from "../../features/player-experience";
import { supabase } from "../../lib/supabase";

// The public player page /play/:slug (backend task B5.2): the campaign's design from the Studio,
// played with the live gateway only. Every outcome comes from select-prize (CLAUDE.md, rule 1):
// a demo or scripted gateway would show an error screen instead of the game.
// The runtime is rendered straight in this document, never inside another page's layout.

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL as string;
const ONLY_LIVE = ["live"] as const;

type PageState =
  | { status: "loading" }
  | { status: "error"; message: string }
  | PublicExperience;

// Shown before the brand's design is known: the player dark theme, trilingual (CLAUDE.md, rule 5).
const NOT_FOUND = {
  title: {
    fr: "Campagne introuvable",
    ar: "الحملة غير موجودة",
    en: "Campaign not found",
  },
  text: {
    fr: "Le lien que vous avez suivi est peut-être expiré ou incorrect.",
    ar: "قد يكون الرابط الذي اتبعته منتهي الصلاحية أو غير صحيح.",
    en: "The link you followed may have expired or be incorrect.",
  },
};
const LOAD_ERROR = {
  title: {
    fr: "Un problème est survenu",
    ar: "حدث خطأ ما",
    en: "Something went wrong",
  },
  text: {
    fr: "Vérifiez votre connexion et réessayez.",
    ar: "تحقق من اتصالك وحاول مجدداً.",
    en: "Check your connection and try again.",
  },
  retry: { fr: "Réessayer", ar: "إعادة المحاولة", en: "Retry" },
};
const LANGUAGES = ["fr", "ar", "en"] as const;

export default function PublicPlayPage() {
  const { slug = "" } = useParams<{ slug: string }>();
  const [state, setState] = useState<PageState>({ status: "loading" });
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    setState({ status: "loading" });
    loadPublicExperience(supabase, slug).then(
      (result) => {
        if (active) setState(result);
      },
      (error: unknown) => {
        if (!active) return;
        setState({
          status: "error",
          message: error instanceof Error ? error.message : String(error),
        });
      },
    );
    return () => {
      active = false;
    };
  }, [slug, attempt]);

  const retry = useCallback(() => setAttempt((value) => value + 1), []);

  if (state.status === "loading") return <LoadingScreen />;
  if (state.status === "not_found") return <MessageScreen texts={NOT_FOUND} />;
  if (state.status === "error") {
    return <MessageScreen texts={LOAD_ERROR} onRetry={retry} />;
  }
  return <LiveExperience experience={state} />;
}

function LiveExperience({
  experience,
}: {
  experience: Extract<PublicExperience, { status: "ok" }>;
}) {
  const { campaign, config, availability } = experience;
  const services = useMemo(
    () =>
      createPublicServices({
        client: supabase,
        supabaseUrl: SUPABASE_URL,
        availability,
      }),
    [availability],
  );
  const [locale] = useState(() =>
    pickInitialLocale(
      config.locales,
      typeof navigator === "undefined"
        ? []
        : navigator.languages?.length
          ? navigator.languages
          : [navigator.language],
    ),
  );

  useEffect(() => {
    document.title = campaign.name;
  }, [campaign.name]);

  return (
    <ServicesProvider services={services}>
      <PlayerExperience
        config={config}
        campaign={campaign}
        locale={locale}
        allowedGatewayModes={ONLY_LIVE}
      />
    </ServicesProvider>
  );
}

function LoadingScreen() {
  return (
    <div
      className="flex min-h-dvh items-center justify-center bg-[#0F0F1A]"
      role="status"
    >
      <div className="size-8 animate-spin rounded-full border-2 border-white/15 border-t-white/70" />
      <span className="sr-only">Loading</span>
    </div>
  );
}

function MessageScreen({
  texts,
  onRetry,
}: {
  texts: {
    title: Record<(typeof LANGUAGES)[number], string>;
    text: Record<(typeof LANGUAGES)[number], string>;
    retry?: Record<(typeof LANGUAGES)[number], string>;
  };
  onRetry?: () => void;
}) {
  return (
    <main
      className="flex min-h-dvh items-center justify-center bg-[#0F0F1A] px-6 py-10 text-center text-white"
      style={{ fontFamily: '"Poppins", "Noto Sans Arabic", sans-serif' }}
    >
      <div className="w-full max-w-md space-y-6">
        {LANGUAGES.map((language) => (
          <section
            key={language}
            dir="auto"
            lang={language}
            className="space-y-1"
          >
            <h1 className="text-lg font-bold">{texts.title[language]}</h1>
            <p className="text-sm text-white/60">{texts.text[language]}</p>
          </section>
        ))}
        {onRetry && texts.retry && (
          <button
            type="button"
            onClick={onRetry}
            className="mx-auto flex min-h-11 items-center justify-center rounded-full bg-white px-6 text-sm font-bold text-[#0F0F1A] transition hover:bg-white/90 active:scale-95"
          >
            {LANGUAGES.map((language) => texts.retry![language]).join(" · ")}
          </button>
        )}
      </div>
    </main>
  );
}
