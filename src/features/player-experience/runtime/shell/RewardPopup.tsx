import { Check, Copy } from "lucide-react";
import type { Ref } from "react";
import { scriptOf } from "../frame/text";
import { Panel } from "./Panel";

// The prize card of a win: the brand, the prize, its message and its code, popping up in the
// theme's card frame (shell.css, .xp-reward-popup). Copying the code is one tap. A prize with
// no code says how to collect it instead: never a made-up code (B6). It shows what the
// participation gateway returned, and nothing else.

export interface RewardPopupProps {
  brandName: string;
  prizeLabel: string;
  winMessage: string | null;
  code: string | null;
  codeLabel: string;
  copyLabel: string;
  copiedLabel: string;
  copied: boolean;
  onCopy: (code: string) => void;
  pickupInstructions: string;
  shimmer: boolean;
  cardRef?: Ref<HTMLDivElement>;
}

export function RewardPopup({
  brandName,
  prizeLabel,
  winMessage,
  code,
  codeLabel,
  copyLabel,
  copiedLabel,
  copied,
  onCopy,
  pickupInstructions,
  shimmer,
  cardRef,
}: RewardPopupProps) {
  return (
    <div ref={cardRef} className="w-full">
      <Panel
        framed
        data-xp-reward=""
        className="xp-reward-popup relative isolate w-full overflow-hidden p-4 text-center"
      >
        {/* Light sweeping across the card once, the main button's own effect. */}
        {shimmer && <span aria-hidden className="xp-shimmer" />}
        {brandName && (
          <p
            dir="auto"
            data-xp-clamp
            data-xp-reward-brand
            className="xp-label truncate text-[0.65rem] font-extrabold uppercase tracking-[0.14em]"
            style={{
              color:
                "color-mix(in srgb, var(--xp-primary) 70%, var(--xp-text))",
            }}
          >
            {brandName}
          </p>
        )}
        <p
          dir="auto"
          data-xp-clamp
          data-xp-script={scriptOf(prizeLabel)}
          className="xp-display mt-1 line-clamp-2 text-[length:var(--xp-fs-display)] leading-tight font-black wrap-anywhere"
        >
          {prizeLabel}
        </p>
        {winMessage && (
          <p
            dir="auto"
            data-xp-clamp
            className="mt-1 text-sm text-[var(--xp-text-muted)]"
          >
            {winMessage}
          </p>
        )}

        <div
          aria-hidden
          data-xp-reward-rule
          className="mx-auto my-3 w-full border-t-2 border-dashed"
          style={{
            borderColor: "color-mix(in srgb, var(--xp-text) 22%, transparent)",
          }}
        />

        {code ? (
          <div className="flex flex-col items-center gap-1.5">
            <p className="xp-label text-[0.65rem] font-extrabold uppercase tracking-[0.14em] text-[var(--xp-text-muted)]">
              {codeLabel}
            </p>
            <button
              type="button"
              onClick={() => onCopy(code)}
              className="flex min-h-[44px] w-full items-center justify-between gap-2 rounded-[var(--xp-radius-md)] border-dashed px-3 py-2.5 font-mono text-[clamp(0.62rem,3.4cqw,1rem)] font-extrabold tracking-[0.1em] transition-[border-color] duration-200 hover:border-[color:var(--xp-primary)] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[color:var(--xp-primary)]"
              // The code reads like a field: the theme's, or the classic outlined one.
              style={{
                backgroundColor: "var(--xp-field-bg, transparent)",
                color: "var(--xp-field-text, var(--xp-text))",
                borderColor:
                  "var(--xp-field-border, color-mix(in srgb, var(--xp-text) 14%, transparent))",
                borderWidth: "var(--xp-field-border-width, 1px)",
              }}
            >
              <span className="min-w-0 truncate">{code}</span>
              <span
                className="flex shrink-0 items-center gap-1 text-xs font-bold"
                style={{
                  color: copied ? "var(--xp-success)" : "currentColor",
                  opacity: copied ? 1 : 0.7,
                }}
              >
                {copied ? (
                  <>
                    <Check className="size-4" strokeWidth={3} />
                    <span className="xp-code-copy-label">{copiedLabel}</span>
                  </>
                ) : (
                  <>
                    <Copy className="size-4" />
                    <span className="xp-code-copy-label">{copyLabel}</span>
                  </>
                )}
              </span>
            </button>
          </div>
        ) : (
          <p dir="auto" className="text-sm text-[var(--xp-text-muted)]">
            {pickupInstructions}
          </p>
        )}
      </Panel>
    </div>
  );
}
