import { Facebook } from "lucide-react";
import { useEffect, useRef } from "react";
import { resolvePrizeDisplay } from "../../domain/display";
import { resolveText } from "../../domain/locale";
import { RESULT_TEXT } from "../../presets/contentDefaults";
import { runtimeAudio } from "../feedback/audio";
import { celebrate } from "../feedback/confetti";
import { vibrate } from "../feedback/haptics";
import { ExperienceFrame } from "../frame/ExperienceFrame";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { GameButton } from "../shell/GameButton";
import { PrizeArt } from "../shell/PrizeArt";
import { ResultScreen } from "../shell/ResultScreen";
import { RewardPopup } from "../shell/RewardPopup";
import { useThemeHeroArt } from "../shell/useThemeHeroArt";
import { ComicWord, useComicWord } from "../shell/ComicWord";
import { useGameTheme } from "../../theme/GameTheme";
import { useWinHold } from "../winIntro/WinIntro";
import { press, type ScreenProps } from "./screenProps";

// The end of a winning journey (plan §6.3, tasks.md T4.4), on the shell: the prize popping in
// over turning rays (ResultScreen), then its card (RewardPopup) with the win message and the
// code. Copying the code also confirms it (CONFIRM_COUPON, sent only once, T1.10): the
// dashboard's "Coupon Confirmed". A campaign without a code shows how to collect the prize
// instead: never a fallback code like the prototype's "AKT-DZ-9824X" (B6). Confetti and a win
// sound, skipped with reduced motion. Sharing is optional, plain WhatsApp/Facebook links, and
// never grants another try (features.shareBonus is locked to false, N4): nothing here reads or
// writes it.
//
// A spotlight template draws it like its own win screen: its character (a star) over the
// title instead of the prize popping in, and the card flat on the panel.

// The logo itself: lucide draws brands no more, and on a phone the icon stands alone.
function WhatsAppIcon() {
  return (
    <svg
      aria-hidden
      viewBox="0 0 24 24"
      fill="currentColor"
      className="size-4 shrink-0"
    >
      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
    </svg>
  );
}

export function WinScreen({
  flow,
  config,
  campaign,
  locale,
  chrome,
}: ScreenProps) {
  const { state } = flow;
  const fallback = config.locales.default;
  const text = (value: Parameters<typeof resolveText>[0]) =>
    resolveText(value, locale, fallback);
  const reducedMotion = useReducedMotion(config.features.animations);
  const card = useRef<HTMLDivElement>(null);
  const { copied, copy } = useCopyToClipboard();

  const outcome = state.outcome;
  const prizeId = outcome?.prize?.id ?? "";
  const resolved = resolvePrizeDisplay(
    prizeId,
    config,
    campaign,
    locale,
    outcome?.prize,
  );
  const display = {
    ...resolved,
    label: resolved.label || text(RESULT_TEXT.prizeFallback),
  };
  const couponCode = outcome?.couponCode ?? null;
  const couponStatus = flow.couponStatus;
  const heroArt = useThemeHeroArt("win");
  const { manifest } = useGameTheme();
  const motion = manifest?.motion;
  const winWord = useComicWord("win");
  const held = useWinHold();

  // Once, when the win is first shown: never replayed on a re-render (a resize, an edit). A
  // template's scene before the win holds all of it back until the page shows.
  useEffect(() => {
    if (held) return;
    runtimeAudio.play("win");
    vibrate(motion?.games === "lively" ? "bigWin" : "win");
    if (card.current) {
      celebrate(card.current, {
        reducedMotion,
        style: motion?.confetti ?? "classic",
      });
    }
    // The theme's look of it is read once: a template changed in the Studio mid-win does
    // not fire the confetti again.
  }, [reducedMotion, held]);
  // The code is the player's: the reward sound, once it is confirmed.
  useEffect(() => {
    if (couponStatus === "confirmed") runtimeAudio.play("reward");
  }, [couponStatus]);

  const brandName =
    config.brand.name.trim() || config.legal.organizerName.trim();
  const shareUrl = window.location.href;
  const shareMessage = (template: string) =>
    `${template.replace("{prize}", display.label).replace("{brand}", brandName)} ${shareUrl}`;
  const share = (kind: "whatsapp" | "facebook") => () => {
    flow.track("share_clicked", { kind });
    const message = shareMessage(text(RESULT_TEXT.shareWinText));
    const url =
      kind === "whatsapp"
        ? `https://api.whatsapp.com/send?text=${encodeURIComponent(message)}`
        : `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(shareUrl)}&quote=${encodeURIComponent(message)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

  // Only ever wired to the code button, which only renders when there is a code.
  const handleCopy = (code: string) => {
    void copy(code);
    flow.track("coupon_copied");
    flow.confirmCoupon();
  };

  return (
    <ExperienceFrame
      config={config}
      locale={locale}
      screenContent={config.screens.win}
      editPath="screens.win"
      logoUrl={chrome.logoUrl}
      statusBadge={chrome.statusBadge}
      live={chrome.live}
      cta={{ onPrimary: press(flow, flow.restart, "primary") }}
    >
      {winWord && !reducedMotion && !held && (
        <ComicWord word={winWord} over y={18} />
      )}
      <ResultScreen
        tone="win"
        art={
          heroArt ? null : (
            <PrizeArt image={display.image} icon={display.icon} />
          )
        }
      >
        <RewardPopup
          cardRef={card}
          brandName={brandName}
          prizeLabel={display.label}
          winMessage={display.winMessage}
          code={couponCode}
          copyLabel={text(RESULT_TEXT.copy)}
          copiedLabel={text(RESULT_TEXT.copied)}
          copied={copied}
          onCopy={handleCopy}
          pickupInstructions={text(RESULT_TEXT.pickupInstructions)}
          shimmer={!reducedMotion}
        />

        <div className="flex w-full flex-col gap-2" data-xp-share-row>
          <GameButton
            variant="secondary"
            label={text(RESULT_TEXT.shareWhatsapp)}
            icon={<WhatsAppIcon />}
            onClick={share("whatsapp")}
            className="min-h-[44px] px-2 text-xs font-bold"
          />
          <GameButton
            variant="secondary"
            label={text(RESULT_TEXT.shareFacebook)}
            icon={<Facebook className="size-4 shrink-0" />}
            onClick={share("facebook")}
            className="min-h-[44px] px-2 text-xs font-bold"
          />
        </div>
      </ResultScreen>
    </ExperienceFrame>
  );
}
