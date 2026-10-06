/**
 * Standalone SVG charts for the exported campaign report.
 *
 * Each builder returns a complete SVG document (explicit size, own fonts and
 * colors, no external assets) so it can be rasterised and embedded in a file.
 * All text placed in the markup is escaped.
 */
import {
  ALGERIA_MAP_VIEWBOX,
  ALGERIA_WILAYA_LABEL_POINTS,
  ALGERIA_WILAYA_PATHS,
} from "./algeriaMapPaths";
import { ALGERIA_WILAYAS } from "./algeriaWilayas";
import {
  WILAYA_RAMP_LIGHT,
  wilayaRampStep,
} from "./campaignAnalyticsTransforms";

export interface SvgChart {
  svg: string;
  width: number;
  height: number;
}

export interface StackSeries {
  name: string;
  color: string;
  values: number[];
}

export interface DonutItem {
  label: string;
  count: number;
  color: string;
}

const INK = "#0f172a";
const MUTED = "#64748b";
const GRID = "#e2e8f0";
const SURFACE = "#ffffff";
const MAP_EMPTY_FILL = "#e2e8f0";
const MAX_MAP_LABELS = 8;
const FONT_FAMILY = "Segoe UI, Arial, Helvetica, sans-serif";

export const REPORT_CHART_WIDTH = 720;
export const REPORT_HALF_CHART_WIDTH = 440;
const CHART_HEIGHT = 260;
const PLOT = { left: 40, right: 20, top: 12, bottom: 28 };
const DONUT_SIZE = 180;
const MAP_WIDTH = 520;
const MAP_HEIGHT = 506;

const esc = (value: unknown): string =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const num = (value: number): string => value.toLocaleString("en-US");
const round = (value: number): string => value.toFixed(1);

