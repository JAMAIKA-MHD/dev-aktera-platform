import React, { useState, useRef } from "react";
import { motion } from "motion/react";
import { AkteraBrandPreset } from "../aktera-presets";
import { AkteraLang, AKTERA_I18N } from "../aktera-i18n";
import { playTick, playWin, playClick } from "../aktera-audio";
import { Sparkles } from "lucide-react";

interface AkteraWheelEngineProps {
  preset: AkteraBrandPreset;
  lang: AkteraLang;
  isLight?: boolean;
  onWin: (prizeName: string, prizeVal: string) => void;
}

export const AkteraWheelEngine: React.FC<AkteraWheelEngineProps> = ({
  preset,
  lang,
  isLight = false,
  onWin,
}) => {
  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winnerLabel, setWinnerLabel] = useState<string | null>(null);
  const audioIntervalRef = useRef<number | null>(null);

  const t = AKTERA_I18N[lang];
  const slices =
    preset.prizes.length > 0
      ? preset.prizes
      : [
          {
            id: "1",
            nameFr: "VIP Pass",
            nameAr: "بطاقة VIP",
            nameEn: "VIP Pass",
            icon: "👑",
            isWin: true,
            color: preset.primaryColor,
            value: "VIP",
          },
          {
            id: "2",
            nameFr: "Bon 5000 DA",
            nameAr: "قسيمة 5000 دج",
            nameEn: "5000 DZD Voucher",
            icon: "🎁",
            isWin: true,
            color: preset.accentColor,
            value: "5000 DA",
          },
          {
            id: "3",
            nameFr: "Recharge 2000 DA",
            nameAr: "رصيد 2000 دج",
            nameEn: "2000 DZD Topup",
            icon: "⚡",
            isWin: true,
            color: "#10B981",
            value: "2000 DA",
          },
          {
            id: "4",
            nameFr: "Chance suivante",
            nameAr: "حظ أوفر",
            nameEn: "Try Again",
            icon: "🌙",
            isWin: false,
            color: "#475569",
            value: "0 DA",
          },
        ];

  const totalSlices = slices.length;
  const sliceAngle = 360 / totalSlices;

  const handleSpin = () => {
    if (isSpinning) return;
    playClick();
    setIsSpinning(true);
    setWinnerLabel(null);

    // Pick a winning index (favoring win slices)
    const winningIndex = 0; // First slice is top reward
    const extraSpins = 5 + Math.floor(Math.random() * 3); // 5 to 7 full rotations
    const targetAngle =
      360 * extraSpins + (360 - (winningIndex * sliceAngle + sliceAngle / 2));

    let tickCount = 0;
    audioIntervalRef.current = window.setInterval(() => {
      tickCount++;
      if (tickCount % 2 === 0) playTick();
    }, 90);

    setRotation((prev) => prev + targetAngle);

    setTimeout(() => {
      if (audioIntervalRef.current) clearInterval(audioIntervalRef.current);
      setIsSpinning(false);
      playWin();
      const wonPrize = slices[winningIndex];
      const name =
        lang === "ar"
          ? wonPrize.nameAr
          : lang === "en"
            ? wonPrize.nameEn
            : wonPrize.nameFr;
      setWinnerLabel(name);
      setTimeout(() => {
        onWin(name, wonPrize.value);
      }, 1500);
    }, 4000);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center relative py-2">
      {/* Dynamic Wheel Container */}
      <div className="relative w-64 h-64 sm:w-72 sm:h-72 flex items-center justify-center">
        {/* Outer Glow Halo */}
        <div
          className="absolute inset-0 rounded-full blur-xl opacity-40 animate-pulse pointer-events-none"
          style={{ background: preset.primaryColor }}
        />

        {/* Outer Bezel Rim */}
        <div
          className="w-full h-full rounded-full border-4 shadow-2xl relative overflow-hidden flex items-center justify-center p-2"
          style={{
            borderColor: preset.primaryColor,
            background: `radial-gradient(circle, ${preset.secondaryColor} 40%, #000 100%)`,
          }}
        >
          {/* Rotating Wheel Disk */}
          <motion.div
            animate={{ rotate: rotation }}
            transition={{ duration: 4, ease: [0.15, 0.9, 0.2, 1] }}
            className="w-full h-full rounded-full relative overflow-hidden"
          >
            <svg viewBox="0 0 100 100" className="w-full h-full -rotate-90">
              {slices.map((slice, idx) => {
                const startAngle = idx * sliceAngle;
                const endAngle = startAngle + sliceAngle;
                const startRad = (startAngle * Math.PI) / 180;
                const endRad = (endAngle * Math.PI) / 180;

                const x1 = 50 + 50 * Math.cos(startRad);
                const y1 = 50 + 50 * Math.sin(startRad);
                const x2 = 50 + 50 * Math.cos(endRad);
                const y2 = 50 + 50 * Math.sin(endRad);

                const pathData = `M 50 50 L ${x1} ${y1} A 50 50 0 0 1 ${x2} ${y2} Z`;

                const midAngle = startAngle + sliceAngle / 2;
                const midRad = (midAngle * Math.PI) / 180;
                const iconX = 50 + 32 * Math.cos(midRad);
                const iconY = 50 + 32 * Math.sin(midRad);

                const sliceBg =
                  idx % 2 === 0
                    ? preset.primaryColor
                    : idx % 3 === 0
                      ? preset.accentColor
                      : preset.secondaryColor;

                return (
                  <g key={slice.id}>
                    <path
                      d={pathData}
                      fill={sliceBg}
                      stroke="#0F172A"
                      strokeWidth="0.75"
                    />
                    <text
                      x={iconX}
                      y={iconY}
                      fontSize="7"
                      textAnchor="middle"
                      dominantBaseline="middle"
                      transform={`rotate(${midAngle + 90}, ${iconX}, ${iconY})`}
                    >
                      {slice.icon}
                    </text>
                  </g>
                );
              })}
            </svg>
          </motion.div>

          {/* Center Pin & Spin Trigger Button */}
          <button
            onClick={handleSpin}
            disabled={isSpinning}
            className="absolute z-20 w-16 h-16 rounded-full shadow-2xl flex flex-col items-center justify-center text-white font-extrabold text-[11px] tracking-wider uppercase border-2 transition-transform active:scale-95 hover:scale-105 cursor-pointer disabled:cursor-not-allowed"
            style={{
              background: `linear-gradient(135deg, ${preset.primaryColor}, #000)`,
              borderColor: "#FFFFFF",
              boxShadow: `0 0 20px ${preset.primaryColor}80`,
            }}
          >
            <Sparkles className="w-3.5 h-3.5 mb-0.5 text-white animate-spin" />
            <span>
              {isSpinning ? t.games.wheel.spinning : t.games.wheel.spinBtn}
            </span>
          </button>
        </div>

        {/* Top Indicator Needle */}
        <div className="absolute -top-3 z-30 flex flex-col items-center pointer-events-none">
          <div
            className="w-0 h-0 border-l-[10px] border-l-transparent border-r-[10px] border-r-transparent border-t-[18px] drop-shadow-md"
            style={{ borderTopColor: "#FFFFFF" }}
          />
        </div>
      </div>

      {/* Instruction / Winner Banner */}
      {winnerLabel ? (
        <motion.div
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          className="mt-3 px-4 py-1.5 rounded-full text-xs font-bold text-black flex items-center gap-1.5 shadow-lg"
          style={{ background: preset.primaryColor }}
        >
          <span>🎉 {winnerLabel}</span>
        </motion.div>
      ) : (
        <p className="mt-3 text-[11px] font-medium text-slate-400 text-center">
          {t.games.wheel.instruction}
        </p>
      )}
    </div>
  );
};
