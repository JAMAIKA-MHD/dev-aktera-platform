import React, { useState, useEffect } from "react";
import { Wifi, Battery, Signal } from "lucide-react";

interface PhoneFrameProps {
  children: React.ReactNode;
  compact?: boolean;
}

export const PhoneFrame: React.FC<PhoneFrameProps> = ({
  children,
  compact = false,
}) => {
  const [time, setTime] = useState("");

  useEffect(() => {
    const updateClock = () => {
      const now = new Date();
      let hours = now.getHours();
      let minutes = now.getMinutes().toString().padStart(2, "0");
      setTime(`${hours}:${minutes}`);
    };
    updateClock();
    const interval = setInterval(updateClock, 60000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div
      id="phone-frame-container"
      className={
        compact
          ? "relative flex items-center justify-center p-0 w-full max-w-[320px] sm:max-w-[335px] mx-auto h-full min-h-0"
          : "relative flex items-center justify-center p-0 md:p-6 lg:p-8 xl:p-10 w-full max-w-[500px] mx-auto"
      }
    >
      {/* Outer Phone Bezel & Body (Desktop Only, Responsive) */}
      <div
        id="phone-device-shell"
        className={
          compact
            ? "relative w-full h-[650px] max-h-[calc(100vh-70px)] bg-[#09090F] border-[7px] sm:border-[8px] border-[#1E1E2E] rounded-[40px] shadow-[0_0_40px_rgba(0,0,0,0.6)] flex flex-col overflow-hidden transition-all duration-300 ease-out"
            : "relative w-full h-[880px] max-h-[92vh] md:max-h-[880px] bg-[#09090F] border-4 border-[#2D2D3F]/70 rounded-[48px] shadow-[0_0_80px_rgba(124,58,237,0.15)] flex flex-col overflow-hidden transition-all duration-500 ease-out md:border-[12px] md:border-[#1E1E2E]"
        }
      >
        {/* Dynamic Screen Glare Accent */}
        <div
          id="screen-glare-overlay"
          className="absolute top-0 right-0 w-[150%] h-[150%] bg-gradient-to-tr from-transparent via-white/[0.01] to-white/[0.04] rounded-[48px] pointer-events-none z-40"
        />

        {/* Dynamic Glowing Border for Premium Effect */}
        <div
          id="phone-glow-outline"
          className="absolute inset-0 border border-violet-500/10 rounded-[36px] pointer-events-none z-30"
        />

        {/* Dynamic Notch / Island */}
        <div
          id="phone-dynamic-island"
          className={
            compact
              ? "absolute top-0 left-1/2 transform -translate-x-1/2 w-22 h-[20px] bg-[#000000] rounded-b-xl flex items-center justify-center gap-1 px-2 z-50 pointer-events-none"
              : "absolute top-0 left-1/2 transform -translate-x-1/2 w-32 h-[30px] bg-[#000000] rounded-b-2xl flex items-center justify-center gap-1.5 px-3 z-50 pointer-events-none"
          }
        >
          <div className="w-2.5 h-2.5 rounded-full bg-[#111] border border-zinc-800 flex items-center justify-center">
            <div className="w-1 h-1 rounded-full bg-indigo-950/80" />
          </div>
          <div className="w-6 h-1 bg-[#111] rounded-full" />
        </div>

        {/* Native Smartphone Status Bar */}
        <div
          id="phone-status-bar"
          className={
            compact
              ? "h-8 pt-1 px-4 flex items-center justify-between text-[10px] font-semibold text-zinc-400 select-none bg-[#0F0F1A] border-b border-white/[0.02] z-40"
              : "h-10 pt-2 px-6 flex items-center justify-between text-[11px] font-semibold text-zinc-400 select-none bg-[#0F0F1A] border-b border-white/[0.02] z-40"
          }
        >
          <span className="font-medium font-sans text-xs tracking-wide">
            {time || "13:16"}
          </span>
          <div className="flex items-center gap-2">
            <Signal className="w-3 h-3 text-zinc-400 stroke-[2.5]" />
            <Wifi className="w-3 h-3 text-zinc-400 stroke-[2.5]" />
            <div className="flex items-center gap-0.5">
              <span className="text-[8px] mr-0.5 text-zinc-500 font-sans">
                4G
              </span>
              <Battery className="w-3.5 h-3.5 text-zinc-400 stroke-[2]" />
            </div>
          </div>
        </div>

        {/* Actual Mobile Screen Area */}
        <div
          id="phone-screen-content"
          className="flex-1 flex flex-col relative overflow-y-auto bg-[#0F0F1A] z-20 scrollbar-thin"
        >
          {children}
        </div>

        {/* Simulated iOS Home Indicator */}
        <div
          id="phone-home-indicator-bar"
          className="h-3 pb-1 flex items-center justify-center bg-[#0F0F1A] select-none z-40"
        >
          <div
            className={
              compact
                ? "w-20 h-0.5 bg-zinc-600 rounded-full opacity-60"
                : "w-32 h-1 bg-zinc-600 rounded-full opacity-60"
            }
          />
        </div>
      </div>
    </div>
  );
};
