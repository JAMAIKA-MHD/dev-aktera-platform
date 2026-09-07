import React, { useState, useEffect } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import { Campaign, PlayerScreenConfig } from "../../types";
import { PlayerEditorLeftNav, AkteraScreenType } from "./PlayerEditorLeftNav";
import { PlayerEditorCanvas } from "./PlayerEditorCanvas";
import { PlayerEditorSettings } from "./PlayerEditorSettings";
import {
  ArrowLeft,
  Monitor,
  Tablet,
  Smartphone,
  QrCode,
  Layers,
  Volume2,
  VolumeX,
  Sparkles,
  Save,
  Check,
  Sun,
  Moon,
} from "lucide-react";
import { AKTERA_BRAND_PRESETS, AkteraBrandPreset } from "./aktera-presets";
import { AkteraLang, AKTERA_I18N } from "./aktera-i18n";
import { AkteraMechanicId } from "./AkteraPhoneSimulator";
import { setAkteraMuted, getAkteraMuted, playClick } from "./aktera-audio";
import { AkteraQrModal } from "./modals/AkteraQrModal";
import { AkteraBlueprintModal } from "./modals/AkteraBlueprintModal";

interface PlayerEditorShellProps {
  campaigns: Campaign[];
  selectedCampaignId?: string | null;
  onSelectCampaign: (id: string) => void;
  onClose: () => void;
  onSave: (
    campaignId: string,
    config: PlayerScreenConfig,
    logicConfig: any,
  ) => void;
}

