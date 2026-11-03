import { vars, type SceneProps } from "./scene";

// The 8-bit win (pixel.css): a "?" block counting down from 3, an explosion, a trophy, coins,
// fireworks and the iris closing on the level. Everything moves in steps().

const SPARKLES = [
  [8, 14],
  [22, 62],
  [14, 38],
  [34, 10],
  [64, 8],
  [78, 26],
  [90, 12],
  [86, 56],
  [70, 70],
  [6, 74],
];

// Offsets from the middle in cqmin, and when each one goes off.
const EXPLOSIONS = [
  { size: 140, x: 0, y: 0, at: 4, run: 1.2 },
  { size: 90, x: -26, y: 14, at: 4.15, run: 1.2 },
  { size: 90, x: 28, y: -12, at: 4.3, run: 1.2 },
  { size: 40, x: -30, y: -24, at: 6, run: 0.9 },
  { size: 40, x: 32, y: -18, at: 6.5, run: 0.9 },
  { size: 44, x: 0, y: -34, at: 7, run: 0.9 },
];

const DEBRIS = [
  [-62, -40],
  [-44, -66],
  [-18, -70],
  [16, -68],
  [46, -60],
  [66, -34],
  [70, 10],
  [50, 44],
  [20, 60],
  [-22, 62],
  [-52, 40],
  [-70, 6],
];

const COIN_DRIFT = [-34, 22, -12, 30, -26, 8, 34, -20, 14, -30];

export function PixelScene({ art }: SceneProps) {
  return (
    <>
      <div className="xp-p-sky" />
      <div className="xp-p-rays">
        <span />
      </div>
      <div className="xp-p-shake">
        <div className="xp-p-ground" />
        {SPARKLES.map(([left, top], index) => (
          <img
            key={index}
            className="xp-p-sparkle"
            src={art.sparkle}
            alt=""
            style={{
              left: `${left}%`,
              top: `${top}%`,
              ...vars({ delay: `${-0.17 * index}s` }),
            }}
          />
        ))}
        <p className="xp-p-ready">PRÊT ?</p>
        <div className="xp-p-block">
          <img src={art["question-block"]} alt="" />
        </div>
        <p className="xp-p-count xp-p-count-3">3</p>
        <p className="xp-p-count xp-p-count-2">2</p>
        <p className="xp-p-count xp-p-count-1">1</p>
        {EXPLOSIONS.map(({ size, x, y, at, run }) => (
          <div
            key={at}
            className="xp-p-explosion"
            style={vars({
              size: `${size}cqmin`,
              x: `${x}cqmin`,
              y: `${y}cqmin`,
              at: `${at}s`,
              run: `${run}s`,
            })}
          >
            <img src={art["explosion-sprite"]} alt="" />
          </div>
        ))}
        {DEBRIS.map(([x, y], index) => (
          <span
            key={index}
            className="xp-p-debris"
            style={vars({ x: `${x}cqmin`, y: `${y}cqmin` })}
          />
        ))}
        <div className="xp-p-trophy">
          <img src={art.trophy} alt="" />
        </div>
        {COIN_DRIFT.map((drift, index) => (
          <div
            key={index}
            className="xp-p-coin"
            style={vars({ drift: `${drift}cqmin`, at: `${5 + index * 0.2}s` })}
          >
            <img src={art.coin} alt="" />
          </div>
        ))}
        <p className="xp-p-banner">
          NIVEAU
          <br />
          TERMINÉ !
        </p>
      </div>
      <span className="xp-intro-flash xp-p-flash" />
      <div className="xp-p-scanlines" />
    </>
  );
}
