import { AnimationConfig, CustomKeyframe } from "../types";

export interface MotionVariantDef {
  initial?: Record<string, any>;
  animate?: Record<string, any>;
  whileHover?: Record<string, any>;
  whileTap?: Record<string, any>;
  exit?: Record<string, any>;
  transition?: Record<string, any>;
}

export const PRESET_VARIANTS: Record<
  Exclude<AnimationConfig["preset"], "custom">,
  (cfg: AnimationConfig) => MotionVariantDef
> = {
  fadeIn: (cfg) => ({
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    transition: {
      duration: (cfg.duration || 300) / 1000,
      delay: (cfg.delay || 0) / 1000,
      ease: cfg.easing || "easeOut",
      repeat: cfg.loop ? Infinity : 0,
    },
  }),
  slideIn: (cfg) => ({
    initial: { x: -50, opacity: 0 },
    animate: { x: 0, opacity: 1 },
    transition: {
      duration: (cfg.duration || 400) / 1000,
      delay: (cfg.delay || 0) / 1000,
      ease: "easeOut",
      repeat: cfg.loop ? Infinity : 0,
    },
  }),
  popIn: (cfg) => ({
    initial: { scale: 0.5, opacity: 0 },
    animate: { scale: 1, opacity: 1 },
    transition: {
      type: "spring",
      stiffness: 300,
      damping: 20,
      duration: (cfg.duration || 350) / 1000,
      delay: (cfg.delay || 0) / 1000,
      repeat: cfg.loop ? Infinity : 0,
    },
  }),
  shake: (cfg) => ({
    animate: { x: [0, -10, 10, -8, 8, -4, 4, 0] },
    transition: {
      duration: (cfg.duration || 400) / 1000,
      delay: (cfg.delay || 0) / 1000,
      repeat: cfg.loop ? Infinity : 0,
      repeatType: "reverse",
    },
  }),
  pulse: (cfg) => ({
    animate: { scale: [1, 1.08, 1] },
    transition: {
      duration: (cfg.duration || 1000) / 1000,
      delay: (cfg.delay || 0) / 1000,
      repeat: Infinity,
      ease: "easeInOut",
    },
  }),
  bounce: (cfg) => ({
    animate: { y: [0, -16, 0] },
    transition: {
      duration: (cfg.duration || 600) / 1000,
      delay: (cfg.delay || 0) / 1000,
      repeat: cfg.loop ? Infinity : 0,
      ease: "easeOut",
    },
  }),
};

/**
 * Converts custom GSAP-authored keyframes into Motion keyframe arrays and normalized times
 */
export function convertCustomKeyframesToMotion(
  keyframes: CustomKeyframe[],
  totalDurationMs: number,
  loop = false,
): MotionVariantDef {
  if (!keyframes || keyframes.length === 0) {
    return {};
  }

  const sorted = [...keyframes].sort((a, b) => a.time - b.time);
  const totalDuration = totalDurationMs > 0 ? totalDurationMs / 1000 : 1;

  // Collect all unique properties across all keyframes
  const propKeys = new Set<string>();
  sorted.forEach((kf) => {
    Object.keys(kf.properties).forEach((k) => propKeys.add(k));
  });

  const animateProps: Record<string, any[]> = {};
  propKeys.forEach((key) => {
    animateProps[key] = [];
  });

  const times: number[] = [];

  sorted.forEach((kf) => {
    // Normalize time to 0..1 based on totalDuration
    const normalizedTime = Math.min(1, Math.max(0, kf.time / totalDuration));
    times.push(Number(normalizedTime.toFixed(3)));

    propKeys.forEach((prop) => {
      if (kf.properties[prop] !== undefined) {
        animateProps[prop].push(kf.properties[prop]);
      } else {
        // Fallback to previous value or default
        const prevArr = animateProps[prop];
        animateProps[prop].push(
          prevArr.length > 0 ? prevArr[prevArr.length - 1] : 0,
        );
      }
    });
  });

  // Ensure times start with 0 and end with 1
  if (times.length > 0 && times[0] !== 0) {
    times[0] = 0;
  }
  if (times.length > 1 && times[times.length - 1] !== 1) {
    times[times.length - 1] = 1;
  }

  return {
    animate: animateProps,
    transition: {
      duration: totalDuration,
      times: times,
      repeat: loop ? Infinity : 0,
      ease: "easeInOut",
    },
  };
}

/**
 * Resolves an AnimationConfig into Framer Motion props
 */
export function resolveAnimationVariant(
  config?: AnimationConfig,
): MotionVariantDef {
  if (!config) return {};

  if (
    config.preset === "custom" &&
    config.customKeyframes &&
    config.customKeyframes.length > 0
  ) {
    return convertCustomKeyframesToMotion(
      config.customKeyframes,
      config.duration || 1000,
      config.loop,
    );
  }

  if (config.preset in PRESET_VARIANTS) {
    return PRESET_VARIANTS[config.preset as keyof typeof PRESET_VARIANTS](
      config,
    );
  }

  return {};
}
