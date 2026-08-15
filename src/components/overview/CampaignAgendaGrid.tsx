import React, { useState, useRef } from "react";
import {
  CAMPAIGN_AGENDA_GRID,
  AGENDA_TIME_LABELS,
  AgendaDaySchedule,
  AgendaTimeSlot,
  AvailableCampaignInfo,
} from "./OverviewMockData";
import { Campaign } from "../../types";
import { useTheme } from "../../contexts/ThemeContext";

interface CampaignAgendaGridProps {
  campaigns?: Campaign[];
}

export const CampaignAgendaGrid: React.FC<CampaignAgendaGridProps> = () => {
  const { theme } = useTheme();
  const isDark = theme === "dark";
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredDay, setHoveredDay] = useState<string | null>(null);
  const [hoveredSlot, setHoveredSlot] = useState<AgendaTimeSlot | null>(null);
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  );

  const getCellClass = (intensity: number) => {
    switch (intensity) {
      case 2:
        // Dark green (5+)
        return "bg-emerald-600 dark:bg-emerald-500 shadow-sm";
      case 1:
        // Medium green (3-)
        return "bg-emerald-300/85 dark:bg-emerald-700/65";
      case 0:
      default:
        // Light mint green / subtle base (0)
        return "bg-emerald-100/50 dark:bg-slate-800/40 hover:bg-emerald-100 dark:hover:bg-slate-700/50";
    }
  };

  const getAvailableCampaignsForDay = (
    schedule: AgendaDaySchedule,
  ): AvailableCampaignInfo[] => {
    if (schedule.availableCampaigns && schedule.availableCampaigns.length > 0) {
      return schedule.availableCampaigns;
    }
    return [];
  };

  const handleMouseMove = (
    e: React.MouseEvent,
    day: string,
    slot?: AgendaTimeSlot,
  ) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    setMousePos({ x, y });
    setHoveredDay(day);
    if (slot) setHoveredSlot(slot);
  };

  const handleMouseLeave = () => {
    setHoveredDay(null);
    setHoveredSlot(null);
    setMousePos(null);
  };

  // Find active hovered day's schedule & available campaigns
  const activeSchedule = hoveredDay
    ? CAMPAIGN_AGENDA_GRID.find((s) => s.day === hoveredDay)
    : null;
  const activeCampaigns = activeSchedule
    ? getAvailableCampaignsForDay(activeSchedule)
    : [];

  return (
    <div
      ref={containerRef}
      className={`rounded-[32px] p-7 sm:p-8 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30 flex flex-col justify-between h-full relative overflow-visible border ${
        isDark
          ? "bg-[#151E30] border-slate-800 text-white"
          : "bg-white border-slate-200 text-slate-900 shadow-sm"
      }`}
    >
      {/* Header with Title, Subtitle, and Legend */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-6">
        <div>
          <h3 className="font-bold text-xl sm:text-2xl text-brand-text">
            Campaign Agenda
          </h3>
          <p className="text-xs sm:text-sm text-brand-textMuted mt-1">
            number of campaigns that has been lunched
          </p>
        </div>

        {/* Legend */}
        <div className="flex items-center gap-5 text-xs sm:text-sm font-bold text-brand-text">
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-600 shrink-0"></span>
            <span>5+</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-3.5 h-3.5 rounded-full bg-emerald-300 shrink-0"></span>
            <span>3-</span>
          </div>
          <div className="flex items-center gap-2">
            <span
              className={`w-3.5 h-3.5 rounded-full shrink-0 ${
                isDark ? "bg-slate-700" : "bg-slate-200"
              }`}
            ></span>
            <span>0</span>
          </div>
        </div>
      </div>

      {/* Heatmap Grid */}
      <div className="w-full overflow-x-auto relative">
        <div className="min-w-[550px]">
          {/* Hour labels row */}
          <div className="grid grid-cols-12 gap-1 mb-2 pl-14">
            {AGENDA_TIME_LABELS.map((label, idx) => (
              <span
                key={idx}
                className="text-[10px] sm:text-xs font-bold text-brand-textMuted text-center select-none"
              >
                {label}
              </span>
            ))}
          </div>

          {/* Grid rows by day */}
          <div className="space-y-1.5">
            {CAMPAIGN_AGENDA_GRID.map((daySchedule) => (
              <div
                key={daySchedule.day}
                className="flex items-center gap-2 group/row"
              >
                {/* Day label */}
                <span className="w-12 text-xs sm:text-sm font-bold text-brand-text select-none text-left">
                  {daySchedule.day}
                </span>

                {/* 12-Slot grid cells */}
                <div className="grid grid-cols-12 gap-1.5 flex-1">
                  {daySchedule.slots.map((slot, sIdx) => {
                    const cellClass = getCellClass(slot.intensity);
                    return (
                      <div
                        key={sIdx}
                        onMouseEnter={(e) =>
                          handleMouseMove(e, daySchedule.day, slot)
                        }
                        onMouseMove={(e) =>
                          handleMouseMove(e, daySchedule.day, slot)
                        }
                        onMouseLeave={handleMouseLeave}
                        className={`h-7 sm:h-8 rounded-lg cursor-pointer transition-all duration-150 transform hover:scale-105 ${cellClass}`}
                      />
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* HOVER POPOVER */}
      {hoveredDay &&
        activeSchedule &&
        activeCampaigns.length > 0 &&
        mousePos && (
          <div
            style={{
              left: `${Math.min(
                Math.max(mousePos.x - 20, 10),
                (containerRef.current?.offsetWidth || 600) - 300,
              )}px`,
              top: `${mousePos.y > 160 ? mousePos.y - 130 : mousePos.y + 20}px`,
            }}
            className={`absolute z-50 rounded-2xl p-3.5 min-w-[240px] max-w-[300px] pointer-events-none transition-all duration-75 ease-out animate-in fade-in zoom-in-95 border ${
              isDark
                ? "bg-[#151E30] border-slate-700 text-white shadow-2xl"
                : "bg-white border-slate-200 text-slate-900 shadow-xl"
            }`}
          >
            {/* Popover Header */}
            <div
              className={`flex items-center justify-between gap-2 pb-2 mb-2 border-b ${
                isDark ? "border-slate-800" : "border-slate-100"
              }`}
            >
              <span className="text-xs font-black text-brand-text">
                {hoveredDay}{" "}
                {hoveredSlot ? `(${hoveredSlot.timeLabel})` : "Campaigns"}
              </span>
              <span className="px-2 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-100 dark:bg-emerald-950/70 text-emerald-600 dark:text-emerald-400">
                {activeCampaigns.length} live
              </span>
            </div>

            {/* Campaign List */}
            <div className="space-y-2">
              {activeCampaigns.map((camp, cIdx) => (
                <div
                  key={cIdx}
                  className={`flex flex-col gap-0.5 p-2 rounded-xl border ${
                    isDark
                      ? "bg-slate-800/60 border-slate-700/60"
                      : "bg-slate-50 border-slate-100"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-brand-text truncate">
                      {camp.name}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0"></span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-brand-textMuted font-medium">
                    <span>{camp.type || "Campaign"}</span>
                    <span>{camp.timeWindow || "All Day"}</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
    </div>
  );
};
