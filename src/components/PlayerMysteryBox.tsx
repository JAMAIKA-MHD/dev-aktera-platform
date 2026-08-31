import React, { useState } from "react";
import { BrandPreset } from "../types";

interface PlayerMysteryBoxProps {
  activeBrand: BrandPreset;
  onBoxSelect: (index: number) => Promise<any>;
  onComplete: () => void;
}

export const PlayerMysteryBox: React.FC<PlayerMysteryBoxProps> = ({
  activeBrand,
  onBoxSelect,
  onComplete,
}) => {
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [boxesData, setBoxesData] = useState<any[] | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleClick = async (index: number) => {
    if (selectedBox !== null || submitting) return;
    setSubmitting(true);
    setSelectedBox(index);
    const outcome = await onBoxSelect(index);
    if (outcome && outcome.boxes) {
      setBoxesData(outcome.boxes);
      setTimeout(() => onComplete(), 3000);
    } else {
      // Error occurred
      setSubmitting(false);
      setSelectedBox(null);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6 text-center bg-zinc-950 text-white w-full">
      <h2 className="text-2xl font-black mb-6">Pick a Mystery Box!</h2>
      <div className="flex flex-col gap-4 w-full max-w-xs">
        {[0, 1, 2].map((index) => {
          const isSelected = selectedBox === index;
          const isRevealed = boxesData !== null;
          const boxData = boxesData?.[index];

          return (
            <div
              key={index}
              onClick={() => handleClick(index)}
              className={`p-6 rounded-xl flex items-center justify-center cursor-pointer border-2 transition-all ${
                isSelected ? "scale-105 shadow-2xl z-10" : ""
              } ${isRevealed && !isSelected ? "opacity-50 scale-95" : ""}`}
              style={{
                backgroundColor: isRevealed
                  ? boxData?.is_win
                    ? activeBrand.primaryColor
                    : "#27272a"
                  : activeBrand.primaryColor,
                borderColor: isSelected ? "white" : "transparent",
              }}
            >
              {!isRevealed ? (
                <span className="text-2xl font-bold">
                  {submitting && isSelected ? "..." : "?"}
                </span>
              ) : (
                <span className="text-xl font-bold">
                  {boxData?.is_win ? boxData.prize_name : "Empty"}
                </span>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
