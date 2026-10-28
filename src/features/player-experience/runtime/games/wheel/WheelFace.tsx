import { useId, type CSSProperties, type Ref } from "react";
import type { CampaignSnapshot } from "../../../domain/campaign";
import { resolvePrizeDisplay } from "../../../domain/display";
import { resolveText, type Locale } from "../../../domain/locale";
import type { ExperienceConfig, WheelSegment } from "../../../domain/types";
import { ICON_COMPONENTS } from "../../../presets/icons";
import { useGameTheme } from "../../../theme/GameTheme";
import { tint } from "../../../theme/recipes";
import { prizeArtUrl } from "../../../theme/themeAssets";

// The wheel itself, drawn once and shared by the engine and the pregame teaser (plan §8.7):
// the teaser shows exactly the wheel that will be played, down to the segment a brand just
// renamed in the Studio. Pure drawing — it holds no state, decides nothing, and turns only
// as much as the rotor ref, class or style it is given says.
//
// Its colors are the theme's wheel tokens (--xp-wheel-*, from theme.json), each falling back
// to the classic wheel in the brand's own colors. A theme with bulbs gets lights around the
// rim, blinking while the wheel turns; a theme with prize art shows each prize's picture on
// its slice instead of an icon.

// Geometry, in the SVG's own units: the viewBox scales the whole thing, so the pointer and
// the hub grow with the wheel instead of staying a fixed pixel size (plan §8.6).
const DISC = 128;
const RIM = 140;
const LABEL_RADIUS = 84;
const ICON_RADIUS = 110;
const ICON_SIZE = 19;
const ART_SIZE = 24;
const HUB = 40;
const BULB = 3.2;
const RIM_STRIPES = 24; // blocks of a striped rim, all round
const INKED_BULB = 4.4; // an outlined light reads bigger, like a rivet
// A theme's own pointer stands above the rim (its tip at the bottom of the picture, its size
// from theme.json): the viewBox grows by what stands out, all round, so the wheel stays
// square and centred.
// Prize names are held to 14 characters by the design check (T1.11); a longer label, typed
// straight into a segment, is cut here rather than left to spill over its neighbours.
const MAX_LABEL = 14;

// The classic wheel alternates the brand's three colors; a theme brings its own palette.
const CLASSIC = [
  "var(--xp-primary)",
  "var(--xp-secondary)",
  "var(--xp-accent)",
] as const;
// A segment that carries no prize is quiet rather than coloured: on a preset whose brand
// colours are close to one another, a wheel where every slice shouts reads as one flat disc,
// and the player cannot tell a prize from a blank.
const LOSING =
  "var(--xp-wheel-blank, color-mix(in srgb, var(--xp-text) 16%, var(--xp-surface)))";
const LOSING_TEXT = "var(--xp-wheel-blank-text, var(--xp-text))";

interface SliceColors {
  fill: string;
  text: string;
}

