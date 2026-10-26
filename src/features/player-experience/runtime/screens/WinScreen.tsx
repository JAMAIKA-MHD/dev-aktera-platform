import { Check, Facebook, MessageCircle } from "lucide-react";
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
import { useGameTheme } from "../../theme/GameTheme";
import { press, type ScreenProps } from "./screenProps";

// The end of a winning journey (plan §6.3, tasks.md T4.4), on the shell: the prize popping in
// over turning rays (ResultScreen), then its card (RewardPopup) with the win message and the
// code — copy, then confirm once (CONFIRM_COUPON, sent only once, T1.10). A campaign without a
// code shows how to collect the prize instead: never a fallback code like the prototype's
// "AKT-DZ-9824X" (B6). Confetti and a win sound, skipped with reduced motion. Sharing is
// optional, plain WhatsApp/Facebook links, and never grants another try (features.shareBonus
// is locked to false, N4): nothing here reads or writes it.
//
// A spotlight template draws it like its own win screen: its character (a star) over the
// title instead of the prize popping in, the card flat on the panel, and the confirmation
// as the light button under the main one.

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
  const resolved = resolvePrizeDisplay(prizeId, config, campaign, locale);
  const display = {
    ...resolved,
    label: resolved.label || text(RESULT_TEXT.prizeFallback),
  };
  const couponCode = outcome?.couponCode ?? null;
  const couponStatus = flow.couponStatus;
  const heroArt = useThemeHeroArt("win");
  const confirmUnderCta = useGameTheme().manifest?.layout.kind === "spotlight";
  const canConfirm =
    couponCode !== null &&
    couponStatus !== "confirmed" &&
    couponStatus !== "failed";
  const confirmLabel = text(
    couponStatus === "sending" ? RESULT_TEXT.confirming : RESULT_TEXT.confirm,
  );

  // Once, when the win is first shown: never replayed on a re-render (a resize, an edit).
  useEffect(() => {
    runtimeAudio.play("win");
    vibrate("win");
    if (card.current) celebrate(card.current, { reducedMotion });
  }, [reducedMotion]);
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
      cta={{
        onPrimary: press(flow, flow.restart, "primary"),
        ...(confirmUnderCta && canConfirm
          ? {
              onSecondary: () => flow.confirmCoupon(),
              secondaryLabel: confirmLabel,
              secondaryDisabled: couponStatus === "sending",
            }
          : null),
      }}
    >
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
          codeLabel={text(RESULT_TEXT.codeLabel)}
          copyLabel={text(RESULT_TEXT.copy)}
          copiedLabel={text(RESULT_TEXT.copied)}
          copied={copied}
          onCopy={handleCopy}
          pickupInstructions={text(RESULT_TEXT.pickupInstructions)}
          shimmer={!reducedMotion}
        />

        {canConfirm && !confirmUnderCta && (
          // Sent once: unavailable while it is on its way (not merely busy).
          <GameButton
            variant="secondary"
            label={confirmLabel}
            icon={
              couponStatus === "sending" ? (
                <span
                  aria-hidden
                  className="xp-spin size-4 shrink-0 rounded-full border-2 border-current border-t-transparent"
                />
              ) : undefined
            }
            disabled={couponStatus === "sending"}
            onClick={() => flow.confirmCoupon()}
            className="min-h-[44px] w-full px-4 text-sm font-bold"
          />
        )}
        {couponStatus === "confirmed" && (
          <p
            role="status"
            className="flex items-center gap-1.5 text-sm font-bold"
            style={{ color: "var(--xp-success)" }}
          >
            <Check className="size-4" strokeWidth={3} />
            {text(RESULT_TEXT.confirmed)}
          </p>
        )}
        {couponStatus === "failed" && (
          <p
            role="status"
            dir="auto"
            className="text-xs text-[var(--xp-text-muted)]"
          >
            {text(RESULT_TEXT.confirmFailed)}
          </p>
        )}

        <div className="flex w-full flex-col gap-2" data-xp-share-row>
          <GameButton
            variant="secondary"
            label={text(RESULT_TEXT.shareWhatsapp)}
            icon={<MessageCircle className="size-4 shrink-0" />}
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
