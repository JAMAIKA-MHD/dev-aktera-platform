import type { CSSProperties, ReactNode } from "react";

// Slot 5 (prototype Slot5PrimaryInteraction): the game or the body of the screen. A size
// container (frame.css): engines size themselves on the space really left (cqw, cqh,
// cqmin), never on the screen. Below the floor --xp-game-min the page scrolls, and the
// game is never squashed. It replaces the prototype's fixed minimum heights (250 and 260 px).
export function PrimaryInteractionSlot({ children }: { children: ReactNode }) {
  return (
    <div
      data-xp-slot="interaction"
      data-xp-edit="game"
      data-xp-rise
      style={{ "--xp-rise-order": 3 } as CSSProperties}
    >
      {children}
    </div>
  );
}
