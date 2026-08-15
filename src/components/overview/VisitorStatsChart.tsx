import React, { useState, useRef } from "react";
import { useTheme } from "../../contexts/ThemeContext";
import {
  VISITOR_HISTOGRAM_DATA,
  VisitorHistogramBar,
} from "./OverviewMockData";
import { Campaign } from "../../types";

interface VisitorStatsChartProps {
  campaigns?: Campaign[];
  onMoreDetails?: () => void;
}

export const VisitorStatsChart: React.FC<VisitorStatsChartProps> = ({
  campaigns: _campaigns = [],
  onMoreDetails,
}) => {
  const { theme } = useTheme();
  const isDark = theme === "dark";

  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredBar, setHoveredBar] = useState<VisitorHistogramBar | null>(
    null,
  );
  const [mousePos, setMousePos] = useState<{ x: number; y: number } | null>(
    null,
  );

  // Hardcoded histogram data representing the example visitor distribution
  const data: VisitorHistogramBar[] = VISITOR_HISTOGRAM_DATA;

  // SVG Chart Dimensions
  const width = 720;
  const height = 310;
  const paddingLeft = 70;
  const paddingRight = 40;
  const paddingTop = 30;
  const paddingBottom = 45;

  const chartWidth = width - paddingLeft - paddingRight;
  const chartHeight = height - paddingTop - paddingBottom;
  const maxY = 2500;

  const yTicks = [2500, 2000, 1500, 1000, 500, 100];

  const getBarX = (index: number) => {
    const totalBars = data.length;
    const barSpacing = chartWidth / totalBars;
    return paddingLeft + index * barSpacing + barSpacing * 0.15;
  };

  const getBarWidth = () => {
    const totalBars = data.length;
    return (chartWidth / totalBars) * 0.7;
  };

  const getBarHeight = (visitors: number) => {
    return Math.min(chartHeight, (visitors / maxY) * chartHeight);
  };

  const getBarY = (visitors: number) => {
    return paddingTop + chartHeight - getBarHeight(visitors);
  };

  const handleMouseMove = (e: React.MouseEvent, bar: VisitorHistogramBar) => {
    if (!containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setMousePos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
    setHoveredBar(bar);
  };

  const handleMouseLeave = () => {
    setHoveredBar(null);
    setMousePos(null);
  };

  // Colors
  const textFill = isDark ? "#FFFFFF" : "#64748B";
  const gridStroke = isDark
    ? "rgba(255, 255, 255, 0.08)"
    : "rgba(0, 0, 0, 0.06)";
  const defaultBarFill = isDark ? "#94D3C9" : "#A7E1D8";
  const activeBarFill = isDark ? "#0D9488" : "#00897B";

  return (
    <div
      ref={containerRef}
      className="backdrop-blur-xl bg-card-bg/90 dark:bg-[#111726]/80 border border-card-border/80 dark:border-white/10 rounded-[32px] p-7 sm:p-8 transition-all duration-300 hover:shadow-xl hover:shadow-blue-500/5 hover:border-blue-500/30 flex flex-col justify-between h-full relative overflow-visible"
    >
      {/* Top Header: Title, Subtitle, and More Details Button */}
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="font-bold text-xl sm:text-2xl text-brand-text">
            Visitors Stats
          </h3>
          <div className="text-xs font-bold text-brand-text mt-1 leading-tight">
            <div>number of</div>
            <div>visitors</div>
          </div>
        </div>

        {/* More Details Button */}
        <button
          onClick={onMoreDetails}
          className="bg-slate-400 hover:bg-slate-500 dark:bg-slate-700/80 dark:hover:bg-slate-600 text-white font-bold text-xs sm:text-sm px-4 py-1.5 rounded-xl transition-all shadow-sm cursor-pointer border border-white/5"
        >
          More Details
        </button>
      </div>

      {/* SVG Histogram Chart */}
      <div className="w-full overflow-x-auto relative">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto min-w-[550px] overflow-visible"
        >
          {/* Vertical Dotted Grid Lines per bar column */}
          {data.map((_, idx) => {
            const barX = getBarX(idx) + getBarWidth() / 2;
            return (
              <line
                key={`vert-grid-${idx}`}
                x1={barX}
                y1={paddingTop}
                x2={barX}
                y2={paddingTop + chartHeight}
                stroke={gridStroke}
                strokeDasharray="4 4"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Horizontal Grid lines & Y-Axis Labels */}
          {yTicks.map((val) => {
            const yPos = paddingTop + chartHeight - (val / maxY) * chartHeight;
            const formattedVal = val.toLocaleString("fr-FR");
            return (
              <g key={`y-tick-${val}`}>
                <line
                  x1={paddingLeft - 5}
                  y1={yPos}
                  x2={width - paddingRight}
                  y2={yPos}
                  stroke={gridStroke}
                  strokeDasharray="4 4"
                  strokeWidth="1"
                />
                <text
                  x={paddingLeft - 16}
                  y={yPos + 4}
                  textAnchor="end"
                  fill={textFill}
                  className="text-[13px] font-bold select-none"
                >
                  {formattedVal}
                </text>
              </g>
            );
          })}

          {/* Baseline */}
          <line
            x1={paddingLeft - 5}
            y1={paddingTop + chartHeight}
            x2={width - paddingRight}
            y2={paddingTop + chartHeight}
            stroke={isDark ? "rgba(255,255,255,0.15)" : "rgba(0,0,0,0.1)"}
            strokeWidth="1.5"
          />

          {/* Histogram Bars */}
          {data.map((bar, idx) => {
            const barX = getBarX(idx);
            const barW = getBarWidth();
            const barH = getBarHeight(bar.visitors);
            const barY = getBarY(bar.visitors);

            const isHighlighted =
              hoveredBar?.id === bar.id || (!hoveredBar && bar.highlighted);

            return (
              <g
                key={bar.id}
                className="cursor-pointer"
                onMouseEnter={(e) => handleMouseMove(e, bar)}
                onMouseMove={(e) => handleMouseMove(e, bar)}
                onMouseLeave={handleMouseLeave}
              >
                {/* Visible Bar Rectangle with rounded top */}
                <rect
                  x={barX}
                  y={barY}
                  width={barW}
                  height={barH}
                  rx="3"
                  fill={isHighlighted ? activeBarFill : defaultBarFill}
                  className="transition-colors duration-150"
                  opacity={isHighlighted ? 1 : 0.85}
                />

                {/* Invisible hover overlay for easier targeting */}
                <rect
                  x={barX - 4}
                  y={paddingTop}
                  width={barW + 8}
                  height={chartHeight}
                  fill="transparent"
                />
              </g>
            );
          })}

          {/* Bottom Right "campaigns" Axis Label */}
          <text
            x={width - paddingRight}
            y={paddingTop + chartHeight + 32}
            textAnchor="end"
            fill={textFill}
            className="text-[13px] font-extrabold select-none tracking-tight"
          >
            campaigns
          </text>
        </svg>
      </div>

      {/* FLOATING HOVER DETAILS POPOVER */}
      {hoveredBar && mousePos && (
        <div
          style={{
            left: `${Math.min(
              Math.max(mousePos.x + 15, 10),
              (containerRef.current?.offsetWidth || 600) - 260,
            )}px`,
            top: `${mousePos.y > 140 ? mousePos.y - 90 : mousePos.y + 15}px`,
          }}
          className="absolute z-50 backdrop-blur-2xl bg-card-bg/95 dark:bg-[#151e30]/95 border border-card-border dark:border-white/15 shadow-2xl rounded-2xl p-4 min-w-[200px] pointer-events-none transition-all duration-75 ease-out animate-in fade-in zoom-in-95"
        >
          <div className="flex flex-col gap-1">
            <span className="text-sm font-black text-brand-text truncate">
              {hoveredBar.campaignName}
            </span>
            <div className="flex flex-col text-xs text-brand-textMuted font-semibold mt-1">
              <span>Start Date</span>
              <span className="text-brand-text font-black tracking-wider text-sm mt-0.5">
                {hoveredBar.startDate}
              </span>
            </div>
            <div className="mt-1 pt-1.5 border-t border-brand-border/20 flex items-center justify-between text-xs">
              <span className="text-brand-textMuted font-medium">
                Visitors:
              </span>
              <span className="text-emerald-500 font-extrabold">
                {hoveredBar.visitors.toLocaleString()}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
