import type { CSSProperties, ElementType, ReactNode } from "react";

// A card of the player screens (shell.css, .xp-card): the theme's card colors, border and
// radius, or — `framed` — its 9-slice card frame, one small image stretched to any size
// (border-image), so the same asset dresses a coupon, a medallion or a modal. The big panel
// behind the 8 slots is the frame's own (.xp-frame::before), drawn from the panel frame.

export interface PanelProps {
  as?: ElementType;
  framed?: boolean; // the theme's card frame, when it has one
  className?: string;
  style?: CSSProperties;
  children?: ReactNode;
  [data: `data-${string}`]: string | undefined;
}

export function Panel({
  as: Element = "div",
  framed = false,
  className = "",
  style,
  children,
  ...data
}: PanelProps) {
  return (
    <Element
      {...data}
      data-xp-framed={framed ? "" : undefined}
      className={`xp-card ${className}`}
      style={style}
    >
      {children}
    </Element>
  );
}
