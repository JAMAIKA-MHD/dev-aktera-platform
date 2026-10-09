// A phone caught in the middle of a turn, with the arrow that turns it: the icon of the rotate
// button of the device bar (lucide has the phone and the arrow, not the two together). Drawn like
// the lucide icons: 24 px grid, 2 px round strokes, the color of the text.
import type { SVGProps } from "react";

export function PhoneRotateIcon(props: SVGProps<SVGSVGElement>) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
      {...props}
    >
      {/* The phone, tilted half way: its body and its speaker line */}
      <g transform="rotate(30 9.5 14.5)">
        <rect x="5.5" y="8.25" width="8" height="12.5" rx="1.8" />
        <path d="M8.5 17.6h2" />
      </g>
      {/* The arrow that turns it: the end of the ring of the "rotate" icon, at the top right */}
      <path d="M12 3c2.52 0 4.93 1 6.74 2.74L21 8" />
      <path d="M21 3v5h-5" />
    </svg>
  );
}
