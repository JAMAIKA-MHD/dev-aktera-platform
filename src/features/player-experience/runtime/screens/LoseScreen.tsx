import { HandHeart, MessageCircle } from "lucide-react";
import { useEffect } from "react";
import { resolveText } from "../../domain/locale";
import { RESULT_TEXT } from "../../presets/contentDefaults";
import { tint } from "../../theme/recipes";
import { runtimeAudio } from "../feedback/audio";
import { ExperienceFrame } from "../frame/ExperienceFrame";
import { ScreenMedallion } from "./ScreenMedallion";
import { press, type ScreenProps } from "./screenProps";

// The end of a losing journey (plan §6.3, tasks.md T4.4), from LoseConsolation.tsx: a warm
// message with a light illustration, and a single, simple share button. No "+1 try for a
// share" (features.shareBonus is locked to false, N4): sharing here is purely optional and
// never unlocks anything, unlike the prototype's onShareBonus.
export function LoseScreen({ flow, config, locale, chrome }: ScreenProps) {
  const fallback = config.locales.default;
  const text = (value: Parameters<typeof resolveText>[0]) =>
    resolveText(value, locale, fallback);

  useEffect(() => {
    runtimeAudio.play("lose");
  }, []);

  const brandName =
    config.brand.name.trim() || config.legal.organizerName.trim();
  const shareUrl = window.location.href;
  const share = () => {
    flow.track("share_clicked", { kind: "whatsapp" });
    const message = `${text(RESULT_TEXT.shareLoseText).replace("{brand}", brandName)} ${shareUrl}`;
    window.open(
      `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`,
      "_blank",
      "noopener,noreferrer",
    );
  };

  return (
    <ExperienceFrame
      config={config}
      locale={locale}
      screenContent={config.screens.lose}
      editPath="screens.lose"
      logoUrl={chrome.logoUrl}
      statusBadge={chrome.statusBadge}
      live={chrome.live}
      cta={{ onPrimary: press(flow, flow.restart, "primary") }}
    >
      <ScreenMedallion icon={HandHeart}>
        <button
          type="button"
          onClick={share}
          className="mt-2 inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[var(--xp-radius-pill)] border px-4 text-sm font-bold transition-colors duration-200 hover:border-[color:var(--xp-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]"
          style={{ borderColor: tint("--xp-text", 14) }}
        >
          <MessageCircle className="size-4 shrink-0" />
          {text(RESULT_TEXT.share)}
        </button>
      </ScreenMedallion>
    </ExperienceFrame>
  );
}
