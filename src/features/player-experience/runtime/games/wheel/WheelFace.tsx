import { useId, type CSSProperties, type Ref } from "react";
import type { CampaignSnapshot } from "../../../domain/campaign";
import { resolvePrizeDisplay } from "../../../domain/display";
import { resolveText, type Locale } from "../../../domain/locale";
import type { ExperienceConfig, WheelSegment } from "../../../domain/types";
import { ICON_COMPONENTS } from "../../../presets/icons";
import { tint } from "../../../theme/recipes";

// The wheel itself, drawn once and shared by the engine and the pregame teaser (plan §8.7):
// the teaser shows exactly the wheel that will be played, down to the segment a brand just
// renamed in the Studio. Pure drawing — it holds no state, decides nothing, and turns only
// as much as the rotor ref, class or style it is given says.

// Geometry, in the SVG's own units: the viewBox scales the whole thing, so the pointer and
// the hub grow with the wheel instead of staying a fixed pixel size (plan §8.6).
const DISC = 128;
const RIM = 140;
const LABEL_RADIUS = 84;
const ICON_RADIUS = 110;
const ICON_SIZE = 19;
const HUB = 40;
// Prize names are held to 14 characters by the design check (T1.11); a longer label, typed
// straight into a segment, is cut here rather than left to spill over its neighbours.
const MAX_LABEL = 14;

// Segments without a color of their own alternate through the theme, so a preset change
// recolors the whole wheel (C5: never a color written here).
const PALETTE = [
  "var(--xp-primary)",
  "var(--xp-secondary)",
  "var(--xp-accent)",
] as const;
// A segment that carries no prize is quiet rather than coloured: on a preset whose brand
// colours are close to one another, a wheel where every slice shouts reads as one flat disc,
// and the player cannot tell a prize from a blank.
const LOSING = "color-mix(in srgb, var(--xp-text) 16%, var(--xp-surface))";

function segmentColor(
  segment: WheelSegment,
  index: number,
  count: number,
): string {
  if (segment.color) return segment.color;
  if (segment.prizeId === null) return LOSING;
  // The last segment of a wheel whose size is not a multiple of the palette would meet the
  // first one in the same color: it takes the one neither of its neighbours has.
  const wraps = index === count - 1 && index % PALETTE.length === 0;
  return PALETTE[wraps ? 1 : index % PALETTE.length];
}

// Labels run along their slice. Half the wheel would have them upside down, so those are
// turned the other way up: a prize is read at a glance, never head-tilted.
function labelAngle(middle: number): number {
  const tangential = middle + 90;
  return Math.cos((tangential * Math.PI) / 180) < 0
    ? tangential + 180
    : tangential;
}

function arcPath(startAngle: number, endAngle: number): string {
  const point = (degrees: number) => {
    const radians = (degrees * Math.PI) / 180;
    return `${(Math.cos(radians) * DISC).toFixed(2)} ${(Math.sin(radians) * DISC).toFixed(2)}`;
  };
  const large = endAngle - startAngle > 180 ? 1 : 0;
  return `M 0 0 L ${point(startAngle)} A ${DISC} ${DISC} 0 ${large} 1 ${point(endAngle)} Z`;
}

export interface WheelFaceProps {
  segments: readonly WheelSegment[];
  hubLabel: string;
  campaign: CampaignSnapshot;
  config: ExperienceConfig;
  locale: Locale;
  // How the wheel turns: the engine drives the angle frame by frame through the ref, the
  // teaser hands a CSS animation instead. Neither of them re-renders the segments to move.
  rotorRef?: Ref<SVGGElement>;
  rotorClassName?: string;
  rotorStyle?: CSSProperties;
}

