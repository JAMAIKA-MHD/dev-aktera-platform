import { vars, type SceneProps } from "./scene";

// The neon win (jackpot.css): Nixo pulls the lever of a slot machine, three lucky 7s, a rain of
// coins and prizes, all of them sucked into a gift box that bursts open.

const COINS = [
  [8, 4.8],
  [66, 4.9],
  [28, 5],
  [86, 5.05],
  [46, 5.15],
  [14, 5.2],
  [74, 5.3],
  [36, 5.35],
  [58, 5.45],
  [92, 5.5],
];

// In cqmin from the middle of the machine.
const PRIZES: readonly {
  name: string;
  x: number;
  y: number | string;
  at: number;
  tilt: number;
}[] = [
  { name: "coin", x: -32, y: -30, at: 5, tilt: -10 },
  { name: "trophy", x: 32, y: -26, at: 5.2, tilt: 8 },
  { name: "medal", x: -38, y: 14, at: 5.4, tilt: 6 },
  // Over the machine's top on a landscape screen, where 42 would leave the screen.
  {
    name: "crown",
    x: 0,
    y: "max(-42cqmin, calc(-46cqh + 27cqmin))",
    at: 5.6,
    tilt: -4,
  },
  { name: "gem", x: 38, y: 16, at: 5.8, tilt: -8 },
  { name: "star", x: -14, y: 38, at: 5.9, tilt: 12 },
];

export function JackpotScene({ art }: SceneProps) {
  return (
    <>
      <img className="xp-j-sky" src={art["scene-bg"]} alt="" />
      <div className="xp-j-rays">
        <span />
      </div>
      <div className="xp-j-machine">
        {[1, 2, 3].map((reel) => (
          <div key={reel} className="xp-j-reel" data-xp-reel={reel}>
            <img src={art["slot-reel-strip"]} alt="" />
          </div>
        ))}
        <img className="xp-j-cabinet" src={art["slot-machine"]} alt="" />
        <img className="xp-j-lever" src={art["slot-lever"]} alt="" />
        <div className="xp-j-nixo">
          <div className="xp-j-nixo-hop">
            <div className="xp-j-nixo-frame">
              <img src={art["nixo-sprite"]} alt="" />
            </div>
          </div>
        </div>
      </div>
      {COINS.map(([left, at]) => (
        <img
          key={at}
          className="xp-j-coin"
          src={art.coin}
          alt=""
          style={{ left: `${left}%`, ...vars({ at: `${at}s` }) }}
        />
      ))}
      {PRIZES.map(({ name, x, y, at, tilt }) => (
        <img
          key={name}
          className="xp-j-prize"
          src={art[name]}
          alt=""
          style={vars({
            x: `${x}cqmin`,
            y: typeof y === "number" ? `${y}cqmin` : y,
            at: `${at}s`,
            tilt: `${tilt}deg`,
          })}
        />
      ))}
      <div className="xp-j-glow" />
      <div className="xp-j-gift">
        <div className="xp-j-gift-shake">
          <img className="xp-j-gift-box" src={art["gift-box"]} alt="" />
          <img className="xp-j-gift-lid" src={art["gift-lid"]} alt="" />
        </div>
      </div>
      <p className="xp-j-jackpot">JACKPOT !</p>
      <p className="xp-j-all">TOUT GAGNÉ !</p>
      <div className="xp-j-scanlines" />
      <span className="xp-intro-flash xp-j-flash" />
    </>
  );
}
