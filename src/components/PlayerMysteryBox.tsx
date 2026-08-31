import React, { useState } from "react";
import { BrandPreset } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { Gift, Sparkles, Frown, PartyPopper } from "lucide-react";

interface PlayerMysteryBoxProps {
  activeBrand: BrandPreset | null;
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

    try {
      const outcome = await onBoxSelect(index);
      if (outcome && outcome.boxes) {
        setBoxesData(outcome.boxes);
        setTimeout(() => onComplete(), 2800);
      } else {
        // Fallback demo reveal
        const fallbackBoxes = [0, 1, 2].map((i) => ({
          index: i,
          content: i === index ? "win" : "lose",
          prize: { name: "Special Reward" },
        }));
        setBoxesData(fallbackBoxes);
        setTimeout(() => onComplete(), 2800);
      }
    } catch {
      setSubmitting(false);
      setSelectedBox(null);
    }
  };

  const primaryColor = activeBrand?.primaryColor || "#6366F1";

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center w-full min-h-full">
      <motion.div
        initial={{ opacity: 0, y: 15 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm flex flex-col items-center"
      >
        <div className="flex items-center gap-2 mb-2">
          <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
          <h2 className="text-2xl sm:text-3xl font-black text-white drop-shadow-md">
            Mystery Boxes
          </h2>
          <Sparkles className="w-5 h-5 text-amber-400 animate-pulse" />
        </div>
        <p className="text-xs sm:text-sm text-zinc-400 mb-8 font-medium">
          {selectedBox === null
            ? "Pick 1 lucky box to reveal your instant surprise!"
            : submitting && boxesData === null
              ? "Opening your box..."
              : "Here is what was inside!"}
        </p>

        {/* 3 Interactive Boxes */}
        <div className="grid grid-cols-3 gap-3.5 w-full">
          {[0, 1, 2].map((index) => {
            const isSelected = selectedBox === index;
            const isRevealed = boxesData !== null;
            const boxData =
              boxesData?.find((b) => b.index === index) || boxesData?.[index];
            const isWin = boxData?.content === "win" || boxData?.is_win;
            const prizeName =
              boxData?.prize?.name ||
              boxData?.prize?.prize_name ||
              boxData?.prize_name ||
              "Surprise Prize";

            return (
              <motion.div
                key={index}
                whileHover={selectedBox === null ? { scale: 1.05, y: -4 } : {}}
                whileTap={selectedBox === null ? { scale: 0.95 } : {}}
                animate={
                  isSelected && submitting && !isRevealed
                    ? {
                        rotate: [-3, 3, -3, 3, 0],
                        transition: { repeat: Infinity, duration: 0.3 },
                      }
                    : {}
                }
                onClick={() => handleClick(index)}
                className={`relative aspect-[3/4] rounded-2xl flex flex-col items-center justify-center p-3 cursor-pointer transition-all border-2 select-none overflow-hidden ${
                  isSelected
                    ? "border-amber-400 shadow-xl shadow-amber-500/20 z-10"
                    : "border-white/10"
                } ${isRevealed && !isSelected ? "opacity-40 scale-95" : ""}`}
                style={{
                  background: isRevealed
                    ? isWin
                      ? "linear-gradient(145deg, #064e3b 0%, #022c22 100%)"
                      : "linear-gradient(145deg, #1f2937 0%, #111827 100%)"
                    : `linear-gradient(145deg, ${primaryColor}dd 0%, #0F0F1A 120%)`,
                }}
              >
                {/* Box Number Tag */}
                <span className="absolute top-2 left-2 text-[10px] font-mono font-bold text-white/50 bg-black/30 px-1.5 py-0.5 rounded">
                  #{index + 1}
                </span>

                {!isRevealed ? (
                  <div className="flex flex-col items-center justify-center gap-2">
                    <motion.div
                      animate={{
                        y: isSelected ? [0, -6, 0] : [0, -3, 0],
                      }}
                      transition={{
                        repeat: Infinity,
                        duration: isSelected ? 0.6 : 2,
                        delay: index * 0.2,
                      }}
                    >
                      <Gift className="w-10 h-10 text-white drop-shadow-md" />
                    </motion.div>
                    <span className="text-xs font-black tracking-wider text-white/80 uppercase">
                      {isSelected && submitting ? "..." : "TAP"}
                    </span>
                  </div>
                ) : (
                  <AnimatePresence>
                    <motion.div
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ type: "spring", bounce: 0.5 }}
                      className="flex flex-col items-center justify-center gap-1.5 text-center"
                    >
                      {isWin ? (
                        <>
                          <div className="w-8 h-8 rounded-full bg-emerald-500/20 flex items-center justify-center">
                            <PartyPopper className="w-4 h-4 text-emerald-400" />
                          </div>
                          <span className="text-[11px] font-black text-emerald-400 leading-tight line-clamp-2">
                            {prizeName}
                          </span>
                        </>
                      ) : (
                        <>
                          <div className="w-8 h-8 rounded-full bg-zinc-800 flex items-center justify-center">
                            <Frown className="w-4 h-4 text-zinc-400" />
                          </div>
                          <span className="text-[10px] font-bold text-zinc-400">
                            Empty
                          </span>
                        </>
                      )}
                    </motion.div>
                  </AnimatePresence>
                )}
              </motion.div>
            );
          })}
        </div>

        {/* Status prompt */}
        <motion.p
          animate={{ opacity: [0.6, 1, 0.6] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mt-8 text-xs font-bold text-zinc-500 uppercase tracking-widest"
        >
          {selectedBox === null ? "Choose wisely" : "Locking in selection..."}
        </motion.p>
      </motion.div>
    </div>
  );
};
