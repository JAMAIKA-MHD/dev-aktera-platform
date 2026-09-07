import React, { useState, useEffect } from "react";
import { Wifi, Battery, Signal } from "lucide-react";
import { SOFT_UI_THEME } from "../theme/tokens";

export type DeviceFrameType = "mobile" | "tablet" | "desktop";

interface DeviceFrameProps {
  deviceType: DeviceFrameType;
  width: number;
  height: number;
  children: React.ReactNode;
  campaignSlug?: string;
}

export const DeviceFrame: React.FC<DeviceFrameProps> = ({
  deviceType,
  width,
  height,
  children,
  campaignSlug = "campaign",
}) => {
  const [time, setTime] = useState("11:12");

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      const hours = now.getHours().toString().padStart(2, "0");
      const minutes = now.getMinutes().toString().padStart(2, "0");
      setTime(`${hours}:${minutes}`);
    };
    updateTime();
    const interval = setInterval(updateTime, 60000);
    return () => clearInterval(interval);
  }, []);

  // 1. MOBILE PHONE FRAME (Clean Soft UI smartphone with Dynamic Island & Status Bar)
  if (deviceType === "mobile") {
    return (
      <div
        className="relative flex flex-col items-center justify-center select-none"
        style={{ width: `${width + 24}px`, height: `${height + 72}px` }}
      >
        {/* Outer Phone Shell & Bezel */}
        <div
          className="relative w-full h-full bg-[#FFFFFF] border-[8px] border-[#E2E8F0] rounded-[48px] flex flex-col overflow-hidden transition-all duration-200"
          style={{
            boxShadow:
              "0 20px 48px rgba(163, 177, 198, 0.4), 0 0 0 1px rgba(226, 232, 240, 0.8)",
          }}
        >
          {/* Dynamic Island Notch */}
          <div className="absolute top-2.5 left-1/2 -translate-x-1/2 w-28 h-6 bg-[#1E293B] rounded-full flex items-center justify-between px-3 z-50 pointer-events-none shadow-sm">
            <div className="w-2.5 h-2.5 rounded-full bg-[#0F172A] border border-[#334155] flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-[#3B82F6]" />
            </div>
            <div className="w-8 h-1 bg-[#334155] rounded-full" />
          </div>

          {/* Smartphone Status Bar */}
          <div className="h-8 pt-1.5 px-6 flex items-center justify-between text-[11px] font-semibold text-[#64748B] select-none bg-white/90 z-40 shrink-0">
            <span className="font-mono text-xs font-bold text-[#1E293B]">
              {time}
            </span>
            <div className="flex items-center gap-2">
              <Signal className="w-3 h-3 text-[#64748B] stroke-[2.5]" />
              <span className="text-[9px] font-bold text-[#64748B]">5G</span>
              <Wifi className="w-3.5 h-3.5 text-[#64748B] stroke-[2.5]" />
              <Battery className="w-4 h-4 text-[#64748B] stroke-[2]" />
            </div>
          </div>

          {/* Screen Canvas Host */}
          <div className="flex-1 relative overflow-hidden bg-[#F0F2F5] flex flex-col">
            {children}
          </div>

          {/* Bottom iOS Home Indicator Bar */}
          <div className="h-4 pb-1 flex items-center justify-center bg-white/90 select-none z-40 shrink-0">
            <div className="w-32 h-1 bg-[#CBD5E1] rounded-full" />
          </div>
        </div>
      </div>
    );
  }

  // 2. TABLET FRAME
  if (deviceType === "tablet") {
    return (
      <div
        className="relative flex flex-col items-center justify-center select-none"
        style={{ width: `${width + 36}px`, height: `${height + 36}px` }}
      >
        {/* Tablet Outer Shell */}
        <div
          className="relative w-full h-full bg-[#FFFFFF] border-[14px] border-[#E2E8F0] rounded-[36px] flex flex-col overflow-hidden"
          style={{
            boxShadow:
              "0 20px 48px rgba(163, 177, 198, 0.4), 0 0 0 1px rgba(226, 232, 240, 0.8)",
          }}
        >
          {/* Top Bezel Camera Dot */}
          <div className="absolute top-2 left-1/2 -translate-x-1/2 flex items-center gap-1.5 z-50 pointer-events-none">
            <div className="w-2.5 h-2.5 rounded-full bg-[#334155] border border-[#64748B] flex items-center justify-center">
              <div className="w-1 h-1 rounded-full bg-[#3B82F6]" />
            </div>
          </div>

          {/* Screen Canvas Area */}
          <div className="flex-1 relative overflow-hidden bg-[#F0F2F5] rounded-[18px]">
            {children}
          </div>
        </div>
      </div>
    );
  }

  // 3. DESKTOP / BROWSER MONITOR FRAME
  return (
    <div
      className="relative flex flex-col select-none"
      style={{ width: `${width + 20}px`, height: `${height + 56}px` }}
    >
      {/* Desktop Browser Shell */}
      <div
        className="relative w-full h-full bg-[#FFFFFF] border border-[#E2E8F0] rounded-2xl flex flex-col overflow-hidden"
        style={{
          boxShadow:
            "0 20px 48px rgba(163, 177, 198, 0.35), 0 0 0 1px rgba(226, 232, 240, 0.8)",
        }}
      >
        {/* Browser Topbar */}
        <div className="h-9 px-4 bg-[#F8FAFC] border-b border-[#E2E8F0] flex items-center justify-between shrink-0">
          {/* Window Buttons */}
          <div className="flex items-center gap-2">
            <div className="w-3 h-3 rounded-full bg-[#EF4444]/80" />
            <div className="w-3 h-3 rounded-full bg-[#F59E0B]/80" />
            <div className="w-3 h-3 rounded-full bg-[#10B981]/80" />
          </div>

          {/* URL Search Pill */}
          <div className="px-6 py-1 rounded-lg bg-white border border-[#E2E8F0] text-[11px] font-mono text-[#64748B] flex items-center gap-2 max-w-sm w-full justify-center shadow-sm">
            <i className="fa-solid fa-lock text-[10px] text-[#10B981]" />
            <span>https://octoreach.app/play/{campaignSlug}</span>
          </div>

          <div className="w-12" />
        </div>

        {/* Screen Canvas Area */}
        <div className="flex-1 relative overflow-hidden bg-[#F0F2F5]">
          {children}
        </div>
      </div>
    </div>
  );
};
