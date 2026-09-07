import React, { useState } from "react";
import { motion, AnimatePresence } from "motion/react";
import { AkteraBrandPreset } from "./aktera-presets";
import { AkteraLang, AKTERA_I18N } from "./aktera-i18n";
import { playClick } from "./aktera-audio";
import {
  Wifi,
  Battery,
  ShieldCheck,
  Globe,
  Sparkles,
  ArrowRight,
  HelpCircle,
  Trophy,
  Gift,
  ExternalLink,
  ChevronRight,
} from "lucide-react";
import { AkteraWheelEngine } from "./engines/AkteraWheelEngine";
import { AkteraQuizEngine } from "./engines/AkteraQuizEngine";
import { AkteraScratchEngine } from "./engines/AkteraScratchEngine";
import { AkteraMysteryBoxEngine } from "./engines/AkteraMysteryBoxEngine";
import { AkteraScreenWelcome } from "./screens/AkteraScreenWelcome";
import { AkteraScreenLeadCapture } from "./screens/AkteraScreenLeadCapture";
import { AkteraScreenVoucherWin } from "./screens/AkteraScreenVoucherWin";
import { AkteraScreenConsolation } from "./screens/AkteraScreenConsolation";

export type AkteraScreenId = 1 | 2 | 3 | 4 | 5;
export type AkteraMechanicId = "wheel" | "quiz" | "scratch" | "mystery";

interface AkteraPhoneSimulatorProps {
  preset: AkteraBrandPreset;
  lang: AkteraLang;
  mode?: "dark" | "light";
  activeScreen: AkteraScreenId;
  onChangeScreen: (screen: AkteraScreenId) => void;
  mechanic: AkteraMechanicId;
  inspectorMode: boolean;
  onOpenTerms?: () => void;
}

