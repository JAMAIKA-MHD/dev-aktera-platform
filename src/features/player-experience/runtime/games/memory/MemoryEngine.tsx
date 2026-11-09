import { useCallback, useEffect, useRef, useState } from "react";
import { DEFAULT_RULES } from "../../../domain/campaign";
import { DEFAULT_MEMORY_FACES } from "../../../domain/defaults";
import { resolveText } from "../../../domain/locale";
import type { AssetRef, IconName } from "../../../domain/types";
import { runtimeAudio } from "../../feedback/audio";
import { vibrate } from "../../feedback/haptics";
import { useElementSize } from "../../layout/useElementSize";
import { RoundHud } from "../RoundHud";
import type { GameEngineProps } from "../types";
import { useRoundClock, type RoundClock } from "../useRoundClock";
import { MemoryCard, type CardState } from "./MemoryCard";

// Memory Match. The board holds the campaign's number of pairs and the player must find every
// one of them before the clock runs out; the clock starts on the first card, so reading the
// screen is never punished. The engine reports what was done (pairs, moves, time) and nothing
// else: whether that wins, and what it wins, is the server's to say (N1).

const GAP = 8; // between cards, in px: only used to choose the best number of columns
const MATCH_MS = 380;
const MISS_MS = 800;

interface Slot {
  face: IconName;
  faceImage: AssetRef; // the brand's picture of that face, over its icon
  pair: number;
}

function buildDeck(
  faces: readonly IconName[],
  faceImages: readonly AssetRef[],
  pairs: number,
): Slot[] {
  const deck: Slot[] = [];
  for (let pair = 0; pair < pairs; pair++) {
    const index = pair % faces.length;
    const card = { face: faces[index], faceImage: faceImages[index] ?? null };
    deck.push({ ...card, pair }, { ...card, pair });
  }
  // Fisher–Yates: the layout is cosmetic, it carries no prize information.
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [deck[i], deck[j]] = [deck[j], deck[i]];
  }
  return deck;
}

// The number of columns that makes the cards as big as the container allows.
function pickColumns(count: number, width: number, height: number) {
  let best = { cols: Math.min(4, count), cell: 0 };
  for (let cols = 2; cols <= count; cols++) {
    const rows = Math.ceil(count / cols);
    const cell = Math.min(
      (width - GAP * (cols - 1)) / cols,
      (height - GAP * (rows - 1)) / rows,
    );
    if (cell > best.cell) best = { cols, cell };
  }
  return best;
}

