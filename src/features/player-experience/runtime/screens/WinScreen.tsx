import { Check, Copy, Facebook, MessageCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { resolvePrizeDisplay } from "../../domain/display";
import { resolveText } from "../../domain/locale";
import { RESULT_TEXT } from "../../presets/contentDefaults";
import { BRAND_INK, cardStyle, tint } from "../../theme/recipes";
import { runtimeAudio } from "../feedback/audio";
import { celebrate } from "../feedback/confetti";
import { vibrate } from "../feedback/haptics";
import { ExperienceFrame } from "../frame/ExperienceFrame";
import { useCopyToClipboard } from "../hooks/useCopyToClipboard";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { press, type ScreenProps } from "./screenProps";

// The end of a winning journey (plan §6.3, tasks.md T4.4), from RewardVoucher.tsx: a
// "ticket" (dashed separator, notches, a sweep of light) with the prize name, the win
// message and the code — copy, then confirm once (CONFIRM_COUPON, sent only once, T1.10).
// A campaign without a code shows how to collect the prize instead: never a fallback code
// like the prototype's "AKT-DZ-9824X" (B6). Confetti and a win sound, skipped with reduced
// motion. Sharing is optional, plain WhatsApp/Facebook links, and never grants another try
// (features.shareBonus is locked to false, N4): nothing here reads or writes it.

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
  const ticket = useRef<HTMLDivElement>(null);
  const { copied, copy } = useCopyToClipboard();

  const outcome = state.outcome;
  const prizeId = outcome?.prize?.id ?? "";
  const display = resolvePrizeDisplay(prizeId, config, campaign, locale);
  const couponCode = outcome?.couponCode ?? null;
  const couponStatus = flow.couponStatus;

  // Once, when the win is first shown: never replayed on a re-render (a resize, an edit).
  useEffect(() => {
    runtimeAudio.play("win");
    vibrate("win");
    if (ticket.current) celebrate(ticket.current, { reducedMotion });
  }, [reducedMotion]);

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
  const handleCopy = (code: string) => () => {
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
      cta={{ onPrimary: press(flow, flow.restart, "primary") }}
    >
      <div className="flex min-h-0 flex-col items-center gap-3 overflow-y-auto py-1">
        <div
          ref={ticket}
          className="xp-pop relative isolate w-full overflow-hidden border p-4 text-center"
          style={cardStyle}
        >
          {/* Light sweeping across the ticket once, the primary button's own effect. */}
          {!reducedMotion && <span aria-hidden className="xp-shimmer" />}
          {brandName && (
            <p
              dir="auto"
              data-xp-clamp
              className="truncate text-[0.65rem] font-extrabold uppercase tracking-[0.14em]"
              style={{ color: BRAND_INK }}
            >
              {brandName}
            </p>
          )}
          <p
            dir="auto"
            data-xp-clamp
            className="mt-1 line-clamp-2 text-[clamp(1.35rem,5cqw,1.85rem)] leading-tight font-black wrap-anywhere"
          >
            {display.label}
          </p>
          {display.winMessage && (
            <p
              dir="auto"
              data-xp-clamp
              className="mt-1 text-sm text-[var(--xp-text-muted)]"
            >
              {display.winMessage}
            </p>
          )}

          {/* The ticket's perforation: a dashed line with a notch cut on each side. */}
          <div className="relative my-3 h-3">
            <span
              aria-hidden
              className="absolute start-[-1.5rem] top-1/2 size-6 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: "var(--xp-surface)" }}
            />
            <span
              aria-hidden
              className="absolute inset-x-0 top-1/2 border-t-2 border-dashed -translate-y-1/2"
              style={{ borderColor: tint("--xp-text", 20) }}
            />
            <span
              aria-hidden
              className="absolute end-[-1.5rem] top-1/2 size-6 -translate-y-1/2 rounded-full"
              style={{ backgroundColor: "var(--xp-surface)" }}
            />
          </div>

          {couponCode ? (
            <div className="flex flex-col items-center gap-1.5">
              <p className="text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-[var(--xp-text-muted)]">
                {text(RESULT_TEXT.codeLabel)}
              </p>
              <button
                type="button"
                onClick={handleCopy(couponCode)}
                className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[var(--xp-radius-md)] border px-4 py-2.5 font-mono text-[clamp(0.75rem,3.6cqw,1rem)] font-extrabold tracking-[0.15em] transition-[border-color] duration-200 hover:border-[color:var(--xp-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]"
                style={{ borderColor: tint("--xp-text", 16) }}
              >
                <span className="min-w-0 truncate">{couponCode}</span>
                <span
                  className="flex shrink-0 items-center gap-1 text-xs font-bold"
                  style={{
                    color: copied
                      ? "var(--xp-success)"
                      : "var(--xp-text-muted)",
                  }}
                >
                  {copied ? (
                    <>
                      <Check className="size-4" strokeWidth={3} />
                      <span className="xp-code-copy-label">
                        {text(RESULT_TEXT.copied)}
                      </span>
                    </>
                  ) : (
                    <>
                      <Copy className="size-4" />
                      <span className="xp-code-copy-label">
                        {text(RESULT_TEXT.copy)}
                      </span>
                    </>
                  )}
                </span>
              </button>
            </div>
          ) : (
            <p dir="auto" className="text-sm text-[var(--xp-text-muted)]">
              {text(RESULT_TEXT.pickupInstructions)}
            </p>
          )}
        </div>

        {couponCode &&
          couponStatus !== "confirmed" &&
          couponStatus !== "failed" && (
            <button
              type="button"
              disabled={couponStatus === "sending"}
              onClick={() => flow.confirmCoupon()}
              className="inline-flex min-h-[44px] w-full items-center justify-center gap-2 rounded-[var(--xp-radius-pill)] border px-4 text-sm font-bold text-[var(--xp-text-muted)] transition-colors duration-200 hover:text-[var(--xp-text)] disabled:opacity-60 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]"
              style={{ borderColor: tint("--xp-text", 14) }}
            >
              {couponStatus === "sending" && (
                <span
                  aria-hidden
                  className="xp-spin size-4 shrink-0 rounded-full border-2 border-current border-t-transparent"
                />
              )}
              {text(
                couponStatus === "sending"
                  ? RESULT_TEXT.confirming
                  : RESULT_TEXT.confirm,
              )}
            </button>
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

        <div className="flex w-full flex-col gap-2">
          <button
            type="button"
            onClick={share("whatsapp")}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[var(--xp-radius-pill)] border px-2 text-xs font-bold transition-colors duration-200 hover:border-[color:var(--xp-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]"
            style={{ borderColor: tint("--xp-text", 14) }}
          >
            <MessageCircle className="size-4 shrink-0" />
            <span className="min-w-0 truncate">
              {text(RESULT_TEXT.shareWhatsapp)}
            </span>
          </button>
          <button
            type="button"
            onClick={share("facebook")}
            className="inline-flex min-h-[44px] items-center justify-center gap-1.5 rounded-[var(--xp-radius-pill)] border px-2 text-xs font-bold transition-colors duration-200 hover:border-[color:var(--xp-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]"
            style={{ borderColor: tint("--xp-text", 14) }}
          >
            <Facebook className="size-4 shrink-0" />
            <span className="min-w-0 truncate">
              {text(RESULT_TEXT.shareFacebook)}
            </span>
          </button>
        </div>
      </div>
    </ExperienceFrame>
  );
}
