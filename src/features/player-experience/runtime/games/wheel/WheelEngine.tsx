import { useRef } from "react";
import { resolveText } from "../../../domain/locale";
import { useGameTheme } from "../../../theme/GameTheme";
import type { GameEngineProps } from "../types";
import { useWheelSpin } from "./useWheelSpin";
import { WheelFace } from "./WheelFace";

// The wheel (plan §8.6, tasks.md T5.2). How it turns, and lands on the outcome it was handed,
// is useWheelSpin's. Its look is WheelFace's, in the theme's wheel tokens.

export function WheelEngine({
  settings,
  campaign,
  config,
  phase,
  outcome,
  onStart,
  onRevealComplete,
  reducedMotion,
  locale,
}: GameEngineProps) {
  const rotor = useRef<SVGGElement>(null);
  const pointer = useRef<SVGGraphicsElement>(null);
  const stage = useRef<HTMLDivElement>(null);
  const motion = useGameTheme().manifest?.motion;
  const lively = motion?.games === "lively";
  const stepped = motion?.feel === "stepped";
  const segments = settings.wheel?.segments ?? [];
  const hubLabel = resolveText(
    settings.wheel?.hubLabel,
    locale,
    config.locales.default,
  );
  const { skip } = useWheelSpin({
    phase,
    segments,
    outcome,
    reducedMotion,
    onRevealComplete,
    rotor: () => rotor.current,
    lively,
    stepped,
    pointer: () => pointer.current,
    stage: () => stage.current,
  });

  const face = (
    <WheelFace
      segments={segments}
      hubLabel={hubLabel}
      campaign={campaign}
      config={config}
      locale={locale}
      rotorRef={rotor}
      pointerRef={pointer}
    />
  );
  // Square, sized on the slot itself and never on the screen (plan §8.6). The audit reads
  // data-xp-wheel to check it stays square at every size (wheel-not-square, T3.8).
  const size =
    "block w-[min(100cqw,100cqh)] aspect-square max-w-full self-center";

  // Idle: the wheel is the button, next to the CTA of slot 7 and firing the same event.
  // Once it turns, it is a picture: tapping it again would change nothing.
  return (
    // A tap on the turning wheel skips its landing (a lively theme's is long): the slice it
    // stops on is the same, only sooner.
    <div
      ref={stage}
      className="grid size-full min-h-0 place-items-center"
      data-xp-game="lucky_wheel"
      data-xp-phase={phase}
      onPointerDown={phase === "revealing" ? skip : undefined}
    >
      {phase === "idle" ? (
        <button
          type="button"
          onClick={onStart}
          aria-label={hubLabel}
          data-xp-wheel
          className={`${size} cursor-pointer transition-transform duration-200 ease-out active:scale-[0.98] focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[color:var(--xp-primary)]`}
        >
          {face}
        </button>
      ) : (
        <div className={size} data-xp-wheel>
          {face}
        </div>
      )}
    </div>
  );
}
