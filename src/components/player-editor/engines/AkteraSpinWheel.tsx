import React, { useEffect, useMemo, useRef, useState } from "react";
import { playClick, playLose, playTick, playWin } from "../aktera-audio";

export type WheelLanguage = "en" | "fr" | "ar";

export interface WheelPrizeSlice {
  id: string;
  labelEn: string;
  labelFr?: string;
  labelAr?: string;
  icon?: string;
  probability: number;
  category?: "win" | "empty";
  value?: string;
  color?: string;
}

export interface WheelSpinSignal {
  name: string;
  nonce: number;
  payload?: any;
}

export interface WheelSpinResult {
  prize: WheelPrizeSlice;
  rewardLabel: string;
  isWin: boolean;
  outcome: "win" | "lose";
}

export interface SpinWheelProps {
  prizes?: WheelPrizeSlice[];
  language?: WheelLanguage;
  externalSpinSignal?: WheelSpinSignal | null;
  onSpinSignalConsumed?: (nonce: number) => void;
  onSpinComplete?: (result: WheelSpinResult) => void;
  className?: string;
  style?: React.CSSProperties;
  primaryColor?: string;
  secondaryColor?: string;
  logoText?: string;
}

export const DEFAULT_PRIZES: WheelPrizeSlice[] = [
  {
    id: "voucher-20",
    labelEn: "20% Voucher",
    labelFr: "Bon 20%",
    labelAr: "قسيمة 20%",
    icon: "🎁",
    probability: 0.16,
    category: "win",
    value: "20% Voucher",
    color: "#7C3AED",
  },
  {
    id: "free-delivery",
    labelEn: "Free Delivery",
    labelFr: "Livraison gratuite",
    labelAr: "توصيل مجاني",
    icon: "🚚",
    probability: 0.14,
    category: "win",
    value: "Free Delivery",
    color: "#2563EB",
  },
  {
    id: "bonus-points",
    labelEn: "Bonus Points",
    labelFr: "Points bonus",
    labelAr: "نقاط إضافية",
    icon: "⭐",
    probability: 0.18,
    category: "win",
    value: "500 Bonus Points",
    color: "#059669",
  },
  {
    id: "mystery-gift",
    labelEn: "Mystery Gift",
    labelFr: "Cadeau mystère",
    labelAr: "هدية مفاجأة",
    icon: "🎉",
    probability: 0.14,
    category: "win",
    value: "Mystery Gift",
    color: "#D97706",
  },
  {
    id: "better-luck",
    labelEn: "Try Again",
    labelFr: "Réessayez",
    labelAr: "حظ أوفر",
    icon: "🌙",
    probability: 0.18,
    category: "empty",
    value: "Try Again",
    color: "#475569",
  },
  {
    id: "vip-pass",
    labelEn: "VIP Pass",
    labelFr: "Pass VIP",
    labelAr: "بطاقة VIP",
    icon: "👑",
    probability: 0.1,
    category: "win",
    value: "VIP Pass",
    color: "#9333EA",
  },
  {
    id: "instant-coupon",
    labelEn: "1000 DA Coupon",
    labelFr: "Bon 1000 DA",
    labelAr: "قسيمة 1000 دج",
    icon: "💰",
    probability: 0.1,
    category: "win",
    value: "1000 DA Coupon",
    color: "#0F766E",
  },
  {
    id: "surprise-box",
    labelEn: "Surprise Box",
    labelFr: "Boîte surprise",
    labelAr: "صندوق مفاجأة",
    icon: "🎁",
    probability: 0.1,
    category: "win",
    value: "Surprise Box",
    color: "#1D4ED8",
  },
];

const DEFAULT_PRIMARY = "#7C3AED";
const DEFAULT_SECONDARY = "#A78BFA";

function resolvePrizeLabel(prize: WheelPrizeSlice, language: WheelLanguage) {
  if (language === "ar") return prize.labelAr || prize.labelEn;
  if (language === "fr") return prize.labelFr || prize.labelEn;
  return prize.labelEn;
}

function selectPrizeIndex(prizes: WheelPrizeSlice[]) {
  if (prizes.length === 0) return 0;

  const totalProbability = prizes.reduce(
    (sum, prize) => sum + Math.max(0, prize.probability || 0),
    0,
  );

  if (totalProbability <= 0) {
    return Math.floor(Math.random() * prizes.length);
  }

  const randomPick = Math.random() * totalProbability;
  let accumulated = 0;

  for (let index = 0; index < prizes.length; index++) {
    accumulated += Math.max(0, prizes[index].probability || 0);
    if (randomPick <= accumulated) return index;
  }

  return prizes.length - 1;
}

