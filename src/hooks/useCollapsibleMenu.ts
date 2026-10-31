// A menu that rests as a rail and opens in two ways at once:
//   - hover (or keyboard focus): it opens over the page while the pointer is on it, and the page
//     does not move;
//   - click: it is pinned open ("pinned"), the page makes room for it, and the choice is
//     remembered across visits.
// The caller lays the menu out; this hook owns the state and the pointer / focus wiring.
import { useRef, useState, type FocusEvent } from "react";

/** The choice made earlier, or null when there was none. */
function readPinned(key: string): boolean | null {
  try {
    const stored = localStorage.getItem(key);
    return stored === null ? null : stored === "true";
  } catch {
    return null;
  }
}

function writePinned(key: string, pinned: boolean) {
  try {
    localStorage.setItem(key, String(pinned));
  } catch {
    // Storage blocked: the menu still works for this visit.
  }
}

export function useCollapsibleMenu(
  storageKey: string,
  /** Where the menu starts when no choice was remembered. */
  defaultPinned: () => boolean = () => false,
) {
  const [pinned, setPinned] = useState(
    () => readPinned(storageKey) ?? defaultPinned(),
  );
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // After a click that closes the menu, the pointer is still on it: hover must not reopen it
  // until the pointer has left once.
  const [hoverMuted, setHoverMuted] = useState(false);

  // A click also focuses a button or a link: only a keyboard focus opens the menu, otherwise
  // closing it by click would leave it open. (`:focus-visible` says the same in a browser, but
  // is not reliable everywhere, so the input mode is tracked here.)
  const pointerFocus = useRef(false);

  const expanded = pinned || (hovered && !hoverMuted) || focused;

  const togglePinned = () => {
    // Only when the pointer is on the menu (a button inside it): a button elsewhere, like the
    // top bar's, takes the pointer away from the menu, and the next hover must open it.
    if (pinned && hovered) setHoverMuted(true);
    setPinned(!pinned);
    // Written here and not on every render: only a real choice is remembered, so the default
    // keeps following the screen until the person picks.
    writePinned(storageKey, !pinned);
  };

  // Spread on the menu's root element.
  const bind = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => {
      setHovered(false);
      setHoverMuted(false);
    },
    onPointerDown: () => {
      pointerFocus.current = true;
    },
    onKeyDown: () => {
      pointerFocus.current = false;
    },
    onFocus: () => setFocused(!pointerFocus.current),
    onBlur: (event: FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setFocused(false);
        pointerFocus.current = false;
      }
    },
  };

  return { pinned, expanded, togglePinned, bind };
}
