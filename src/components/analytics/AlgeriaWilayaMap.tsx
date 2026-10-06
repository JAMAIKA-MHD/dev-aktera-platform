import React, { useMemo, useRef, useState } from "react";
import { ALGERIA_WILAYAS } from "../../lib/algeriaWilayas";
import {
  ALGERIA_MAP_VIEWBOX,
  ALGERIA_WILAYA_LABEL_POINTS,
  ALGERIA_WILAYA_PATHS,
} from "../../lib/algeriaMapPaths";
import {
  buildWilayaBreakdown,
  WILAYA_RAMP_DARK,
  WILAYA_RAMP_LIGHT,
  wilayaRampStep,
} from "../../lib/campaignAnalyticsTransforms";
import { CampaignLocationCount } from "../../types";
import { ChartPanel, useChartTheme } from "./CampaignAnalyticsCharts";

const MAX_MAP_LABELS = 8;
const MAX_LIST_ROWS = 10;

interface AlgeriaWilayaMapProps {
  locations: CampaignLocationCount[];
  unknownCount: number;
}

interface HoverState {
  code: number;
  x: number;
  y: number;
}

export const AlgeriaWilayaMap: React.FC<AlgeriaWilayaMapProps> = ({
  locations,
  unknownCount,
}) => {
  const chart = useChartTheme();
  const containerRef = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<HoverState | null>(null);

  const { counts, ranked, unmatchedCount, maxCount, totalLocated } = useMemo(
    () => buildWilayaBreakdown(locations),
    [locations],
  );
  const labelledCodes = ranked.slice(0, MAX_MAP_LABELS).map((w) => w.code);

  // One-hue sequential ramp (fewer -> more); zero stays a neutral surface tone.
  const ramp = chart.isDark ? WILAYA_RAMP_DARK : WILAYA_RAMP_LIGHT;
  const emptyFill = chart.isDark ? "#1e2738" : "#eef2f7";
  const borderColor = chart.isDark ? "#0b0e14" : "#ffffff";
  const fillFor = (code: number) => {
    const step = wilayaRampStep(counts.get(code) ?? 0, maxCount, ramp.length);
    return step === null ? emptyFill : ramp[step];
  };

  const hoveredWilaya = hover
    ? ALGERIA_WILAYAS.find((w) => w.code === hover.code)
    : undefined;

  const handleMove = (code: number, event: React.MouseEvent) => {
    const rect = containerRef.current?.getBoundingClientRect();
    if (!rect) return;
    setHover({
      code,
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    });
  };

  return (
    <ChartPanel
      title="Segmentation by wilaya"
      subtitle="Participants per wilaya, from the location captured on each entry."
      isEmpty={locations.length === 0}
      emptyMessage="No location data has been captured for this campaign's participants yet."
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        <div ref={containerRef} className="relative lg:col-span-7">
          <svg
            viewBox={ALGERIA_MAP_VIEWBOX}
            className="w-full max-h-[520px]"
            role="img"
            aria-label="Map of Algeria showing participants per wilaya"
            onMouseLeave={() => setHover(null)}
          >
            {ALGERIA_WILAYAS.map((wilaya) => (
              <path
                key={wilaya.code}
                d={ALGERIA_WILAYA_PATHS[wilaya.code]}
                fill={fillFor(wilaya.code)}
                stroke={hover?.code === wilaya.code ? chart.axis : borderColor}
                strokeWidth={hover?.code === wilaya.code ? 2.5 : 1}
                strokeLinejoin="round"
                onMouseMove={(event) => handleMove(wilaya.code, event)}
              />
            ))}
            {labelledCodes.map((code) => {
              const point = ALGERIA_WILAYA_LABEL_POINTS[code];
              if (!point) return null;
              return (
                <text
                  key={code}
                  x={point.x}
                  y={point.y}
                  textAnchor="middle"
                  dominantBaseline="central"
                  fontSize={22}
                  fontWeight={700}
                  fill={chart.isDark ? "#ffffff" : "#0f172a"}
                  stroke={chart.isDark ? "#0b0e14" : "#ffffff"}
                  strokeWidth={5}
                  paintOrder="stroke"
                  pointerEvents="none"
                >
                  {(counts.get(code) ?? 0).toLocaleString()}
                </text>
              );
            })}
          </svg>

          {hover && hoveredWilaya && (
            <div
              className="pointer-events-none absolute z-10 rounded-xl border border-brand-border bg-card-bg px-3 py-2 text-xs shadow-lg"
              style={{ left: hover.x + 12, top: hover.y + 12 }}
            >
              <div className="font-semibold text-brand-text">
                {String(hoveredWilaya.code).padStart(2, "0")} ·{" "}
                {hoveredWilaya.name}
              </div>
              <div className="text-brand-text-muted">
                {(counts.get(hoveredWilaya.code) ?? 0).toLocaleString()}{" "}
                participants
              </div>
            </div>
          )}

          <div className="mt-2 flex items-center gap-2 text-[10px] text-brand-text-muted">
            <span>Fewer</span>
            {ramp.map((color) => (
              <span
                key={color}
                className="h-2.5 w-6 rounded-sm"
                style={{ backgroundColor: color }}
              />
            ))}
            <span>More</span>
          </div>
        </div>

        <div className="lg:col-span-5">
          <h3 className="text-[10px] uppercase font-semibold tracking-wider text-brand-text-muted mb-3">
            Top wilayas
          </h3>
          {ranked.length === 0 ? (
            <p className="text-xs text-brand-text-muted">
              None of the captured locations match a wilaya.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {ranked.slice(0, MAX_LIST_ROWS).map((wilaya) => (
                <li key={wilaya.code}>
                  <div className="flex items-center justify-between text-xs mb-1">
                    <span className="text-brand-text">
                      <span className="text-brand-text-muted">
                        {String(wilaya.code).padStart(2, "0")}
                      </span>{" "}
                      {wilaya.name}
                    </span>
                    <span className="font-semibold text-brand-text">
                      {wilaya.count.toLocaleString()}
                      <span className="font-normal text-brand-text-muted">
                        {" "}
                        · {((wilaya.count / totalLocated) * 100).toFixed(1)}%
                      </span>
                    </span>
                  </div>
                  <div className="h-1.5 w-full overflow-hidden rounded-full bg-card-bg-subtle">
                    <div
                      className="h-full rounded-full"
                      style={{
                        width: `${(wilaya.count / maxCount) * 100}%`,
                        backgroundColor: chart.series[0],
                      }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          )}

          {ranked.length > MAX_LIST_ROWS && (
            <p className="mt-3 text-[11px] text-brand-text-muted">
              +{ranked.length - MAX_LIST_ROWS} more wilayas — hover the map for
              details.
            </p>
          )}
          {(unmatchedCount > 0 || unknownCount > 0) && (
            <p className="mt-3 text-[11px] text-brand-text-muted">
              Not on the map:{" "}
              {[
                unknownCount > 0 &&
                  `${unknownCount.toLocaleString()} without location data`,
                unmatchedCount > 0 &&
                  `${unmatchedCount.toLocaleString()} in a location that does not match a wilaya`,
              ]
                .filter(Boolean)
                .join(", ")}
              .
            </p>
          )}
        </div>
      </div>
    </ChartPanel>
  );
};