export function WheelFace({
  segments,
  hubLabel,
  campaign,
  config,
  locale,
  rotorRef,
  rotorClassName,
  rotorStyle,
}: WheelFaceProps) {
  const gradientId = useId(); // several wheels can live in one page (Studio preview)
  const count = segments.length;
  const segmentAngle = count > 0 ? 360 / count : 360;

  return (
    <svg
      viewBox={`-${RIM} -${RIM} ${RIM * 2} ${RIM * 2}`}
      className="size-full overflow-visible"
      aria-hidden
      focusable="false"
    >
      <defs>
        <radialGradient id={`${gradientId}-hub`}>
          <stop offset="0%" stopColor="var(--xp-primary-light)" />
          <stop offset="100%" stopColor="var(--xp-primary-deep)" />
        </radialGradient>
      </defs>

      {/* The rim stays still: only the disc inside it turns. */}
      <circle
        r={(DISC + RIM) / 2}
        fill="none"
        stroke={tint("--xp-text", 12)}
        strokeWidth={RIM - DISC}
      />
      <circle
        r={RIM - 1}
        fill="none"
        stroke={tint("--xp-primary", 45)}
        strokeWidth={2}
      />

      <g ref={rotorRef} className={rotorClassName} style={rotorStyle}>
        {segments.map((segment, index) => {
          const start = index * segmentAngle;
          const middle = start + segmentAngle / 2;
          const radians = (middle * Math.PI) / 180;
          const display = segment.prizeId
            ? resolvePrizeDisplay(segment.prizeId, config, campaign, locale)
            : null;
          const own = resolveText(
            segment.label,
            locale,
            config.locales.default,
          );
          const label = own || display?.label || "";
          const iconName = segment.icon ?? display?.icon ?? null;
          const Icon = iconName ? ICON_COMPONENTS[iconName] : null;
          return (
            <g key={segment.id}>
              <path
                d={arcPath(start, start + segmentAngle)}
                fill={segmentColor(segment, index, count)}
                stroke={tint("--xp-surface", 55)}
                strokeWidth={1.5}
              />
              <g
                transform={`translate(${(Math.cos(radians) * LABEL_RADIUS).toFixed(2)} ${(Math.sin(radians) * LABEL_RADIUS).toFixed(2)}) rotate(${labelAngle(middle).toFixed(2)})`}
              >
                <text
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={
                    segment.prizeId === null
                      ? "var(--xp-text)"
                      : "var(--xp-on-primary)"
                  }
                  fontSize="11"
                  fontWeight="800"
                  style={{
                    textShadow: `0 1px 2px ${tint("--xp-surface", 55)}`,
                  }}
                >
                  {label.length > MAX_LABEL
                    ? `${label.slice(0, MAX_LABEL - 1)}…`
                    : label}
                </text>
              </g>
              {Icon && (
                <Icon
                  x={Math.cos(radians) * ICON_RADIUS - ICON_SIZE / 2}
                  y={Math.sin(radians) * ICON_RADIUS - ICON_SIZE / 2}
                  width={ICON_SIZE}
                  height={ICON_SIZE}
                  strokeWidth={2}
                  color={
                    segment.prizeId === null
                      ? "var(--xp-text)"
                      : "var(--xp-on-primary)"
                  }
                  opacity={0.85}
                />
              )}
            </g>
          );
        })}
      </g>

      {/* Hub and pointer, both inside the viewBox: they scale with the wheel. */}
      <circle
        r={HUB}
        fill={`url(#${gradientId}-hub)`}
        stroke={tint("--xp-surface", 70)}
        strokeWidth={3}
      />
      <text
        textAnchor="middle"
        dominantBaseline="middle"
        fill="var(--xp-on-primary)"
        fontSize="15"
        fontWeight="900"
        letterSpacing="1"
      >
        {hubLabel}
      </text>
      <path
        d={`M -13 -${RIM} L 13 -${RIM} L 0 -${DISC - 6} Z`}
        fill="var(--xp-primary)"
        stroke={tint("--xp-surface", 65)}
        strokeWidth={2}
        strokeLinejoin="round"
      />
    </svg>
  );
}
