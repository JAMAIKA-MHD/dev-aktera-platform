import { useLayoutEffect, type RefObject } from "react";
import { BUMP_PER_PAD, cloudImage } from "../../theme/cloudShape";

// The panel's cloud drawn at its exact size (panel.shape.draw): the frame's ::before is the
// panel, so its used size, the room it leaves around the texts (its negative margin) and the
// outline (its stroke-width) are read from it, and the picture is drawn again whenever the
// frame changes size (a text that wraps, a font that loads, a rotation). Set straight on the
// frame as --xp-panel-cloud: a resize never renders React again.

export function usePanelCloud(
  ref: RefObject<HTMLElement | null>,
  enabled: boolean,
  screen: string | undefined, // its own fill on some screens
): void {
  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || !enabled || typeof ResizeObserver === "undefined") return;
    let pending = 0;
    let last = "";
    const draw = () => {
      const before = getComputedStyle(element, "::before");
      const width = parseFloat(before.width);
      const height = parseFloat(before.height);
      const pad = -parseFloat(before.marginLeft);
      if (!(width > 0 && height > 0 && pad > 0)) return;
      const style = getComputedStyle(element);
      const image = cloudImage({
        width,
        height,
        bump: pad * BUMP_PER_PAD,
        outline: parseFloat(before.strokeWidth) || 0,
        fill: style.getPropertyValue("--xp-panel-cloud-fill").trim(),
        ink: style.getPropertyValue("--xp-panel-cloud-ink").trim(),
      });
      if (image === last) return;
      last = image;
      element.style.setProperty("--xp-panel-cloud", image);
    };
    const observer = new ResizeObserver(() => {
      cancelAnimationFrame(pending);
      pending = requestAnimationFrame(draw);
    });
    observer.observe(element);
    draw();
    return () => {
      observer.disconnect();
      cancelAnimationFrame(pending);
      element.style.removeProperty("--xp-panel-cloud");
    };
  }, [ref, enabled, screen]);
}