const svgDocument = (
  width: number,
  height: number,
  viewBox: string,
  body: string,
): SvgChart => ({
  width,
  height,
  svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="${viewBox}" font-family="${FONT_FAMILY}"><rect x="${viewBox.split(" ")[0]}" y="${viewBox.split(" ")[1]}" width="100%" height="100%" fill="${SURFACE}"/>${body}</svg>`,
});

/** Round axis maximum and tick values for a count axis. */
function countAxis(maxValue: number): { max: number; ticks: number[] } {
  if (maxValue <= 0) return { max: 1, ticks: [0, 1] };
  const rough = maxValue / 4;
  const magnitude = Math.pow(10, Math.floor(Math.log10(rough)));
  const multiplier = [1, 2, 5, 10].find((m) => m * magnitude >= rough) ?? 10;
  const step = Math.max(1, multiplier * magnitude);
  const max = Math.ceil(maxValue / step) * step;
  const ticks: number[] = [];
  for (let tick = 0; tick <= max; tick += step) ticks.push(tick);
  return { max, ticks };
}

interface Frame {
  plotWidth: number;
  y: (value: number) => number;
  svg: string;
}

/** Gridlines, y tick labels and x labels shared by the cartesian charts. */
function chartFrame(
  labels: string[],
  maxValue: number,
  width: number,
  xForIndex: (index: number, plotWidth: number) => number,
): Frame {
  const plotWidth = width - PLOT.left - PLOT.right;
  const plotHeight = CHART_HEIGHT - PLOT.top - PLOT.bottom;
  const axis = countAxis(maxValue);
  const y = (value: number) =>
    PLOT.top + plotHeight - (value / axis.max) * plotHeight;

  const grid = axis.ticks
    .map(
      (tick) =>
        `<line x1="${PLOT.left}" x2="${width - PLOT.right}" y1="${round(y(tick))}" y2="${round(y(tick))}" stroke="${GRID}" stroke-width="1"/>` +
        `<text x="${PLOT.left - 8}" y="${round(y(tick) + 4)}" text-anchor="end" font-size="11" fill="${MUTED}">${num(tick)}</text>`,
    )
    .join("");

  const labelEvery = Math.max(1, Math.ceil(labels.length / 8));
  const xLabels = labels
    .map((label, index) =>
      index % labelEvery === 0
        ? `<text x="${round(xForIndex(index, plotWidth))}" y="${CHART_HEIGHT - 8}" text-anchor="middle" font-size="11" fill="${MUTED}">${esc(label)}</text>`
        : "",
    )
    .join("");

  return { plotWidth, y, svg: grid + xLabels };
}

const pointX = (index: number, count: number, plotWidth: number): number =>
  count <= 1
    ? PLOT.left + plotWidth / 2
    : PLOT.left + (index / (count - 1)) * plotWidth;

const cartesian = (width: number, body: string): SvgChart =>
  svgDocument(width, CHART_HEIGHT, `0 0 ${width} ${CHART_HEIGHT}`, body);

export function lineChartSvg(
  labels: string[],
  values: number[],
  color: string,
  width = REPORT_CHART_WIDTH,
): SvgChart {
  const frame = chartFrame(
    labels,
    Math.max(0, ...values),
    width,
    (index, plotWidth) => pointX(index, labels.length, plotWidth),
  );
  const points = values.map((value, index) => ({
    x: round(pointX(index, values.length, frame.plotWidth)),
    y: round(frame.y(value)),
  }));
  const marks =
    points.length === 1
      ? `<circle cx="${points[0].x}" cy="${points[0].y}" r="4" fill="${color}"/>`
      : `<polyline points="${points.map((p) => `${p.x},${p.y}`).join(" ")}" fill="none" stroke="${color}" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>`;
  return cartesian(width, frame.svg + marks);
}

export function barChartSvg(
  labels: string[],
  values: number[],
  color: string,
  width = REPORT_CHART_WIDTH,
): SvgChart {
  const slot = (plotWidth: number) => plotWidth / Math.max(1, labels.length);
  const frame = chartFrame(
    labels,
    Math.max(0, ...values),
    width,
    (index, plotWidth) => PLOT.left + slot(plotWidth) * (index + 0.5),
  );
  const barWidth = Math.min(36, slot(frame.plotWidth) * 0.7);
  const baseline = frame.y(0);
  const bars = values
    .map((value, index) => {
      if (value <= 0) return "";
      const x =
        PLOT.left + slot(frame.plotWidth) * (index + 0.5) - barWidth / 2;
      const top = frame.y(value);
      const radius = Math.min(4, barWidth / 2, baseline - top);
      // Rounded top corners, square at the baseline.
      return `<path d="M${round(x)},${round(baseline)} V${round(top + radius)} Q${round(x)},${round(top)} ${round(x + radius)},${round(top)} H${round(x + barWidth - radius)} Q${round(x + barWidth)},${round(top)} ${round(x + barWidth)},${round(top + radius)} V${round(baseline)} Z" fill="${color}"/>`;
    })
    .join("");
  return cartesian(width, frame.svg + bars);
}

export function stackedAreaSvg(
  labels: string[],
  series: StackSeries[],
  width = REPORT_CHART_WIDTH,
): SvgChart {
  const totals = labels.map((_, index) =>
    series.reduce((sum, s) => sum + (s.values[index] ?? 0), 0),
  );
  const frame = chartFrame(
    labels,
    Math.max(0, ...totals),
    width,
    (index, plotWidth) => pointX(index, labels.length, plotWidth),
  );
  const x = (index: number) => pointX(index, labels.length, frame.plotWidth);

  const lower = labels.map(() => 0);
  const layers = series
    .map((s) => {
      const base = [...lower];
      const top = base.map((value, index) => value + (s.values[index] ?? 0));
      top.forEach((value, index) => (lower[index] = value));

      if (labels.length === 1) {
        // A single day cannot form an area: draw the stack as one column.
        const height = frame.y(base[0]) - frame.y(top[0]);
        return height > 0
          ? `<rect x="${round(x(0) - 18)}" y="${round(frame.y(top[0]))}" width="36" height="${round(height)}" fill="${s.color}" fill-opacity="0.85"/>`
          : "";
      }

      const upper = top.map(
        (value, index) => `${round(x(index))},${round(frame.y(value))}`,
      );
      const under = base
        .map((value, index) => `${round(x(index))},${round(frame.y(value))}`)
        .reverse();
      return (
        `<polygon points="${[...upper, ...under].join(" ")}" fill="${s.color}" fill-opacity="0.35"/>` +
        `<polyline points="${upper.join(" ")}" fill="none" stroke="${s.color}" stroke-width="2" stroke-linejoin="round"/>`
      );
    })
    .join("");

  return cartesian(width, frame.svg + layers);
}

export function donutSvg(items: DonutItem[], centerLabel: string): SvgChart {
  const total = items.reduce((sum, item) => sum + item.count, 0);
  const radius = 57;
  const circumference = 2 * Math.PI * radius;
  const active = items.filter((item) => item.count > 0);
  const gap = active.length > 1 ? 2 : 0;
  const centre = DONUT_SIZE / 2;
  let offset = 0;
  const segments = active
    .map((item) => {
      const length = (item.count / total) * circumference;
      const segment = `<circle cx="${centre}" cy="${centre}" r="${radius}" fill="none" stroke="${item.color}" stroke-width="26" stroke-dasharray="${round(Math.max(0, length - gap))} ${round(circumference)}" stroke-dashoffset="${round(-offset)}" transform="rotate(-90 ${centre} ${centre})"/>`;
      offset += length;
      return segment;
    })
    .join("");
  return svgDocument(
    DONUT_SIZE,
    DONUT_SIZE,
    `0 0 ${DONUT_SIZE} ${DONUT_SIZE}`,
    `${segments}<text x="${centre}" y="${centre - 2}" text-anchor="middle" font-size="22" font-weight="700" fill="${INK}">${num(total)}</text>` +
      `<text x="${centre}" y="${centre + 14}" text-anchor="middle" font-size="9" fill="${MUTED}" letter-spacing="1">${esc(centerLabel)}</text>`,
  );
}

export function wilayaMapSvg(
  counts: Map<number, number>,
  maxCount: number,
): SvgChart {
  const paths = ALGERIA_WILAYAS.map((wilaya) => {
    const step = wilayaRampStep(
      counts.get(wilaya.code) ?? 0,
      maxCount,
      WILAYA_RAMP_LIGHT.length,
    );
    const fill = step === null ? MAP_EMPTY_FILL : WILAYA_RAMP_LIGHT[step];
    return `<path d="${ALGERIA_WILAYA_PATHS[wilaya.code]}" fill="${fill}" stroke="${SURFACE}" stroke-width="1" stroke-linejoin="round"/>`;
  }).join("");

  const labels = [...counts.entries()]
    .sort((a, b) => b[1] - a[1] || a[0] - b[0])
    .slice(0, MAX_MAP_LABELS)
    .map(([code, count]) => {
      const point = ALGERIA_WILAYA_LABEL_POINTS[code];
      return point
        ? `<text x="${point.x}" y="${point.y + 8}" text-anchor="middle" font-size="22" font-weight="700" fill="${INK}" stroke="${SURFACE}" stroke-width="5" paint-order="stroke">${num(count)}</text>`
        : "";
    })
    .join("");

  return svgDocument(
    MAP_WIDTH,
    MAP_HEIGHT,
    ALGERIA_MAP_VIEWBOX,
    paths + labels,
  );
}