export function presetPrizesToWheelSlices(
  prizes: Array<{
    id: string;
    nameEn: string;
    nameFr?: string;
    nameAr?: string;
    icon?: string;
    isWin: boolean;
    color?: string;
    value?: string;
  }>,
): WheelPrizeSlice[] {
  if (!prizes || prizes.length === 0) return DEFAULT_PRIZES;
  const equalProb = 1 / prizes.length;
  return prizes.map((p) => ({
    id: p.id,
    labelEn: p.nameEn,
    labelFr: p.nameFr,
    labelAr: p.nameAr,
    icon: p.icon,
    color: p.color,
    value: p.value,
    category: p.isWin ? "win" : "empty",
    probability: equalProb,
  }));
}

export const SpinWheel: React.FC<SpinWheelProps> = ({
  prizes,
  language = "en",
  externalSpinSignal,
  onSpinSignalConsumed,
  onSpinComplete,
  className = "",
  style,
  primaryColor = DEFAULT_PRIMARY,
  secondaryColor = DEFAULT_SECONDARY,
  logoText = "AKTERA",
}) => {
  const wheelPrizes = useMemo(
    () => (prizes && prizes.length > 0 ? prizes : DEFAULT_PRIZES),
    [prizes],
  );
  const sliceAngle = 360 / wheelPrizes.length;

  const [rotation, setRotation] = useState(0);
  const [isSpinning, setIsSpinning] = useState(false);
  const [winnerLabel, setWinnerLabel] = useState<string | null>(null);

  const rotationRef = useRef(0);
  const animationFrameRef = useRef<number | null>(null);
  const lastTickAngleRef = useRef(0);
  const consumedSignalRef = useRef<number | null>(null);

  const cancelAnimation = () => {
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
  };

  const startSpin = () => {
    if (isSpinning) return false;

    cancelAnimation();
    setIsSpinning(true);
    setWinnerLabel(null);
    playClick();

    const selectedIndex = selectPrizeIndex(wheelPrizes);
    const selectedPrize = wheelPrizes[selectedIndex] || wheelPrizes[0];

    const extraRotations = 360 * (5 + Math.floor(Math.random() * 2));
    const targetSliceAngle = selectedIndex * sliceAngle + sliceAngle / 2;
    const targetDegree = 360 - targetSliceAngle + 270;
    const startRotation = rotationRef.current;
    const finalRotation =
      startRotation + extraRotations + (targetDegree - (startRotation % 360));

    const startTime = performance.now();
    const duration = 4500;
    lastTickAngleRef.current = startRotation;

    const animateSpin = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      const easeOut = 1 - Math.pow(1 - progress, 4);
      const nextRotation =
        startRotation + (finalRotation - startRotation) * easeOut;

      setRotation(nextRotation);
      rotationRef.current = nextRotation;

      if (Math.abs(nextRotation - lastTickAngleRef.current) >= sliceAngle / 2) {
        playTick();
        lastTickAngleRef.current = nextRotation;
      }

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(animateSpin);
        return;
      }

      animationFrameRef.current = null;
      setIsSpinning(false);

      const rewardLabel = resolvePrizeLabel(selectedPrize, language);
      const isWin = selectedPrize.category !== "empty";
      setWinnerLabel(rewardLabel);

      if (isWin) {
        playWin();
      } else {
        playLose();
      }

      onSpinComplete?.({
        prize: selectedPrize,
        rewardLabel,
        isWin,
        outcome: isWin ? "win" : "lose",
      });
    };

    animationFrameRef.current = requestAnimationFrame(animateSpin);
    return true;
  };

  useEffect(() => () => cancelAnimation(), []);

  useEffect(() => {
    if (!externalSpinSignal || externalSpinSignal.name !== "wheel.spinAction") {
      return;
    }

    if (consumedSignalRef.current === externalSpinSignal.nonce) {
      return;
    }

    consumedSignalRef.current = externalSpinSignal.nonce;
    startSpin();
    onSpinSignalConsumed?.(externalSpinSignal.nonce);
  }, [externalSpinSignal, wheelPrizes, language]);

  return (
    <div
      className={`relative flex h-full w-full select-none items-center justify-center overflow-visible ${className}`}
      style={style}
    >
      <div className="relative flex h-full w-full items-center justify-center overflow-visible">
        <div className="pointer-events-none absolute -top-3 left-1/2 z-30 flex -translate-x-1/2 flex-col items-center">
          <div
            className="drop-shadow-md"
            style={{
              width: 0,
              height: 0,
              borderLeft: "10px solid transparent",
              borderRight: "10px solid transparent",
              borderTop: "20px solid #0f172a",
            }}
          />
          <div className="-mt-2.5 h-2.5 w-2.5 rounded-full bg-violet-400 shadow-inner" />
        </div>

        <div
          className="relative h-full w-full overflow-visible"
          style={{ maxWidth: "92%", maxHeight: "92%" }}
        >
          <div
            className="relative h-full w-full"
            style={{
              transform: `rotate(${rotation}deg) scale(1.12)`,
              transformOrigin: "center center",
              transformBox: "fill-box",
              willChange: "transform",
            }}
          >
            <svg
              className="h-full w-full cursor-pointer overflow-visible"
              viewBox="-150 -150 300 300"
              onClick={startSpin}
              role="img"
              aria-label="Lucky wheel"
            >
              {wheelPrizes.map((prize, index) => {
                const startAngle = (index * sliceAngle * Math.PI) / 180;
                const endAngle = ((index + 1) * sliceAngle * Math.PI) / 180;
                const x1 = Math.cos(startAngle) * 140;
                const y1 = Math.sin(startAngle) * 140;
                const x2 = Math.cos(endAngle) * 140;
                const y2 = Math.sin(endAngle) * 140;
                const pathData = `M 0 0 L ${x1} ${y1} A 140 140 0 0 1 ${x2} ${y2} Z`;

                const sliceColor =
                  prize.color ||
                  (index % 2 === 0
                    ? primaryColor
                    : index % 4 === 1
                      ? secondaryColor
                      : "#334155");

                const midAngle = (index + 0.5) * sliceAngle;
                const textRad = (midAngle * Math.PI) / 180;
                const textX = Math.cos(textRad) * 85;
                const textY = Math.sin(textRad) * 85;
                const label = resolvePrizeLabel(prize, language);

                return (
                  <g key={prize.id}>
                    <path
                      d={pathData}
                      fill={prize.category === "empty" ? "#475569" : sliceColor}
                      stroke="#ffffff"
                      strokeWidth="2"
                      strokeOpacity="0.45"
                    />
                    <g
                      transform={`translate(${textX}, ${textY}) rotate(${midAngle + 90})`}
                      className="pointer-events-none select-none"
                    >
                      <text
                        textAnchor="middle"
                        dominantBaseline="middle"
                        direction="auto"
                        unicodeBidi="plaintext"
                        fill="#FFFFFF"
                        fontSize="11"
                        fontWeight="800"
                        fontFamily={
                          language === "ar"
                            ? "Poppins, Noto Sans Arabic, sans-serif"
                            : "Poppins, sans-serif"
                        }
                        style={{ textShadow: "0 1px 3px rgba(0,0,0,0.75)" }}
                      >
                        {prize.icon ? `${prize.icon} ` : ""}
                        {label}
                      </text>
                    </g>
                  </g>
                );
              })}

              <circle cx="0" cy="0" r="28" fill="#FFFFFF" opacity="0.96" />
              <circle cx="0" cy="0" r="18" fill={primaryColor} />
              <circle cx="0" cy="0" r="6" fill="#FFFFFF" opacity="0.9" />
            </svg>

            <button
              type="button"
              onClick={startSpin}
              disabled={isSpinning}
              className="absolute left-1/2 top-1/2 z-20 flex h-16 w-16 -translate-x-1/2 -translate-y-1/2 flex-col items-center justify-center rounded-full border-4 border-slate-800 bg-white text-xs font-extrabold text-slate-900 shadow-xl transition-transform hover:scale-105 active:scale-95 disabled:cursor-not-allowed sm:h-18 sm:w-18"
            >
              <span className="text-[11px] font-black uppercase leading-tight tracking-widest text-slate-900">
                {isSpinning ? "SPINNING" : "SPIN"}
              </span>
              <span className="text-[8px] font-bold uppercase tracking-wider text-violet-600">
                {logoText}
              </span>
            </button>
          </div>
        </div>
      </div>

      {winnerLabel && !isSpinning && (
        <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/80 px-3 py-1 text-[11px] font-bold text-white shadow-lg backdrop-blur-sm">
          {winnerLabel}
        </div>
      )}
    </div>
  );
};

export default SpinWheel;