export function MemoryEngine({
  settings,
  campaign,
  config,
  phase,
  onInteractionComplete,
  onRevealComplete,
  reducedMotion,
  locale,
}: GameEngineProps) {
  const rules = campaign.rules.memory ?? DEFAULT_RULES.memory;
  const totalMs = rules.durationSeconds * 1000;
  const faces = settings.memory?.faces ?? DEFAULT_MEMORY_FACES;
  const faceImages = settings.memory?.faceImages ?? [];
  const backIcon = settings.memory?.backIcon ?? "help-circle";
  const backImage = settings.memory?.backImage ?? null;
  const fallback = config.locales.default;

  const [deck] = useState(() => buildDeck(faces, faceImages, rules.pairs));
  const [flipped, setFlipped] = useState<number[]>([]);
  const [missed, setMissed] = useState<number[]>([]); // a wrong pair, until it turns back
  const [matched, setMatched] = useState<boolean[]>(() =>
    deck.map(() => false),
  );
  const [started, setStarted] = useState(false);
  const [over, setOver] = useState(false);
  const locked = useRef(false);
  const overRef = useRef(false);
  const moves = useRef(0);
  const found = useRef(0);
  const timers = useRef<ReturnType<typeof setTimeout>[]>([]);
  const later = useCallback((run: () => void, ms: number) => {
    timers.current.push(setTimeout(run, ms));
  }, []);
  useEffect(() => {
    const pending = timers.current;
    return () => pending.forEach(clearTimeout);
  }, []);

  const send = useRef(onInteractionComplete);
  useEffect(() => {
    send.current = onInteractionComplete;
  });
  const revealComplete = useRef(onRevealComplete);
  useEffect(() => {
    revealComplete.current = onRevealComplete;
  });

  const clockRef = useRef<RoundClock | null>(null);
  const finish = useCallback(
    (delayMs: number) => {
      if (overRef.current) return;
      overRef.current = true;
      setOver(true);
      const report = () =>
        send.current({
          kind: "memory",
          pairs: found.current,
          moves: moves.current,
          elapsedMs: clockRef.current?.elapsedMs() ?? 0,
        });
      if (delayMs > 0) later(report, delayMs);
      else report();
    },
    [later],
  );

  const clock = useRoundClock(totalMs, started && !over, () => finish(0));
  useEffect(() => {
    clockRef.current = clock;
  });

  // Memory shows nothing of its own at the reveal: the result belongs to the screens after.
  useEffect(() => {
    if (phase === "revealing") revealComplete.current();
  }, [phase]);

  const playing = phase === "interacting" && !over;

  const flip = (index: number) => {
    if (!playing || locked.current) return;
    if (matched[index] || flipped.includes(index)) return;
    setStarted(true);
    runtimeAudio.play("tick");
    vibrate("tap");
    const next = [...flipped, index];
    setFlipped(next);
    if (next.length < 2) return;

    moves.current += 1;
    locked.current = true;
    const [a, b] = next;
    if (deck[a].pair === deck[b].pair) {
      later(
        () => {
          found.current += 1;
          setMatched((previous) =>
            previous.map((done, i) => done || i === a || i === b),
          );
          setFlipped([]);
          locked.current = false;
          runtimeAudio.play("click");
          if (found.current >= rules.pairs) finish(reducedMotion ? 0 : 450);
        },
        reducedMotion ? 0 : MATCH_MS,
      );
    } else {
      setMissed(next);
      later(
        () => {
          setFlipped([]);
          setMissed([]);
          locked.current = false;
        },
        reducedMotion ? 450 : MISS_MS,
      );
    }
  };

  const [boardRef, size] = useElementSize<HTMLDivElement>();
  const measured = size.width > 0 && size.height > 0;
  const { cols, cell } = measured
    ? pickColumns(deck.length, size.width, size.height)
    : { cols: Math.min(4, deck.length), cell: 0 };
  const gridWidth = measured
    ? Math.max(0, Math.floor(cols * cell + GAP * (cols - 1)))
    : undefined;

  const foundCount = matched.filter(Boolean).length / 2;
  const stateOf = (index: number): CardState =>
    matched[index] ? "matched" : flipped.includes(index) ? "up" : "down";
  const label = resolveText(config.screens.play.primaryCta, locale, fallback);

  return (
    <div
      className="grid size-full min-h-0 grid-rows-[auto_1fr] gap-2"
      data-xp-game="memory_match"
      data-xp-phase={phase}
    >
      <RoundHud
        score={`${foundCount} / ${rules.pairs}`}
        goal={`${rules.pairs} · ${rules.durationSeconds}s`}
        leftMs={clock.leftMs}
        totalMs={totalMs}
        reducedMotion={reducedMotion}
        reached={foundCount >= rules.pairs}
      />
      <div
        ref={boardRef}
        // The padding keeps the room a found pair jumps and glows into, inside the board.
        className="grid min-h-0 min-w-0 grid-cols-[minmax(0,1fr)] grid-rows-[minmax(0,1fr)] place-items-center overflow-hidden p-[clamp(0.25rem,2.5cqmin,0.75rem)]"
        style={{ opacity: phase === "interacting" ? 1 : 0.6 }}
      >
        <div
          data-xp-memory-board
          className="grid"
          style={{
            gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`,
            gap: GAP,
            width: gridWidth ?? "100%",
          }}
        >
          {deck.map((slot, index) => {
            const state = stateOf(index);
            return (
              <button
                key={index}
                type="button"
                disabled={!playing}
                aria-pressed={state !== "down"}
                aria-label={`${label} ${index + 1}`}
                onClick={() => flip(index)}
                className="aspect-square min-h-[44px] min-w-[44px] cursor-pointer rounded-[var(--xp-memory-radius,var(--xp-radius-md))] transition-transform duration-150 enabled:active:scale-[0.96] disabled:cursor-default focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]"
              >
                <MemoryCard
                  state={state}
                  face={slot.face}
                  faceImage={slot.faceImage}
                  toneIndex={slot.pair}
                  backIcon={backIcon}
                  backImage={backImage}
                  reducedMotion={reducedMotion}
                  miss={missed.includes(index)}
                />
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
