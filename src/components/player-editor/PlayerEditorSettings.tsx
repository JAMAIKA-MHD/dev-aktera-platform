import React, { useState } from "react";
import {
  Palette,
  Gamepad2,
  Type,
  Sparkles,
  Check,
  Disc,
  HelpCircle,
  Layers,
  Gift,
  Sun,
  Moon,
  Volume2,
  VolumeX,
} from "lucide-react";
import { AkteraBrandPreset, AKTERA_BRAND_PRESETS } from "./aktera-presets";
import { AkteraLang, AKTERA_I18N } from "./aktera-i18n";
import { AkteraMechanicId } from "./AkteraPhoneSimulator";
import { playClick } from "./aktera-audio";

interface PlayerEditorSettingsProps {
  preset: AkteraBrandPreset;
  onPresetChange: (preset: AkteraBrandPreset) => void;
  mechanic: AkteraMechanicId;
  onMechanicChange: (mechanic: AkteraMechanicId) => void;
  lang: AkteraLang;
  mode?: "dark" | "light";
  onModeChange?: (mode: "dark" | "light") => void;
  isMuted: boolean;
  onToggleMute: () => void;
}

type TabId = "tokens" | "mechanics" | "content";

export function PlayerEditorSettings({
  preset,
  onPresetChange,
  mechanic,
  onMechanicChange,
  lang,
  mode = "dark",
  onModeChange,
  isMuted,
  onToggleMute,
}: PlayerEditorSettingsProps) {
  const [activeTab, setActiveTab] = useState<TabId>("tokens");
  const isLight = mode === "light";
  const t = AKTERA_I18N[lang];

  const tabs = [
    { id: "tokens" as TabId, label: t.studio.presets, icon: Palette },
    { id: "mechanics" as TabId, label: t.studio.mechanics, icon: Gamepad2 },
    { id: "content" as TabId, label: "Content & Copy", icon: Type },
  ];

  const handleApplyPreset = (p: AkteraBrandPreset) => {
    playClick();
    onPresetChange({ ...p, mode });
  };

  const handleColorChange = (
    key: "primaryColor" | "secondaryColor" | "accentColor",
    val: string,
  ) => {
    onPresetChange({
      ...preset,
      [key]: val,
    });
  };

  const handleRadiusChange = (radius: "sharp" | "rounded" | "pill") => {
    playClick();
    onPresetChange({
      ...preset,
      borderRadius: radius,
    });
  };

  const handleBgTypeChange = (type: "solid" | "gradient" | "mesh" | "dots") => {
    playClick();
    onPresetChange({
      ...preset,
      backgroundType: type,
    });
  };

  const handleToggleMode = (newMode: "dark" | "light") => {
    playClick();
    if (onModeChange) onModeChange(newMode);
  };

  return (
    <div
      className={`w-80 border-l flex flex-col h-full shrink-0 text-xs select-none transition-colors duration-300 ${
        isLight
          ? "bg-white border-slate-200 text-slate-800"
          : "bg-[#0A1120] border-slate-800/80 text-slate-200"
      }`}
    >
      {/* Tabs Header */}
      <div
        className={`flex border-b transition-colors ${
          isLight
            ? "border-slate-200 bg-slate-50"
            : "border-slate-800/80 bg-[#0F172A]"
        }`}
      >
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                playClick();
                setActiveTab(tab.id);
              }}
              title={tab.label}
              className={`flex-1 py-3.5 flex flex-col items-center gap-1 border-b-2 font-bold transition-all cursor-pointer ${
                isActive
                  ? isLight
                    ? "border-amber-500 text-amber-600 bg-amber-500/10 shadow-sm"
                    : "border-amber-400 text-amber-400 bg-amber-500/5 shadow-sm"
                  : isLight
                    ? "border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-100"
                    : "border-transparent text-slate-400 hover:text-slate-200 hover:bg-slate-800/40"
              }`}
            >
              <Icon className="w-4 h-4" />
              <span className="text-[10px] tracking-tight">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content Area */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* ========================================================================= */}
        {/* TAB 1: DESIGN TOKENS & 14 PRESETS */}
        {/* ========================================================================= */}
        {activeTab === "tokens" && (
          <div className="flex flex-col gap-3.5">
            {/* Dark Mode / White Light Mode Switcher */}
            <div
              className={`p-3 rounded-2xl border flex flex-col gap-2 transition-colors ${
                isLight
                  ? "bg-slate-50 border-slate-200 shadow-sm"
                  : "bg-slate-900/90 border-slate-800"
              }`}
            >
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  isLight ? "text-slate-800" : "text-amber-400"
                }`}
              >
                {lang === "fr"
                  ? "Thème d'Affichage (White & Dark)"
                  : "Display Theme (White & Dark)"}
              </span>

              <div className="grid grid-cols-2 gap-1.5">
                <button
                  onClick={() => handleToggleMode("dark")}
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                    !isLight
                      ? "bg-slate-950 border-amber-400 text-amber-300 shadow"
                      : "bg-white border-slate-200 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <Moon className="w-3.5 h-3.5" />
                  <span>Dark Obsidian</span>
                </button>

                <button
                  onClick={() => handleToggleMode("light")}
                  className={`py-2 px-3 rounded-xl border flex items-center justify-center gap-1.5 font-bold transition-all cursor-pointer ${
                    isLight
                      ? "bg-white border-amber-500 text-amber-600 shadow font-black"
                      : "bg-slate-950 border-slate-800 text-slate-400 hover:text-white"
                  }`}
                >
                  <Sun className="w-3.5 h-3.5" />
                  <span>White Luxe</span>
                </button>
              </div>
            </div>

            {/* 14 Presets Grid */}
            <div
              className={`p-3 rounded-2xl border flex flex-col gap-2 transition-colors ${
                isLight
                  ? "bg-slate-50 border-slate-200 shadow-sm"
                  : "bg-slate-900/90 border-slate-800"
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-black uppercase tracking-wider flex items-center gap-1 ${
                    isLight ? "text-slate-800" : "text-amber-400"
                  }`}
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>
                    {lang === "fr"
                      ? "14 Presets de Marques"
                      : "14 Brand Presets"}
                  </span>
                </span>
                <span
                  className={`text-[9px] font-mono font-bold ${isLight ? "text-slate-500" : "text-slate-400"}`}
                >
                  Algeria & B2B
                </span>
              </div>

              <div className="grid grid-cols-2 gap-1.5 max-h-44 overflow-y-auto pr-1">
                {AKTERA_BRAND_PRESETS.map((p) => {
                  const isSelected = preset.id === p.id;
                  return (
                    <button
                      key={p.id}
                      onClick={() => handleApplyPreset(p)}
                      className={`p-2 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                        isSelected
                          ? isLight
                            ? "border-amber-500 bg-white text-slate-900 shadow font-bold"
                            : "border-amber-400 bg-amber-500/10 text-white shadow"
                          : isLight
                            ? "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                            : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <div
                        className="w-3.5 h-3.5 rounded-full shrink-0 border border-white/20"
                        style={{ background: p.primaryColor }}
                      />
                      <span className="text-[10px] truncate leading-tight">
                        {p.name}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Custom Token Colors */}
            <div
              className={`p-3 rounded-2xl border flex flex-col gap-2.5 transition-colors ${
                isLight
                  ? "bg-slate-50 border-slate-200 shadow-sm"
                  : "bg-slate-900/90 border-slate-800"
              }`}
            >
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  isLight ? "text-slate-800" : "text-slate-300"
                }`}
              >
                {t.studio.themeTokens}
              </span>

              {/* Primary Color */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-semibold ${isLight ? "text-slate-600" : "text-slate-400"}`}
                >
                  {t.studio.primaryColor}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={preset.primaryColor}
                    onChange={(e) =>
                      handleColorChange("primaryColor", e.target.value)
                    }
                    className="w-6 h-6 rounded border border-slate-300 bg-transparent cursor-pointer"
                  />
                  <span
                    className={`font-mono text-[10px] ${isLight ? "text-slate-800" : "text-slate-300"}`}
                  >
                    {preset.primaryColor}
                  </span>
                </div>
              </div>

              {/* Secondary Color */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-semibold ${isLight ? "text-slate-600" : "text-slate-400"}`}
                >
                  {t.studio.secondaryColor}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={preset.secondaryColor}
                    onChange={(e) =>
                      handleColorChange("secondaryColor", e.target.value)
                    }
                    className="w-6 h-6 rounded border border-slate-300 bg-transparent cursor-pointer"
                  />
                  <span
                    className={`font-mono text-[10px] ${isLight ? "text-slate-800" : "text-slate-300"}`}
                  >
                    {preset.secondaryColor}
                  </span>
                </div>
              </div>

              {/* Accent Color */}
              <div className="flex items-center justify-between">
                <span
                  className={`text-[11px] font-semibold ${isLight ? "text-slate-600" : "text-slate-400"}`}
                >
                  {t.studio.accentColor}
                </span>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={preset.accentColor}
                    onChange={(e) =>
                      handleColorChange("accentColor", e.target.value)
                    }
                    className="w-6 h-6 rounded border border-slate-300 bg-transparent cursor-pointer"
                  />
                  <span
                    className={`font-mono text-[10px] ${isLight ? "text-slate-800" : "text-slate-300"}`}
                  >
                    {preset.accentColor}
                  </span>
                </div>
              </div>
            </div>

            {/* Border Radius Switcher */}
            <div
              className={`p-3 rounded-2xl border flex flex-col gap-2 transition-colors ${
                isLight
                  ? "bg-slate-50 border-slate-200 shadow-sm"
                  : "bg-slate-900/90 border-slate-800"
              }`}
            >
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  isLight ? "text-slate-800" : "text-slate-300"
                }`}
              >
                {t.studio.borderRadius}
              </span>
              <div className="grid grid-cols-3 gap-1.5">
                {(["sharp", "rounded", "pill"] as const).map((r) => (
                  <button
                    key={r}
                    onClick={() => handleRadiusChange(r)}
                    className={`py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      preset.borderRadius === r
                        ? isLight
                          ? "border-amber-500 bg-white text-amber-600 shadow"
                          : "border-amber-400 bg-amber-500/10 text-amber-300"
                        : isLight
                          ? "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {r}
                  </button>
                ))}
              </div>
            </div>

            {/* Background Texture Switcher */}
            <div
              className={`p-3 rounded-2xl border flex flex-col gap-2 transition-colors ${
                isLight
                  ? "bg-slate-50 border-slate-200 shadow-sm"
                  : "bg-slate-900/90 border-slate-800"
              }`}
            >
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  isLight ? "text-slate-800" : "text-slate-300"
                }`}
              >
                {t.studio.bgTexture}
              </span>
              <div className="grid grid-cols-2 gap-1.5">
                {(["mesh", "gradient", "dots", "solid"] as const).map((bg) => (
                  <button
                    key={bg}
                    onClick={() => handleBgTypeChange(bg)}
                    className={`py-1.5 rounded-lg border text-[10px] font-bold uppercase transition-all cursor-pointer ${
                      preset.backgroundType === bg
                        ? isLight
                          ? "border-amber-500 bg-white text-amber-600 shadow"
                          : "border-amber-400 bg-amber-500/10 text-amber-300"
                        : isLight
                          ? "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                          : "border-slate-800 bg-slate-950 text-slate-400 hover:border-slate-700"
                    }`}
                  >
                    {bg}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 2: GAME MECHANICS (SLOT 5) */}
        {/* ========================================================================= */}
        {activeTab === "mechanics" && (
          <div className="flex flex-col gap-3.5">
            <div
              className={`p-3 rounded-2xl border flex flex-col gap-2 transition-colors ${
                isLight
                  ? "bg-slate-50 border-slate-200 shadow-sm"
                  : "bg-slate-900/90 border-slate-800"
              }`}
            >
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  isLight ? "text-slate-800" : "text-amber-400"
                }`}
              >
                {lang === "fr"
                  ? "Sélection du Moteur (Slot 5)"
                  : "Game Engine Selection (Slot 5)"}
              </span>

              <div className="flex flex-col gap-2">
                {[
                  {
                    id: "wheel" as AkteraMechanicId,
                    name:
                      lang === "fr" ? "Roue de la Fortune" : "Spin the Wheel",
                    desc:
                      lang === "fr"
                        ? "Slices vectorielles & physique de décélération"
                        : "Vector slice physics & deceleration",
                    icon: Disc,
                  },
                  {
                    id: "quiz" as AkteraMechanicId,
                    name: "Speed Quiz 15s",
                    desc:
                      lang === "fr"
                        ? "Timer interactif & feedback instantané"
                        : "Interactive timer & instant feedback",
                    icon: HelpCircle,
                  },
                  {
                    id: "scratch" as AkteraMechanicId,
                    name: lang === "fr" ? "Ticket à Gratter" : "Scratch Card",
                    desc:
                      lang === "fr"
                        ? "Foil argenté Canvas HTML5 & reveal >50%"
                        : "HTML5 Canvas metallic foil & >50% auto-reveal",
                    icon: Layers,
                  },
                  {
                    id: "mystery" as AkteraMechanicId,
                    name:
                      lang === "fr"
                        ? "Boîtes Cadeaux Mystères"
                        : "Mystery Gift Boxes",
                    desc:
                      lang === "fr"
                        ? "3 coffrets 3D & surprise instantanée"
                        : "3 3D gift boxes & instant opening reveal",
                    icon: Gift,
                  },
                ].map((m) => {
                  const isSelected = mechanic === m.id;
                  const Icon = m.icon;
                  return (
                    <button
                      key={m.id}
                      onClick={() => {
                        playClick();
                        onMechanicChange(m.id);
                      }}
                      className={`p-3 rounded-xl border text-left flex items-start gap-2.5 transition-all cursor-pointer ${
                        isSelected
                          ? isLight
                            ? "border-amber-500 bg-white text-slate-900 shadow font-bold"
                            : "border-amber-400 bg-amber-500/10 text-white shadow"
                          : isLight
                            ? "border-slate-200 bg-white text-slate-600 hover:border-slate-300"
                            : "border-slate-800 bg-slate-950/60 text-slate-400 hover:border-slate-700 hover:text-slate-200"
                      }`}
                    >
                      <div
                        className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 border ${
                          isSelected
                            ? "bg-amber-500 text-black border-amber-400"
                            : isLight
                              ? "bg-slate-100 text-slate-600 border-slate-200"
                              : "bg-slate-800 text-slate-400 border-slate-700"
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                      </div>
                      <div className="flex flex-col">
                        <span className="text-xs font-bold leading-tight">
                          {m.name}
                        </span>
                        <span
                          className={`text-[10px] mt-0.5 leading-snug ${isLight ? "text-slate-500" : "text-slate-400"}`}
                        >
                          {m.desc}
                        </span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Audio Web FX Toggle */}
            <div
              className={`p-3 rounded-2xl border flex items-center justify-between transition-colors ${
                isLight
                  ? "bg-slate-50 border-slate-200 shadow-sm"
                  : "bg-slate-900/90 border-slate-800"
              }`}
            >
              <div className="flex items-center gap-2">
                {isMuted ? (
                  <VolumeX className="w-4 h-4 text-red-500" />
                ) : (
                  <Volume2 className="w-4 h-4 text-emerald-500" />
                )}
                <div>
                  <span
                    className={`text-xs font-bold block ${isLight ? "text-slate-800" : "text-slate-200"}`}
                  >
                    {lang === "fr"
                      ? "Synthèse Audio Web FX"
                      : "Procedural Web Audio FX"}
                  </span>
                  <span
                    className={`text-[10px] ${isLight ? "text-slate-500" : "text-slate-400"}`}
                  >
                    {isMuted
                      ? lang === "fr"
                        ? "Audio muet"
                        : "Muted audio"
                      : lang === "fr"
                        ? "Audio actif (Web Audio API)"
                        : "Active audio (Web Audio API)"}
                  </span>
                </div>
              </div>

              <button
                onClick={onToggleMute}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                  isMuted
                    ? isLight
                      ? "bg-white border-slate-300 text-slate-700"
                      : "bg-slate-800 border-slate-700 text-slate-300"
                    : isLight
                      ? "bg-amber-500/20 border-amber-500/40 text-amber-700"
                      : "bg-amber-500/20 border-amber-500/40 text-amber-300"
                }`}
              >
                {isMuted
                  ? lang === "fr"
                    ? "Activer"
                    : "Enable"
                  : lang === "fr"
                    ? "Couper"
                    : "Mute"}
              </button>
            </div>
          </div>
        )}

        {/* ========================================================================= */}
        {/* TAB 3: CONTENT COPY & RULES */}
        {/* ========================================================================= */}
        {activeTab === "content" && (
          <div className="flex flex-col gap-3.5">
            <div
              className={`p-3 rounded-2xl border flex flex-col gap-3 transition-colors ${
                isLight
                  ? "bg-slate-50 border-slate-200 shadow-sm"
                  : "bg-slate-900/90 border-slate-800"
              }`}
            >
              <span
                className={`text-[11px] font-black uppercase tracking-wider ${
                  isLight ? "text-slate-800" : "text-slate-300"
                }`}
              >
                {lang === "fr"
                  ? "Textes et Accents Marketing"
                  : "Marketing Copy & Slogans"}
              </span>

              <div className="flex flex-col gap-1">
                <label
                  className={`text-[10px] font-semibold ${isLight ? "text-slate-600" : "text-slate-400"}`}
                >
                  {lang === "fr"
                    ? "Nom de Marque Affiché"
                    : "Displayed Brand Name"}
                </label>
                <input
                  type="text"
                  value={preset.name}
                  onChange={(e) =>
                    onPresetChange({ ...preset, name: e.target.value })
                  }
                  className={`border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900"
                      : "bg-slate-950 border-slate-800 text-white"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  className={`text-[10px] font-semibold ${isLight ? "text-slate-600" : "text-slate-400"}`}
                >
                  Slogan (English)
                </label>
                <input
                  type="text"
                  value={preset.sloganEn}
                  onChange={(e) =>
                    onPresetChange({ ...preset, sloganEn: e.target.value })
                  }
                  className={`border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900"
                      : "bg-slate-950 border-slate-800 text-white"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  className={`text-[10px] font-semibold ${isLight ? "text-slate-600" : "text-slate-400"}`}
                >
                  Slogan (Français)
                </label>
                <input
                  type="text"
                  value={preset.sloganFr}
                  onChange={(e) =>
                    onPresetChange({ ...preset, sloganFr: e.target.value })
                  }
                  className={`border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900"
                      : "bg-slate-950 border-slate-800 text-white"
                  }`}
                />
              </div>

              <div className="flex flex-col gap-1">
                <label
                  className={`text-[10px] font-semibold ${isLight ? "text-slate-600" : "text-slate-400"}`}
                >
                  Slogan (العربية)
                </label>
                <input
                  type="text"
                  dir="rtl"
                  value={preset.sloganAr}
                  onChange={(e) =>
                    onPresetChange({ ...preset, sloganAr: e.target.value })
                  }
                  className={`border rounded-lg px-2.5 py-1.5 text-xs outline-none focus:border-amber-500 ${
                    isLight
                      ? "bg-white border-slate-300 text-slate-900"
                      : "bg-slate-950 border-slate-800 text-white"
                  }`}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
