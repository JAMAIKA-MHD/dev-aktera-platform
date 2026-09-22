import { useCallback, useEffect, useRef, useState } from "react";

// Copies a text (the coupon code of the win screen) and says so for a moment: the button
// turns into "Copied" (D15, feedback within 100 ms). The Clipboard API first; an older or
// sandboxed browser falls back to a hidden text area. Never throws: copy() tells whether
// it worked, and the screen keeps the code readable either way.

async function writeText(text: string, doc: Document): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(text);
      return true;
    }
  } catch {
    // Refused (permissions, insecure context): try the fallback.
  }
  try {
    const area = doc.createElement("textarea");
    area.value = text;
    area.setAttribute("readonly", "");
    Object.assign(area.style, {
      position: "fixed",
      opacity: "0",
      pointerEvents: "none",
    });
    doc.body.appendChild(area);
    area.select();
    const copied = doc.execCommand("copy");
    area.remove();
    return copied;
  } catch {
    return false;
  }
}

export function useCopyToClipboard(resetAfterMs = 2000): {
  copied: boolean;
  copy: (text: string) => Promise<boolean>;
} {
  const [copied, setCopied] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  const copy = useCallback(
    async (text: string) => {
      const done = await writeText(text, document);
      if (timer.current) clearTimeout(timer.current);
      setCopied(done);
      if (done)
        timer.current = setTimeout(() => setCopied(false), resetAfterMs);
      return done;
    },
    [resetAfterMs],
  );

  return { copied, copy };
}
