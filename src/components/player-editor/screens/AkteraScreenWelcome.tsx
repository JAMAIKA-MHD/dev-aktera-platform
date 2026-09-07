import React from "react";
import { motion } from "motion/react";
import { AkteraBrandPreset } from "../aktera-presets";
import { AkteraLang, AKTERA_I18N } from "../aktera-i18n";
import { playClick } from "../aktera-audio";
import {
  Sparkles,
  Trophy,
  ShieldCheck,
  ArrowRight,
  HelpCircle,
} from "lucide-react";

interface AkteraScreenWelcomeProps {
  preset: AkteraBrandPreset;
  lang: AkteraLang;
  isLight?: boolean;
  onStart: () => void;
}

export const AkteraScreenWelcome: React.FC<AkteraScreenWelcomeProps> = ({
  preset,
  lang,
  isLight = false,
  onStart,
}) => {
  const t = AKTERA_I18N[lang];
  const brandName =
    lang === "ar" ? preset.nameAr : lang === "fr" ? preset.nameFr : preset.name;
  const slogan =
    lang === "ar"
      ? preset.sloganAr
      : lang === "en"
        ? preset.sloganEn
        : preset.sloganFr;

  return (
    <div className="flex-1 flex flex-col items-center justify-between text-center px-4 py-2 select-none">
      {/* Teaser 3D Visual Hero */}
      <div className="relative w-full max-w-[280px] my-auto flex flex-col items-center">
        {/* Floating Prize Badges */}
        <div className="absolute -top-3 -left-2 z-10">
          <motion.div
            animate={{ y: [-3, 3, -3] }}
            transition={{ duration: 2.5, repeat: Infinity, ease: "easeInOut" }}
            className="px-2.5 py-1 rounded-full text-[10px] font-extrabold text-black flex items-center gap-1 shadow-lg"
            style={{ background: preset.primaryColor }}
          >
            <Sparkles className="w-3 h-3 text-black" />
            <span>{preset.prizes[0]?.value || "50 000 DA"}</span>
          </motion.div>
        </div>

        <div className="absolute -top-1 -right-2 z-10">
          <motion.div
            animate={{ y: [3, -3, 3] }}
            transition={{ duration: 2.8, repeat: Infinity, ease: "easeInOut" }}
            className="px-2.5 py-1 rounded-full text-[10px] font-extrabold bg-blue-600 text-white flex items-center gap-1 shadow-lg"
          >
            <span>-30% VIP</span>
          </motion.div>
        </div>

        {/* Central 3D Trophy Orb */}
        <motion.div
          animate={{ scale: [0.96, 1.04, 0.96] }}
          transition={{ duration: 3.5, repeat: Infinity, ease: "easeInOut" }}
          className="w-28 h-28 sm:w-32 sm:h-32 rounded-3xl p-1 flex items-center justify-center relative shadow-2xl border-2 transition-all"
          style={{
            borderColor: preset.primaryColor,
            background: isLight
              ? `radial-gradient(circle, ${preset.secondaryColor} 10%, #FFFFFF 100%)`
              : `radial-gradient(circle, ${preset.secondaryColor} 20%, #050B14 100%)`,
            boxShadow: `0 0 35px ${preset.primaryColor}40`,
          }}
        >
          <Trophy
            className="w-14 h-14 sm:w-16 sm:h-16 drop-shadow-xl"
            style={{ color: preset.primaryColor }}
          />
        </motion.div>

        {/* Trust verification pill */}
        <div
          className={`mt-4 px-3 py-1 rounded-full border flex items-center gap-1.5 shadow-sm transition-colors ${
            isLight
              ? "bg-white/90 border-slate-200"
              : "bg-slate-900/90 border-slate-800"
          }`}
        >
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
          <span
            className={`text-[10px] font-bold ${isLight ? "text-slate-700" : "text-slate-300"}`}
          >
            {t.welcome.verified}
          </span>
        </div>
      </div>

      {/* Primary Rules & Teaser Highlights */}
      <div className="w-full grid grid-cols-2 gap-2 my-2">
        <div
          className={`p-2 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${
            isLight
              ? "bg-white/80 border-slate-200 text-slate-700 shadow-sm"
              : "bg-slate-900/60 border-slate-800 text-slate-300"
          }`}
        >
          <span>✨ {t.welcome.rule1}</span>
        </div>
        <div
          className={`p-2 rounded-xl border text-[10px] font-bold flex items-center justify-center gap-1 transition-colors ${
            isLight
              ? "bg-white/80 border-slate-200 text-slate-700 shadow-sm"
              : "bg-slate-900/60 border-slate-800 text-slate-300"
          }`}
        >
          <span>⚡ {t.welcome.rule2}</span>
        </div>
      </div>
    </div>
  );
};