export const AkteraPhoneSimulator: React.FC<AkteraPhoneSimulatorProps> = ({
  preset,
  lang,
  mode = "dark",
  activeScreen,
  onChangeScreen,
  mechanic,
  inspectorMode,
  onOpenTerms,
}) => {
  const [wonPrize, setWonPrize] = useState<{ name: string; val: string }>({
    name: "VIP Pass 50 000 DZD",
    val: "50 000 DA",
  });

  const isLight = mode === "light";
  const t = AKTERA_I18N[lang];
  const isRtl = lang === "ar";
  const brandName =
    lang === "ar" ? preset.nameAr : lang === "fr" ? preset.nameFr : preset.name;
  const slogan =
    lang === "ar"
      ? preset.sloganAr
      : lang === "en"
        ? preset.sloganEn
        : preset.sloganFr;

  // Background styling
  const getBgStyle = () => {
    if (isLight) {
      if (preset.backgroundType === "gradient") {
        return {
          background: `linear-gradient(160deg, #FFFFFF 0%, ${preset.lightSurface || "#F1F5F9"} 100%)`,
        };
      }
      if (preset.backgroundType === "mesh") {
        return {
          background:
            "radial-gradient(at 15% 15%, #EEF2FF 0px, transparent 50%), radial-gradient(at 85% 85%, #F8FAFC 0px, transparent 50%)",
          backgroundColor: "#FFFFFF",
        };
      }
      if (preset.backgroundType === "dots") {
        return {
          backgroundColor: "#FFFFFF",
          backgroundImage:
            "radial-gradient(rgba(15, 23, 42, 0.08) 1px, transparent 1px)",
          backgroundSize: "16px 16px",
        };
      }
      return { background: preset.lightSurface || "#FAF8F5" };
    }

    // Dark Mode
    if (preset.backgroundType === "gradient") {
      const colors = preset.backgroundValue.split(",");
      return {
        background: `linear-gradient(160deg, ${colors[0]?.trim() || preset.secondaryColor}, ${colors[1]?.trim() || preset.darkSurface})`,
      };
    }
    if (preset.backgroundType === "mesh") {
      return {
        background: preset.backgroundValue,
        backgroundColor: preset.darkSurface,
      };
    }
    if (preset.backgroundType === "dots") {
      return {
        backgroundColor: preset.darkSurface,
        backgroundImage:
          "radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)",
        backgroundSize: "16px 16px",
      };
    }
    return { background: preset.darkSurface };
  };

  const handleGameWin = (name: string, val: string) => {
    setWonPrize({ name, val });
    onChangeScreen(3); // Go to lead capture form
  };

  const handleGameLose = () => {
    onChangeScreen(5); // Go to consolation screen
  };

  const handleLeadSubmit = () => {
    onChangeScreen(4); // Go to voucher claim
  };

  // Helper badge for 8-slot inspector
  const renderSlotBadge = (slotNum: number, label: string) => {
    if (!inspectorMode) return null;
    return (
      <div className="absolute top-0 left-0 z-30 transform -translate-y-1/2 bg-amber-500 text-black text-[9px] font-black font-mono px-1.5 py-0.5 rounded shadow flex items-center gap-1 pointer-events-none">
        <span>SLOT {slotNum}</span>
        <span className="opacity-75">• {label}</span>
      </div>
    );
  };

  const getSlotOutline = (slotNum: number) => {
    if (!inspectorMode) return "";
    return `relative border border-dashed rounded-xl my-1 p-1 transition-all ${
      isLight
        ? "border-amber-600/80 bg-amber-500/10"
        : "border-amber-400/70 bg-amber-500/5"
    }`;
  };

  return (
    <div className="flex flex-col items-center justify-center relative select-none">
      {/* iPhone 16 Pro Style Hardware Chassis */}
      <div
        className={`w-[360px] sm:w-[380px] h-[720px] sm:h-[750px] rounded-[52px] p-[10px] border-[4px] shadow-2xl relative flex flex-col justify-between overflow-hidden transition-all duration-300 ${
          isLight
            ? "bg-[#E2E8F0] border-slate-300 shadow-slate-900/20"
            : "bg-[#1E293B] border-slate-700 shadow-2xl"
        }`}
        style={{
          boxShadow: isLight
            ? `0 25px 60px -15px rgba(0,0,0,0.25), 0 0 35px ${preset.primaryColor}25`
            : `0 25px 60px -15px rgba(0,0,0,0.9), 0 0 40px ${preset.primaryColor}20`,
        }}
      >
        {/* Hardware Glass Reflection Glare */}
        <div className="absolute inset-0 bg-gradient-to-tr from-transparent via-white/5 to-transparent pointer-events-none rounded-[48px] z-40" />

        {/* Inner Phone Screen */}
        <div
          dir={isRtl ? "rtl" : "ltr"}
          className={`w-full h-full rounded-[42px] relative flex flex-col overflow-y-auto overflow-x-hidden font-sans scrollbar-none transition-colors duration-300 ${
            isLight ? "text-slate-900" : "text-white"
          }`}
          style={getBgStyle()}
        >
          {/* iOS Status Bar */}
          <div
            className={`w-full pt-3 px-6 pb-1 flex items-center justify-between z-30 shrink-0 text-[11px] font-bold tracking-tight ${
              isLight ? "text-slate-800" : "text-white/90"
            }`}
          >
            <span className="font-mono">12:45</span>

            {/* Dynamic Island / Notch */}
            <div className="w-24 h-5 rounded-full bg-black flex items-center justify-end px-2 gap-1.5 shadow-inner">
              <div className="w-2.5 h-2.5 rounded-full bg-slate-900 border border-slate-800" />
            </div>

            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-mono font-bold tracking-tighter">
                5G
              </span>
              <Wifi className="w-3.5 h-3.5" />
              <Battery className="w-4 h-4" />
            </div>
          </div>

          {/* MAIN 8-SLOT GRAMMAR CONTAINER */}
          <div className="flex-1 flex flex-col justify-between px-3.5 pb-4 pt-1 z-20">
            {/* ========================================================================= */}
            {/* SLOT 1: BRAND HEADER */}
            {/* ========================================================================= */}
            <div className={`${getSlotOutline(1)} shrink-0 pt-1`}>
              {renderSlotBadge(1, "Header")}
              <div className="flex items-center justify-between">
                {/* Brand Logo & Name */}
                <div className="flex items-center gap-2">
                  <div
                    className={`w-8 h-8 rounded-xl overflow-hidden border flex items-center justify-center p-0.5 shadow transition-colors ${
                      isLight
                        ? "bg-white border-slate-200"
                        : "bg-slate-900 border-slate-700"
                    }`}
                  >
                    <img
                      src={preset.logoUrl}
                      alt={brandName}
                      className="w-full h-full object-contain rounded-lg"
                    />
                  </div>
                  <div className="flex flex-col text-left">
                    <span
                      className={`text-xs font-black leading-tight tracking-tight ${
                        isLight ? "text-slate-900" : "text-white"
                      }`}
                    >
                      {brandName}
                    </span>
                    <div className="flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-emerald-500" />
                      <span className="text-[9px] font-bold text-emerald-500">
                        {t.welcome.badge}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Language Pill */}
                <div
                  className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold shadow-sm uppercase ${
                    isLight
                      ? "bg-slate-100 border-slate-200 text-slate-800"
                      : "bg-slate-900/80 border-slate-700 text-amber-400"
                  }`}
                >
                  {lang}
                </div>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SLOT 2: HERO VISUAL BADGE */}
            {/* ========================================================================= */}
            <div className={`${getSlotOutline(2)} shrink-0 my-0.5 text-center`}>
              {renderSlotBadge(2, "Hero Badge")}
              <div
                className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-widest text-black shadow-lg"
                style={{ background: preset.primaryColor }}
              >
                <Sparkles className="w-3 h-3 text-black" />
                <span>{t.welcome.heroBadge}</span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SLOT 3: HIGH-IMPACT HEADLINE */}
            {/* ========================================================================= */}
            <div className={`${getSlotOutline(3)} shrink-0 text-center px-1`}>
              {renderSlotBadge(3, "Headline")}
              <h1
                className={`text-sm sm:text-base font-black leading-tight drop-shadow-sm ${
                  isLight ? "text-slate-900" : "text-white drop-shadow-md"
                }`}
              >
                {activeScreen === 1 && t.welcome.title}
                {activeScreen === 2 &&
                  (mechanic === "wheel"
                    ? lang === "fr"
                      ? "Faites tourner la roue de la fortune !"
                      : lang === "ar"
                        ? "أدر عجلة الحظ واربح !"
                        : "Spin the wheel of fortune!"
                    : mechanic === "quiz"
                      ? lang === "fr"
                        ? "Répondez au quiz et gagnez !"
                        : lang === "ar"
                          ? "أجب عن السؤال واربح !"
                          : "Answer the quiz and win!"
                      : mechanic === "scratch"
                        ? lang === "fr"
                          ? "Grattez pour découvrir votre lot !"
                          : lang === "ar"
                            ? "امسح البطاقة لاكتشاف هديتك !"
                            : "Scratch to reveal your prize!"
                        : lang === "fr"
                          ? "Ouvrez une boîte mystère !"
                          : lang === "ar"
                            ? "افتح صندوقك السري !"
                            : "Open a mystery box!")}
                {activeScreen === 3 && t.lead.title}
                {activeScreen === 4 && t.win.title}
                {activeScreen === 5 && t.lose.title}
              </h1>
            </div>

            {/* ========================================================================= */}
            {/* SLOT 4: SUPPORTING VALUE COPY */}
            {/* ========================================================================= */}
            <div className={`${getSlotOutline(4)} shrink-0 text-center px-2`}>
              {renderSlotBadge(4, "Supporting Copy")}
              <p
                className={`text-[11px] font-medium leading-tight ${
                  isLight ? "text-slate-600" : "text-slate-300"
                }`}
              >
                {activeScreen === 1 && t.welcome.subtitle}
                {activeScreen === 2 && slogan}
                {activeScreen === 3 && t.lead.subtitle}
                {activeScreen === 4 && t.win.subtitle}
                {activeScreen === 5 && t.lose.subtitle}
              </p>
            </div>

            {/* ========================================================================= */}
            {/* SLOT 5: INTERACTIVE GAME ENGINE / FLOW SCREEN CONTAINER */}
            {/* ========================================================================= */}
            <div
              className={`${getSlotOutline(5)} flex-1 flex flex-col justify-center my-1 relative min-h-[220px]`}
            >
              {renderSlotBadge(5, "Interaction Engine")}
              <AnimatePresence mode="wait">
                <motion.div
                  key={`${activeScreen}-${mechanic}-${lang}-${mode}`}
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.96 }}
                  transition={{ duration: 0.25 }}
                  className="w-full flex-1 flex flex-col justify-center"
                >
                  {/* Screen 1: Welcome */}
                  {activeScreen === 1 && (
                    <AkteraScreenWelcome
                      preset={preset}
                      lang={lang}
                      isLight={isLight}
                      onStart={() => {
                        playClick();
                        onChangeScreen(2);
                      }}
                    />
                  )}

                  {/* Screen 2: Interactive Game Engines */}
                  {activeScreen === 2 && (
                    <>
                      {mechanic === "wheel" && (
                        <AkteraWheelEngine
                          preset={preset}
                          lang={lang}
                          isLight={isLight}
                          onWin={handleGameWin}
                        />
                      )}
                      {mechanic === "quiz" && (
                        <AkteraQuizEngine
                          preset={preset}
                          lang={lang}
                          isLight={isLight}
                          onWin={handleGameWin}
                          onLose={handleGameLose}
                        />
                      )}
                      {mechanic === "scratch" && (
                        <AkteraScratchEngine
                          preset={preset}
                          lang={lang}
                          isLight={isLight}
                          onWin={handleGameWin}
                        />
                      )}
                      {mechanic === "mystery" && (
                        <AkteraMysteryBoxEngine
                          preset={preset}
                          lang={lang}
                          isLight={isLight}
                          onWin={handleGameWin}
                        />
                      )}
                    </>
                  )}

                  {/* Screen 3: Lead Capture Form */}
                  {activeScreen === 3 && (
                    <AkteraScreenLeadCapture
                      preset={preset}
                      lang={lang}
                      isLight={isLight}
                      onSubmit={handleLeadSubmit}
                    />
                  )}

                  {/* Screen 4: Win Voucher Claim */}
                  {activeScreen === 4 && (
                    <AkteraScreenVoucherWin
                      preset={preset}
                      lang={lang}
                      isLight={isLight}
                      prizeName={wonPrize.name}
                      prizeValue={wonPrize.val}
                    />
                  )}

                  {/* Screen 5: Consolation Screen */}
                  {activeScreen === 5 && (
                    <AkteraScreenConsolation
                      preset={preset}
                      lang={lang}
                      isLight={isLight}
                      onRetry={() => {
                        playClick();
                        onChangeScreen(2);
                      }}
                    />
                  )}
                </motion.div>
              </AnimatePresence>
            </div>

            {/* ========================================================================= */}
            {/* SLOT 6: REINFORCEMENT & MICRO-INDICATORS */}
            {/* ========================================================================= */}
            <div
              className={`${getSlotOutline(6)} shrink-0 flex items-center justify-center gap-2 py-0.5`}
            >
              {renderSlotBadge(6, "Progress & Reinforcement")}
              <div
                className={`flex items-center gap-1 text-[10px] font-bold px-3 py-1 rounded-full border transition-colors ${
                  isLight
                    ? "text-slate-700 bg-white/90 border-slate-200 shadow-sm"
                    : "text-slate-400 bg-slate-900/60 border-slate-800"
                }`}
              >
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-ping" />
                <span>
                  {lang === "fr"
                    ? "1 tentative restante • Gain garanti"
                    : lang === "ar"
                      ? "محاولة واحدة متبقية • ربح مضمون"
                      : "1 attempt remaining • Guaranteed Win"}
                </span>
              </div>
            </div>

            {/* ========================================================================= */}
            {/* SLOT 7: HIGH-CONTRAST ACTION BUTTONS (CTA) */}
            {/* ========================================================================= */}
            <div
              className={`${getSlotOutline(7)} shrink-0 flex flex-col gap-1.5 mt-1`}
            >
              {renderSlotBadge(7, "Primary & Ghost CTA")}
              {activeScreen === 1 && (
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => {
                    playClick();
                    onChangeScreen(2);
                  }}
                  className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-black flex items-center justify-center gap-2 shadow-xl relative overflow-hidden cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${preset.primaryColor}, #FFFFFF)`,
                    boxShadow: `0 8px 25px ${preset.primaryColor}50`,
                  }}
                >
                  {/* Shimmer light effect */}
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/40 to-transparent -translate-x-full animate-shimmer" />
                  <span>{t.welcome.ctaPrimary}</span>
                  <ArrowRight className="w-4 h-4" />
                </motion.button>
              )}

              {activeScreen === 3 && (
                <button
                  type="submit"
                  form="lead-form"
                  onClick={handleLeadSubmit}
                  className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-black flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${preset.primaryColor}, #FFFFFF)`,
                    boxShadow: `0 8px 25px ${preset.primaryColor}50`,
                  }}
                >
                  <span>{t.lead.ctaSubmit}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}

              {activeScreen === 4 && (
                <button
                  onClick={() => {
                    playClick();
                    alert(
                      lang === "fr"
                        ? "Store Locator: Alger Centre, Oran Es Senia, Constantine Ville"
                        : "Store Locator: Algiers City Centre, Oran Es Senia, Constantine",
                    );
                  }}
                  className="w-full py-2.5 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-black flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${preset.primaryColor}, #FFFFFF)`,
                    boxShadow: `0 8px 25px ${preset.primaryColor}50`,
                  }}
                >
                  <span>{t.win.storeLocator}</span>
                  <ExternalLink className="w-3.5 h-3.5" />
                </button>
              )}

              {activeScreen === 5 && (
                <button
                  onClick={() => {
                    playClick();
                    onChangeScreen(2);
                  }}
                  className="w-full py-3 px-4 rounded-xl text-xs font-black uppercase tracking-wider text-black flex items-center justify-center gap-2 shadow-xl cursor-pointer"
                  style={{
                    background: `linear-gradient(135deg, ${preset.primaryColor}, #FFFFFF)`,
                    boxShadow: `0 8px 25px ${preset.primaryColor}50`,
                  }}
                >
                  <span>{t.lose.ctaRetry}</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>

            {/* ========================================================================= */}
            {/* SLOT 8: FOOTER & LEGAL UTILITY */}
            {/* ========================================================================= */}
            <div className={`${getSlotOutline(8)} shrink-0 pt-1 text-center`}>
              {renderSlotBadge(8, "Footer & Legal")}
              <p
                className={`text-[9px] leading-tight ${isLight ? "text-slate-500" : "text-slate-500"}`}
              >
                {t.footer.legalText}
              </p>
              <div className="flex items-center justify-center gap-2 mt-0.5">
                <button
                  onClick={() => {
                    playClick();
                    if (onOpenTerms) onOpenTerms();
                  }}
                  className={`text-[9px] font-bold underline transition-colors ${
                    isLight
                      ? "text-slate-600 hover:text-amber-600"
                      : "text-slate-400 hover:text-amber-400"
                  }`}
                >
                  {t.footer.termsLink}
                </button>
                <span className="text-slate-400">•</span>
                <span className="text-[8px] uppercase font-bold text-slate-500 tracking-wider">
                  {t.footer.poweredBy}
                </span>
              </div>
            </div>
          </div>

          {/* iOS Home Indicator Bar */}
          <div className="w-full flex justify-center pb-2 pt-1 shrink-0">
            <div
              className={`w-32 h-1 rounded-full ${isLight ? "bg-black/30" : "bg-white/40"}`}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
