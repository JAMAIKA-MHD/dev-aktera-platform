// A menu that rests as a rail and opens in two ways at once:
//   - hover (or keyboard focus): it opens over the page while the pointer is on it, and the page
//     does not move;
//   - click: it is pinned open ("pinned"), the page makes room for it, and the choice is
//     remembered across visits.
// The caller lays the menu out; this hook owns the state and the pointer / focus wiring.
import { useEffect, useState, type FocusEvent } from "react";

function readPinned(key: string): boolean {
  try {
    return localStorage.getItem(key) === "true";
  } catch {
    return false;
  }
}

function writePinned(key: string, pinned: boolean) {
  try {
    localStorage.setItem(key, String(pinned));
  } catch {
    // Storage blocked: the menu still works for this visit.
  }
}

// A click also focuses a button or a link: only a keyboard focus opens the menu, otherwise
// closing it by click would leave it open.
function isKeyboardFocus(element: EventTarget): boolean {
  try {
    return (element as Element).matches(":focus-visible");
  } catch {
    return true;
  }
}

export function useCollapsibleMenu(storageKey: string) {
  const [pinned, setPinned] = useState(() => readPinned(storageKey));
  const [hovered, setHovered] = useState(false);
  const [focused, setFocused] = useState(false);
  // After a click that closes the menu, the pointer is still on it: hover must not reopen it
  // until the pointer has left once.
  const [hoverMuted, setHoverMuted] = useState(false);

  useEffect(() => writePinned(storageKey, pinned), [storageKey, pinned]);

  const expanded = pinned || (hovered && !hoverMuted) || focused;

  const togglePinned = () => {
    if (pinned) setHoverMuted(true);
    setPinned(!pinned);
  };

  // Spread on the menu's root element.
  const bind = {
    onMouseEnter: () => setHovered(true),
    onMouseLeave: () => {
      setHovered(false);
      setHoverMuted(false);
    },
    onFocus: (event: FocusEvent<HTMLElement>) =>
      setFocused(isKeyboardFocus(event.target)),
    onBlur: (event: FocusEvent<HTMLElement>) => {
      if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
        setFocused(false);
      }
    },
  };

  return { pinned, expanded, togglePinned, bind };
}
