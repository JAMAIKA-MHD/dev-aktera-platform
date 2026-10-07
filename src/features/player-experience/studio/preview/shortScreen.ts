// A short screen: a laptop, where the Studio's own bars take a big share of the height and the
// preview is what suffers. The bars get thinner and the device bar starts closed.
//
// The same threshold is the `short:` variant of Tailwind (src/index.css): keep the two in step.

export const SHORT_SCREEN_QUERY = "(max-height: 45rem)";

export function isShortScreen(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia?.(SHORT_SCREEN_QUERY).matches === true
  );
}
