import React, { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AkteraBrandPreset } from "../aktera-presets";
import { AkteraLang, AKTERA_I18N } from "../aktera-i18n";
import { playScratch, playWin, playClick } from "../aktera-audio";
import { Sparkles, Eye } from "lucide-react";

interface AkteraScratchEngineProps {
  preset: AkteraBrandPreset;
  lang: AkteraLang;
  isLight?: boolean;
  onWin: (prizeName: string, prizeVal: string) => void;
}

export const AkteraScratchEngine: React.FC<AkteraScratchEngineProps> = ({
  preset,
  lang,
  isLight = false,
  onWin,
}) => {
  const [isRevealed, setIsRevealed] = useState(false);
  const [percentScratched, setPercentScratched] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawing = useRef(false);
  const lastPos = useRef<{ x: number; y: number } | null>(null);

  const t = AKTERA_I18N[lang];
  const targetPrize = preset.prizes[0] || {
    nameFr: "Bon d'Achat 10 000 DZD",
    nameAr: "قسيمة شراء 10,000 دج",
    nameEn: "10,000 DZD Voucher",
    value: "10 000 DA",
  };

  const prizeTitle =
    lang === "ar"
      ? targetPrize.nameAr
      : lang === "en"
        ? targetPrize.nameEn
        : targetPrize.nameFr;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d", { willReadFrequently: true });
    if (!ctx) return;

    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * 2;
    canvas.height = rect.height * 2;
    ctx.scale(2, 2);

    // Realistic silver foil background
    const foilGradient = ctx.createLinearGradient(
      0,
      0,
      rect.width,
      rect.height,
    );
    foilGradient.addColorStop(0, "#94A3B8");
    foilGradient.addColorStop(0.25, "#E2E8F0");
    foilGradient.addColorStop(0.5, "#CBD5E1");
    foilGradient.addColorStop(0.75, "#F1F5F9");
    foilGradient.addColorStop(1, "#64748B");

    ctx.fillStyle = foilGradient;
    ctx.fillRect(0, 0, rect.width, rect.height);

    // Decorative texture hatch pattern
    ctx.strokeStyle = "rgba(255,255,255,0.25)";
    ctx.lineWidth = 1;
    for (let i = -rect.height; i < rect.width; i += 12) {
      ctx.beginPath();
      ctx.moveTo(i, 0);
      ctx.lineTo(i + rect.height, rect.height);
      ctx.stroke();
    }

    // Centered foil instructions badge
    ctx.fillStyle = "#0F172A";
    ctx.font = "bold 13px 'Plus Jakarta Sans', sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.shadowColor = "rgba(255,255,255,0.6)";
    ctx.shadowBlur = 4;
    ctx.fillText(
      "✨ GRATTEZ ICI / امسح هنا ✨",
      rect.width / 2,
      rect.height / 2,
    );
    ctx.shadowBlur = 0;
  }, [preset]);

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
    playScratch();
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
    ctx.lineWidth = 36;
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
    const totalPixels = pixels.length / 4;

    for (let i = 3; i < pixels.length; i += 16) {
      if (pixels[i] < 20) transparent++;
    }

    const sampledTotal = Math.ceil(totalPixels / 4);
    const percent = Math.min(
      100,
      Math.round((transparent / sampledTotal) * 100),
    );
    setPercentScratched(percent);

    if (percent > 48 && !isRevealed) {
      triggerReveal();
    }
  };

  const triggerReveal = () => {
    setIsRevealed(true);
    setPercentScratched(100);
    playWin();
    setTimeout(() => {
      onWin(prizeTitle, targetPrize.value);
    }, 1600);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center py-1">
      {/* Scratch Container Card */}
      <div
        className={`relative w-full max-w-[280px] aspect-[16/10] rounded-2xl overflow-hidden shadow-2xl border-2 transition-colors ${
          isLight
            ? "border-slate-300 bg-slate-100"
            : "border-slate-700 bg-slate-950"
        }`}
      >
        {/* Revealed Prize Layer Underneath */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center p-3 text-center"
          style={{
            background: isLight
              ? `radial-gradient(circle, ${preset.secondaryColor} 20%, #F8FAFC 100%)`
              : `radial-gradient(circle, ${preset.secondaryColor} 20%, #030712 100%)`,
          }}
        >
          <motion.div
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            className="flex flex-col items-center"
          >
            <div
              className="w-12 h-12 rounded-full flex items-center justify-center text-2xl mb-1 shadow-lg border"
              style={{
                background: `${preset.primaryColor}20`,
                borderColor: preset.primaryColor,
              }}
            >
              🎁
            </div>
            <span className="text-[10px] uppercase font-bold tracking-wider text-amber-500">
              GAGNÉ / مبروك عليك
            </span>
            <p
              className={`text-xs font-black mt-0.5 line-clamp-1 ${isLight ? "text-slate-900" : "text-white"}`}
            >
              {prizeTitle}
            </p>
            <span
              className="text-xs font-extrabold px-2 py-0.5 rounded-full mt-1 text-black font-mono shadow"
              style={{ background: preset.primaryColor }}
            >
              {targetPrize.value}
            </span>
          </motion.div>
        </div>

        {/* Scratchable Canvas Layer */}
        <AnimatePresence>
          {!isRevealed && (
            <motion.canvas
              ref={canvasRef}
              exit={{ opacity: 0, scale: 1.05 }}
              transition={{ duration: 0.5 }}
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

      {/* Progress & Quick Reveal Action */}
      <div className="w-full max-w-[280px] flex items-center justify-between mt-2.5 px-1">
        <span
          className={`text-[11px] font-bold ${isLight ? "text-slate-600" : "text-slate-400"}`}
        >
          {t.games.scratch.revealed}:{" "}
          <span className="text-amber-500 font-mono font-black">
            {percentScratched}%
          </span>
        </span>

        {!isRevealed && (
          <button
            onClick={() => {
              playClick();
              triggerReveal();
            }}
            className={`flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-md border transition-colors cursor-pointer ${
              isLight
                ? "bg-white hover:bg-slate-100 text-slate-800 border-slate-300 shadow-sm"
                : "bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700"
            }`}
          >
            <Eye className="w-3 h-3 text-amber-500" />
            <span>{t.games.scratch.instantReveal}</span>
          </button>
        )}
      </div>

      <p
        className={`mt-2 text-[10px] font-medium text-center ${isLight ? "text-slate-500" : "text-slate-400"}`}
      >
        {t.games.scratch.instruction}
      </p>
    </div>
  );
};
