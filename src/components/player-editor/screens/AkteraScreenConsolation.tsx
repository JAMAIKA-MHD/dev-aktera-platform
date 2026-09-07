import React from "react";
import { motion } from "motion/react";
import { AkteraBrandPreset } from "../aktera-presets";
import { AkteraLang, AKTERA_I18N } from "../aktera-i18n";
import { playClick } from "../aktera-audio";
import { Moon, RotateCcw, Share2, Sparkles } from "lucide-react";

interface AkteraScreenConsolationProps {
  preset: AkteraBrandPreset;
  lang: AkteraLang;
  isLight?: boolean;
  onRetry: () => void;
}

export const AkteraScreenConsolation: React.FC<
  AkteraScreenConsolationProps
> = ({ preset, lang, isLight = false, onRetry }) => {
  const t = AKTERA_I18N[lang];

  const handleShare = () => {
    playClick();
    const shareText = `Tentez votre chance avec ${preset.name} et gagnez des cadeaux instantanés ! 🇩🇿🎁`;
    const shareUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(shareUrl, "_blank");
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between text-center px-4 py-2 select-none">
      {/* Visual Consolation Card */}
      <div className="w-full my-auto flex flex-col items-center">
        <motion.div
          animate={{ scale: [0.96, 1.02, 0.96] }}
          transition={{ duration: 3, repeat: Infinity }}
          className={`w-20 h-20 rounded-full border-2 flex items-center justify-center text-4xl shadow-xl mb-3 ${
            isLight
              ? "bg-white border-slate-200"
              : "bg-slate-900 border-slate-700"
          }`}
        >
          🌙
        </motion.div>

        {/* Bonus badge */}
        <div
          className="px-3 py-1 rounded-full text-[10px] font-extrabold text-black flex items-center gap-1 shadow-md mb-2"
          style={{ background: preset.primaryColor }}
        >
          <Sparkles className="w-3 h-3 text-black" />
          <span>{t.lose.bonusBadge}</span>
        </div>

        <p
          className={`text-xs max-w-[260px] leading-relaxed mt-1 ${isLight ? "text-slate-600" : "text-slate-400"}`}
        >
          {t.lose.subtitle}
        </p>

        {/* Viral Share Option */}
        <button
          onClick={handleShare}
          className={`mt-4 px-4 py-2 rounded-xl border text-xs font-bold flex items-center gap-1.5 shadow-lg transition-transform active:scale-95 cursor-pointer ${
            isLight
              ? "bg-emerald-50 border-emerald-300 text-emerald-800 hover:bg-emerald-100"
              : "bg-emerald-950/80 border-emerald-500/50 hover:border-emerald-400 text-emerald-300"
          }`}
        >
          <Share2 className="w-3.5 h-3.5 text-emerald-500" />
          <span>{t.lose.ctaShare}</span>
        </button>
      </div>
    </div>
  );
};
