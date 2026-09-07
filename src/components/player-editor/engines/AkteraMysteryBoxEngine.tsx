import React, { useState } from "react";
import { motion } from "motion/react";
import { AkteraBrandPreset } from "../aktera-presets";
import { AkteraLang, AKTERA_I18N } from "../aktera-i18n";
import { playClick, playWin } from "../aktera-audio";
import { Sparkles, Gift } from "lucide-react";

interface AkteraMysteryBoxEngineProps {
  preset: AkteraBrandPreset;
  lang: AkteraLang;
  isLight?: boolean;
  onWin: (prizeName: string, prizeVal: string) => void;
}

export const AkteraMysteryBoxEngine: React.FC<AkteraMysteryBoxEngineProps> = ({
  preset,
  lang,
  isLight = false,
  onWin,
}) => {
  const [selectedBox, setSelectedBox] = useState<number | null>(null);
  const [isOpened, setIsOpened] = useState(false);

  const t = AKTERA_I18N[lang];
  const wonPrize = preset.prizes[0] || {
    nameFr: "Coffret Cadeau Prestige",
    nameAr: "صندوق هدايا فاخر",
    nameEn: "Prestige Gift Hamper",
    value: "50 000 DA",
  };

  const prizeTitle =
    lang === "ar"
      ? wonPrize.nameAr
      : lang === "en"
        ? wonPrize.nameEn
        : wonPrize.nameFr;

  const boxes = [
    {
      id: 0,
      label: t.games.mystery.box1,
      color: preset.primaryColor,
      icon: "👑",
    },
    {
      id: 1,
      label: t.games.mystery.box2,
      color: preset.accentColor,
      icon: "💎",
    },
    { id: 2, label: t.games.mystery.box3, color: "#10B981", icon: "✨" },
  ];

  const handleSelectBox = (id: number) => {
    if (selectedBox !== null) return;
    playClick();
    setSelectedBox(id);

    setTimeout(() => {
      setIsOpened(true);
      playWin();
      setTimeout(() => {
        onWin(prizeTitle, wonPrize.value);
      }, 1600);
    }, 800);
  };

  return (
    <div className="w-full flex flex-col items-center justify-center py-2">
      {/* 3 Interactive Boxes */}
      <div className="grid grid-cols-3 gap-2.5 w-full max-w-[290px]">
        {boxes.map((box) => {
          const isThisSelected = selectedBox === box.id;
          const isOtherSelected = selectedBox !== null && !isThisSelected;

          return (
            <motion.button
              key={box.id}
              whileHover={selectedBox === null ? { scale: 1.05, y: -4 } : {}}
              whileTap={selectedBox === null ? { scale: 0.95 } : {}}
              onClick={() => handleSelectBox(box.id)}
              disabled={selectedBox !== null}
              className={`flex flex-col items-center justify-center p-3 rounded-2xl border transition-all relative overflow-hidden cursor-pointer disabled:cursor-default ${
                isThisSelected
                  ? isLight
                    ? "border-amber-500 bg-white shadow-2xl scale-105"
                    : "border-amber-400 bg-slate-900 shadow-2xl scale-105"
                  : isOtherSelected
                    ? "opacity-30 border-slate-300 bg-slate-100"
                    : isLight
                      ? "border-slate-200 bg-white hover:border-amber-400 shadow-sm"
                      : "border-slate-800 bg-slate-900/80 hover:border-amber-400/50"
              }`}
              style={{
                boxShadow: isThisSelected
                  ? `0 0 25px ${preset.primaryColor}80`
                  : undefined,
              }}
            >
              {/* Box Top Ribbon Accent */}
              <div
                className="w-8 h-1.5 rounded-full mb-2"
                style={{ background: box.color }}
              />

              {/* Animated Box Visual */}
              <motion.div
                animate={
                  isThisSelected && isOpened
                    ? { y: [-2, -8, 0], scale: [1, 1.2, 1.1] }
                    : isThisSelected
                      ? { rotate: [-4, 4, -4, 4, 0] }
                      : {}
                }
                transition={{ duration: 0.5 }}
                className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl relative shadow-inner"
                style={{
                  background: isLight
                    ? `linear-gradient(135deg, ${box.color}20, #F1F5F9)`
                    : `linear-gradient(135deg, ${box.color}30, #030712)`,
                  borderColor: box.color,
                }}
              >
                {isThisSelected && isOpened ? (
                  <Sparkles className="w-7 h-7 text-amber-500 animate-spin" />
                ) : (
                  <Gift
                    className={`w-6 h-6 ${isLight ? "text-slate-700" : "text-slate-200"}`}
                  />
                )}
              </motion.div>

              <span
                className={`text-[10px] font-bold mt-2 text-center line-clamp-1 ${isLight ? "text-slate-800" : "text-slate-300"}`}
              >
                {box.label}
              </span>
            </motion.button>
          );
        })}
      </div>

      {/* Opening feedback */}
      {isOpened ? (
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="mt-3 px-3.5 py-1.5 rounded-full text-xs font-extrabold text-black flex items-center gap-1 shadow-lg"
          style={{ background: preset.primaryColor }}
        >
          <span>
            🎉 {prizeTitle} ({wonPrize.value})
          </span>
        </motion.div>
      ) : (
        <p
          className={`mt-3 text-[11px] font-medium text-center ${isLight ? "text-slate-500" : "text-slate-400"}`}
        >
          {t.games.mystery.instruction}
        </p>
      )}
    </div>
  );
};
