import React, { useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
} from "lucide-react";
import { Campaign } from "../types";

interface CampaignAgendaProps {
  campaigns: Campaign[];
}

export const AGENDA_COLORS = [
  "bg-blue-500",
  "bg-pink-500",
  "bg-emerald-500",
  "bg-amber-500",
  "bg-purple-500",
  "bg-cyan-500",
  "bg-rose-500",
  "bg-indigo-500",
  "bg-teal-500",
  "bg-orange-500",
  "bg-fuchsia-500",
  "bg-lime-500",
  "bg-violet-500",
  "bg-red-500",
  "bg-sky-500",
  "bg-yellow-500",
];

export const AGENDA_HOVER_GLOWS = [
  "group-hover:shadow-blue-500/50 group-hover:border-blue-500/50",
  "group-hover:shadow-pink-500/50 group-hover:border-pink-500/50",
  "group-hover:shadow-emerald-500/50 group-hover:border-emerald-500/50",
  "group-hover:shadow-amber-500/50 group-hover:border-amber-500/50",
  "group-hover:shadow-purple-500/50 group-hover:border-purple-500/50",
  "group-hover:shadow-cyan-500/50 group-hover:border-cyan-500/50",
  "group-hover:shadow-rose-500/50 group-hover:border-rose-500/50",
  "group-hover:shadow-indigo-500/50 group-hover:border-indigo-500/50",
  "group-hover:shadow-teal-500/50 group-hover:border-teal-500/50",
  "group-hover:shadow-orange-500/50 group-hover:border-orange-500/50",
  "group-hover:shadow-fuchsia-500/50 group-hover:border-fuchsia-500/50",
  "group-hover:shadow-lime-500/50 group-hover:border-lime-500/50",
  "group-hover:shadow-violet-500/50 group-hover:border-violet-500/50",
  "group-hover:shadow-red-500/50 group-hover:border-red-500/50",
  "group-hover:shadow-sky-500/50 group-hover:border-sky-500/50",
  "group-hover:shadow-yellow-500/50 group-hover:border-yellow-500/50",
];

export const getCampaignColor = (index: number) => {
  return AGENDA_COLORS[index % AGENDA_COLORS.length];
};

export const getCampaignHoverGlow = (index: number) => {
  return AGENDA_HOVER_GLOWS[index % AGENDA_HOVER_GLOWS.length];
};

export const getCampaignShadowClass = (index: number) => {
  const color = AGENDA_COLORS[index % AGENDA_COLORS.length];
  return color.replace("bg-", "shadow-") + "/20";
};

export const getCampaignBorderClass = (index: number) => {
  const color = AGENDA_COLORS[index % AGENDA_COLORS.length];
  return color.replace("bg-", "border-") + "/30";
};

export const CampaignAgenda: React.FC<CampaignAgendaProps> = ({
  campaigns,
}) => {
  const [currentDate, setCurrentDate] = useState(new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const monthName = currentDate.toLocaleString("default", { month: "long" });

  // Generate days
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday

  const days = [];
  for (let i = 0; i < firstDay; i++) {
    days.push(null);
  }
  for (let i = 1; i <= daysInMonth; i++) {
    const dStr = `${year}-${String(month + 1).padStart(2, "0")}-${String(i).padStart(2, "0")}`;
    days.push({ day: i, dateString: dStr });
  }

  // Helper to check if a date string falls within a campaign
  const getActiveCampaignsForDate = (dateString: string) => {
    return campaigns.filter((camp) => {
      return dateString >= camp.startDate && dateString <= camp.endDate;
    });
  };

  return (
    <div className="glass-panel rounded-xl p-3 mt-4">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-1.5">
          <CalendarIcon className="w-4 h-4 text-blue-500" />
          <h3 className="font-bold text-sm text-white">Campaign Agenda</h3>
        </div>
        <div className="flex items-center gap-4 bg-card-bg-subtle rounded-xl p-1 border border-brand-border">
          <button
            onClick={prevMonth}
            className="p-1.5 hover:bg-white/10 rounded-lg text-brand-textMuted hover:text-white transition-colors"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-bold w-28 text-center">
            {monthName} {year}
          </span>
          <button
            onClick={nextMonth}
            className="p-1.5 hover:bg-white/10 rounded-lg text-brand-textMuted hover:text-white transition-colors"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>

      <div className="grid grid-cols-7 gap-2">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
          <div
            key={dayName}
            className="text-center text-[10px] font-bold text-brand-textMuted uppercase tracking-wider py-2"
          >
            {dayName}
          </div>
        ))}

        {days.map((dayObj, index) => {
          if (!dayObj) {
            return (
              <div
                key={`empty-${index}`}
                className="min-h-[24px] rounded bg-white/5 border border-transparent opacity-50"
              />
            );
          }

          const activeCamps = getActiveCampaignsForDate(dayObj.dateString);

          return (
            <div
              key={dayObj.dateString}
              className={`min-h-[24px] p-0.5 rounded border flex flex-col items-center justify-center ${activeCamps.length > 0 ? "bg-card-bg-subtle border-brand-border" : "bg-transparent border-transparent"} transition-colors relative group hover:border-brand-textMuted/30`}
            >
              <span
                className={`text-[8px] font-bold ${activeCamps.length > 0 ? "text-white" : "text-brand-textMuted"}`}
              >
                {dayObj.day}
              </span>

              <div className="flex flex-col gap-[1px] w-full mt-auto">
                {activeCamps.slice(0, 3).map((camp) => (
                  <div
                    key={camp.id}
                    className={`w-full h-0.5 rounded-full ${getCampaignColor(campaigns.findIndex((c) => c.id === camp.id))} opacity-80 group-hover:opacity-100 transition-opacity`}
                    title={camp.name}
                  />
                ))}
                {activeCamps.length > 3 && (
                  <span className="text-[6px] text-brand-textMuted text-center font-bold">
                    +{activeCamps.length - 3}
                  </span>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Legend */}
      {campaigns.length > 0 && (
        <div className="flex flex-wrap gap-3 mt-3 pt-2 border-t border-brand-border/40">
          {campaigns.slice(0, 6).map((camp) => (
            <div key={camp.id} className="flex items-center gap-1.5">
              <div
                className={`w-2 h-2 rounded-full ${getCampaignColor(campaigns.findIndex((c) => c.id === camp.id))}`}
              />
              <span className="text-[9px] font-semibold text-brand-textMuted uppercase">
                {camp.name}
              </span>
            </div>
          ))}
          {campaigns.length > 6 && (
            <span className="text-[10px] font-semibold text-brand-textMuted uppercase">
              +{campaigns.length - 6} more
            </span>
          )}
        </div>
      )}
    </div>
  );
};
