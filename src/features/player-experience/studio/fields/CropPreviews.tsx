// How a background photo is cropped on a tall phone and on a wide laptop, around the point of
// interest the brand picked (ImageField): the two frames the runtime will actually show.
const FRAMES = [
  { label: "Phone", className: "h-20 w-11" },
  { label: "Laptop", className: "h-11 w-20" },
] as const;

export function CropPreviews({
  src,
  position,
}: {
  src: string;
  position: string; // CSS object-position, "x% y%"
}) {
  return (
    <div className="flex items-end gap-2" aria-label="Crop previews">
      {FRAMES.map((frame) => (
        <figure key={frame.label} className="space-y-1 text-center">
          <img
            src={src}
            alt=""
            className={`${frame.className} rounded-md object-cover shadow-sm ring-1 ring-card-border`}
            style={{ objectPosition: position }}
          />
          <figcaption className="text-[9px] font-bold uppercase text-brand-text-muted">
            {frame.label}
          </figcaption>
        </figure>
      ))}
    </div>
  );
}
