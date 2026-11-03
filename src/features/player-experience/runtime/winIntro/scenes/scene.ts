import type { CSSProperties } from "react";

// What every scene of a win intro receives: its pictures, by the names of its theme.json.
export interface SceneProps {
  art: Readonly<Record<string, string | undefined>>;
}

// The numbers of one element of a scene, as the variables its keyframes read.
export function vars(values: Record<string, string | number>): CSSProperties {
  return Object.fromEntries(
    Object.entries(values).map(([name, value]) => [`--${name}`, value]),
  ) as CSSProperties;
}
