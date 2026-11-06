import { BadgeCheck, MessageCircle } from "lucide-react";
import { useEffect, useRef } from "react";
import { resolveText } from "../../domain/locale";
import { RESULT_TEXT } from "../../presets/contentDefaults";
import { useGameTheme } from "../../theme/GameTheme";
import { runtimeAudio } from "../feedback/audio";
import { celebrate } from "../feedback/confetti";
import { vibrate } from "../feedback/haptics";
import { ExperienceFrame } from "../frame/ExperienceFrame";
import { useReducedMotion } from "../hooks/useReducedMotion";
import { GameButton } from "../shell/GameButton";
import { Panel } from "../shell/Panel";
import { PrizeArt } from "../shell/PrizeArt";
import { ResultScreen } from "../shell/ResultScreen";
import { useThemeHeroArt } from "../shell/useThemeHeroArt";
import { useWinHold } from "../winIntro/WinIntro";
import { press, type ScreenProps } from "./screenProps";

// The end of a draw campaign's journey (CampaignSnapshot.ballot): nothing is won on the spot,
// the player is told their participation is accepted and in the draw. It is a happy moment, so
// it is dressed and played like a win — the template's scene before it (WinIntro), the win's
// stage mood, art, confetti and sound — but it never shows a prize nor a code: the winners are
// drawn later, outside the game. The outcome still comes from the gateway (select-prize): this
// screen only tells what the server recorded.

// A short, readable reference of the entry, for the player to quote if they call the brand.
function entryReference(entryId: string | null): string | null {
  if (!entryId) return null;
  const compact = entryId.replace(/[^0-9a-z]/gi, "").toUpperCase();
  return compact ? compact.slice(0, 8) : null;
}

export function BallotScreen({ flow, config, locale, chrome }: ScreenProps) {
  const fallback = config.locales.default;
  const text = (value: Parameters<typeof resolveText>[0]) =>
    resolveText(value, locale, fallback);
  const reducedMotion = useReducedMotion(config.features.animations);
  const card = useRef<HTMLDivElement>(null);
  const heroArt = useThemeHeroArt("win");
  const { manifest } = useGameTheme();
  const motion = manifest?.motion;
  const held = useWinHold();

  // Once, when the page shows: the template's scene before it holds all of it back.
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
    // Read once: a template changed in the Studio does not fire the confetti again.
  }, [reducedMotion, held]);

  const brandName =
    config.brand.name.trim() || config.legal.organizerName.trim();
  const reference = entryReference(flow.state.entryId);
  const share = () => {
    flow.track("share_clicked", { kind: "whatsapp" });
    const message = `${text(RESULT_TEXT.shareBallotText).replace("{brand}", brandName)} ${window.location.href}`;
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
      screenContent={config.screens.ballot}
      editPath="screens.ballot"
      logoUrl={chrome.logoUrl}
      statusBadge={chrome.statusBadge}
      live={chrome.live}
      cta={{ onPrimary: press(flow, flow.restart, "primary") }}
    >
      <ResultScreen
        tone="win"
        art={
          // The template's ticket (its prize art), else the ticket icon in its colors.
          heroArt ? null : <PrizeArt image={null} icon="ticket" />
        }
      >
        <div ref={card} className="w-full">
          <Panel
            framed
            data-xp-ballot=""
            className="xp-reward-popup relative isolate w-full overflow-hidden p-4 text-center"
          >
            {!reducedMotion && <span aria-hidden className="xp-shimmer" />}
            {brandName && (
              <p
                dir="auto"
                data-xp-clamp
                className="xp-label truncate text-[0.65rem] font-extrabold uppercase tracking-[0.14em]"
                style={{
                  color:
                    "color-mix(in srgb, var(--xp-primary) 70%, var(--xp-text))",
                }}
              >
                {brandName}
              </p>
            )}
            <p
              dir="auto"
              className="xp-display mt-1 flex items-center justify-center gap-2 text-[length:var(--xp-fs-display)] leading-tight font-black wrap-anywhere"
            >
              <BadgeCheck
                aria-hidden
                className="size-[1.1em] shrink-0"
                style={{ color: "var(--xp-success)" }}
              />
              <span>{text(RESULT_TEXT.ballotBadge)}</span>
            </p>
            {reference && (
              <>
                <div
                  aria-hidden
                  className="mx-auto my-3 w-full border-t-2 border-dashed"
                  style={{
                    borderColor:
                      "color-mix(in srgb, var(--xp-text) 22%, transparent)",
                  }}
                />
                <p
                  dir="auto"
                  className="text-xs font-bold text-[var(--xp-text-muted)]"
                >
                  {text(RESULT_TEXT.ballotReference)}
                </p>
                <p
                  data-xp-ballot-reference
                  className="mt-1 font-mono text-[clamp(0.7rem,3.6cqw,1rem)] font-extrabold tracking-[0.18em]"
                >
                  {reference}
                </p>
              </>
            )}
          </Panel>
        </div>

        {/* One labelled button, as on a loss: the win's share row shows icons only. */}
        <GameButton
          variant="secondary"
          label={text(RESULT_TEXT.share)}
          icon={<MessageCircle className="size-4 shrink-0" />}
          onClick={share}
          className="mt-1 min-h-[44px] px-4 text-sm font-bold"
        />
      </ResultScreen>
    </ExperienceFrame>
  );
}
