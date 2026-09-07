import React, { useMemo, useEffect, useState } from "react";
import { motion } from "motion/react";
import { Lottie } from "lottie-react";
import { UIElement, AnimationConfig } from "../types";
import { resolveAnimationVariant } from "./animations";
import { fireWinConfetti } from "../utils/confettiUtils";
import { SOFT_UI_THEME } from "../theme/tokens";

interface RenderedElementProps {
  element: UIElement;
  /** Live or mock game data dictionary (e.g. { 'player.health': 75, 'player.score': '12400' }) */
  data?: Record<string, any>;
  /** Event trigger callback (e.g. onClick or button action) */
  onAction?: (actionName: string, payload?: any) => void;
  /** Active game events for triggering onGameEvent animations (e.g. 'damageTaken', 'scoreIncrease') */
  activeEvent?: string | null;
  /** Mode: 'editor' (disables native pointer-events inside buttons/inputs if needed) vs 'runtime' */
  mode?: "editor" | "runtime" | "preview";
}

export const RenderedElement: React.FC<RenderedElementProps> = ({
  element,
  data = {},
  onAction,
  activeEvent,
  mode = "runtime",
}) => {
  const [eventTriggerCount, setEventTriggerCount] = useState(0);

  // Extract bound or static content
  const displayContent = useMemo(() => {
    if (element.binding && data[element.binding] !== undefined) {
      return String(data[element.binding]);
    }
    return element.content ?? "";
  }, [element.binding, element.content, data]);

  // Check if any onGameEvent animation matches the active event
  const matchingEventAnim = useMemo(() => {
    if (!activeEvent || !element.animations) return null;
    return element.animations.find(
      (a) => a.trigger === "onGameEvent" && a.gameEvent === activeEvent,
    );
  }, [activeEvent, element.animations]);

  useEffect(() => {
    if (matchingEventAnim) {
      setEventTriggerCount((c) => c + 1);
      if (matchingEventAnim.celebrationEffect === "confetti") {
        fireWinConfetti();
      }
    }
  }, [matchingEventAnim, activeEvent]);

  // Determine active mount/hover/event motion variant
  const mountAnim = element.animations?.find(
    (a) => a.trigger === "onMount" || a.trigger === "onScreenEnter",
  );
  const hoverAnim = element.animations?.find((a) => a.trigger === "onHover");
  const clickAnim = element.animations?.find((a) => a.trigger === "onClick");

  const mountVariant = useMemo(
    () => resolveAnimationVariant(mountAnim),
    [mountAnim],
  );
  const hoverVariant = useMemo(() => {
    if (!hoverAnim) return {};
    const v = resolveAnimationVariant(hoverAnim);
    return v.animate ? { whileHover: v.animate } : {};
  }, [hoverAnim]);
  const eventVariant = useMemo(
    () => resolveAnimationVariant(matchingEventAnim || undefined),
    [matchingEventAnim],
  );

  const handleClick = (e: React.MouseEvent) => {
    if (mode === "editor") return; // Editor handles canvas selection
    e.stopPropagation();

    if (clickAnim?.celebrationEffect === "confetti") {
      fireWinConfetti();
    }

    if (element.binding) {
      onAction?.(element.binding, displayContent);
    } else if (element.type === "button") {
      onAction?.(element.name || "click", displayContent);
    }
  };

  const styleProps: React.CSSProperties = {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent:
      element.style?.textAlign === "left"
        ? "flex-start"
        : element.style?.textAlign === "right"
          ? "flex-end"
          : "center",
    boxSizing: "border-box",
    overflow: "hidden",
    userSelect: mode === "editor" ? "none" : "auto",
    cursor:
      element.type === "button" && mode !== "editor" ? "pointer" : "default",
    ...element.style,
  };

  const renderInnerContent = () => {
    switch (element.type) {
      case "button":
        return (
          <button
            type="button"
            className="w-full h-full flex items-center justify-center font-semibold transition-transform active:scale-95 focus:outline-none"
            style={{
              background: "inherit",
              color: "inherit",
              borderRadius: "inherit",
              fontSize: "inherit",
              fontFamily: "inherit",
              fontWeight: "inherit",
              border: "none",
              padding: "0 12px",
            }}
          >
            {element.iconName && <i className={`${element.iconName} mr-2`} />}
            <span>{displayContent || "Button"}</span>
          </button>
        );

      case "text":
        return (
          <div
            className="w-full h-full flex items-center leading-tight whitespace-pre-wrap select-none"
            style={{
              justifyContent: styleProps.justifyContent,
              color: "inherit",
              fontSize: "inherit",
              fontWeight: "inherit",
              fontFamily: "inherit",
            }}
          >
            {element.iconName && <i className={`${element.iconName} mr-2`} />}
            <span>{displayContent || "Text Box"}</span>
          </div>
        );

      case "progressBar": {
        const rawVal = parseFloat(displayContent) || 100;
        const clampedVal = Math.max(0, Math.min(100, rawVal));
        const barColor =
          (element.style?.color as string) || SOFT_UI_THEME.colors.accent;
        return (
          <div
            className="w-full h-full relative overflow-hidden rounded-full flex items-center p-0.5"
            style={{
              backgroundColor: SOFT_UI_THEME.colors.surfaceSubtle,
              boxShadow: SOFT_UI_THEME.shadows.insetSm,
              border: `1px solid ${SOFT_UI_THEME.colors.border}`,
            }}
          >
            <motion.div
              className="h-full rounded-full"
              style={{
                backgroundColor: barColor,
                boxShadow: `0 2px 8px ${SOFT_UI_THEME.colors.accentGlow}`,
              }}
              initial={false}
              animate={{ width: `${clampedVal}%` }}
              transition={{ type: "spring", damping: 25, stiffness: 200 }}
            />
            {element.style?.showValue && (
              <span className="absolute inset-0 flex items-center justify-center text-[10px] font-bold text-slate-700">
                {Math.round(clampedVal)}%
              </span>
            )}
          </div>
        );
      }

      case "avatar": {
        const avatarSrc =
          displayContent ||
          "https://images.unsplash.com/photo-1566492031773-4f4e44671857?w=150&auto=format&fit=crop&q=80";
        return (
          <div
            className="w-full h-full relative rounded-full overflow-hidden flex items-center justify-center"
            style={{
              backgroundColor: SOFT_UI_THEME.colors.card,
              boxShadow: SOFT_UI_THEME.shadows.extrudedSm,
              border: `1px solid ${SOFT_UI_THEME.colors.border}`,
            }}
          >
            <img
              src={avatarSrc}
              alt={element.name}
              className="w-full h-full object-cover"
              draggable={false}
              onError={(e) => {
                (e.target as HTMLElement).style.display = "none";
              }}
            />
          </div>
        );
      }

      case "image":
        return displayContent ? (
          <img
            src={displayContent}
            alt={element.name}
            className="w-full h-full object-contain pointer-events-none"
            draggable={false}
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center rounded-xl text-xs"
            style={{
              backgroundColor: SOFT_UI_THEME.colors.bgSecondary,
              border: `1px dashed ${SOFT_UI_THEME.colors.border}`,
              color: SOFT_UI_THEME.colors.textSecondary,
            }}
          >
            <i className="fa-regular fa-image text-lg mb-1" />
            <span>Image</span>
          </div>
        );

      case "icon":
        return (
          <div className="w-full h-full flex items-center justify-center text-current">
            <i
              className={`${element.iconName || displayContent || "fa-solid fa-star"} text-2xl`}
            />
          </div>
        );

      case "panel": {
        // 1. Lucky Wheel
        if (
          element.binding === "wheel.spinner" ||
          element.slotId === "wheelContainer" ||
          element.slotId === "wheelHub"
        ) {
          const slices = [
            {
              name: "500 DA Voucher",
              icon: "fa-solid fa-gift",
              color: "#2F6FED",
              textColor: "#FFFFFF",
            },
            {
              name: "Free Delivery",
              icon: "fa-solid fa-truck",
              color: "#FFFFFF",
              textColor: "#2D3748",
            },
            {
              name: "1000 DA Coupon",
              icon: "fa-solid fa-money-bill-wave",
              color: "#EBF2FE",
              textColor: "#2F6FED",
            },
            {
              name: "Special Reward",
              icon: "fa-solid fa-box-open",
              color: "#F1F4F9",
              textColor: "#2D3748",
            },
            {
              name: "Mystery Gift",
              icon: "fa-solid fa-ticket",
              color: "#2F6FED",
              textColor: "#FFFFFF",
            },
            {
              name: "20% Discount",
              icon: "fa-solid fa-tag",
              color: "#FFFFFF",
              textColor: "#2D3748",
            },
            {
              name: "Bonus Points",
              icon: "fa-solid fa-star",
              color: "#EBF2FE",
              textColor: "#2F6FED",
            },
            {
              name: "Try Again",
              icon: "fa-solid fa-rotate-right",
              color: "#F1F4F9",
              textColor: "#64748B",
            },
          ];

          return (
            <div className="w-full h-full relative flex items-center justify-center select-none overflow-visible">
              {/* Outer Wheel Rim with Soft Neumorphic Bezel */}
              <div
                className="relative w-full h-full max-w-[340px] max-h-[340px] aspect-square rounded-full flex items-center justify-center p-2"
                style={{
                  backgroundColor: SOFT_UI_THEME.colors.card,
                  border: `4px solid ${SOFT_UI_THEME.colors.borderLight}`,
                  boxShadow: SOFT_UI_THEME.shadows.extruded,
                }}
              >
                <svg
                  viewBox="0 0 400 400"
                  className="w-full h-full rounded-full overflow-hidden shadow-inner"
                >
                  {slices.map((slice, idx) => {
                    const total = slices.length;
                    const angle = 360 / total;
                    const startAngle = idx * angle;
                    const endAngle = (idx + 1) * angle;
                    const radStart = (startAngle - 90) * (Math.PI / 180);
                    const radEnd = (endAngle - 90) * (Math.PI / 180);
                    const x1 = 200 + 190 * Math.cos(radStart);
                    const y1 = 200 + 190 * Math.sin(radStart);
                    const x2 = 200 + 190 * Math.cos(radEnd);
                    const y2 = 200 + 190 * Math.sin(radEnd);
                    const path = `M 200 200 L ${x1} ${y1} A 190 190 0 0 1 ${x2} ${y2} Z`;

                    const midAngle = idx * angle + angle / 2 - 90;
                    const rad = midAngle * (Math.PI / 180);
                    const tx = 200 + 115 * Math.cos(rad);
                    const ty = 200 + 115 * Math.sin(rad);

                    return (
                      <g key={idx}>
                        <path
                          d={path}
                          fill={slice.color}
                          stroke={SOFT_UI_THEME.colors.border}
                          strokeWidth="1.5"
                        />
                        <g
                          transform={`translate(${tx}, ${ty}) rotate(${midAngle + 90})`}
                        >
                          <text
                            textAnchor="middle"
                            fill={slice.textColor}
                            fontSize="11"
                            fontWeight="700"
                            fontFamily="Inter, system-ui"
                          >
                            {slice.name}
                          </text>
                        </g>
                      </g>
                    );
                  })}
                  {/* Central Hub Cover */}
                  <circle
                    cx="200"
                    cy="200"
                    r="32"
                    fill={SOFT_UI_THEME.colors.card}
                    stroke={SOFT_UI_THEME.colors.border}
                    strokeWidth="3"
                  />
                  <circle
                    cx="200"
                    cy="200"
                    r="18"
                    fill={SOFT_UI_THEME.colors.accent}
                  />
                  <circle
                    cx="200"
                    cy="200"
                    r="6"
                    fill="#FFFFFF"
                    opacity="0.8"
                  />
                </svg>

                {/* 12 LED Lights along Bezel */}
                {[...Array(12)].map((_, i) => {
                  const angle = (i * 360) / 12 - 90;
                  const rad = angle * (Math.PI / 180);
                  const radius = 48;
                  const lx = 50 + radius * Math.cos(rad);
                  const ly = 50 + radius * Math.sin(rad);
                  return (
                    <div
                      key={i}
                      className="absolute w-2.5 h-2.5 rounded-full border border-slate-200"
                      style={{
                        left: `${lx}%`,
                        top: `${ly}%`,
                        transform: "translate(-50%, -50%)",
                        backgroundColor:
                          i % 2 === 0 ? SOFT_UI_THEME.colors.accent : "#FFFFFF",
                        boxShadow:
                          i % 2 === 0
                            ? `0 0 6px ${SOFT_UI_THEME.colors.accentGlow}`
                            : "0 1px 3px rgba(0,0,0,0.1)",
                      }}
                    />
                  );
                })}
              </div>

              {/* Top Pointer Needle */}
              <div className="absolute top-0 left-1/2 -translate-x-1/2 -translate-y-2 z-20 pointer-events-none drop-shadow-[0_4px_8px_rgba(0,0,0,0.15)]">
                <svg width="26" height="34" viewBox="0 0 28 38" fill="none">
                  <path
                    d="M14 38L0 12C0 12 4.5 0 14 0C23.5 0 28 12 28 12L14 38Z"
                    fill={SOFT_UI_THEME.colors.accent}
                  />
                  <circle cx="14" cy="10" r="4" fill="#FFFFFF" />
                </svg>
              </div>
            </div>
          );
        }

        // 2. Scratch Card Surface
        if (
          element.binding === "scratch.surface" ||
          element.slotId === "ticketArea"
        ) {
          return (
            <div
              className="w-full h-full relative rounded-2xl p-4 flex flex-col items-center justify-center text-center overflow-hidden"
              style={{
                background: "linear-gradient(135deg, #FFFFFF 0%, #F1F4F9 100%)",
                border: `1px solid ${SOFT_UI_THEME.colors.border}`,
                boxShadow: SOFT_UI_THEME.shadows.extruded,
              }}
            >
              <div
                className="w-full h-full rounded-xl flex flex-col items-center justify-center gap-2 p-3"
                style={{
                  background:
                    "linear-gradient(135deg, #E2E8F0 0%, #CBD5E1 50%, #E2E8F0 100%)",
                  boxShadow: SOFT_UI_THEME.shadows.inset,
                }}
              >
                <i className="fa-solid fa-coins text-3xl text-[#2F6FED] animate-bounce" />
                <span className="font-extrabold text-xs tracking-wider uppercase text-slate-700">
                  SCRATCH TO REVEAL
                </span>
                <span
                  dir="auto"
                  className="text-slate-600 text-[11px] font-semibold"
                >
                  احك البطاقة واكتشف هديتك
                </span>
              </div>
            </div>
          );
        }

        // 3. Mystery Boxes Group
        if (
          element.binding === "mystery.boxes" ||
          element.slotId === "mysteryBoxGroup"
        ) {
          return (
            <div className="w-full h-full flex items-center justify-center gap-3 p-2">
              {[1, 2, 3].map((boxNum) => (
                <div
                  key={boxNum}
                  className="flex-1 aspect-[4/5] rounded-2xl flex flex-col items-center justify-center gap-2 text-center group cursor-pointer transition-transform hover:scale-105"
                  style={{
                    backgroundColor: SOFT_UI_THEME.colors.card,
                    border: `1px solid ${SOFT_UI_THEME.colors.border}`,
                    boxShadow: SOFT_UI_THEME.shadows.extrudedSm,
                  }}
                >
                  <div
                    className="w-11 h-11 rounded-xl flex items-center justify-center"
                    style={{
                      backgroundColor: SOFT_UI_THEME.colors.accentLight,
                      color: SOFT_UI_THEME.colors.accent,
                    }}
                  >
                    <i className="fa-solid fa-gift text-xl group-hover:scale-110 transition-transform" />
                  </div>
                  <span className="text-[11px] font-bold uppercase text-slate-700 tracking-wider">
                    Box #{boxNum}
                  </span>
                </div>
              ))}
            </div>
          );
        }

        // 4. Hit It Target Area
        if (
          element.binding === "hitit.target" ||
          element.slotId === "targetField"
        ) {
          return (
            <div
              className="w-full h-full relative rounded-2xl flex items-center justify-center overflow-hidden"
              style={{
                backgroundColor: SOFT_UI_THEME.colors.bgSecondary,
                border: `1px solid ${SOFT_UI_THEME.colors.border}`,
              }}
            >
              <div
                className="relative z-10 w-20 h-20 rounded-full flex items-center justify-center text-2xl transition-transform hover:scale-105"
                style={{
                  backgroundColor: SOFT_UI_THEME.colors.card,
                  border: `3px solid ${SOFT_UI_THEME.colors.border}`,
                  boxShadow: SOFT_UI_THEME.shadows.extruded,
                  color: SOFT_UI_THEME.colors.accent,
                }}
              >
                <i className="fa-solid fa-bolt text-2xl" />
              </div>
            </div>
          );
        }

        // 5. Quiz Question Prompt Card
        if (
          element.binding === "quiz.question" ||
          element.slotId === "questionPanel"
        ) {
          return (
            <div
              className="w-full h-full flex flex-col justify-between p-3.5 rounded-2xl text-left"
              style={{
                backgroundColor: SOFT_UI_THEME.colors.card,
                border: `1px solid ${SOFT_UI_THEME.colors.border}`,
                boxShadow: SOFT_UI_THEME.shadows.extrudedSm,
              }}
            >
              <div className="mb-2">
                <span className="text-[10px] uppercase font-bold text-[#2F6FED]">
                  Question 1 / 3
                </span>
                <p className="text-xs font-bold text-slate-800 mt-0.5 leading-snug">
                  What is the international calling code for Algeria?
                </p>
              </div>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { label: "A", text: "+213", correct: true },
                  { label: "B", text: "+212", correct: false },
                  { label: "C", text: "+216", correct: false },
                  { label: "D", text: "+20", correct: false },
                ].map((opt) => (
                  <div
                    key={opt.label}
                    className="px-2.5 py-2 rounded-xl text-[11px] font-bold flex items-center gap-2 cursor-pointer transition-all"
                    style={{
                      backgroundColor: opt.correct
                        ? SOFT_UI_THEME.colors.accent
                        : SOFT_UI_THEME.colors.bgSecondary,
                      color: opt.correct
                        ? "#FFFFFF"
                        : SOFT_UI_THEME.colors.textPrimary,
                      border: `1px solid ${opt.correct ? SOFT_UI_THEME.colors.accent : SOFT_UI_THEME.colors.border}`,
                      boxShadow: opt.correct
                        ? SOFT_UI_THEME.shadows.accentBtn
                        : "none",
                    }}
                  >
                    <span
                      className="w-4 h-4 rounded-full flex items-center justify-center text-[9px] font-mono"
                      style={{
                        backgroundColor: opt.correct
                          ? "rgba(255,255,255,0.2)"
                          : "#E2E8F0",
                      }}
                    >
                      {opt.label}
                    </span>
                    <span>{opt.text}</span>
                  </div>
                ))}
              </div>
            </div>
          );
        }

        // 6. Voucher Card
        if (
          element.binding === "prize.coupon" ||
          element.slotId === "voucherArea"
        ) {
          return (
            <div
              className="w-full h-full rounded-2xl p-3 flex flex-col items-center justify-center text-center"
              style={{
                backgroundColor: SOFT_UI_THEME.colors.card,
                border: `2px dashed ${SOFT_UI_THEME.colors.accent}`,
                boxShadow: SOFT_UI_THEME.shadows.extrudedSm,
              }}
            >
              <span className="text-[10px] font-bold text-[#2F6FED] uppercase tracking-widest font-mono">
                Your Instant Voucher Code
              </span>
              <div
                className="flex items-center gap-2 mt-1 px-3 py-1 rounded-xl"
                style={{
                  backgroundColor: SOFT_UI_THEME.colors.bgSecondary,
                  border: `1px solid ${SOFT_UI_THEME.colors.border}`,
                  boxShadow: SOFT_UI_THEME.shadows.insetSm,
                }}
              >
                <span className="font-mono font-bold text-sm text-[#2F6FED] tracking-wider">
                  OCTO-WIN-2026
                </span>
                <i className="fa-solid fa-copy text-xs text-[#2F6FED]" />
              </div>
            </div>
          );
        }

        return (
          <div className="w-full h-full flex flex-col p-2">
            {displayContent && (
              <span className="text-sm font-semibold text-slate-700">
                {displayContent}
              </span>
            )}
            {element.children && element.children.length > 0 && (
              <div className="flex-1 relative">
                {element.children.map((child) => (
                  <RenderedElement
                    key={child.id}
                    element={child}
                    data={data}
                    onAction={onAction}
                    activeEvent={activeEvent}
                    mode={mode}
                  />
                ))}
              </div>
            )}
          </div>
        );
      }

      case "input":
        return (
          <input
            type="text"
            readOnly={mode === "editor"}
            placeholder={element.placeholder || "Enter value..."}
            value={mode === "editor" ? displayContent : undefined}
            defaultValue={mode !== "editor" ? displayContent : undefined}
            className="w-full h-full px-3 text-sm rounded-xl focus:outline-none transition-all"
            style={{
              backgroundColor: SOFT_UI_THEME.colors.inputBg,
              color: SOFT_UI_THEME.colors.inputText,
              border: `1px solid ${SOFT_UI_THEME.colors.inputBorder}`,
              boxShadow: SOFT_UI_THEME.shadows.inset,
            }}
          />
        );

      case "lottie":
        return element.lottieData || element.lottieUrl ? (
          <Lottie
            src={element.lottieData || element.lottieUrl}
            loop={true}
            autoplay={true}
            className="w-full h-full"
          />
        ) : (
          <div
            className="w-full h-full flex flex-col items-center justify-center rounded-xl text-xs p-2 text-center"
            style={{
              backgroundColor: SOFT_UI_THEME.colors.accentLight,
              border: `1px solid ${SOFT_UI_THEME.colors.border}`,
              color: SOFT_UI_THEME.colors.accent,
            }}
          >
            <i className="fa-solid fa-play text-lg mb-1 text-[#2F6FED] animate-pulse" />
            <span>Lottie Animation</span>
          </div>
        );

      default:
        return <div className="w-full h-full">{displayContent}</div>;
    }
  };

  // Combine initial, animate, whileHover, etc.
  const motionProps: any = {
    ...mountVariant,
    ...hoverVariant,
  };

  // If there's an active event animation, override animate
  if (matchingEventAnim && eventVariant.animate) {
    motionProps.animate = eventVariant.animate;
    motionProps.transition = eventVariant.transition;
  }

  return (
    <motion.div
      key={`${element.id}-${eventTriggerCount}`}
      style={styleProps}
      onClick={handleClick}
      {...motionProps}
    >
      {renderInnerContent()}
    </motion.div>
  );
};
