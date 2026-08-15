import React from "react";
import { BrandPreset, ScreenType, PlayerData } from "../types";
import {
  Smartphone,
  Sparkles,
  Sliders,
  HelpCircle,
  FileText,
  CheckCircle,
} from "lucide-react";

interface ControlPanelProps {
  brandPresets: BrandPreset[];
  activeBrand: BrandPreset;
  onSelectBrand: (brand: BrandPreset) => void;
  activeScreen: ScreenType;
  onChangeScreen: (screen: ScreenType) => void;
  playerData: PlayerData;
  hypeMode: boolean;
  onToggleHypeMode: () => void;
  forcedOutcome: "win" | "lose" | "random";
  onSetForcedOutcome: (outcome: "win" | "lose" | "random") => void;
}

export const ControlPanel: React.FC<ControlPanelProps> = ({
  brandPresets,
  activeBrand,
  onSelectBrand,
  activeScreen,
  onChangeScreen,
  playerData,
  hypeMode,
  onToggleHypeMode,
  forcedOutcome,
  onSetForcedOutcome,
}) => {
  return (
    <div
      id="control-panel-root"
      className="w-full lg:max-w-md bg-gradient-to-br from-[#1F1F2E] to-[#161625] border border-[#2D2D3F] rounded-2xl p-6 flex flex-col gap-6 backdrop-blur-xl shadow-2xl overflow-y-auto max-h-[92vh]"
    >
      {/* Designer desk brand header */}
      <div
        id="designer-header"
        className="flex items-center justify-between border-b border-[#2D2D3F] pb-4"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 bg-violet-600/25 rounded-2xl border border-violet-500/20 text-violet-400">
            <Sliders className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-slate-100 tracking-tight font-sans">
              Aktera
            </h1>
            <p className="text-xs text-slate-400 font-sans">
              UI/UX Designer Desk
            </p>
          </div>
        </div>
        <div
          id="hype-badge"
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold select-none transition-all duration-300 ${hypeMode ? "bg-[#6366F1]/20 border border-[#6366F1]/40 text-indigo-300 shadow-[0_0_15px_rgba(124,58,237,0.15)]" : "bg-[#0F0F1A] text-slate-500 border border-[#2D2D3F]"}`}
        >
          <Sparkles className="w-3.5 h-3.5 animate-pulse" />
          <span>{hypeMode ? "HYPE glow ON" : "PREVIEW MODE"}</span>
        </div>
      </div>

      {/* 1. B2B BRAND PRESETS SELECTOR */}
      <div id="brand-selector-section" className="flex flex-col gap-3">
        <label className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
          <span>1. Select Algerian Brand Preset</span>
          <span className="text-[10px] text-violet-400 lowercase">
            (instant palette shift)
          </span>
        </label>
        <div className="grid grid-cols-2 gap-2">
          {brandPresets.map((brand) => {
            const isActive = brand.id === activeBrand.id;
            return (
              <button
                key={brand.id}
                id={`brand-btn-${brand.id}`}
                onClick={() => onSelectBrand(brand)}
                className={`flex items-center gap-3 p-3 rounded-2xl border text-left transition-all duration-300 cursor-pointer min-h-12 relative overflow-hidden group ${
                  isActive
                    ? "bg-[#0F0F1A] border-[#6366F1] shadow-md ring-2 ring-[#6366F1]/30"
                    : "bg-[#0F0F1A]/50 hover:bg-[#0F0F1A] border-[#2D2D3F] hover:border-slate-600"
                }`}
              >
                {/* Visual colored pill indicator */}
                <span
                  className="w-3 h-3 rounded-full flex-shrink-0 border border-white/20 transition-transform duration-300 group-hover:scale-125"
                  style={{ backgroundColor: brand.primaryColor }}
                />
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-bold text-slate-200 truncate">
                    {brand.name}
                  </p>
                  <p className="text-[10px] text-slate-400 truncate font-sans">
                    {brand.arabicName}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* 2. MANUAL SCREEN NAVIGATION FOR INSPECTION */}
      <div id="screen-navigation-section" className="flex flex-col gap-3">
        <label className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono flex items-center gap-1.5">
          <span>2. Manual Screen Inspection</span>
          <span className="text-[10px] text-violet-400 lowercase">
            (dev overrides)
          </span>
        </label>
        <div className="grid grid-cols-3 gap-2 bg-[#0F0F1A] p-1.5 rounded-2xl border border-[#2D2D3F]">
          {(["landing", "game", "result"] as ScreenType[]).map((screen) => {
            const isActive = activeScreen === screen;
            return (
              <button
                key={screen}
                id={`nav-btn-${screen}`}
                onClick={() => onChangeScreen(screen)}
                className={`py-2 rounded-2xl text-xs font-semibold capitalize transition-all duration-200 cursor-pointer ${
                  isActive
                    ? "bg-[#6366F1] text-white shadow-lg"
                    : "text-slate-400 hover:text-slate-200 hover:bg-[#1F1F2E]/50"
                }`}
              >
                {screen}
              </button>
            );
          })}
        </div>
      </div>

      {/* 3. SIMULATED OUTCOME */}
      <div id="spin-outcome-section" className="flex flex-col gap-3">
        <label className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono">
          3. Configure Wheel Outcome
        </label>
        <div className="grid grid-cols-3 gap-2">
          {(
            [
              { id: "random", label: "Random 🎰" },
              { id: "win", label: "Force Win 🏆" },
              { id: "lose", label: "Force Lose ❌" },
            ] as const
          ).map((opt) => {
            const isActive = forcedOutcome === opt.id;
            return (
              <button
                key={opt.id}
                id={`outcome-btn-${opt.id}`}
                onClick={() => onSetForcedOutcome(opt.id)}
                className={`py-2 px-1 rounded-2xl text-[11px] font-semibold transition-all duration-200 cursor-pointer border ${
                  isActive
                    ? "bg-[#1F1F2E] border-[#2D2D3F] text-emerald-400 shadow-sm font-bold"
                    : "bg-[#0F0F1A] hover:bg-[#1F1F2E] border-[#2D2D3F]/60 text-slate-400 hover:text-slate-350"
                }`}
              >
                {opt.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* 4. RE-AUTHENTICATION & PLAYER TELEMETRY */}
      <div
        id="player-telemetry-section"
        className="bg-[#0F0F1A] border border-[#2D2D3F] rounded-2xl p-4 flex flex-col gap-3"
      >
        <p className="text-xs font-bold text-slate-400 tracking-wider uppercase font-mono flex items-center gap-1.5 border-b border-[#2D2D3F] pb-2">
          <span>Live Player Telemetry</span>
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse ml-auto" />
        </p>
        <div className="grid grid-cols-2 gap-4 text-xs">
          <div>
            <p className="text-slate-500 font-mono text-[10px] uppercase">
              Registered Name
            </p>
            <p className="text-slate-200 font-semibold truncate mt-0.5">
              {playerData.name || "Anonymous"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 font-mono text-[10px] uppercase">
              Phone Number
            </p>
            <p className="text-slate-200 font-semibold font-mono mt-0.5">
              {playerData.phone || "No Data"}
            </p>
          </div>
          <div>
            <p className="text-slate-500 font-mono text-[10px] uppercase">
              Legal Consent Check
            </p>
            <p className="font-semibold mt-0.5 flex items-center gap-1">
              {playerData.consent ? (
                <>
                  <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Granted</span>
                </>
              ) : (
                <span className="text-slate-500">Not Accepted</span>
              )}
            </p>
          </div>
          <div>
            <p className="text-slate-500 font-mono text-[10px] uppercase">
              Theme Constraint
            </p>
            <span className="text-violet-400 font-semibold mt-0.5 block">
              #0F0F1A Dark
            </span>
          </div>
        </div>
      </div>

      {/* 5. INTERACTIVE EYE CANDY - HYPE MODE */}
      <div
        id="hype-mode-toggle-section"
        className="flex items-center justify-between bg-gradient-to-r from-indigo-950/40 to-violet-950/30 border border-indigo-500/10 rounded-2xl p-4"
      >
        <div className="flex flex-col">
          <p className="text-xs font-bold text-indigo-200 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            <span>Enable Hype Glow</span>
          </p>
          <p className="text-[10px] text-indigo-400 font-sans mt-0.5">
            Toggle live ambient particles & glowing neon shadows
          </p>
        </div>
        <button
          id="hype-toggle-switch"
          onClick={onToggleHypeMode}
          className={`relative w-12 h-6 rounded-full transition-colors duration-300 cursor-pointer ${
            hypeMode ? "bg-indigo-500" : "bg-[#0F0F1A]"
          }`}
        >
          <div
            className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-md transition-transform duration-300 ${
              hypeMode ? "transform translate-x-6" : ""
            }`}
          />
        </button>
      </div>

      {/* 6. DESIGN COMPLIANCE CHECKLIST */}
      <div
        id="compliance-checklist"
        className="border-t border-[#2D2D3F] pt-4 flex flex-col gap-2.5"
      >
        <h4 className="text-xs font-bold text-slate-300 font-mono flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-violet-400" />
          <span>Aesthetic Guidelines Met</span>
        </h4>
        <ul className="text-[11px] text-slate-400 flex flex-col gap-1.5 pl-1">
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5 font-bold">✓</span>
            <span>
              <strong className="text-slate-300">Dark Theme First</strong>: Core
              interface builds strictly on rich{" "}
              <code className="bg-[#0F0F1A] px-1.5 py-0.5 rounded border border-[#2D2D3F] text-violet-300 font-mono">
                #0F0F1A
              </code>{" "}
              background to prevent eye fatigue.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5 font-bold">✓</span>
            <span>
              <strong className="text-slate-300">Large Touch Targets</strong>:
              Primary CTAs, input boxes, and checks run strictly at{" "}
              <code className="bg-[#0F0F1A] px-1.5 py-0.5 rounded border border-[#2D2D3F] text-violet-300 font-mono">
                min-h-12
              </code>{" "}
              (48px+) for accurate mobile thumb clicks.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5 font-bold">✓</span>
            <span>
              <strong className="text-slate-300">Strictly Mobile-First</strong>:
              Player views lock to a centered{" "}
              <code className="bg-[#0F0F1A] px-1.5 py-0.5 rounded border border-[#2D2D3F] text-violet-300 font-mono">
                max-w-[480px]
              </code>{" "}
              shell. Fully responsive, adapting beautifully on physical
              touchscreens.
            </span>
          </li>
          <li className="flex items-start gap-2">
            <span className="text-emerald-500 mt-0.5 font-bold">✓</span>
            <span>
              <strong className="text-slate-300">
                Legal Compliance (Loi 18-07)
              </strong>
              : Explicit consent checkbox strictly controls playability to
              guarantee regulatory compliance in Algeria.
            </span>
          </li>
        </ul>
      </div>
    </div>
  );
};
