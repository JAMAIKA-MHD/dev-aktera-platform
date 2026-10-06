import { tint } from "../../theme/recipes";

// Small status pill ("Demo" while the participation gateway is not live, B6). The frame
// shows it in the brand header, or on a row of its own when the screen hides the header;
// `floating` pins it to the top end corner, inside the safe area, for the frame host's
// control views. On the end side of the reading direction: in Arabic, text starts on the right.
export function StatusBadge({
  label,
  floating = false,
}: {
  label: string;
  floating?: boolean;
}) {
  return (
    <span
      className={`rounded-full border px-2 py-0.5 text-[0.65rem] font-extrabold uppercase tracking-[0.2em] ${
        floating
          ? "pointer-events-none fixed top-[calc(var(--xp-safe-top)+0.5rem)] end-[calc(max(var(--xp-safe-left),var(--xp-safe-right))+0.5rem)] z-50"
          : "shrink-0"
      }`}
      style={{
        color: "var(--xp-text)",
        backgroundColor: tint("--xp-surface", 80),
        borderColor: tint("--xp-primary", 50),
      }}
    >
      {label}
    </span>
  );
}
