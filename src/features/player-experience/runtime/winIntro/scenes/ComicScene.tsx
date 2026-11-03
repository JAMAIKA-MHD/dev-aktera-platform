import { vars, type SceneProps } from "./scene";

// The comic win (comic.css): a lit fuse, BOOM!, BRAVO!, a trophy falling on a blue burst, then
// a dive into the screen. Three impacts, each with its own rings, streaks and stars.

const RINGS = [0.78, 0.95, 3.18, 3.32, 5.58, 5.74];
const STREAKS = [
  { at: 0.8, turn: 0 },
  { at: 5.6, turn: 22 },
];
const STARS = [
  { at: 0.8, count: 9, step: 40, turn: 0 },
  { at: 3.2, count: 9, step: 40, turn: 20 },
  { at: 5.6, count: 10, step: 36, turn: 8 },
];

function Burst({
  at,
  turn,
  count,
  step,
  className,
}: {
  at: number;
  turn: number;
  count: number;
  step: number;
  className: string;
}) {
  return Array.from({ length: count }, (_, index) => (
    <span
      key={index}
      className={className}
      style={vars({
        at: `${at}s`,
        angle: `${turn + index * step}deg`,
        reach: `${46 + ((index * 7) % 23)}cqmin`,
      })}
    />
  ));
}

// Three layers of the same word: a black outline, a white one inside it, the yellow-to-orange
// fill with its dots on top.
function Word({ text, className }: { text: string; className: string }) {
  return (
    <div className={`xp-c-word ${className}`}>
      <span className="xp-c-word-ink">{text}</span>
      <span className="xp-c-word-edge">{text}</span>
      <span className="xp-c-word-fill">{text}</span>
    </div>
  );
}

export function ComicScene({ art }: SceneProps) {
  return (
    <>
      <div className="xp-c-shake">
        <div className="xp-c-rays xp-c-rays-red">
          <img src={art["rays-red"]} alt="" />
        </div>
        <div className="xp-c-rays xp-c-rays-blue">
          <img src={art["rays-blue"]} alt="" />
        </div>
        <div className="xp-c-dots" />
        <span className="xp-c-fuse" />
        <div className="xp-c-burst xp-c-burst-red">
          <img src={art["burst-red"]} alt="" />
        </div>
        <div className="xp-c-burst xp-c-burst-blue">
          <img src={art["burst-blue"]} alt="" />
        </div>
        <div className="xp-c-lights">
          <span />
        </div>
        {RINGS.map((at) => (
          <span key={at} className="xp-c-ring" style={vars({ at: `${at}s` })} />
        ))}
        {STREAKS.map(({ at, turn }) => (
          <Burst
            key={at}
            at={at}
            turn={turn}
            count={8}
            step={45}
            className="xp-c-streak"
          />
        ))}
        {STARS.map((star) => (
          <Burst key={star.at} {...star} className="xp-c-star" />
        ))}
        <div className="xp-c-trophy">
          <img src={art.trophy} alt="" />
        </div>
        <Word text="BOOM !" className="xp-c-boom" />
        <Word text="BRAVO !" className="xp-c-bravo" />
        <Word text="VICTOIRE !" className="xp-c-victory" />
      </div>
      <span className="xp-intro-flash xp-c-flash" />
    </>
  );
}
