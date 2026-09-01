import React, { useState, useRef, useEffect } from "react";
import { BrandPreset, Prize } from "../types";
import { motion, AnimatePresence } from "motion/react";
import { PartyPopper, Frown } from "lucide-react";

interface PlayerScratchProps {
  activeBrand: BrandPreset | null;
  targetPrize?: Prize;
  onGameComplete: () => void;
}

export const PlayerScratch: React.FC<PlayerScratchProps> = ({
  activeBrand,
  targetPrize,
  onGameComplete,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    // Set internal resolution higher for crispness
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Fill background with brand color or fallback
    const primaryColor = activeBrand?.primaryColor || "#4F46E5";
    ctx.fillStyle = primaryColor;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Draw some repeating pattern or gradient to make it look like foil
    ctx.globalCompositeOperation = "source-over";
    const gradient = ctx.createLinearGradient(0, 0, rect.width, rect.height);
    gradient.addColorStop(0, "rgba(255,255,255,0.1)");
    gradient.addColorStop(0.5, "rgba(255,255,255,0.3)");
    gradient.addColorStop(1, "rgba(255,255,255,0.1)");
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Add instructions text
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 22px sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(0,0,0,0.5)";
    ctx.shadowBlur = 4;
    ctx.fillText("SCRATCH TO REVEAL", rect.width / 2, rect.height / 2);

    // Reset shadow
    ctx.shadowBlur = 0;
  }, [activeBrand]);

  const getPointerPos = (e: React.PointerEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const handlePointerDown = (e: React.PointerEvent) => {
    if (isRevealed) return;
    const pos = getPointerPos(e);
    if (!pos) return;
    isDrawing.current = true;
    lastPos.current = pos;
    scratch(pos, pos);
  };

  const handlePointerMove = (e: React.PointerEvent) => {
    if (!isDrawing.current || isRevealed) return;
    const pos = getPointerPos(e);
    if (!pos || !lastPos.current) return;
    scratch(lastPos.current, pos);
    lastPos.current = pos;
  };

  const handlePointerUp = () => {
    isDrawing.current = false;
    lastPos.current = null;
    checkProgress();
  };

  const scratch = (
    from: { x: number; y: number },
    to: { x: number; y: number },
  ) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    ctx.globalCompositeOperation = "destination-out";
    ctx.lineWidth = 45;
    ctx.lineCap = "round";
    ctx.lineJoin = "round";

    ctx.beginPath();
    ctx.moveTo(from.x, from.y);
    ctx.lineTo(to.x, to.y);
    ctx.stroke();
  };

  const checkProgress = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const pixels = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
    let transparent = 0;

    // Check every 16th pixel to be faster (step by 4 pixels * 4 channels = 16)
    const totalPixels = pixels.length / 4;
    for (let i = 3; i < pixels.length; i += 16) {
      if (pixels[i] < 10) transparent++;
    }

    const sampledTotal = Math.ceil(totalPixels / 4);
    const percentScratched = (transparent / sampledTotal) * 100;

    if (percentScratched > 40 && !isRevealed) {
      setIsRevealed(true);
      // Wait for the fade-out animation to finish, then call complete
      setTimeout(() => onGameComplete(), 2000);
    }
  };

  const isWin = targetPrize?.isWin && targetPrize.id !== "__loser__";

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <h2 className="text-3xl font-black mb-8 text-white drop-shadow-md">
          {isRevealed ? "Here is your result!" : "Scratch & Win"}
        </h2>

        {/* The Card Container */}
        <div className="relative w-full aspect-[4/3] rounded-2xl overflow-hidden shadow-2xl border-4 border-white/20 bg-slate-900">
          {/* Result Layer (Underneath the Canvas) */}
          <div className="absolute inset-0 flex flex-col items-center justify-center p-4 bg-slate-900">
            {isWin ? (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                  scale: isRevealed ? 1 : 0.8,
                  opacity: isRevealed ? 1 : 0,
                }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 flex items-center justify-center mb-3">
                  <PartyPopper className="w-8 h-8 text-emerald-400" />
                </div>
                <h3 className="text-xl font-black text-white mb-1">You Won!</h3>
                <p className="text-sm font-bold text-emerald-400">
                  {targetPrize.name}
                </p>
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0.8, opacity: 0 }}
                animate={{
                  scale: isRevealed ? 1 : 0.8,
                  opacity: isRevealed ? 1 : 0,
                }}
                transition={{ type: "spring", bounce: 0.5 }}
                className="flex flex-col items-center"
              >
                <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center mb-3">
                  <Frown className="w-8 h-8 text-slate-400" />
                </div>
                <h3 className="text-xl font-black text-white mb-1">
                  Not this time
                </h3>
                <p className="text-sm font-bold text-slate-400">
                  Better luck next time!
                </p>
              </motion.div>
            )}
          </div>

          {/* Scratchable Canvas Layer */}
          <AnimatePresence>
            {!isRevealed && (
              <motion.canvas
                ref={canvasRef}
                exit={{ opacity: 0, scale: 1.1 }}
                transition={{ duration: 0.6, ease: "easeOut" }}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerLeave={handlePointerUp}
                className="absolute inset-0 w-full h-full touch-none cursor-pointer"
                style={{ touchAction: "none" }}
              />
            )}
          </AnimatePresence>
        </div>

        {/* Call to action text below */}
        <motion.p
          animate={{ opacity: isRevealed ? 0 : [0.5, 1, 0.5] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="mt-6 text-sm font-bold text-white/70"
        >
          Use your finger or mouse to scratch the card
        </motion.p>
      </motion.div>
    </div>
  );
};
