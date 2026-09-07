import React from "react";
import {
  Sparkles,
  Gamepad2,
  UserCheck,
  Trophy,
  Moon,
  Layers,
} from "lucide-react";
import { AkteraLang, AKTERA_I18N } from "./aktera-i18n";
import { playClick } from "./aktera-audio";

export type AkteraScreenType = 1 | 2 | 3 | 4 | 5;

interface PlayerEditorLeftNavProps {
  activeScreen: AkteraScreenType;
  onChangeScreen: (screen: AkteraScreenType) => void;
  lang?: AkteraLang;
  mode?: "dark" | "light";
}

export function PlayerEditorLeftNav({
  activeScreen,
  onChangeScreen,
  lang = "en",
  mode = "dark",
}: PlayerEditorLeftNavProps) {
  const t = AKTERA_I18N[lang];
  const isLight = mode === "light";

  const screens = [
    {
      id: 1 as AkteraScreenType,
      num: "01",
      label: t.screens.screen1,
      icon: Sparkles,
      tag: "Teaser",
    },
    {
      id: 2 as AkteraScreenType,
      num: "02",
      label: t.screens.screen2,
      icon: Gamepad2,
      tag: "Slot 5",
    },
    {
      id: 3 as AkteraScreenType,
      num: "03",
      label: t.screens.screen3,
      icon: UserCheck,
      tag: "Conversion",
    },
    {
      id: 4 as AkteraScreenType,
      num: "04",
      label: t.screens.screen4,
      icon: Trophy,
      tag: "Barcode",
    },
    {
      id: 5 as AkteraScreenType,
      num: "05",
      label: t.screens.screen5,
      icon: Moon,
      tag: "Bonus",
    },
  ];

  return (
    <div
      className={`w-64 border-r flex flex-col h-full shrink-0 select-none transition-colors duration-300 ${
        isLight
          ? "bg-white border-slate-200"
          : "bg-[#0A1120] border-slate-800/80"
      }`}
    >
      {/* Header section */}
      <div
        className={`p-4 border-b flex items-center justify-between transition-colors ${
          isLight ? "border-slate-200" : "border-slate-800/80"
        }`}
      >
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-lg bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-500">
            <Layers className="w-3.5 h-3.5" />
          </div>
          <span
            className={`text-xs font-black uppercase tracking-wider ${
              isLight ? "text-slate-800" : "text-slate-200"
            }`}
          >
            {t.studio.screens}
          </span>
        </div>
        <span className="text-[10px] font-mono font-bold text-amber-500 px-1.5 py-0.5 rounded bg-amber-500/10 border border-amber-500/20">
          {lang === "fr" ? "5 ÉTAPES" : lang === "ar" ? "5 مراحل" : "5 STEPS"}
        </span>
      </div>

      {/* Navigation list */}
      <div className="flex-1 p-3 flex flex-col gap-1.5 overflow-y-auto">
        {screens.map((screen) => {
          const isActive = activeScreen === screen.id;

          let btnClass = "";
          if (isActive) {
            btnClass = isLight
              ? "bg-amber-500/10 border-amber-500/60 text-slate-900 shadow-sm translate-x-1"
              : "bg-slate-900 border-amber-500/60 text-white shadow-lg shadow-amber-500/5 translate-x-1";
          } else {
            btnClass = isLight
              ? "border-transparent text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              : "border-transparent text-slate-400 hover:bg-slate-900/50 hover:text-slate-200";
          }

          return (
            <button
              key={screen.id}
              onClick={() => {
                playClick();
                onChangeScreen(screen.id);
              }}
              className={`flex items-center justify-between px-3 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer text-left border ${btnClass}`}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className={`w-6 h-6 rounded-lg flex items-center justify-center text-[10px] font-mono font-extrabold border ${
                    isActive
                      ? "bg-amber-500 text-black border-amber-400"
                      : isLight
                        ? "bg-slate-100 text-slate-600 border-slate-200"
                        : "bg-slate-800/80 text-slate-400 border-slate-700"
                  }`}
                >
                  {screen.num}
                </span>
                <span className="leading-tight line-clamp-1">
                  {screen.label}
                </span>
              </div>

              <span
                className={`text-[9px] font-mono font-semibold px-1.5 py-0.5 rounded ${
                  isActive
                    ? "bg-amber-500/20 text-amber-600 border border-amber-500/30"
                    : isLight
                      ? "bg-slate-100 text-slate-500"
                      : "bg-slate-800/50 text-slate-500"
                }`}
              >
                {screen.tag}
              </span>
            </button>
          );
        })}
      </div>

      {/* Footer Info Pill */}
      <div
        className={`p-3 border-t transition-colors ${isLight ? "border-slate-200" : "border-slate-800/80"}`}
      >
        <div
          className={`p-2.5 rounded-xl border text-[10px] font-medium flex items-center gap-2 ${
            isLight
              ? "bg-slate-50 border-slate-200 text-slate-600"
              : "bg-slate-900/60 border-slate-800 text-slate-400"
          }`}
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
          <span>
            {lang === "fr"
              ? "Grammaire 8-Slots Synchronisée"
              : lang === "ar"
                ? "نظام 8-Slots متزامن"
                : "8-Slot Grammar Synchronized"}
          </span>
        </div>
      </div>
    </div>
  );
}
