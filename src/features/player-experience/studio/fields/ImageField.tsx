import { ImagePlus, Link2, Loader2, Trash2, Upload } from "lucide-react";
import { useRef, useState, type KeyboardEvent, type PointerEvent } from "react";
import { estimateDataUrlBytes, MAX_IMAGE_BYTES } from "../../domain/validation";
import type { AssetRef } from "../../domain/types";
import type { AssetPurpose } from "../../services/ports";
import { useStudioContext } from "../StudioContext";
import { CropPreviews } from "./CropPreviews";
import { clampPercent, isHttpsUrl, nudge, type Focus } from "./imageFocus";
import { inputClass, labelClass } from "./Field";

// An image of the brand: uploaded (compressed by AssetStorage, T2.5), or an https link. For a
// background, the brand also clicks the point that must stay visible (background.focus): a
// photo is cropped tall on a phone and wide on a laptop, and the two small previews show
// both crops before any player does.

export interface ImageFieldProps {
  label: string;
  value: AssetRef;
  onChange: (value: AssetRef) => void;
  purpose: AssetPurpose;
  focus?: Focus; // with onFocusChange: the point-of-interest picker
  onFocusChange?: (focus: Focus) => void;
  hint?: string;
  path?: string;
}

export function ImageField({
  label,
  value,
  onChange,
  purpose,
  focus,
  onFocusChange,
  hint,
  path,
}: ImageFieldProps) {
  const { services } = useStudioContext();
  const file = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [urlMode, setUrlMode] = useState(false);
  const [url, setUrl] = useState("");
  const src = services.assets.resolveUrl(value);
  const bytes =
    value?.kind === "dataUrl" ? estimateDataUrlBytes(value.url) : null;
  const picking = Boolean(focus && onFocusChange && src);

  const upload = async (picked: File | undefined) => {
    if (!picked) return;
    setBusy(true);
    setError(null);
    const result = await services.assets.upload(picked, purpose);
    setBusy(false);
    if (result.ok === false) setError(result.error.message);
    else onChange(result.asset);
  };

  const applyUrl = () => {
    if (!isHttpsUrl(url)) {
      setError("Use a secure link starting with https://");
      return;
    }
    setError(null);
    onChange({ kind: "remote", url: url.trim() });
    setUrlMode(false);
    setUrl("");
  };

  const pickFocus = (event: PointerEvent<HTMLDivElement>) => {
    if (!picking) return;
    const box = event.currentTarget.getBoundingClientRect();
    onFocusChange?.({
      x: clampPercent(((event.clientX - box.left) / box.width) * 100),
      y: clampPercent(((event.clientY - box.top) / box.height) * 100),
    });
  };
  const nudgeFocus = (event: KeyboardEvent<HTMLDivElement>) => {
    const next =
      picking && focus ? nudge(focus, event.key, event.shiftKey) : null;
    if (!next) return;
    event.preventDefault();
    onFocusChange?.(next);
  };
  const position = focus ? `${focus.x}% ${focus.y}%` : "50% 50%";

  return (
    <div className="space-y-2" data-studio-path={path}>
      <span className={labelClass}>{label}</span>
      <div className="flex gap-3">
        <div
          role={picking ? "slider" : undefined}
          aria-label={picking ? `${label} point of interest` : undefined}
          aria-valuetext={
            picking && focus
              ? `${focus.x}% across, ${focus.y}% down`
              : undefined
          }
          tabIndex={picking ? 0 : undefined}
          onPointerDown={pickFocus}
          onKeyDown={nudgeFocus}
          onDragOver={(event) => event.preventDefault()}
          onDrop={(event) => {
            event.preventDefault();
            void upload(event.dataTransfer.files[0]);
          }}
          className={`relative flex aspect-video flex-1 items-center justify-center overflow-hidden rounded-xl border border-card-border bg-card-bg-subtle bg-[linear-gradient(45deg,var(--color-card-border)_25%,transparent_25%,transparent_75%,var(--color-card-border)_75%),linear-gradient(45deg,var(--color-card-border)_25%,transparent_25%,transparent_75%,var(--color-card-border)_75%)] [background-position:0_0,6px_6px] [background-size:12px_12px] focus-visible:outline-2 focus-visible:outline-blue-500 ${picking ? "cursor-crosshair" : ""}`}
        >
          {src ? (
            <img
              src={src}
              alt=""
              className="size-full object-contain"
              draggable={false}
            />
          ) : (
            <span className="flex flex-col items-center gap-1 text-xs font-semibold text-brand-text-muted">
              <ImagePlus className="size-6" aria-hidden />
              Drop an image
            </span>
          )}
          {picking && focus && (
            <span
              aria-hidden
              className="pointer-events-none absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full border-2 border-white bg-blue-600/60 shadow-[0_0_0_2px_rgba(37,99,235,0.8)]"
              style={{ left: `${focus.x}%`, top: `${focus.y}%` }}
            />
          )}
          {busy && (
            <span className="absolute inset-0 flex items-center justify-center bg-card-bg/70">
              <Loader2
                className="size-6 animate-spin text-blue-600"
                aria-label="Uploading"
              />
            </span>
          )}
        </div>
        {picking && src && <CropPreviews src={src} position={position} />}
      </div>

      <div className="flex flex-wrap gap-2">
        <input
          ref={file}
          type="file"
          accept="image/*"
          className="sr-only"
          tabIndex={-1}
          aria-label={`Upload ${label.toLowerCase()}`}
          onChange={(event) => {
            void upload(event.target.files?.[0]);
            event.target.value = "";
          }}
        />
        <button
          type="button"
          onClick={() => file.current?.click()}
          disabled={busy}
          className="flex min-h-10 items-center gap-1.5 rounded-xl bg-blue-600 px-3 text-xs font-bold text-white shadow-sm transition hover:bg-blue-500 active:scale-95 disabled:opacity-50"
        >
          <Upload className="size-3.5" aria-hidden />
          {src ? "Replace" : "Upload"}
        </button>
        <button
          type="button"
          aria-expanded={urlMode}
          onClick={() => setUrlMode(!urlMode)}
          className="flex min-h-10 items-center gap-1.5 rounded-xl border border-card-border px-3 text-xs font-bold text-brand-text transition hover:bg-card-hover active:scale-95"
        >
          <Link2 className="size-3.5" aria-hidden />
          Link
        </button>
        {value && (
          <button
            type="button"
            onClick={() => onChange(null)}
            className="ml-auto flex min-h-10 items-center gap-1.5 rounded-xl px-3 text-xs font-bold text-red-600 transition hover:bg-red-50 active:scale-95 dark:text-red-400 dark:hover:bg-red-500/10"
          >
            <Trash2 className="size-3.5" aria-hidden />
            Remove
          </button>
        )}
      </div>
      {urlMode && (
        <div className="flex gap-2">
          <input
            type="url"
            inputMode="url"
            aria-label={`${label} link`}
            placeholder="https://…"
            value={url}
            onChange={(event) => setUrl(event.target.value)}
            onKeyDown={(event) => {
              if (event.key === "Enter") applyUrl();
            }}
            className={inputClass}
          />
          <button
            type="button"
            onClick={applyUrl}
            className="min-h-11 rounded-xl bg-blue-600 px-4 text-xs font-bold text-white transition hover:bg-blue-500 active:scale-95"
          >
            Use
          </button>
        </div>
      )}
      <p className="text-xs text-brand-text-muted" aria-live="polite">
        {error ? (
          <span
            role="alert"
            className="font-semibold text-red-600 dark:text-red-400"
          >
            {error}
          </span>
        ) : bytes !== null ? (
          <span
            className={
              bytes > MAX_IMAGE_BYTES
                ? "font-semibold text-amber-600"
                : undefined
            }
          >
            {Math.round(bytes / 1024)} KB of {MAX_IMAGE_BYTES / 1024} KB
            {picking
              ? " · click the image to set the point that must stay visible"
              : ""}
          </span>
        ) : (
          hint
        )}
      </p>
    </div>
  );
}
