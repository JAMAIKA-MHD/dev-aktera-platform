import React, {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { createPortal } from "react-dom";
import {
  ChevronDown,
  ChevronRight,
  MapPin,
  Maximize2,
  Minus,
  Plus,
  RotateCcw,
  Search,
  X,
} from "lucide-react";
import { ALGERIA_WILAYAS } from "../../lib/algeriaWilayas";
import {
  ALGERIA_MAP_VIEWBOX,
  ALGERIA_WILAYA_LABEL_POINTS,
  ALGERIA_WILAYA_PATHS,
} from "../../lib/algeriaMapPaths";
import { buildWilayaBreakdown } from "../../lib/campaignAnalyticsTransforms";
import { CampaignLocationCount } from "../../types";
import { Button } from "../ui/button";
import { ChartPanel, useChartTheme } from "./CampaignAnalyticsCharts";

const TOP_ROWS = 3;
const MAX_MAP_LABELS = 8;
const PEEK_SIZE = { w: 560, h: 150 };
const DIALOG_MAP_SIZE = { w: 640, h: 460 };
// Map units (the viewBox is ~980 wide): padding around the located wilayas and
// the narrowest crop, so a single wilaya never fills the whole frame.
const PEEK_FIT = { pad: 80, minWidth: 330 };
const DIALOG_FIT = { pad: 135, minWidth: 380 };
// Popover zoom: up to 12× the starting view; buttons and double-click step by 1.6×.
const MAX_ZOOM = 12;
const ZOOM_STEP = 1.6;
// Pixels a press may move before it counts as a drag rather than a click.
const DRAG_THRESHOLD = 4;
// From this zoom on, every bubble gets its wilaya name.
const LABEL_ALL_ZOOM = 2;

const [MAP_X, MAP_Y, MAP_W, MAP_H] = ALGERIA_MAP_VIEWBOX.split(" ").map(Number);

interface RankedWilaya {
  code: number;
  name: string;
  count: number;
}

interface MapView {
  x: number;
  y: number;
  w: number;
  h: number;
}

interface Breakdown {
  ranked: RankedWilaya[];
  byCode: Map<number, RankedWilaya>;
  maxCount: number;
  totalLocated: number;
}

interface AlgeriaWilayaMapProps {
  locations: CampaignLocationCount[];
  unknownCount: number;
}

const padCode = (code: number) => String(code).padStart(2, "0");
const wilayaName = (code: number) =>
  ALGERIA_WILAYAS.find((w) => w.code === code)?.name ?? padCode(code);
const shareOf = (count: number, total: number) =>
  total > 0 ? `${((count / total) * 100).toFixed(1)}%` : "0%";
const entriesLabel = (count: number) =>
  `${count.toLocaleString()} ${count === 1 ? "entry" : "entries"}`;

/** Crops the map around the given points at the frame's aspect ratio. */
function fitView(
  codes: number[],
  aspect: number,
  pad: number,
  minWidth: number,
): MapView {
  const points = codes
    .map((code) => ALGERIA_WILAYA_LABEL_POINTS[code])
    .filter(Boolean);
  if (points.length === 0) return wholeView(aspect);
  const xs = points.map((p) => p.x);
  const ys = points.map((p) => p.y);
  const x0 = Math.min(...xs);
  const x1 = Math.max(...xs);
  const y0 = Math.min(...ys);
  const y1 = Math.max(...ys);
  let w = Math.max(x1 - x0 + 2 * pad, minWidth);
  let h = w / aspect;
  if (y1 - y0 + 2 * pad > h) {
    h = y1 - y0 + 2 * pad;
    w = h * aspect;
  }
  return { x: (x0 + x1) / 2 - w / 2, y: (y0 + y1) / 2 - h / 2, w, h };
}

/** The whole country, letterboxed to the frame's aspect ratio. */
function wholeView(aspect: number): MapView {
  let w = MAP_W;
  let h = MAP_H;
  if (w / h < aspect) w = h * aspect;
  else h = w / aspect;
  return { x: MAP_X + MAP_W / 2 - w / 2, y: MAP_Y + MAP_H / 2 - h / 2, w, h };
}

/** Follows the pixel size of an element, so the map draws without letterboxing. */
function useElementSize(
  ref: React.RefObject<HTMLElement | null>,
  fallback: { w: number; h: number },
) {
  const [size, setSize] = useState(fallback);
  useEffect(() => {
    const element = ref.current;
    if (!element || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize({ w: Math.round(width), h: Math.round(height) });
      }
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, [ref]);
  return size;
}

/**
 * Zoom (wheel, buttons, double-click) and drag-to-pan over a starting view. Zooming out
 * stops at the starting view; the centre always stays over the country.
 */
function useMapZoom(
  frameRef: React.RefObject<HTMLElement | null>,
  base: MapView,
) {
  const [view, setView] = useState(base);
  const [dragging, setDragging] = useState(false);
  const draggedRef = useRef(false);

  useEffect(() => setView(base), [base]);

  const clamp = useCallback(
    (next: MapView): MapView => {
      const w = Math.min(base.w, Math.max(base.w / MAX_ZOOM, next.w));
      if (w >= base.w * 0.999) return base;
      const h = w * (base.h / base.w);
      const cx = Math.min(MAP_X + MAP_W, Math.max(MAP_X, next.x + next.w / 2));
      const cy = Math.min(MAP_Y + MAP_H, Math.max(MAP_Y, next.y + next.h / 2));
      return { x: cx - w / 2, y: cy - h / 2, w, h };
    },
    [base],
  );

  /** Zooms by `factor` keeping the point at (fx, fy), fractions of the frame, in place. */
  const zoomAt = useCallback(
    (factor: number, fx = 0.5, fy = 0.5) =>
      setView((current) => {
        const px = current.x + fx * current.w;
        const py = current.y + fy * current.h;
        const w = current.w / factor;
        const h = current.h / factor;
        return clamp({ x: px - fx * w, y: py - fy * h, w, h });
      }),
    [clamp],
  );

  const pointIn = (event: { clientX: number; clientY: number }) => {
    const rect = frameRef.current?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return [0.5, 0.5];
    return [
      (event.clientX - rect.left) / rect.width,
      (event.clientY - rect.top) / rect.height,
    ];
  };

  // React's wheel listener is passive; this one may cancel the page scroll.
  useEffect(() => {
    const element = frameRef.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const rect = element.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      zoomAt(
        Math.exp(-event.deltaY * 0.0015),
        (event.clientX - rect.left) / rect.width,
        (event.clientY - rect.top) / rect.height,
      );
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [frameRef, zoomAt]);

  const onPointerDown = (event: React.PointerEvent) => {
    if (event.button !== 0) return;
    draggedRef.current = false;
    const start = { x: event.clientX, y: event.clientY, view };
    const onMove = (move: PointerEvent) => {
      const dx = move.clientX - start.x;
      const dy = move.clientY - start.y;
      if (!draggedRef.current && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
      draggedRef.current = true;
      setDragging(true);
      const rect = frameRef.current?.getBoundingClientRect();
      if (!rect || rect.width === 0 || rect.height === 0) return;
      setView(
        clamp({
          ...start.view,
          x: start.view.x - (dx / rect.width) * start.view.w,
          y: start.view.y - (dy / rect.height) * start.view.h,
        }),
      );
    };
    const onUp = () => {
      setDragging(false);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup", onUp);
      window.removeEventListener("pointercancel", onUp);
    };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
    window.addEventListener("pointercancel", onUp);
  };

  /** Keeps the zoom and moves the centre onto a map point. */
  const centerOn = (point: { x: number; y: number }) =>
    setView((current) =>
      clamp({
        ...current,
        x: point.x - current.w / 2,
        y: point.y - current.h / 2,
      }),
    );

  return {
    view,
    level: base.w / view.w,
    dragging,
    /** True when the last press moved the map: its click must not select. */
    wasDragged: () => draggedRef.current,
    zoomIn: () => zoomAt(ZOOM_STEP),
    zoomOut: () => zoomAt(1 / ZOOM_STEP),
    reset: () => setView(base),
    centerOn,
    onPointerDown,
    onDoubleClick: (event: React.MouseEvent) => {
      event.preventDefault();
      const [fx, fy] = pointIn(event);
      zoomAt(ZOOM_STEP * ZOOM_STEP, fx, fy);
    },
  };
}

/** Drive-usage style bar: the value sits inside the fill, quarter ticks behind. */
const WilayaRail: React.FC<{ percent: number; label: string }> = ({
  percent,
  label,
}) => {
  const chart = useChartTheme();
  const p = Math.max(0, Math.min(100, percent));
  const short = p < 30;
  return (
    <div
      className="relative h-5 w-full rounded-md bg-card-bg-subtle ring-1 ring-inset ring-brand-border"
      style={{
        backgroundImage:
          "linear-gradient(90deg, transparent calc(25% - 1px), var(--theme-border) calc(25% - 1px) 25%, transparent 25% calc(50% - 1px), var(--theme-border) calc(50% - 1px) 50%, transparent 50% calc(75% - 1px), var(--theme-border) calc(75% - 1px) 75%, transparent 75%)",
      }}
    >
      {p > 0 && (
        <div
          className="absolute inset-y-0 left-0 flex items-center justify-end rounded-md"
          style={{ width: `${p}%`, backgroundColor: chart.series[0] }}
        >
          <span
            className={`whitespace-nowrap px-2 text-[11px] font-semibold ${
              short ? "absolute left-full text-brand-text" : "text-white"
            }`}
          >
            {label}
          </span>
        </div>
      )}
      {p <= 0 && (
        <span className="absolute inset-y-0 left-2 flex items-center text-[11px] font-semibold text-brand-text-muted">
          {label}
        </span>
      )}
    </div>
  );
};

const CodeChip: React.FC<{ code: number }> = ({ code }) => (
  <span className="inline-grid h-6 min-w-8 place-items-center rounded-lg bg-card-bg-subtle px-1.5 text-[11px] font-semibold text-brand-text-muted">
    {padCode(code)}
  </span>
);

interface WilayaMapSvgProps {
  breakdown: Breakdown;
  view: MapView;
  size: { w: number; h: number };
  bubbleCodes: number[];
  labelCodes?: number[];
  selected?: number | null;
  hovered?: number | null;
  onHover?: (code: number | null, event?: React.PointerEvent) => void;
  onSelect?: (code: number) => void;
  ariaLabel: string;
}

/**
 * The wilaya choropleth drawn into a fixed pixel frame: shapes live in map units
 * under one transform, bubbles are placed in pixels so they keep their size.
 */
const WilayaMapSvg: React.FC<WilayaMapSvgProps> = ({
  breakdown,
  view,
  size,
  bubbleCodes,
  labelCodes = [],
  selected = null,
  hovered = null,
  onHover,
  onSelect,
  ariaLabel,
}) => {
  const chart = useChartTheme();
  const { byCode, maxCount } = breakdown;
  const k = size.w / view.w;
  const brand = chart.series[0];
  const baseFill = chart.isDark ? "#1e2738" : "#e3e8f1";
  const hoverFill = chart.isDark ? "#2c3850" : "#c9d2e0";
  const surface = chart.surface;
  const ink = chart.isDark ? "#eaf0fb" : "#0f172a";

  return (
    <svg
      viewBox={`0 0 ${size.w} ${size.h}`}
      preserveAspectRatio="xMidYMid meet"
      className="block h-full w-full"
      role="img"
      aria-label={ariaLabel}
      onPointerLeave={() => onHover?.(null)}
    >
      <g transform={`translate(${-view.x * k} ${-view.y * k}) scale(${k})`}>
        {ALGERIA_WILAYAS.map(({ code }) => {
          const row = byCode.get(code);
          const isHover = hovered === code;
          const isSelected = selected === code;
          const heat =
            row && maxCount > 0 ? 0.4 + 0.6 * (row.count / maxCount) : 1;
          return (
            <path
              key={code}
              d={ALGERIA_WILAYA_PATHS[code]}
              fill={row ? brand : isHover ? hoverFill : baseFill}
              fillOpacity={row ? (isHover ? 1 : heat) : 1}
              stroke={isSelected ? ink : row ? brand : surface}
              strokeWidth={isSelected ? 2 : row ? 1.5 : 1}
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
              className={onSelect ? "cursor-pointer" : undefined}
              onPointerMove={onHover ? (e) => onHover(code, e) : undefined}
              onClick={onSelect ? () => onSelect(code) : undefined}
            />
          );
        })}
      </g>
      {bubbleCodes.map((code) => {
        const row = byCode.get(code);
        const point = ALGERIA_WILAYA_LABEL_POINTS[code];
        if (!row || !point) return null;
        const x = (point.x - view.x) * k;
        const y = (point.y - view.y) * k;
        const r = 12 + 12 * Math.sqrt(row.count / Math.max(maxCount, 1));
        const isSelected = selected === code;
        return (
          <g key={code} transform={`translate(${x} ${y})`} pointerEvents="none">
            <circle
              r={r}
              fill={isSelected ? brand : surface}
              stroke={brand}
              strokeWidth={2}
            />
            <text
              textAnchor="middle"
              dominantBaseline="central"
              fontSize={11}
              fontWeight={600}
              fill={isSelected ? "#ffffff" : ink}
            >
              {row.count.toLocaleString()}
            </text>
            {labelCodes.includes(code) && (
              <text
                y={r + 13}
                textAnchor="middle"
                fontSize={11}
                fontWeight={500}
                fill={ink}
                stroke={surface}
                strokeWidth={4}
                strokeLinejoin="round"
                paintOrder="stroke"
              >
                {row.name}
              </text>
            )}
          </g>
        );
      })}
    </svg>
  );
};

const dottedBackdrop: React.CSSProperties = {
  backgroundImage:
    "radial-gradient(var(--theme-border) 1px, transparent 1.3px)",
  backgroundSize: "16px 16px",
};

export const AlgeriaWilayaMap: React.FC<AlgeriaWilayaMapProps> = ({
  locations,
  unknownCount,
}) => {
  const [open, setOpen] = useState(false);

  const breakdown = useMemo<Breakdown & { unmatchedCount: number }>(() => {
    const { ranked, unmatchedCount, maxCount, totalLocated } =
      buildWilayaBreakdown(locations);
    return {
      ranked,
      byCode: new Map(ranked.map((w) => [w.code, w])),
      maxCount,
      totalLocated,
      unmatchedCount,
    };
  }, [locations]);
  const { ranked, maxCount, totalLocated, unmatchedCount } = breakdown;

  const peekView = useMemo(
    () =>
      fitView(
        ranked.map((w) => w.code),
        PEEK_SIZE.w / PEEK_SIZE.h,
        PEEK_FIT.pad,
        PEEK_FIT.minWidth,
      ),
    [ranked],
  );

  const offMap = unknownCount + unmatchedCount;
  const hasLocated = ranked.length > 0;

  return (
    <ChartPanel
      title="Segmentation by wilaya"
      subtitle="Participants per wilaya, from the location captured on each entry."
      className="h-full"
      isEmpty={locations.length === 0}
      emptyMessage="No location data has been captured for these participants yet."
      actions={
        hasLocated && (
          <Button
            size="sm"
            onClick={() => setOpen(true)}
            aria-haspopup="dialog"
            className="rounded-full bg-brand-accent text-white hover:bg-brand-accent/90"
          >
            <Maximize2 aria-hidden />
            Open map
          </Button>
        )
      }
    >
      {!hasLocated ? (
        <p className="text-xs text-brand-text-muted">
          None of the captured locations match a wilaya.
        </p>
      ) : (
        <div className="flex flex-col gap-3">
          <button
            type="button"
            onClick={() => setOpen(true)}
            aria-label="Open the full wilaya map"
            className="group relative h-[150px] cursor-zoom-in overflow-hidden rounded-xl bg-card-bg-subtle outline-none focus-visible:ring-2 focus-visible:ring-brand-accent"
            style={dottedBackdrop}
          >
            <WilayaMapSvg
              breakdown={breakdown}
              view={peekView}
              size={PEEK_SIZE}
              bubbleCodes={ranked.slice(0, MAX_MAP_LABELS).map((w) => w.code)}
              ariaLabel="Map of Algeria cropped to the wilayas with participants"
            />
            <span className="absolute bottom-3 right-3 inline-flex items-center gap-1.5 rounded-full bg-card-bg px-3 py-1.5 text-[11px] font-medium text-brand-text shadow-md transition-colors group-hover:bg-brand-accent group-hover:text-white">
              <Maximize2 className="h-3.5 w-3.5" aria-hidden />
              Explore the map
            </span>
          </button>

          <div>
            <h3 className="text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
              Top wilayas
            </h3>
            <ul className="divide-y-2 divide-dotted divide-brand-border">
              {ranked.slice(0, TOP_ROWS).map((wilaya) => (
                <li
                  key={wilaya.code}
                  className="grid grid-cols-[2rem_1fr] items-center gap-x-3 gap-y-1.5 py-2"
                >
                  <CodeChip code={wilaya.code} />
                  <span className="text-sm font-medium text-brand-text">
                    {wilaya.name}
                  </span>
                  <div className="col-start-2">
                    <WilayaRail
                      percent={(wilaya.count / maxCount) * 100}
                      label={`${entriesLabel(wilaya.count)} · ${shareOf(wilaya.count, totalLocated)}`}
                    />
                  </div>
                </li>
              ))}
            </ul>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            {offMap > 0 ? (
              <OffMapChip
                unknownCount={unknownCount}
                unmatchedCount={unmatchedCount}
              />
            ) : (
              <span />
            )}
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="inline-flex items-center gap-1 text-xs font-medium text-brand-accent hover:underline"
            >
              View all {ranked.length}{" "}
              {ranked.length === 1 ? "wilaya" : "wilayas"}
              <ChevronRight className="h-3.5 w-3.5" aria-hidden />
            </button>
          </div>
        </div>
      )}

      {open && (
        <WilayaMapDialog
          breakdown={breakdown}
          unknownCount={unknownCount}
          unmatchedCount={unmatchedCount}
          onClose={() => setOpen(false)}
        />
      )}
    </ChartPanel>
  );
};

const OffMapChip: React.FC<{
  unknownCount: number;
  unmatchedCount: number;
}> = ({ unknownCount, unmatchedCount }) => (
  <span className="inline-flex items-center gap-1.5 rounded-full border-2 border-dotted border-brand-border px-3 py-1.5 text-[11px] text-brand-text-muted">
    <MapPin className="h-3.5 w-3.5 shrink-0" aria-hidden />
    {[
      unknownCount > 0 &&
        `${unknownCount.toLocaleString()} without location data`,
      unmatchedCount > 0 &&
        `${unmatchedCount.toLocaleString()} in a location that matches no wilaya`,
    ]
      .filter(Boolean)
      .join(" · ")}
  </span>
);

interface WilayaMapDialogProps {
  breakdown: Breakdown;
  unknownCount: number;
  unmatchedCount: number;
  onClose: () => void;
}

const WilayaMapDialog: React.FC<WilayaMapDialogProps> = ({
  breakdown,
  unknownCount,
  unmatchedCount,
  onClose,
}) => {
  const { ranked, byCode, maxCount, totalLocated } = breakdown;
  const chart = useChartTheme();
  const dialogRef = useRef<HTMLDivElement>(null);
  const paneRef = useRef<HTMLDivElement>(null);
  const closeRef = useRef<HTMLButtonElement>(null);
  const [mode, setMode] = useState<"focus" | "whole">("focus");
  const [selected, setSelected] = useState<number | null>(
    ranked[0]?.code ?? null,
  );
  const [hovered, setHovered] = useState<number | null>(null);
  const [tip, setTip] = useState<{ x: number; y: number } | null>(null);
  const [query, setQuery] = useState("");
  const [showEmpty, setShowEmpty] = useState(false);

  // Focus the close button, trap Tab inside, close on Escape, restore focus after.
  useEffect(() => {
    const opener = document.activeElement as HTMLElement | null;
    closeRef.current?.focus();
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        event.preventDefault();
        onClose();
        return;
      }
      if (event.key !== "Tab" || !dialogRef.current) return;
      const focusable =
        dialogRef.current.querySelectorAll<HTMLElement>("button, input");
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last?.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first?.focus();
      }
    };
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("keydown", onKeyDown);
      opener?.focus?.();
    };
  }, [onClose]);

  const frameRef = useRef<HTMLDivElement>(null);
  const frame = useElementSize(frameRef, DIALOG_MAP_SIZE);
  const aspect = frame.w / frame.h;
  const baseView = useMemo(
    () =>
      mode === "focus"
        ? fitView(
            ranked.map((w) => w.code),
            aspect,
            DIALOG_FIT.pad,
            DIALOG_FIT.minWidth,
          )
        : wholeView(aspect),
    [mode, ranked, aspect],
  );
  const zoom = useMapZoom(frameRef, baseView);

  const selectWilaya = (code: number) => {
    setSelected(code);
    // Zoomed in, a wilaya picked from the list may be off screen: bring it in view.
    const point = ALGERIA_WILAYA_LABEL_POINTS[code];
    if (zoom.level > 1 && point) zoom.centerOn(point);
  };

  const matches = (code: number, name: string) => {
    const term = query.trim().toLowerCase();
    if (!term) return true;
    return (
      name.toLowerCase().includes(term) ||
      String(code) === term.replace(/^0+/, "")
    );
  };
  const visibleRows = ranked.filter((w) => matches(w.code, w.name));
  const emptyWilayas = ALGERIA_WILAYAS.filter(
    (w) => !byCode.has(w.code) && matches(w.code, w.name),
  );

  const handleHover = (code: number | null, event?: React.PointerEvent) => {
    setHovered(code);
    const rect = paneRef.current?.getBoundingClientRect();
    if (code === null || !event || !rect) {
      setTip(null);
      return;
    }
    setTip({
      x: Math.min(event.clientX - rect.left + 14, rect.width - 180),
      y: Math.max(event.clientY - rect.top - 56, 8),
    });
  };

  const selectedRow = selected !== null ? byCode.get(selected) : undefined;
  const hoveredRow = hovered !== null ? byCode.get(hovered) : undefined;

  return createPortal(
    <div
      className="fixed inset-0 z-50 grid place-items-center bg-slate-950/55 p-4 backdrop-blur-sm"
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="wilaya-map-title"
        className="flex h-[min(640px,100%)] w-[min(1080px,100%)] flex-col overflow-hidden rounded-2xl border border-brand-border bg-card-bg text-brand-text shadow-2xl"
      >
        <header className="flex items-start justify-between gap-4 px-5 pb-4 pt-5 sm:px-6">
          <div>
            <h2 id="wilaya-map-title" className="text-lg font-semibold">
              Segmentation by wilaya
            </h2>
            <p className="text-[11px] text-brand-text-muted">
              {entriesLabel(totalLocated)} located across {ranked.length}{" "}
              {ranked.length === 1 ? "wilaya" : "wilayas"}.
            </p>
          </div>
          <button
            ref={closeRef}
            type="button"
            onClick={onClose}
            aria-label="Close map"
            className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-card-bg-subtle text-brand-text hover:bg-brand-border focus-visible:outline-2 focus-visible:outline-brand-accent"
          >
            <X className="h-4 w-4" aria-hidden />
          </button>
        </header>

        <div className="grid min-h-0 flex-1 grid-cols-1 gap-5 overflow-y-auto px-5 pb-5 sm:px-6 sm:pb-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,1fr)] lg:overflow-hidden">
          <div
            ref={paneRef}
            className="relative h-80 overflow-hidden rounded-xl bg-card-bg-subtle lg:h-auto lg:min-h-0"
            style={dottedBackdrop}
          >
            <div
              role="group"
              aria-label="Map view"
              className="absolute left-3 top-3 z-10 inline-flex gap-0.5 rounded-full bg-card-bg p-0.5 shadow-md"
            >
              {(
                [
                  ["focus", "Focus"],
                  ["whole", "Whole country"],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={value}
                  type="button"
                  aria-pressed={mode === value}
                  onClick={() => setMode(value)}
                  className={`rounded-full px-3 py-1.5 text-[11px] font-medium ${
                    mode === value
                      ? "bg-brand-accent text-white"
                      : "text-brand-text-muted hover:text-brand-text"
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>

            <div
              ref={frameRef}
              className={`absolute inset-0 touch-none select-none ${
                zoom.dragging
                  ? "cursor-grabbing"
                  : zoom.level > 1
                    ? "cursor-grab"
                    : ""
              }`}
              onPointerDown={zoom.onPointerDown}
              onDoubleClick={zoom.onDoubleClick}
            >
              <WilayaMapSvg
                breakdown={breakdown}
                view={zoom.view}
                size={frame}
                bubbleCodes={ranked.map((w) => w.code)}
                labelCodes={(zoom.level >= LABEL_ALL_ZOOM
                  ? ranked
                  : ranked.slice(0, MAX_MAP_LABELS)
                ).map((w) => w.code)}
                selected={selected}
                hovered={zoom.dragging ? null : hovered}
                onHover={handleHover}
                onSelect={(code) => {
                  if (!zoom.wasDragged()) setSelected(code);
                }}
                ariaLabel="Map of Algeria showing participants per wilaya"
              />
            </div>

            <p className="pointer-events-none absolute right-3 top-3 z-10 hidden rounded-full bg-card-bg/90 px-3 py-1.5 text-[10px] text-brand-text-muted sm:block">
              Scroll or double-click to zoom · drag to move
            </p>

            <div
              role="group"
              aria-label="Zoom"
              className="absolute bottom-3 right-3 z-10 flex flex-col overflow-hidden rounded-xl bg-card-bg shadow-md"
            >
              {(
                [
                  ["Zoom in", Plus, zoom.zoomIn, zoom.level >= MAX_ZOOM],
                  ["Zoom out", Minus, zoom.zoomOut, zoom.level <= 1],
                  ["Reset zoom", RotateCcw, zoom.reset, zoom.level <= 1],
                ] as const
              ).map(([label, Icon, onClick, disabled]) => (
                <button
                  key={label}
                  type="button"
                  aria-label={label}
                  title={label}
                  onClick={onClick}
                  disabled={disabled}
                  className="grid h-9 w-9 place-items-center text-brand-text hover:bg-card-bg-subtle disabled:opacity-35 disabled:hover:bg-transparent [&+button]:border-t [&+button]:border-brand-border"
                >
                  <Icon className="h-4 w-4" aria-hidden />
                </button>
              ))}
            </div>

            {tip && hovered !== null && !zoom.dragging && (
              <div
                className="pointer-events-none absolute z-20 rounded-lg bg-slate-900 px-3 py-2 text-[11px] leading-4 text-white shadow-lg"
                style={{ left: tip.x, top: tip.y }}
              >
                <b>{wilayaName(hovered)}</b> · {padCode(hovered)}
                <br />
                {hoveredRow
                  ? `${entriesLabel(hoveredRow.count)} · ${shareOf(hoveredRow.count, totalLocated)}`
                  : "No entries"}
              </div>
            )}

            <div className="absolute bottom-3 left-3 z-10 flex items-center gap-1.5 rounded-full bg-card-bg px-3 py-1.5 text-[10px] text-brand-text-muted">
              <span>Fewer</span>
              {[0.4, 0.6, 0.8, 1].map((opacity) => (
                <i
                  key={opacity}
                  className="h-3 w-3 rounded-full"
                  style={{ opacity, backgroundColor: chart.series[0] }}
                />
              ))}
              <span>More entries</span>
            </div>
          </div>

          <aside className="flex min-h-0 flex-col gap-3">
            {selected !== null && (
              <div className="flex flex-col gap-2 rounded-xl bg-card-bg-subtle p-4">
                <span className="text-[10px] font-semibold uppercase tracking-wider text-brand-text-muted">
                  Selected
                </span>
                <div className="flex items-center gap-2.5 text-base font-semibold">
                  <CodeChip code={selected} />
                  {wilayaName(selected)}
                </div>
                <div className="flex flex-wrap items-baseline gap-2.5">
                  <b className="text-2xl font-semibold tabular-nums">
                    {(selectedRow?.count ?? 0).toLocaleString()}
                  </b>
                  <span className="text-[11px] text-brand-text-muted">
                    {selectedRow
                      ? `entries · ${shareOf(selectedRow.count, totalLocated)} of located · rank ${ranked.indexOf(selectedRow) + 1} of ${ranked.length}`
                      : "entries yet from this wilaya"}
                  </span>
                </div>
                <WilayaRail
                  percent={
                    selectedRow ? (selectedRow.count / maxCount) * 100 : 0
                  }
                  label={
                    selectedRow
                      ? `${selectedRow.count.toLocaleString()} of ${totalLocated.toLocaleString()} located`
                      : "0"
                  }
                />
              </div>
            )}

            <label className="flex h-10 shrink-0 items-center gap-2 rounded-full border border-brand-border px-3.5 text-brand-text-muted focus-within:ring-2 focus-within:ring-brand-accent">
              <Search className="h-4 w-4 shrink-0" aria-hidden />
              <input
                type="search"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Search a wilaya or its number"
                aria-label="Search wilayas"
                className="min-w-0 flex-1 bg-transparent text-sm text-brand-text outline-none placeholder:text-brand-text-muted"
              />
            </label>

            <div className="min-h-0 flex-1 overflow-y-auto">
              <ul>
                {visibleRows.map((wilaya) => (
                  <li key={wilaya.code}>
                    <button
                      type="button"
                      onClick={() => selectWilaya(wilaya.code)}
                      onPointerEnter={() => setHovered(wilaya.code)}
                      onPointerLeave={() => setHovered(null)}
                      className={`grid w-full grid-cols-[2rem_1fr] items-center gap-x-3 gap-y-2 rounded-xl p-3 text-left hover:bg-card-bg-subtle ${
                        selected === wilaya.code ? "bg-card-bg-subtle" : ""
                      }`}
                    >
                      <CodeChip code={wilaya.code} />
                      <span className="text-sm font-medium">{wilaya.name}</span>
                      <div className="col-start-2">
                        <WilayaRail
                          percent={(wilaya.count / maxCount) * 100}
                          label={`${wilaya.count.toLocaleString()} · ${shareOf(wilaya.count, totalLocated)}`}
                        />
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
              {visibleRows.length === 0 && emptyWilayas.length === 0 && (
                <p className="p-3 text-xs text-brand-text-muted">
                  No wilaya matches “{query.trim()}”.
                </p>
              )}

              {emptyWilayas.length > 0 && (
                <>
                  <button
                    type="button"
                    aria-expanded={showEmpty}
                    onClick={() => setShowEmpty((current) => !current)}
                    className="flex w-full items-center gap-1.5 border-t-2 border-dotted border-brand-border p-3 text-xs font-medium text-brand-text-muted hover:text-brand-text"
                  >
                    {emptyWilayas.length}{" "}
                    {emptyWilayas.length === 1 ? "wilaya" : "wilayas"} with no
                    entries
                    <ChevronDown
                      className={`h-3.5 w-3.5 transition-transform ${showEmpty ? "rotate-180" : ""}`}
                      aria-hidden
                    />
                  </button>
                  {showEmpty && (
                    <ul className="flex flex-wrap gap-1.5 px-3 pb-3">
                      {emptyWilayas.map((wilaya) => (
                        <li key={wilaya.code}>
                          <button
                            type="button"
                            onClick={() => selectWilaya(wilaya.code)}
                            className={`rounded-full border px-2.5 py-1 text-[11px] ${
                              selected === wilaya.code
                                ? "border-brand-accent text-brand-accent"
                                : "border-brand-border text-brand-text-muted hover:text-brand-text"
                            }`}
                          >
                            {padCode(wilaya.code)} {wilaya.name}
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </>
              )}
            </div>

            {unknownCount + unmatchedCount > 0 && (
              <OffMapChip
                unknownCount={unknownCount}
                unmatchedCount={unmatchedCount}
              />
            )}
          </aside>
        </div>
      </div>
    </div>,
    document.body,
  );
};