function sliceColors(
  segment: WheelSegment,
  index: number,
  count: number,
  palette: number, // how many colors the wheel alternates
): SliceColors {
  // A color the brand set on this segment keeps the text of its kind.
  if (segment.color) {
    return {
      fill: segment.color,
      text: segment.prizeId === null ? LOSING_TEXT : "var(--xp-on-primary)",
    };
  }
  if (segment.prizeId === null) return { fill: LOSING, text: LOSING_TEXT };
  // The last segment of a wheel whose size is not a multiple of the palette would meet the
  // first one in the same color: it takes the one neither of its neighbours has.
  const wraps = index === count - 1 && index % palette === 0;
  const slot = wraps ? 1 : index % palette;
  return {
    fill: `var(--xp-wheel-seg-${slot + 1}, ${CLASSIC[slot % CLASSIC.length]})`,
    text: `var(--xp-wheel-seg-text-${slot + 1}, var(--xp-on-primary))`,
  };
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
  pointerRef?: Ref<SVGGraphicsElement>; // flicked on each slice by a lively engine
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
  pointerRef,
  rotorClassName,
  rotorStyle,
}: WheelFaceProps) {
  const gradientId = useId(); // several wheels can live in one page (Studio preview)
  const { manifest, assets } = useGameTheme();
  const themed = manifest !== null;
  const palette = manifest?.wheel.segments.length ?? CLASSIC.length;
  const count = segments.length;
  const segmentAngle = count > 0 ? 360 / count : 360;
  // Lights per slice from the theme (two by default, never fewer than twelve around the
  // wheel); one per slice sits on the lines between them.
  const perSlice = manifest?.wheel.bulbsPerSlice ?? 2;
  const bulbs = manifest?.wheel.bulbs
    ? perSlice === 1
      ? Math.max(1, count)
      : Math.max(12, count * perSlice)
    : 0;
  const bulbOffset = perSlice === 1 ? segmentAngle / 2 : 0;
  const inkedBulbs = Boolean(manifest?.wheel.bulbInk);
  const pointerArt = assets?.wheelPointer ?? null;
  const pointerSize = manifest?.wheel.pointerSize;
  const view =
    RIM +
    (pointerArt && pointerSize
      ? Math.max(0, pointerSize.height - pointerSize.overlap)
      : 0);
  const flatHub = themed && manifest?.wheel.hubShine === false;
  const stripes = Boolean(manifest?.wheel.rimStripes);
  const stripe = (2 * Math.PI * ((DISC + RIM) / 2)) / (2 * RIM_STRIPES);
  const squareBulbs = manifest?.wheel.bulbShape === "square";
  const squareHub = manifest?.wheel.hubShape === "square";
  const rimMiddle = (DISC + RIM) / 2;

  return (
    <svg
      viewBox={`-${view} -${view} ${view * 2} ${view * 2}`}
      // Everything is drawn inside the viewBox (pointer included), so nothing needs to spill:
      // a rotated group that overflowed pushed the page sideways by a few pixels (T5.7).
      className="xp-wheel size-full"
      aria-hidden
      focusable="false"
    >
      <defs>
        <radialGradient id={`${gradientId}-hub`}>
          <stop
            offset="0%"
            stopColor={
              themed ? "var(--xp-wheel-hub)" : "var(--xp-primary-light)"
            }
          />
          <stop
            offset="100%"
            stopColor={
              themed
                ? "color-mix(in srgb, var(--xp-wheel-hub) 72%, var(--xp-ink))"
                : "var(--xp-primary-deep)"
            }
          />
        </radialGradient>
      </defs>

      {/* The rim stays still: only the disc inside it turns. */}
      <circle
        className="xp-wheel-rim"
        r={rimMiddle}
        fill="none"
        stroke={`var(--xp-wheel-rim, ${tint("--xp-text", 12)})`}
        strokeWidth={RIM - DISC}
      />
      {stripes && (
        // Blocks of the second color all round the rim, the rim's own color between them.
        <circle
          className="xp-wheel-rim-stripes"
          r={rimMiddle}
          fill="none"
          stroke="var(--xp-wheel-rim-stripes)"
          strokeWidth={RIM - DISC}
          strokeDasharray={`${stripe.toFixed(3)} ${stripe.toFixed(3)}`}
        />
      )}
      <circle
        className="xp-wheel-rim-edge"
        r={RIM - 1}
        fill="none"
        stroke={`var(--xp-wheel-rim-ink, ${tint("--xp-primary", 45)})`}
        strokeWidth={themed ? 2.5 : 2}
      />
      {Array.from({ length: bulbs }, (_, index) => {
        const radians =
          ((index * 360) / bulbs - 90 + bulbOffset) * (Math.PI / 180);
        const x = Math.cos(radians) * rimMiddle;
        const y = Math.sin(radians) * rimMiddle;
        const size = inkedBulbs ? INKED_BULB : BULB;
        const light = {
          className: "xp-wheel-bulb",
          stroke: inkedBulbs ? "var(--xp-wheel-bulb-ink)" : undefined,
          strokeWidth: inkedBulbs ? 1.6 : undefined,
          // Every other light blinks on the other beat: a chase around the rim. Its place in
          // the ring, for a theme's slow chase while the wheel waits (motion.css).
          style: {
            "--xp-bulb-delay": index % 2 ? "0.25s" : "0s",
            "--xp-bulb-at": (index / bulbs).toFixed(3),
          } as CSSProperties,
        };
        // A pixel theme's lights are square, upright whatever their place on the rim.
        return squareBulbs ? (
          <rect
            key={index}
            {...light}
            x={(x - size).toFixed(2)}
            y={(y - size).toFixed(2)}
            width={size * 2}
            height={size * 2}
          />
        ) : (
          <circle
            key={index}
            {...light}
            cx={x.toFixed(2)}
            cy={y.toFixed(2)}
            r={size}
          />
        );
      })}

      <g
        ref={rotorRef}
        className={`xp-wheel-rotor ${rotorClassName ?? ""}`}
        style={rotorStyle}
      >
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
          const art =
            segment.prizeId !== null ? prizeArtUrl(assets, iconName) : null;
          const Icon = !art && iconName ? ICON_COMPONENTS[iconName] : null;
          const colors = sliceColors(segment, index, count, palette);
          const iconX = Math.cos(radians) * ICON_RADIUS;
          const iconY = Math.sin(radians) * ICON_RADIUS;
          return (
            <g key={segment.id} data-xp-segment>
              <path
                className="xp-wheel-segment"
                d={arcPath(start, start + segmentAngle)}
                fill={colors.fill}
                stroke={tint("--xp-surface", 55)}
                strokeWidth={1.5}
              />
              <g
                transform={`translate(${(Math.cos(radians) * LABEL_RADIUS).toFixed(2)} ${(Math.sin(radians) * LABEL_RADIUS).toFixed(2)}) rotate(${labelAngle(middle).toFixed(2)})`}
              >
                <text
                  className="xp-wheel-label"
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fill={colors.text}
                  fontSize="11"
                  fontWeight="800"
                  style={
                    themed
                      ? undefined
                      : { textShadow: `0 1px 2px ${tint("--xp-surface", 55)}` }
                  }
                >
                  {label.length > MAX_LABEL
                    ? `${label.slice(0, MAX_LABEL - 1)}…`
                    : label}
                </text>
              </g>
              {art && (
                <image
                  href={art}
                  x={iconX - ART_SIZE / 2}
                  y={iconY - ART_SIZE / 2}
                  width={ART_SIZE}
                  height={ART_SIZE}
                  transform={`rotate(${(middle + 90).toFixed(2)} ${iconX.toFixed(2)} ${iconY.toFixed(2)})`}
                />
              )}
              {Icon && (
                <Icon
                  x={iconX - ICON_SIZE / 2}
                  y={iconY - ICON_SIZE / 2}
                  width={ICON_SIZE}
                  height={ICON_SIZE}
                  strokeWidth={2}
                  color={colors.text}
                  opacity={0.85}
                />
              )}
            </g>
          );
        })}
      </g>

      {/* The disc's own outline, still over the turning slices: a cartoon wheel is inked. */}
      {themed && (
        <circle
          className="xp-wheel-disc-edge"
          r={DISC}
          fill="none"
          stroke="var(--xp-wheel-rim-ink)"
          strokeWidth={2.5}
        />
      )}

      {/* Hub and pointer, both inside the viewBox: they scale with the wheel. */}
      <g className="xp-wheel-hub-group">
        {squareHub ? (
          <rect
            className="xp-wheel-hub"
            x={-HUB}
            y={-HUB}
            width={HUB * 2}
            height={HUB * 2}
            fill={flatHub ? "var(--xp-wheel-hub)" : `url(#${gradientId}-hub)`}
            stroke="var(--xp-wheel-rim-ink)"
            strokeWidth={4}
          />
        ) : (
          <circle
            className="xp-wheel-hub"
            r={HUB}
            fill={flatHub ? "var(--xp-wheel-hub)" : `url(#${gradientId}-hub)`}
            stroke={
              themed ? "var(--xp-wheel-rim-ink)" : tint("--xp-surface", 70)
            }
            strokeWidth={themed ? 4 : 3}
          />
        )}
        <text
          className="xp-wheel-hub-label"
          textAnchor="middle"
          dominantBaseline="middle"
          fill="var(--xp-wheel-hub-text, var(--xp-on-primary))"
          fontSize="15"
          fontWeight="900"
          letterSpacing="1"
        >
          {hubLabel}
        </text>
      </g>
      {pointerArt && pointerSize ? (
        <image
          ref={pointerRef as Ref<SVGImageElement>}
          className="xp-wheel-pointer"
          href={pointerArt}
          x={-pointerSize.width / 2}
          y={-view}
          width={pointerSize.width}
          height={pointerSize.height}
        />
      ) : (
        <path
          ref={pointerRef as Ref<SVGPathElement>}
          className="xp-wheel-pointer"
          d={`M -13 -${RIM} L 13 -${RIM} L 0 -${DISC - 6} Z`}
          fill="var(--xp-wheel-pointer, var(--xp-primary))"
          stroke={`var(--xp-wheel-pointer-ink, ${tint("--xp-surface", 65)})`}
          strokeWidth={themed ? 3.5 : 2}
          strokeLinejoin="round"
        />
      )}
    </svg>
  );
}
