import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ComponentType,
} from "react";
import type { ThemeWinIntro, WinIntroScene } from "../../domain/themeManifest";
import { ComicScene } from "./scenes/ComicScene";
import { JackpotScene } from "./scenes/JackpotScene";
import { PixelScene } from "./scenes/PixelScene";
import type { SceneProps } from "./scenes/scene";
import { ShowScene } from "./scenes/ShowScene";

// The scene a template plays once between a game and its win (motion.winIntro in theme.json,
// winIntro.css): over the whole document, sized on its own box (cqmin), so the same scene fits
// a phone and a desktop. The win is already decided and recorded by then, and the page is
// already there underneath: the scene only holds it back.
//
//   playing    the scene runs, the page under it is held: its entrances paused (.xp-transition,
//              data-xp-held), out of reach, and its sound and confetti waiting (useWinHold)
//   released   `handoff` seconds in, the page starts under the scene's last moments
//   gone       at `seconds`, or as soon as the player skips it
//
// A journey that arrives on the win plays it, and so does the Studio's preview each time it
// opens on the Win screen (previewWinIntro); no other forced screen does (a fixture, the sweep
// of "Check all sizes"). Never with reduced motion, nor when the brand turned it (or all
// animation) off.

const SCENES: Readonly<Record<WinIntroScene, ComponentType<SceneProps>>> = {
  comic: ComicScene,
  pixel: PixelScene,
  jackpot: JackpotScene,
  show: ShowScene,
};

type Stage = "playing" | "released" | "gone";

const WinHoldContext = createContext(false);
export const WinHoldProvider = WinHoldContext.Provider;

// True while the scene plays: the win page keeps its sound and confetti for when it shows.
export function useWinHold(): boolean {
  return useContext(WinHoldContext);
}

export function useWinIntro({
  intro,
  serial,
}: {
  intro: ThemeWinIntro | null; // null: nothing to play here
  serial: number; // one per change of screen: a new win is a new scene
}): { stage: Stage; skip: () => void } {
  const [ended, setEnded] = useState({ serial: -1, stage: "playing" as Stage });
  const stage = !intro
    ? "gone"
    : ended.serial === serial
      ? ended.stage
      : "playing";
  const seconds = intro?.seconds;
  const handoff = intro?.handoff;

  useEffect(() => {
    if (seconds === undefined || handoff === undefined) return;
    // A scene skipped is over: its timers never bring it back.
    const reach = (next: Stage) => () =>
      setEnded((before) =>
        before.serial === serial && before.stage === "gone"
          ? before
          : { serial, stage: next },
      );
    const release = setTimeout(reach("released"), handoff * 1000);
    const end = setTimeout(reach("gone"), seconds * 1000);
    return () => {
      clearTimeout(release);
      clearTimeout(end);
    };
  }, [seconds, handoff, serial]);

  return { stage, skip: () => setEnded({ serial, stage: "gone" }) };
}

// The pictures and fonts of the scene, fetched ahead: a win must not open on empty boxes.
export function useWinIntroPreload(
  intro: ThemeWinIntro | null,
  art: Readonly<Record<string, string>>,
): void {
  useEffect(() => {
    if (!intro) return;
    for (const url of Object.values(art)) new Image().src = url;
    for (const family of [intro.font, intro.fontUi]) {
      if (family) void document.fonts?.load(`1em "${family}"`);
    }
  }, [intro, art]);
}

export function WinIntro({
  intro,
  art,
  released,
  skipLabel,
  onSkip,
}: {
  intro: ThemeWinIntro;
  art: Readonly<Record<string, string>>;
  released: boolean;
  skipLabel: string;
  onSkip: () => void;
}) {
  const Scene = SCENES[intro.scene];
  return (
    <div
      className="xp-intro"
      data-xp-scene={intro.scene}
      data-xp-released={released ? "" : undefined}
      dir="ltr" // a scene's places are its own, in any language
    >
      <div aria-hidden className="xp-intro-scene">
        <Scene art={art} />
      </div>
      {!released && (
        <button
          type="button"
          dir="auto"
          className="xp-intro-skip"
          onClick={onSkip}
        >
          {skipLabel}
        </button>
      )}
    </div>
  );
}
