import React, { useState } from 'react';
import { BrandPreset, Prize } from '../types';
import { Gift, Copy, Check, MessageCircle, RotateCcw } from 'lucide-react';
import { motion } from 'motion/react';

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
  const couponCode = prize?.couponCode ?? '';

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
    <div id="player-result-container" className="flex-1 flex flex-col px-6 py-6 justify-between h-full bg-[#0F0F1A] text-zinc-100 select-none overflow-y-auto scrollbar-thin">
      {/* 1. Header Outcome Message */}
      <div id="result-header" className="text-center pt-2">
        <p className="text-[10px] font-bold tracking-widest text-zinc-500 font-mono uppercase">Campaign Outcome</p>
        
        {isWin ? (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 15 }}
          >
            <h2 className="text-2xl font-extrabold text-white mt-1 uppercase tracking-tight">
              Mabrouk Alik! 🎉
            </h2>
            <p dir="auto" className="text-xs text-emerald-400 font-semibold font-sans mt-0.5">
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
            <p dir="auto" className="text-xs text-zinc-400 font-semibold font-sans mt-0.5">
              خيرها في غيرها! حظ أوفر في المرة القادمة
            </p>
          </motion.div>
        )}
      </div>

      {/* 2. Visual Prize Display Card */}
      <div id="result-prize-card-wrapper" className="my-6">
        {isWin ? (
          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            id="winner-card"
            className="bg-gradient-to-br from-[#1F1F2E] via-[#161625] to-[#1F1F2E] border border-[#2D2D3F] rounded-[32px] p-6 text-center relative overflow-hidden shadow-[0_0_35px_rgba(124,58,237,0.15)]"
          >
            {/* Visual glow behind the prize icon */}
            <div 
              className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-48 h-48 rounded-full filter blur-[40px] opacity-10 pointer-events-none"
              style={{ backgroundColor: activeBrand.primaryColor }}
            />

            {/* Glowing Prize Icon */}
            <div 
              id="prize-icon-bubble"
              className="w-16 h-16 rounded-2xl mx-auto flex items-center justify-center text-3xl shadow-lg border border-white/10"
              style={{ 
                backgroundColor: activeBrand.primaryColor,
                boxShadow: `0 10px 20px ${activeBrand.primaryColor}30`
              }}
            >
              {prize?.icon ?? '🎁'}
            </div>

            <h3 className="text-lg font-extrabold text-slate-100 tracking-tight mt-4 font-sans uppercase">
              {prize?.name}
            </h3>
            <p className="text-xs text-slate-400 font-sans tracking-wide mt-1">
              Sponsored by {activeBrand.name}
            </p>

            {/* Real-time Coupon redemption box */}
            <div id="coupon-display-box" className="mt-6 flex flex-col gap-2">
              <span className="text-[10px] font-bold tracking-widest text-slate-500 font-mono uppercase">Your Unique Coupon Code</span>
              <div className="relative flex items-center bg-[#0F0F1A] rounded-xl border border-[#2D2D3F] p-1">
                <span className="flex-1 font-mono text-xs font-bold text-slate-300 pl-4 text-left select-text truncate">
                  {couponCode}
                </span>
                <button
                  onClick={handleCopy}
                  id="coupon-copy-btn"
                  className="px-3.5 min-h-10 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all duration-200 cursor-pointer text-white bg-[#1F1F2E] border border-[#2D2D3F] hover:border-slate-600 hover:bg-[#2D2D3F]"
                >
                  {copied ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400 font-sans">Copied</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span className="font-sans">Copy</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Redemption Instructions */}
            <div id="redemption-instructions" className="mt-5 pt-4 border-t border-[#2D2D3F] text-[11px] text-slate-400 leading-relaxed font-sans text-left">
              <p className="font-bold text-slate-300 text-center mb-1">How to Claim / طريقة الاستلام</p>
              <p dir="auto" className="text-slate-400 mt-1">
                • Copy the code above and present it to our partner agent or support desk.
              </p>
              <p dir="auto" className="text-slate-500 mt-0.5">
                • انسخ الكود أعلاه وقدمه لأقرب وكيل تجاري للاستفادة من الهدية فوراً.
              </p>
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
            <p dir="auto" className="text-xs text-slate-400 font-sans leading-relaxed mt-2 px-2">
              Ma3liche {playerName || 'Sadiqi'}! Algeria's lucky star is still shining. Spin limitations protect campaigns. You can return tomorrow to try again!
            </p>
            <p dir="auto" className="text-[11px] text-slate-500 font-sans leading-relaxed mt-2.5 px-2">
              معليش صديقي، لكل مجتهد نصيب! العب مجدداً غداً لزيادة فرص فوزك معنا 🌟
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
                ? 'bg-emerald-950/20 border-emerald-500/40 text-emerald-300' 
                : 'bg-[#1F1F2E] hover:bg-[#2D2D3F] border-[#2D2D3F] hover:border-slate-600 text-slate-300'
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
