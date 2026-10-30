import { vars, type SceneProps } from "./scene";

// The game-show win (show.css): the marquee asks who won, the crowd claps, the host walks in
// and hands the trophy over, and it flies to the camera. The crowd has its back to us.

const FRONT_ROW = [
  { left: -3, image: 1, delay: 0.5, bottom: -3 },
  { left: 17, image: 2, delay: 0.9, bottom: -2 },
  { left: 37, image: 3, delay: 0.7, bottom: -4 },
  { left: 57, image: 1, delay: 1.2, bottom: -2 },
  { left: 77, image: 2, delay: 0.6, bottom: -3 },
];
const BACK_ROW = [
  { left: 8, image: 3, delay: 1.1 },
  { left: 30, image: 1, delay: 1.5 },
  { left: 52, image: 2, delay: 1.3 },
  { left: 73, image: 3, delay: 1.8 },
];

const CONFETTI = Array.from({ length: 18 }, (_, index) => ({
  x: (index % 2 ? 1 : -1) * (4 + ((index * 17) % 42)),
  y: 5 + ((index * 11) % 24),
  turn: ((index * 83) % 360) - 180,
  at: 6.3 + (index % 6) * 0.1,
}));

function Clapper({
  url,
  left,
  bottom,
  delay,
  row,
}: {
  url: string | undefined;
  left: number;
  bottom?: number;
  delay: number;
  row: "front" | "back";
}) {
  return (
    <div
      className="xp-s-person"
      data-xp-row={row}
      style={{
        left: `${left}%`,
        ...vars({
          delay: `${delay}s`,
          ...(bottom === undefined ? {} : { bottom: `${bottom}cqmin` }),
        }),
      }}
    >
      <div className="xp-s-person-bob">
        <div className="xp-s-person-frame">
          <img src={url} alt="" />
        </div>
      </div>
    </div>
  );
}

export function ShowScene({ art }: SceneProps) {
  return (
    <>
      <div className="xp-s-stage">
        <img src={art["stage-scene"]} alt="" />
        <div className="xp-s-marquee">
          <p className="xp-s-question">LE GAGNANT EST…</p>
          <p className="xp-s-mystery">?</p>
          <p className="xp-s-reveal">C'EST VOUS !</p>
        </div>
        {CONFETTI.map(({ x, y, turn, at }, index) => (
          <span
            key={index}
            className="xp-s-confetti"
            style={vars({
              x: `${x}cqmin`,
              y: `${-y}cqmin`,
              turn: `${turn}deg`,
              at: `${at}s`,
            })}
          />
        ))}
      </div>
      <span className="xp-s-spot" data-xp-side="left" />
      <span className="xp-s-spot" data-xp-side="right" />
      <div className="xp-s-host">
        <img src={art.host} alt="" />
      </div>
      {BACK_ROW.map(({ left, image, delay }) => (
        <Clapper
          key={left}
          url={art[`audience-${image}`]}
          left={left}
          delay={delay}
          row="back"
        />
      ))}
      {FRONT_ROW.map(({ left, image, delay, bottom }) => (
        <Clapper
          key={left}
          url={art[`audience-${image}`]}
          left={left}
          bottom={bottom}
          delay={delay}
          row="front"
        />
      ))}
      <div className="xp-s-rays">
        <span />
      </div>
      <div className="xp-s-trophy">
        <span className="xp-s-trophy-glow" />
        <img src={art.trophy} alt="" />
      </div>
      <span className="xp-intro-flash xp-s-flash" />
    </>
  );
}
