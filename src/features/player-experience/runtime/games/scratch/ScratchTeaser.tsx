import { useEffect, useRef, useState } from "react";
import { resolveText } from "../../../domain/locale";
import { tint } from "../../../theme/recipes";
import { TeaserShell } from "../TeaserShell";
import type { GameTeaserProps } from "../types";
import { ScratchCardFace, scratchCoverStyle } from "./ScratchCardFace";

// Pregame teaser of the scratch card (plan §8.7): the brand's own ticket, with a coin that
// scratches a small window and lets nothing but a glint through — no prize is passed to the
// card (rule 1), so there is quite literally nothing underneath to reveal. The window closes
// again and the coin starts over. Still when off screen, static or with reduced motion.

const CYCLE_MS = 4200;
const STEPS = 60;

// The little window the coin has opened, with a soft edge: a glint, never a clean hole cut
// out of the ticket.
const window_ = (swept: number) =>
  `radial-gradient(ellipse 17% 13% at ${(22 + swept * 56).toFixed(1)}% 55%, transparent 30%, black 88%)`;

export function ScratchTeaser(props: GameTeaserProps) {
  const { settings, campaign, config, locale, reducedMotion, active } = props;
  const still = reducedMotion || settings.teaser.mode === "static";
  // 0 to 1 and back: how far the coin has travelled across its little window.
  const [progress, setProgress] = useState(0);
  const frame = useRef(0);

  useEffect(() => {
    if (still || !active) return; // paused where it is (rule 4)
    let start: number | null = null;
    const step = (now: number) => {
      start ??= now;
      const cycle = ((now - start) % CYCLE_MS) / CYCLE_MS;
      // Rounded to a few dozen steps: the picture moves, React does not re-render 60 times
      // a second for a decoration.
      setProgress(Math.round(cycle * STEPS) / STEPS);
      frame.current = requestAnimationFrame(step);
    };
    frame.current = requestAnimationFrame(step);
    return () => cancelAnimationFrame(frame.current);
  }, [still, active]);

  // Out and back, so the window opens and closes rather than jumping shut.
  const swept = progress < 0.5 ? progress * 2 : (1 - progress) * 2;
  const coverText = resolveText(
    settings.scratch?.coverText,
    locale,
    config.locales.default,
  );

  return (
    <TeaserShell {...props}>
      <ScratchCardFace
        campaign={campaign}
        config={config}
        locale={locale}
        cover={
          <>
            <span
              aria-hidden
              className="absolute inset-0"
              style={{
                ...scratchCoverStyle,
                // The window the coin has opened: a band of the cover taken away, showing
                // the glint underneath and never a prize.
                maskImage: window_(swept),
                WebkitMaskImage: window_(swept),
              }}
            />
            <span
              aria-hidden
              data-xp-scratch-coin
              className="absolute size-[14%] rounded-full border-2"
              style={{
                insetInlineStart: `${(20 + swept * 60).toFixed(1)}%`,
                top: "55%",
                transform: "translate(-50%, -50%)",
                background: `radial-gradient(circle at 35% 30%, var(--xp-primary-light), var(--xp-primary-deep))`,
                borderColor: tint("--xp-surface", 60),
                opacity: still ? 0 : 1,
              }}
            />
            <p
              dir="auto"
              className="pointer-events-none absolute inset-0 grid place-items-center p-4 text-center text-[clamp(0.9rem,4.5cqmin,1.25rem)] font-extrabold uppercase tracking-[0.12em]"
              style={{ color: "var(--xp-on-primary)" }}
            >
              {coverText}
            </p>
          </>
        }
      />
    </TeaserShell>
  );
}
