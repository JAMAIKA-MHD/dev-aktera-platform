import type { ReactNode } from "react";

// The body of a result (slot 5 of the win and lose screens): a picture that pops in — the
// prize, over rays turning in the primary color, or the theme's character sulking — then
// what the screen has to say and do. The headline and the message stay in the frame's own
// title and copy slots, written by the brand; this is the moment around them (shell.css).

export function ResultScreen({
  tone,
  art,
  children,
}: {
  tone: "win" | "lose";
  art: ReactNode | null; // decorative: the text that follows says it all
  children?: ReactNode;
}) {
  return (
    <div
      data-xp-result={tone}
      className="flex min-h-0 flex-col items-center gap-[var(--xp-space-sm)] overflow-y-auto py-1"
    >
      {art && (
        <div aria-hidden className="xp-result-art" data-xp-tone={tone}>
          <span className="xp-reward-rays" />
          {art}
        </div>
      )}
      {children}
    </div>
  );
}
