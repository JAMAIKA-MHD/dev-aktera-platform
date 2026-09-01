import React, { useState } from "react";
import { BrandPreset, PlayerData } from "../types";
import {
  Phone,
  User,
  CheckSquare,
  Square,
  Gift,
  ArrowRight,
} from "lucide-react";
import { motion } from "motion/react";
import { DEFAULT_CAMPAIGN_IMAGE_URL } from "../lib/defaultImages";

interface PlayerLandingProps {
  activeBrand: BrandPreset;
  onRegister: (data: PlayerData) => void;
  savedData: PlayerData;
}

export const PlayerLanding: React.FC<PlayerLandingProps> = ({
  activeBrand,
  onRegister,
  savedData,
}) => {
  const [name, setName] = useState(savedData.name);
  const [phone, setPhone] = useState(savedData.phone);
  const [consent, setConsent] = useState(savedData.consent);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Please enter your full name / الرجاء إدخال الاسم الكامل");
      return;
    }

    // Basic Algerian phone regex: matches 05, 06, or 07 followed by 8 digits
    const dzPhoneRegex = /^(05|06|07)[0-9]{8}$/;
    if (!dzPhoneRegex.test(phone.trim())) {
      setError(
        "Please enter a valid Algerian phone number (e.g., 0555123456) / رقم الهاتف غير صحيح",
      );
      return;
    }

    if (!consent) {
      setError(
        "Please accept terms & conditions / الرجاء الموافقة على الشروط والأحكام",
      );
      return;
    }

    onRegister({ name: name.trim(), phone: phone.trim(), email: "", consent });
  };

  return (
    <div
      id="player-landing-container"
      className="flex-1 flex flex-col px-4 sm:px-5 py-3 sm:py-4 overflow-y-auto bg-[#0F0F1A] text-zinc-100 justify-between h-full select-none scrollbar-thin"
    >
      {/* Brand logo & header section */}
      <div
        id="landing-brand-header"
        className="flex flex-col items-center text-center pt-1"
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ duration: 0.4 }}
          id="landing-logo-wrapper"
          className="w-14 h-14 sm:w-16 sm:h-16 rounded-xl p-0.5 bg-gradient-to-tr from-zinc-800 to-zinc-900 border border-zinc-700/60 shadow-[0_4px_16px_rgba(0,0,0,0.4)] flex items-center justify-center overflow-hidden"
        >
          <img
            src={activeBrand.logoUrl || DEFAULT_CAMPAIGN_IMAGE_URL}
            alt={activeBrand.name}
            className="w-full h-full object-cover rounded-[10px]"
            referrerPolicy="no-referrer"
            onError={(event) => {
              event.currentTarget.src = DEFAULT_CAMPAIGN_IMAGE_URL;
            }}
          />
        </motion.div>

        {/* Dynamic multilingual headers */}
        <motion.div
          initial={{ y: 10, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1, duration: 0.4 }}
          className="mt-2 flex flex-col gap-0.5"
        >
          <h2
            className="text-base sm:text-lg font-extrabold tracking-tight font-sans text-white uppercase"
            style={{ color: activeBrand.primaryColor }}
          >
            {activeBrand.name}
          </h2>
          {activeBrand.slogan && (
            <p className="text-[9px] uppercase tracking-wider font-mono text-zinc-400">
              {activeBrand.slogan}
            </p>
          )}
          {activeBrand.arabicSlogan && (
            <p
              dir="auto"
              className="text-xs font-semibold text-zinc-300 font-sans mt-0.5"
              style={{ textShadow: `0 0 10px ${activeBrand.primaryColor}20` }}
            >
              {activeBrand.arabicSlogan}
            </p>
          )}
        </motion.div>
      </div>

      {/* Prize teaser gallery cards */}
      <motion.div
        initial={{ y: 15, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2, duration: 0.5 }}
        id="prize-teaser-box"
        className="my-2 sm:my-2.5 bg-gradient-to-br from-[#1F1F2E] to-[#161625] border border-[#2D2D3F] rounded-2xl p-3 relative overflow-hidden shadow-md"
      >
        <div id="prize-header" className="flex items-center gap-1.5 mb-1">
          <Gift
            className="w-3.5 h-3.5"
            style={{ color: activeBrand.primaryColor }}
          />
          <span className="text-[9px] font-bold text-slate-400 uppercase tracking-widest font-mono">
            Available Rewards
          </span>
        </div>
        <p
          dir="auto"
          className="text-[11px] text-slate-300 leading-snug font-sans mb-2"
        >
          {activeBrand.description}
        </p>

        {/* Mini prizes showcase list */}
        <div id="teaser-prizes-list" className="grid grid-cols-2 gap-1 pt-0.5">
          {activeBrand.prizes
            .filter((p) => p.isWin)
            .slice(0, 4)
            .map((p, idx) => (
              <div
                key={idx}
                className="flex items-center gap-1 bg-[#0F0F1A]/90 px-2 py-1 rounded-xl border border-[#2D2D3F]/50 text-[9.5px] font-semibold text-slate-200"
              >
                <span className="text-xs">{p.icon || "🎁"}</span>
                <span className="truncate">{p.name}</span>
              </div>
            ))}
        </div>
      </motion.div>

      {/* Input registration form */}
      <form
        id="landing-form"
        onSubmit={handleSubmit}
        className="flex-1 flex flex-col gap-2 justify-end"
      >
        {/* Error notification bar */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -5 }}
            animate={{ opacity: 1, y: 0 }}
            className="p-2 bg-red-950/40 border border-red-500/20 text-red-300 rounded-xl text-[10px] text-center font-sans font-medium leading-normal"
          >
            {error}
          </motion.div>
        )}

        {/* Name input */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold tracking-widest text-slate-400 font-mono uppercase">
            Full Name / الاسم الكامل
          </label>
          <div className="relative flex items-center">
            <User className="absolute left-3 w-3.5 h-3.5 text-slate-500" />
            <input
              type="text"
              id="player-name-input"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Mohamed Djelloul"
              className="w-full bg-[#1F1F2E]/80 border border-[#2D2D3F] hover:border-slate-600 focus:border-[#6366F1] rounded-xl pl-9 pr-3 text-xs text-slate-100 placeholder-slate-600 transition-all duration-200 min-h-9 sm:min-h-10 focus:outline-none focus:ring-1 focus:ring-[#6366F1]/20 font-sans"
            />
          </div>
        </div>

        {/* Phone number input */}
        <div className="flex flex-col gap-1">
          <label className="text-[9px] font-bold tracking-widest text-slate-400 font-mono uppercase">
            Phone Number / رقم الهاتف
          </label>
          <div className="relative flex items-center">
            <Phone className="absolute left-3 w-3.5 h-3.5 text-slate-500" />
            <input
              type="tel"
              id="player-phone-input"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 0555123456"
              className="w-full bg-[#1F1F2E]/80 border border-[#2D2D3F] hover:border-slate-600 focus:border-[#6366F1] rounded-xl pl-9 pr-3 text-xs text-slate-100 placeholder-slate-600 transition-all duration-200 min-h-9 sm:min-h-10 focus:outline-none focus:ring-1 focus:ring-[#6366F1]/20 font-mono"
            />
          </div>
        </div>

        {/* Loi 18-07 privacy consent check */}
        <div
          id="consent-checkbox-wrapper"
          onClick={() => setConsent(!consent)}
          className="flex items-start gap-2 mt-0.5 cursor-pointer group select-none"
        >
          <div className="mt-0.5 text-slate-400 hover:text-slate-200 transition-colors duration-150 flex-shrink-0">
            {consent ? (
              <CheckSquare
                className="w-4 h-4 text-emerald-400 fill-emerald-950/10"
                style={{ color: activeBrand.primaryColor }}
              />
            ) : (
              <Square className="w-4 h-4 text-[#2D2D3F] group-hover:border-slate-500" />
            )}
          </div>
          <div className="flex flex-col">
            <span className="text-[10px] font-medium text-slate-300 font-sans leading-tight">
              I agree to participate in this campaign and receive rewards.
            </span>
            <span
              dir="auto"
              className="text-[9px] text-slate-500 font-sans mt-0.5"
            >
              أوافق على المشاركة في الحملة وتلقي الهدايا (قانون 18-07) 🛡️
            </span>
          </div>
        </div>

        {/* Action play button */}
        <motion.button
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          id="registration-submit-btn"
          className="w-full text-xs font-bold tracking-wider text-white shadow-lg transition-all duration-300 min-h-[42px] sm:min-h-[44px] rounded-xl flex items-center justify-center gap-1.5 cursor-pointer mt-1"
          style={{
            background: `linear-gradient(135deg, ${activeBrand.gradientFrom}, ${activeBrand.gradientTo})`,
            boxShadow: `0 8px 16px ${activeBrand.primaryColor}20`,
          }}
        >
          <span>LET'S PLAY & WIN! / ابدأ اللعب</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </motion.button>
      </form>
    </div>
  );
};
