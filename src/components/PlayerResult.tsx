import React, { useState } from "react";
import { BrandPreset, Prize } from "../types";
import { Gift, Copy, Check, MessageCircle, RotateCcw } from "lucide-react";
import { motion } from "motion/react";

interface PlayerResultProps {
  activeBrand: BrandPreset;
  prize: Prize | null;
  onRestart: () => void;
  playerName: string;
  /** Real player flow: entry ID for confirm-coupon call */
  entryId?: string;
  /** Real player flow: callback to confirm coupon on the server */
  onCouponConfirmed?: () => Promise<void>;
}

export const PlayerResult: React.FC<PlayerResultProps> = ({
  activeBrand,
  prize,
  onRestart,
  playerName,
  entryId,
  onCouponConfirmed,
}) => {
  const [copied, setCopied] = useState(false);
  const [couponConfirmed, setCouponConfirmed] = useState(false);
  const [confirmingCoupon, setConfirmingCoupon] = useState(false);

  const isWin = prize?.isWin ?? false;
  const couponCode = prize?.couponCode ?? "";

  const handleCopy = () => {
    if (couponCode) {
      navigator.clipboard.writeText(couponCode);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleConfirmCoupon = async () => {
    if (couponConfirmed || confirmingCoupon) return;
    setConfirmingCoupon(true);
    try {
      if (onCouponConfirmed) {
        await onCouponConfirmed();
      }
    } finally {
      setConfirmingCoupon(false);
      setCouponConfirmed(true);
    }
  };

  const shareText = `Sahit! I just won ${prize?.name} from the ${activeBrand.name} lucky wheel! Try your luck too! 🇩🇿🎁`;
  const whatsappUrl = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;

  return (
    <div
      id="player-result-container"
      className="flex-1 flex flex-col px-6 py-6 justify-between h-full bg-[#0F0F1A] text-zinc-100 select-none overflow-y-auto scrollbar-thin"
    >
      {/* 1. Header Outcome Message */}
      <div id="result-header" className="text-center pt-2">
        <p className="text-[10px] font-bold tracking-widest text-zinc-500 font-mono uppercase">
          Campaign Outcome
        </p>

        {isWin ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", damping: 15 }}
          >
            <h2 className="text-2xl font-extrabold text-white mt-1 uppercase tracking-tight">
              Mabrouk Alik! 🎉
            </h2>
            <p
              dir="auto"
              className="text-xs text-emerald-400 font-semibold font-sans mt-0.5"
            >
              مبروك عليك! لقد فزت بجائزة مميزة 🎁
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.4 }}
          >
            <h2 className="text-2xl font-extrabold text-zinc-300 mt-1 uppercase tracking-tight">
              Ma3liche! 🌙
            </h2>
            <p
              dir="auto"
              className="text-xs text-zinc-400 font-semibold font-sans mt-0.5"
            >
              خيرها في غيرها! حظ أوفر في المرة القادمة
            </p>
          </motion.div>
        )}
      </div>

      {/* 2. Visual Prize Display Card */}
      <div id="result-prize-card-wrapper" className="my-6">
        {isWin ? (
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: "spring", bounce: 0.4, duration: 0.8 }}
            id="win-card"
            className="relative bg-white rounded-lg shadow-2xl flex flex-col w-full mx-auto overflow-hidden mt-4 text-center pb-2"
          >
            {/* TOP CUTOUT */}
            <div className="absolute left-1/2 -top-5 -translate-x-1/2 w-10 h-10 bg-[#0F0F1A] rounded-full shadow-inner z-20" />

            <div className="pt-8 px-6 pb-2 relative z-10">
              {/* Visual glow behind the prize icon */}
              <div
                className="absolute top-12 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-32 h-32 rounded-full filter blur-[30px] opacity-15 pointer-events-none"
                style={{ backgroundColor: activeBrand.primaryColor }}
              />

              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-3">
                {activeBrand.name} PRESENTS
              </div>

              <h3 className="font-black text-3xl text-slate-900 uppercase leading-tight line-clamp-2">
                {prize?.name}
              </h3>

              {/* Glowing Prize Icon */}
              <div
                id="prize-icon-bubble"
                className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg border border-slate-100 mt-4 mb-2"
                style={{
                  backgroundColor: activeBrand.primaryColor,
                  boxShadow: `0 10px 20px ${activeBrand.primaryColor}30`,
                }}
              >
                {prize?.icon ?? "🎁"}
              </div>
            </div>

            {/* TICKET INFO SECTION */}
            <div className="px-6 py-2 grid grid-cols-2 gap-4">
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  DATE
                </div>
                <div className="text-lg font-black text-slate-800">
                  {new Date().toLocaleDateString(undefined, {
                    month: "numeric",
                    day: "numeric",
                    year: "2-digit",
                  })}
                </div>
              </div>
              <div>
                <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
                  VALUE
                </div>
                <div className="text-lg font-black text-slate-800">
                  {prize?.isWin ? "PRIZE" : "FREE"}
                </div>
              </div>
            </div>

            {/* LOWER HOLES / PERFORATED LINE */}
            <div className="relative w-full h-8 flex items-center justify-center my-1 overflow-hidden">
              {/* Left hole */}
              <div className="absolute -left-4 w-8 h-8 bg-[#0F0F1A] rounded-full z-20 shadow-inner" />
              {/* Dashed line */}
              <div className="w-full mx-6 border-b-2 border-dashed border-slate-300" />
              {/* Right hole */}
              <div className="absolute -right-4 w-8 h-8 bg-[#0F0F1A] rounded-full z-20 shadow-inner" />
            </div>

            {/* SERIAL / BARCODE SECTION */}
            <div className="px-6 pb-4 pt-1 text-center relative z-10">
              {/* Barcode representation */}
              <div className="flex h-10 w-full justify-center gap-[2px] opacity-80 overflow-hidden mb-3">
                {couponCode
                  .replace(/-/g, "")
                  .substring(0, 16)
                  .padEnd(16, "A")
                  .split("")
                  .map((char, i) => (
                    <React.Fragment key={i}>
                      <div
                        className={`h-full bg-slate-900 ${char.charCodeAt(0) % 2 === 0 ? "w-1" : "w-[2px]"}`}
                      />
                      <div
                        className={`h-full bg-slate-900 ${char.charCodeAt(0) % 3 === 0 ? "w-0.5" : "w-[3px]"}`}
                      />
                      <div
                        className={`h-full bg-slate-900 ${char.charCodeAt(0) % 5 === 0 ? "w-1" : "w-[1px]"}`}
                        style={{
                          opacity: char.charCodeAt(0) % 2 === 0 ? 0.7 : 1,
                        }}
                      />
                    </React.Fragment>
                  ))}
              </div>

              <div className="flex items-center justify-center gap-2">
                <span className="text-[11px] font-mono font-bold text-slate-900 uppercase tracking-widest">
                  {couponCode}
                </span>
                <button
                  onClick={handleCopy}
                  className="text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {copied ? (
                    <Check className="w-3.5 h-3.5 text-emerald-500" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            initial={{ y: 25, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            id="loser-card"
            className="bg-gradient-to-br from-[#1F1F2E] to-[#161625] border border-[#2D2D3F] rounded-[32px] p-6 text-center shadow-lg"
          >
            <div className="w-16 h-16 rounded-full bg-[#0F0F1A] border border-[#2D2D3F] mx-auto flex items-center justify-center text-3xl">
              🌙
            </div>
            <h3 className="text-base font-bold text-slate-300 tracking-tight mt-4 font-sans">
              No prize this spin!
            </h3>
            <p
              dir="auto"
              className="text-xs text-slate-400 font-sans leading-relaxed mt-2 px-2"
            >
              Ma3liche {playerName || "Sadiqi"}! Algeria's lucky star is still
              shining. Spin limitations protect campaigns. You can return
              tomorrow to try again!
            </p>
            <p
              dir="auto"
              className="text-[11px] text-slate-500 font-sans leading-relaxed mt-2.5 px-2"
            >
              معليش صديقي، لكل مجتهد نصيب! العب مجدداً غداً لزيادة فرص فوزك معنا
              🌟
            </p>
          </motion.div>
        )}
      </div>

      {/* 3. Action Trigger CTAs */}
      <div id="result-ctas" className="flex flex-col gap-3">
        {/* If win, show claim confirmation */}
        {isWin && (
          <motion.button
            whileHover={{ scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            onClick={handleConfirmCoupon}
            disabled={couponConfirmed || confirmingCoupon}
            id="claim-confirmation-btn"
            className={`w-full min-h-[52px] rounded-2xl text-xs font-bold tracking-wider flex items-center justify-center gap-2 border cursor-pointer transition-all duration-300 disabled:cursor-default ${
              couponConfirmed
                ? "bg-emerald-950/20 border-emerald-500/40 text-emerald-300"
                : "bg-[#1F1F2E] hover:bg-[#2D2D3F] border-[#2D2D3F] hover:border-slate-600 text-slate-300"
            }`}
          >
            {confirmingCoupon ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>SAVING...</span>
              </>
            ) : couponConfirmed ? (
              <>
                <Check className="w-4 h-4 text-emerald-400" />
                <span>COUPON CLAIM CONFIRMED / تم حفظ الكود 🛡️</span>
              </>
            ) : (
              <>
                <Check className="w-4 h-4 text-slate-400" />
                <span>I HAVE COPIED MY COUPON / لقد نسخت كود الهدية</span>
              </>
            )}
          </motion.button>
        )}

        {/* Localized WhatsApp Share Campaign Button (highly engaging!) */}
        <motion.a
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          href={whatsappUrl}
          target="_blank"
          rel="noopener noreferrer"
          id="whatsapp-share-btn"
          className="w-full min-h-[52px] rounded-2xl text-xs font-bold tracking-wider flex items-center justify-center gap-2 cursor-pointer bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-950/20 transition-all duration-300"
        >
          <MessageCircle className="w-4.5 h-4.5 fill-white" />
          <span>SHARE TO WHATSAPP / شارك عبر الواتساب</span>
        </motion.a>

        {/* Restart / Replay simulator button */}
        <button
          onClick={onRestart}
          id="simulator-restart-btn"
          className="w-full min-h-[52px] rounded-2xl text-xs font-bold tracking-wider flex items-center justify-center gap-2 bg-[#161625] border border-[#2D2D3F] hover:border-slate-600 text-slate-400 hover:text-slate-200 transition-all duration-200 cursor-pointer"
        >
          <RotateCcw className="w-3.5 h-3.5" />
          <span>TEST ANOTHER BRAND / سحب جديد</span>
        </button>
      </div>
    </div>
  );
};
