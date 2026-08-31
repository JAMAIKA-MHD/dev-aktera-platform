import React, { useState, useEffect } from "react";
import { BrandPreset } from "../types";

interface PlayerHitItProps {
  activeBrand: BrandPreset;
  winThreshold: number;
  onGameEnd: (hits: number) => Promise<void>;
  onComplete: () => void;
}

export const PlayerHitIt: React.FC<PlayerHitItProps> = ({
  activeBrand,
  winThreshold,
  onGameEnd,
  onComplete,
}) => {
  const [hits, setHits] = useState(0);
  const [timeLeft, setTimeLeft] = useState(5);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);

  const startGame = () => {
    setPlaying(true);
    setHits(0);
    setTimeLeft(5);
  };

  useEffect(() => {
    if (playing && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (playing && timeLeft === 0) {
      setPlaying(false);
      setFinished(true);
      onGameEnd(hits).then(() => {
        setTimeout(() => onComplete(), 2000);
      });
    }
  }, [playing, timeLeft, hits, onGameEnd, onComplete]);

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-zinc-950 text-white w-full">
      <h2 className="text-2xl font-black mb-2">Hit It Before It Leaves!</h2>
      <p className="text-sm text-zinc-400 mb-6">
        Get {winThreshold} hits to win.
      </p>

      {!playing && !finished && (
        <button
          onClick={startGame}
          className="px-8 py-4 rounded-xl font-bold text-lg"
          style={{ backgroundColor: activeBrand.primaryColor }}
        >
          START
        </button>
      )}

      {playing && (
        <div className="flex flex-col items-center gap-6 w-full">
          <div className="text-3xl font-black">{timeLeft}s</div>
          <div className="text-xl">Hits: {hits}</div>
          <button
            onClick={() => setHits((prev) => prev + 1)}
            className="w-32 h-32 rounded-full font-bold text-2xl active:scale-90 transition-transform"
            style={{ backgroundColor: activeBrand.primaryColor }}
          >
            HIT!
          </button>
        </div>
      )}

      {finished && (
        <div className="flex flex-col items-center gap-4">
          <div className="text-3xl font-black">Time's Up!</div>
          <div className="text-xl">Total Hits: {hits}</div>
          <div className="text-sm text-zinc-400">Submitting...</div>
        </div>
      )}
    </div>
  );
};
