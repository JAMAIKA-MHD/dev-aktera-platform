import { HandHeart, MessageCircle } from "lucide-react";
import { useEffect } from "react";
import { resolveText } from "../../domain/locale";
import { RESULT_TEXT } from "../../presets/contentDefaults";
import { useGameTheme } from "../../theme/GameTheme";
import { runtimeAudio } from "../feedback/audio";
import { ExperienceFrame } from "../frame/ExperienceFrame";
import { GameButton } from "../shell/GameButton";
import { ResultScreen } from "../shell/ResultScreen";
import { useThemeHeroArt } from "../shell/useThemeHeroArt";
import { ScreenMedallion } from "./ScreenMedallion";
import { press, type ScreenProps } from "./screenProps";

// The end of a losing journey (plan §6.3, tasks.md T4.4), from LoseConsolation.tsx: a warm
// message with the theme's sad character (or a light medallion), and a single, simple share
// button. No "+1 try for a share" (features.shareBonus is locked to false, N4): sharing here
// is purely optional and never unlocks anything, unlike the prototype's onShareBonus.
export function LoseScreen({ flow, config, locale, chrome }: ScreenProps) {
  const fallback = config.locales.default;
  const text = (value: Parameters<typeof resolveText>[0]) =>
    resolveText(value, locale, fallback);
  const character = useGameTheme().assets?.characters.sad ?? null;
  // Drawn over the title by a spotlight template (slot 2): the body keeps the button alone.
  const heroArt = useThemeHeroArt("lose");

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

  const shareButton = (
    <GameButton
      variant="secondary"
      label={text(RESULT_TEXT.share)}
      icon={<MessageCircle className="size-4 shrink-0" />}
      onClick={share}
      className="mt-2 min-h-[44px] px-4 text-sm font-bold"
    />
  );

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
      {/* The template draws its own picture over the title: the body keeps the button. */}
      {character || heroArt ? (
        <ResultScreen
          tone="lose"
          art={
            heroArt || !character ? null : (
              <img src={character} alt="" draggable={false} />
            )
          }
        >
          {shareButton}
        </ResultScreen>
      ) : (
        <ScreenMedallion icon={HandHeart}>{shareButton}</ScreenMedallion>
      )}
    </ExperienceFrame>
  );
}
