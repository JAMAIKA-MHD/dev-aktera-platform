import { useEffect, useRef, useState } from "react";
import { DEFAULT_RULES } from "../../../domain/campaign";
import { tint } from "../../../theme/recipes";
import { runtimeAudio } from "../../feedback/audio";
import { vibrate } from "../../feedback/haptics";
import type { GameEngineProps } from "../types";
import { HitTarget } from "./HitTarget";

// Hit It (plan §8.6, tasks.md T5.6). The campaign sets how long the round lasts and how many
// hits it takes, and both are shown to the player from the start. The engine counts hits and
// sends the count: whether that is a win is the server's to say (N1).

const TICK_MS = 100;
const EDGE = 12; // keeps a target away from the field's edge, in percent

export function HitItEngine({
  settings,
  campaign,
  config,
  phase,
  onInteractionComplete,
  onRevealComplete,
  reducedMotion,
  locale,
}: GameEngineProps) {
  const rules = campaign.rules.hitIt ?? DEFAULT_RULES.hitIt;
  const total = rules.durationSeconds * 1000;
  const [hits, setHits] = useState(0);
  const [left, setLeft] = useState(total);
  const [spot, setSpot] = useState({ x: 50, y: 50 });
  const sent = useRef(false);
  const playing = phase === "interacting";

  const send = useRef(onInteractionComplete);
  useEffect(() => {
    send.current = onInteractionComplete;
  });
  const revealComplete = useRef(onRevealComplete);
  useEffect(() => {
    revealComplete.current = onRevealComplete;
  });

  // The round's clock, read off the wall clock so a slowed-down tab neither steals nor
  // gives time. When it runs out the count leaves, once.
  const count = useRef(0);
  count.current = hits;
  useEffect(() => {
    if (!playing) return;
    const started = Date.now();
    const timer = setInterval(() => {
      const remaining = total - (Date.now() - started);
      if (remaining > 0) {
        setLeft(remaining);
        return;
      }
      clearInterval(timer);
      setLeft(0);
      if (sent.current) return;
      sent.current = true;
      send.current({ kind: "hitIt", hits: count.current });
    }, TICK_MS);
    return () => clearInterval(timer);
  }, [playing, total]);

  // Hit It shows nothing of its own at the reveal: the result belongs to the screens after.
  useEffect(() => {
    if (phase === "revealing") revealComplete.current();
  }, [phase]);

  const hit = () => {
    if (!playing || left <= 0) return;
    setHits((scored) => scored + 1);
    runtimeAudio.play("tick");
    vibrate("tap");
    // Somewhere else on the field, never against an edge where it could be half off.
    setSpot({
      x: EDGE + Math.random() * (100 - 2 * EDGE),
      y: EDGE + Math.random() * (100 - 2 * EDGE),
    });
  };

  const goal = `${rules.winThreshold} · ${rules.durationSeconds}s`;

  return (
    <div
      className="grid size-full min-h-0 grid-rows-[auto_1fr] gap-2"
      data-xp-game="hit_it"
      data-xp-phase={phase}
    >
      <div className="flex items-center justify-between gap-3">
        <span
          data-xp-hit-score
          className="rounded-full border px-3 py-1 text-sm font-extrabold tabular-nums"
          style={{ borderColor: tint("--xp-primary", 40) }}
        >
          {hits} / {rules.winThreshold}
        </span>
        {/* The time left, as a bar: a number would be one more thing to read while playing. */}
        <span
          aria-hidden
          data-xp-hit-time
          className="h-2 flex-1 overflow-hidden rounded-full"
          style={{ backgroundColor: tint("--xp-text", 12) }}
        >
          <span
            className="block h-full rounded-full"
            style={{
              width: `${((left / total) * 100).toFixed(1)}%`,
              backgroundColor: "var(--xp-primary)",
              transition: reducedMotion ? "none" : "width 120ms linear",
            }}
          />
        </span>
        <span className="text-xs font-bold text-[var(--xp-text-muted)] tabular-nums">
          {goal}
        </span>
      </div>

      {/* The field. The target is drawn inside it, in percentages of its own box, and the
          whole field is the button: a tap anywhere that reaches the target counts, and the
          keyboard reaches it too (D19). */}
      <button
        type="button"
        disabled={!playing}
        onPointerDown={hit}
        onKeyDown={(event) => {
          if (event.key === " " || event.key === "Enter") {
            event.preventDefault();
            hit();
          }
        }}
        aria-label={resolveLabel(config, locale)}
        className="relative size-full min-h-0 cursor-pointer rounded-[var(--xp-radius-lg)] border border-dashed disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]"
        style={{ borderColor: tint("--xp-primary", 25) }}
      >
        <HitTarget
          icon={settings.hitIt?.targetIcon ?? "target"}
          image={settings.hitIt?.targetImage ?? null}
          x={spot.x}
          y={spot.y}
          style={{
            transition: reducedMotion
              ? "none"
              : "inset-inline-start 120ms ease-out, top 120ms ease-out",
            opacity: playing ? 1 : 0.5,
          }}
        />
      </button>
    </div>
  );
}

// The play screen's own CTA text names the action; the field borrows it for its accessible
// name rather than inventing a second wording for the same thing.
function resolveLabel(
  config: GameEngineProps["config"],
  locale: GameEngineProps["locale"],
): string {
  const text = config.screens.play.primaryCta;
  return text[locale] ?? text[config.locales.default] ?? "";
}
