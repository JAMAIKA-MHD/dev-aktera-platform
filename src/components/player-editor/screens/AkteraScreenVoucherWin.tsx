import React, { useState } from "react";
import { motion } from "motion/react";
import { AkteraBrandPreset } from "../aktera-presets";
import { AkteraLang, AKTERA_I18N } from "../aktera-i18n";
import { playClick } from "../aktera-audio";
import { Copy, Check, Clock, MapPin, Sparkles, Gift } from "lucide-react";

interface AkteraScreenVoucherWinProps {
  preset: AkteraBrandPreset;
  lang: AkteraLang;
  isLight?: boolean;
  prizeName?: string;
  prizeValue?: string;
}

export const AkteraScreenVoucherWin: React.FC<AkteraScreenVoucherWinProps> = ({
  preset,
  lang,
  isLight = false,
  prizeName = "VIP Pass 50 000 DZD",
  prizeValue = "50 000 DA",
}) => {
  const [copied, setCopied] = useState(false);
  const t = AKTERA_I18N[lang];
  const voucherCode = `AKTERA-${preset.id.toUpperCase().slice(0, 4)}-${Math.floor(1000 + Math.random() * 9000)}`;

  const handleCopy = () => {
    playClick();
    if (navigator.clipboard) {
      navigator.clipboard.writeText(voucherCode);
    }
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-between text-center px-2 py-1 select-none">
      {/* High-Contrast Luxury Voucher Card */}
      <div className="w-full my-auto flex flex-col items-center">
        <motion.div
          initial={{ scale: 0.9, y: 10 }}
          animate={{ scale: 1, y: 0 }}
          className={`w-full max-w-[285px] rounded-2xl p-4 border-2 shadow-2xl relative overflow-hidden flex flex-col items-center transition-all ${
            isLight
              ? "bg-white border-amber-400"
              : "bg-slate-900 border-amber-400/80"
          }`}
          style={{
            borderColor: preset.primaryColor,
            background: isLight
              ? `radial-gradient(circle at top, ${preset.secondaryColor}15 0%, #FFFFFF 100%)`
              : `radial-gradient(circle at top, ${preset.secondaryColor} 0%, #060B13 100%)`,
            boxShadow: `0 0 30px ${preset.primaryColor}30`,
          }}
        >
          {/* Header pill */}
          <div className="flex items-center gap-1 text-[9px] uppercase font-extrabold tracking-widest text-amber-500 mb-1">
            <Sparkles className="w-3 h-3" />
            <span>{t.win.voucherCardTitle}</span>
          </div>

          <h3
            className={`text-base font-black mt-1 leading-snug ${isLight ? "text-slate-900" : "text-white"}`}
          >
            {prizeName}
          </h3>

          <div
            className="text-lg font-black font-mono px-3 py-0.5 rounded-full mt-1.5 text-black shadow-lg"
            style={{ background: preset.primaryColor }}
          >
            {prizeValue}
          </div>

          {/* Dotted separator */}
          <div
            className={`w-full border-t-2 border-dashed my-3 relative ${isLight ? "border-slate-300" : "border-slate-700"}`}
          >
            <div
              className={`w-4 h-4 rounded-full absolute -left-6 -top-2 ${isLight ? "bg-slate-100" : "bg-[#0A1120]"}`}
            />
            <div
              className={`w-4 h-4 rounded-full absolute -right-6 -top-2 ${isLight ? "bg-slate-100" : "bg-[#0A1120]"}`}
            />
          </div>

          {/* Barcode Mockup */}
          <div
            className={`w-full p-2 rounded-lg flex flex-col items-center justify-center border ${
              isLight
                ? "bg-slate-50 border-slate-200"
                : "bg-white border-transparent"
            }`}
          >
            <div className="flex items-center justify-center gap-[3px] h-9 w-full max-w-[210px] overflow-hidden">
              {[
                3, 1, 4, 2, 1, 3, 2, 4, 1, 2, 3, 1, 4, 2, 3, 1, 2, 4, 3, 2, 1,
                4, 2, 1, 3,
              ].map((w, i) => (
                <div
                  key={i}
                  className="bg-black h-full"
                  style={{ width: `${w * 1.5}px` }}
                />
              ))}
            </div>
            <span className="text-[10px] font-mono font-bold tracking-widest text-slate-800 mt-1">
              {voucherCode}
            </span>
          </div>

          {/* Copy Code Button */}
          <button
            onClick={handleCopy}
            className={`w-full mt-3 py-2 px-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-md active:scale-95 ${
              copied
                ? "bg-emerald-600 border-emerald-500 text-white"
                : isLight
                  ? "bg-slate-900 border-slate-800 text-white hover:bg-slate-800"
                  : "bg-slate-800/90 border-slate-700 text-white"
            }`}
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-300" />
                <span>{t.win.codeCopied}</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5 text-amber-400" />
                <span>{t.win.copyCode}</span>
              </>
            )}
          </button>
        </motion.div>

        {/* 48-Hour Live Countdown Banner */}
        <div
          className={`mt-3 flex items-center gap-1.5 text-[11px] font-bold px-3 py-1.5 rounded-full border ${
            isLight
              ? "text-slate-700 bg-white/90 border-slate-200 shadow-sm"
              : "text-slate-400 bg-slate-900/80 border-slate-800"
          }`}
        >
          <Clock className="w-3.5 h-3.5 text-amber-500 animate-spin" />
          <span>
            {t.win.expiresIn}{" "}
            <span className="text-amber-500 font-mono font-bold">47:59:42</span>
          </span>
        </div>
      </div>
    </div>
  );
};
