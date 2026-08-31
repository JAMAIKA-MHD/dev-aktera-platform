import React, { useState } from "react";
import { BrandPreset, Prize } from "../types";

interface PlayerScratchProps {
  activeBrand: BrandPreset;
  targetPrize?: Prize;
  onGameComplete: () => void;
}

export const PlayerScratch: React.FC<PlayerScratchProps> = ({
  activeBrand,
  targetPrize,
  onGameComplete,
}) => {
  const [scratched, setScratched] = useState(false);

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-zinc-950 text-white">
      <h2 className="text-2xl font-black mb-6">Scratch to Win!</h2>
      <div
        className="w-64 h-64 bg-zinc-800 rounded-xl flex items-center justify-center cursor-pointer border-4 border-zinc-700 shadow-xl overflow-hidden relative"
        onClick={() => {
          if (!scratched) {
            setScratched(true);
            setTimeout(() => onGameComplete(), 2000);
          }
        }}
      >
        {!scratched ? (
          <div
            className="absolute inset-0 bg-zinc-700 flex items-center justify-center"
            style={{ backgroundColor: activeBrand.primaryColor }}
          >
            <span className="text-white font-bold opacity-80">
              CLICK TO SCRATCH
            </span>
          </div>
        ) : (
          <div className="absolute inset-0 bg-zinc-900 flex flex-col items-center justify-center p-4">
            <span className="text-2xl font-black text-white">
              {targetPrize?.isWin ? targetPrize.name : "Better luck next time!"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
};
