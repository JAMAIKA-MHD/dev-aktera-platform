import React from "react";
import { AkteraBrandPreset } from "./aktera-presets";
import { AkteraLang } from "./aktera-i18n";
import {
  AkteraPhoneSimulator,
  AkteraScreenId,
  AkteraMechanicId,
} from "./AkteraPhoneSimulator";

interface PlayerEditorCanvasProps {
  deviceType: "desktop" | "tablet" | "mobile";
  preset: AkteraBrandPreset;
  lang: AkteraLang;
  mode?: "dark" | "light";
  activeScreen: AkteraScreenId;
  onChangeScreen: (screen: AkteraScreenId) => void;
  mechanic: AkteraMechanicId;
  inspectorMode: boolean;
  onOpenTerms?: () => void;
}

export function PlayerEditorCanvas({
  deviceType,
  preset,
  lang,
  mode = "dark",
  activeScreen,
  onChangeScreen,
  mechanic,
  inspectorMode,
  onOpenTerms,
}: PlayerEditorCanvasProps) {
  const isLight = mode === "light";

  return (
    <div
      className={`flex-1 flex flex-col items-center justify-center overflow-y-auto p-4 sm:p-6 relative select-none transition-colors duration-300 ${
        isLight ? "bg-[#F1F5F9]" : "bg-[#070D18]"
      }`}
    >
      {/* Ambient background glow matching brand primary color */}
      <div
        className="absolute w-96 h-96 rounded-full blur-3xl opacity-15 pointer-events-none transition-all duration-700"
        style={{ background: preset.primaryColor }}
      />

      {/* Simulator Frame Container */}
      <div className="relative flex items-center justify-center z-10">
        <AkteraPhoneSimulator
          preset={preset}
          lang={lang}
          mode={mode}
          activeScreen={activeScreen}
          onChangeScreen={onChangeScreen}
          mechanic={mechanic}
          inspectorMode={inspectorMode}
          onOpenTerms={onOpenTerms}
        />
      </div>

      {/* Studio Footer Indicator */}
      <div className="mt-3 text-center pointer-events-none z-10">
        <span
          className={`text-[10px] uppercase font-bold tracking-widest transition-colors ${
            isLight ? "text-slate-400" : "text-slate-500 opacity-80"
          }`}
        >
          Aktera Campaign Studio • 8-Slot Mobile Grammar Standard
        </span>
      </div>
    </div>
  );
}