export function PlayerEditorShell({
  campaigns,
  selectedCampaignId,
  onSelectCampaign,
  onClose,
  onSave,
}: PlayerEditorShellProps) {
  const campaign = campaigns.find((c) => c.id === selectedCampaignId) ||
    campaigns[0] || {
      id: "demo",
      name: "Aktera Summer Rewards",
      gameType: "lucky_wheel",
      status: "active",
    };

  // Get Principal App Theme (Light vs Dark)
  let principalTheme: "dark" | "light" = "dark";
  try {
    const themeContext = useTheme();
    if (themeContext?.theme) {
      principalTheme = themeContext.theme;
    }
  } catch (e) {
    const saved = localStorage.getItem("app-theme") as "dark" | "light";
    if (saved) principalTheme = saved;
    else if (document.documentElement.classList.contains("dark"))
      principalTheme = "dark";
    else if (document.documentElement.getAttribute("data-theme") === "light")
      principalTheme = "light";
  }

  // State Management (initializes to Principal Theme)
  const [deviceType, setDeviceType] = useState<"desktop" | "tablet" | "mobile">(
    "mobile",
  );
  const [activeScreen, setActiveScreen] = useState<AkteraScreenType>(1);
  const [lang, setLang] = useState<AkteraLang>("en");
  const [mode, setMode] = useState<"dark" | "light">(principalTheme);
  const [inspectorMode, setInspectorMode] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(getAkteraMuted());
  const [isQrModalOpen, setIsQrModalOpen] = useState<boolean>(false);
  const [isBlueprintModalOpen, setIsBlueprintModalOpen] =
    useState<boolean>(false);
  const [isSavedToast, setIsSavedToast] = useState<boolean>(false);

  // Sync mode whenever the principal theme changes
  useEffect(() => {
    if (principalTheme) {
      setMode(principalTheme);
    }
  }, [principalTheme]);

  // Active Brand Preset & Mechanic
  const [preset, setPreset] = useState<AkteraBrandPreset>(
    AKTERA_BRAND_PRESETS[0],
  );
  const [mechanic, setMechanic] = useState<AkteraMechanicId>(
    campaign.gameType === "quiz"
      ? "quiz"
      : campaign.gameType === "scratch_card"
        ? "scratch"
        : campaign.gameType === "mystery_box"
          ? "mystery"
          : "wheel",
  );

  const isLight = mode === "light";
  const t = AKTERA_I18N[lang];

  const handleToggleMute = () => {
    playClick();
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    setAkteraMuted(nextMuted);
  };

  const handleToggleMode = () => {
    playClick();
    const nextMode = mode === "dark" ? "light" : "dark";
    setMode(nextMode);
  };

  const handleToggleInspector = () => {
    playClick();
    setInspectorMode((prev) => !prev);
  };

  const handleSaveDraft = () => {
    playClick();
    setIsSavedToast(true);
    setTimeout(() => setIsSavedToast(false), 2500);

    onSave(
      campaign.id,
      {
        theme: {
          logoUrl: preset.logoUrl,
          primaryColor: preset.primaryColor,
          secondaryColor: preset.secondaryColor,
          accentColor: preset.accentColor,
          background: {
            type: preset.backgroundType,
            value: preset.backgroundValue,
          },
          fontFamily: preset.fontFamily,
          borderRadius: preset.borderRadius,
          showBrandWatermark: true,
          mode: mode,
        },
        gameAssets: {
          sound: { muted: isMuted },
        },
        content: {
          preGame: {
            title: t.welcome.title,
            subHeader: t.welcome.subtitle,
            rulesText: t.welcome.rule1,
            formFields: [],
          },
          winState: {
            title: t.win.title,
            ctaLabel: t.win.copyCode,
            ctaAction: "claim",
          },
          loseState: {
            title: t.lose.title,
            ctaLabel: t.lose.ctaRetry,
            ctaAction: "retry",
          },
          gameParams: {
            timerSeconds: 15,
            dailyAttempts: 1,
          },
        },
      },
      {
        game_type:
          mechanic === "wheel"
            ? "lucky_wheel"
            : mechanic === "scratch"
              ? "scratch_card"
              : mechanic === "mystery"
                ? "mystery_box"
                : "quiz",
      },
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex flex-col font-sans overflow-hidden select-none transition-colors duration-300 ${
        isLight ? "bg-[#F8FAFC] text-slate-900" : "bg-[#070D18] text-slate-100"
      }`}
    >
      {/* ========================================================================= */}
      {/* TOP STUDIO TOOLBAR WITH LUXURY OBSIDIAN / WHITE LIGHT AESTHETIC */}
      {/* ========================================================================= */}
      <header
        className={`h-16 px-4 sm:px-6 flex items-center justify-between z-30 shrink-0 border-b shadow-md transition-colors duration-300 ${
          isLight
            ? "bg-white border-slate-200"
            : "bg-[#0A1120] border-slate-800/80"
        }`}
      >
        {/* Left: Back to Admin & Brand Identity */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              playClick();
              onClose();
            }}
            className={`p-2 rounded-xl border transition-colors cursor-pointer ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-white"
            }`}
            title={lang === "fr" ? "Quitter le Studio" : "Exit Studio"}
          >
            <ArrowLeft className="w-4 h-4" />
          </button>

          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-gradient-to-tr from-amber-500 to-amber-300 flex items-center justify-center text-black font-black text-xs shadow-lg shadow-amber-500/20">
              AK
            </div>
            <div className="flex flex-col">
              <span
                className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                  isLight ? "text-slate-900" : "text-white"
                }`}
              >
                <span>{t.studio.title}</span>
                <span className="px-1.5 py-0.2 rounded text-[9px] font-extrabold bg-amber-500/20 text-amber-600 border border-amber-500/30">
                  PRO
                </span>
              </span>
              <span
                className={`text-[10px] font-medium ${isLight ? "text-slate-500" : "text-slate-400"}`}
              >
                {preset.name} • {campaign.name}
              </span>
            </div>
          </div>
        </div>

        {/* Center: Companion Tools, Theme Mode, Language & Audio */}
        <div className="hidden md:flex items-center gap-2.5">
          {/* Dark / Light Mode Toggle Button */}
          <button
            onClick={handleToggleMode}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isLight
                ? "bg-amber-500/10 border-amber-400 text-amber-700 shadow-sm"
                : "bg-slate-900 border-slate-800 text-amber-400 hover:border-slate-700"
            }`}
            title={isLight ? "Switch to Dark Obsidian" : "Switch to White Luxe"}
          >
            {isLight ? (
              <Sun className="w-3.5 h-3.5" />
            ) : (
              <Moon className="w-3.5 h-3.5" />
            )}
            <span className="text-[11px] font-bold">
              {isLight ? "White Luxe" : "Dark Obsidian"}
            </span>
          </button>

          {/* Language Switcher */}
          <div
            className={`flex items-center border rounded-xl p-0.5 ${
              isLight
                ? "bg-slate-100 border-slate-200"
                : "bg-slate-900 border-slate-800"
            }`}
          >
            {(["fr", "ar", "en"] as const).map((l) => (
              <button
                key={l}
                onClick={() => {
                  playClick();
                  setLang(l);
                }}
                className={`px-2.5 py-1 rounded-lg text-[10px] font-extrabold uppercase transition-all cursor-pointer ${
                  lang === l
                    ? "bg-amber-500 text-black shadow font-black"
                    : isLight
                      ? "text-slate-600 hover:text-slate-900"
                      : "text-slate-400 hover:text-slate-200"
                }`}
              >
                {l}
              </button>
            ))}
          </div>

          {/* 8-Slot Blueprint Inspector Mode */}
          <button
            onClick={handleToggleInspector}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              inspectorMode
                ? "bg-amber-500/20 border-amber-500 text-amber-600 shadow-lg shadow-amber-500/10"
                : isLight
                  ? "bg-slate-50 border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100"
                  : "bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200 hover:border-slate-700"
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span className="text-[11px]">
              {inspectorMode ? t.studio.inspectorOn : t.studio.inspector}
            </span>
          </button>

          {/* 8-Slot Blueprint Specs Modal Trigger */}
          <button
            onClick={() => {
              playClick();
              setIsBlueprintModalOpen(true);
            }}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-600 hover:text-amber-600 hover:bg-slate-100"
                : "bg-slate-900 border-slate-800 text-slate-400 hover:text-amber-400"
            }`}
            title="Spécifications 8-Slots"
          >
            <Sparkles className="w-4 h-4" />
          </button>

          {/* In-Store QR Code Trigger */}
          <button
            onClick={() => {
              playClick();
              setIsQrModalOpen(true);
            }}
            className={`px-3 py-1.5 rounded-xl border text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer ${
              isLight
                ? "bg-slate-50 border-slate-200 text-slate-700 hover:border-amber-500 hover:text-slate-900"
                : "bg-slate-900 border-slate-800 hover:border-amber-400/60 text-slate-300 hover:text-white"
            }`}
          >
            <QrCode className="w-3.5 h-3.5 text-amber-500" />
            <span className="text-[11px]">{t.studio.qrTrigger}</span>
          </button>

          {/* Audio Synthesizer Toggle */}
          <button
            onClick={handleToggleMute}
            className={`p-1.5 rounded-xl border transition-colors cursor-pointer ${
              isMuted
                ? isLight
                  ? "bg-slate-100 border-slate-200 text-slate-400"
                  : "bg-slate-900 border-slate-800 text-slate-500"
                : isLight
                  ? "bg-amber-500/10 border-amber-500/40 text-amber-600"
                  : "bg-amber-500/10 border-amber-500/40 text-amber-400"
            }`}
            title={isMuted ? t.studio.muted : t.studio.soundOn}
          >
            {isMuted ? (
              <VolumeX className="w-4 h-4" />
            ) : (
              <Volume2 className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Right: Device Toggles & Save Action */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Device Toggles */}
          <div
            className={`hidden sm:flex items-center border rounded-xl p-0.5 ${
              isLight
                ? "bg-slate-100 border-slate-200"
                : "bg-slate-900 border-slate-800"
            }`}
          >
            {[
              { id: "desktop", icon: Monitor },
              { id: "tablet", icon: Tablet },
              { id: "mobile", icon: Smartphone },
            ].map((dev) => {
              const Icon = dev.icon;
              const isActive = deviceType === dev.id;
              return (
                <button
                  key={dev.id}
                  onClick={() => {
                    playClick();
                    setDeviceType(dev.id as any);
                  }}
                  className={`p-1.5 rounded-lg transition-colors cursor-pointer ${
                    isActive
                      ? "bg-amber-500 text-black shadow font-bold"
                      : isLight
                        ? "text-slate-500 hover:text-slate-900"
                        : "text-slate-400 hover:text-slate-200"
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                </button>
              );
            })}
          </div>

          {/* Save Action */}
          <button
            onClick={handleSaveDraft}
            className="px-4 py-2 rounded-xl text-xs font-black uppercase tracking-wider text-black bg-gradient-to-r from-amber-500 to-amber-300 hover:from-amber-400 hover:to-amber-200 shadow-lg shadow-amber-500/20 transition-all active:scale-95 flex items-center gap-1.5 cursor-pointer"
          >
            {isSavedToast ? (
              <>
                <Check className="w-3.5 h-3.5 text-black" />
                <span>{lang === "fr" ? "Enregistré !" : "Saved!"}</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5" />
                <span>{t.studio.saveChanges}</span>
              </>
            )}
          </button>
        </div>
      </header>

      {/* ========================================================================= */}
      {/* MAIN 3-PANE STUDIO WORKSPACE */}
      {/* ========================================================================= */}
      <main className="flex-1 flex overflow-hidden">
        {/* Left: Journey Screen Flow (5 Screens) */}
        <PlayerEditorLeftNav
          activeScreen={activeScreen}
          onChangeScreen={setActiveScreen}
          lang={lang}
          mode={mode}
        />

        {/* Center: Live Mobile Simulator Canvas (8-Slot Grammar) */}
        <PlayerEditorCanvas
          deviceType={deviceType}
          preset={preset}
          lang={lang}
          mode={mode}
          activeScreen={activeScreen}
          onChangeScreen={setActiveScreen}
          mechanic={mechanic}
          inspectorMode={inspectorMode}
          onOpenTerms={() => setIsBlueprintModalOpen(true)}
        />

        {/* Right: Design Token Studio & Mechanics */}
        <PlayerEditorSettings
          preset={preset}
          onPresetChange={setPreset}
          mechanic={mechanic}
          onMechanicChange={setMechanic}
          lang={lang}
          mode={mode}
          onModeChange={setMode}
          isMuted={isMuted}
          onToggleMute={handleToggleMute}
        />
      </main>

      {/* Modals & Companion Sheets */}
      <AkteraQrModal
        isOpen={isQrModalOpen}
        onClose={() => setIsQrModalOpen(false)}
        preset={preset}
        lang={lang}
        mode={mode}
      />

      <AkteraBlueprintModal
        isOpen={isBlueprintModalOpen}
        onClose={() => setIsBlueprintModalOpen(false)}
        lang={lang}
        mode={mode}
      />
    </div>
  );
}
