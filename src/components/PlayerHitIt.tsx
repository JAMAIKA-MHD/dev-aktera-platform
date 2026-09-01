import React, { useState, useEffect, useRef } from "react";
import { BrandPreset } from "../types";
import { motion } from "motion/react";
import { Zap, Timer, Flame, Trophy } from "lucide-react";

interface PlayerHitItProps {
  activeBrand: BrandPreset | null;
  winThreshold: number;
  onGameEnd?: (hits: number) => Promise<void>;
  onComplete: () => void;
}

export const PlayerHitIt: React.FC<PlayerHitItProps> = ({
  activeBrand,
  winThreshold,
  onGameEnd,
  onComplete,
}) => {
  const [hits, setHits] = useState(0);
  const [timeLeft, setTimeLeft] = useState(10);
  const [playing, setPlaying] = useState(false);
  const [finished, setFinished] = useState(false);
  const [targetPos, setTargetPos] = useState({ x: 50, y: 50 });
  const [isHitAnim, setIsHitAnim] = useState(false);
  const moveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const primaryColor = activeBrand?.primaryColor || "#EF4444";
  const effectiveWinThreshold = Math.max(1, winThreshold || 6);

  const randomPosition = () => {
    // Generate position bounded between 15% and 85% to stay inside frame
    const newX = Math.floor(15 + Math.random() * 70);
    const newY = Math.floor(15 + Math.random() * 70);
    setTargetPos({ x: newX, y: newY });
  };

  const startGame = () => {
    setHits(0);
    setTimeLeft(10);
    setPlaying(true);
    setFinished(false);
    randomPosition();
  };

  // Target jumps every 900ms if not hit
  useEffect(() => {
    if (playing) {
      moveTimerRef.current = setInterval(() => {
        randomPosition();
      }, 950);
      return () => {
        if (moveTimerRef.current) clearInterval(moveTimerRef.current);
      };
    }
  }, [playing]);

  // Main countdown timer
  useEffect(() => {
    if (playing && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
      return () => clearTimeout(timer);
    } else if (playing && timeLeft === 0) {
      setPlaying(false);
      setFinished(true);
      if (moveTimerRef.current) clearInterval(moveTimerRef.current);

      if (onGameEnd) {
        onGameEnd(hits).then(() => {
          setTimeout(() => onComplete(), 2000);
        });
      } else {
        setTimeout(() => onComplete(), 2000);
      }
    }
  }, [playing, timeLeft, hits, onGameEnd, onComplete]);

  const handleTargetHit = () => {
    if (!playing) return;
    setHits((prev) => prev + 1);
    setIsHitAnim(true);
    setTimeout(() => setIsHitAnim(false), 200);
    randomPosition();
  };

  const hitPercentage = Math.min(
    100,
    Math.round((hits / effectiveWinThreshold) * 100),
  );

  return (
    <div className="flex-1 flex flex-col items-center justify-between p-5 text-center w-full min-h-full select-none">
      {/* Header bar */}
      <div className="w-full flex flex-col items-center gap-2 pt-2">
        <div className="flex items-center justify-between w-full px-2">
          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-xs font-mono font-bold text-white">
            <Timer className="w-3.5 h-3.5 text-amber-400" />
            <span>{timeLeft}s</span>
          </div>

          <div className="flex items-center gap-1.5 bg-white/10 px-3 py-1.5 rounded-full text-xs font-mono font-bold text-white">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>
              {hits} / {effectiveWinThreshold} Hits
            </span>
          </div>
        </div>

        {/* Progress Bar towards Win Threshold */}
        <div className="w-full bg-white/10 h-2 rounded-full overflow-hidden mt-1">
          <motion.div
            className="h-full rounded-full transition-all duration-200"
            style={{
              width: `${hitPercentage}%`,
              backgroundColor:
                hits >= effectiveWinThreshold ? "#10B981" : primaryColor,
            }}
          />
        </div>
      </div>

      {/* Main Play Area */}
      <div className="relative flex-1 w-full my-4 rounded-3xl bg-slate-900/60 border border-white/10 overflow-hidden flex items-center justify-center">
        {!playing && !finished && (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-4 p-6"
          >
            <div
              className="w-16 h-16 rounded-full flex items-center justify-center shadow-lg"
              style={{
                backgroundColor: `${primaryColor}30`,
                border: `2px solid ${primaryColor}`,
              }}
            >
              <Zap className="w-8 h-8" style={{ color: primaryColor }} />
            </div>
            <div>
              <h3 className="text-xl font-black text-white">Hit It Quick!</h3>
              <p className="text-xs text-zinc-400 mt-1 max-w-[220px]">
                Tap the moving lightning bolt at least {effectiveWinThreshold}{" "}
                times before the timer runs out!
              </p>
            </div>

            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={startGame}
              className="px-8 py-3.5 rounded-2xl font-black text-sm text-white shadow-xl cursor-pointer mt-2"
              style={{ backgroundColor: primaryColor }}
            >
              START CHALLENGE
            </motion.button>
          </motion.div>
        )}

        {playing && (
          <motion.button
            type="button"
            onPointerDown={handleTargetHit}
            animate={{
              left: `${targetPos.x}%`,
              top: `${targetPos.y}%`,
              scale: isHitAnim ? 1.3 : 1,
            }}
            transition={{ type: "spring", stiffness: 400, damping: 25 }}
            className="absolute -translate-x-1/2 -translate-y-1/2 w-20 h-20 rounded-full flex flex-col items-center justify-center cursor-pointer shadow-2xl border-4 border-white active:scale-90"
            style={{
              backgroundColor: primaryColor,
              boxShadow: `0 0 25px ${primaryColor}80`,
            }}
          >
            <Zap className="w-8 h-8 text-white fill-white" />
            <span className="text-[10px] font-black text-white tracking-widest uppercase">
              HIT!
            </span>
          </motion.button>
        )}

        {finished && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex flex-col items-center gap-3 p-6"
          >
            <Trophy
              className={`w-14 h-14 ${hits >= effectiveWinThreshold ? "text-amber-400" : "text-zinc-500"}`}
            />
            <h3 className="text-2xl font-black text-white">Time's Up!</h3>
            <p className="text-sm font-bold text-zinc-300">
              You scored <span className="text-emerald-400">{hits}</span> hits!
            </p>
            <p className="text-xs text-zinc-500 mt-2">
              Checking your reward...
            </p>
          </motion.div>
        )}
      </div>

      {/* Footer hint */}
      <p className="text-[11px] text-zinc-500 font-medium">
        {playing
          ? "Tap the target as fast as you can!"
          : "10 seconds speed challenge"}
      </p>
    </div>
  );
};
