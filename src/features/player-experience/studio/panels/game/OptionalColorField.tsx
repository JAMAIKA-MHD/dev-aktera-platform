import { ColorField } from "../../fields/ColorField";
import { ToggleField } from "../../fields/ToggleField";

// A color that is null by default: the runtime then derives it from the theme, so a new
// preset recolors it. The brand may pin its own instead.
export function OptionalColorField({
  label,
  value,
  onChange,
  fallback,
  path,
}: {
  label: string;
  value: string | null;
  onChange: (value: string | null) => void;
  fallback: string; // the theme color offered when the brand pins one
  path?: string;
}) {
  return (
    <div className="space-y-2" data-studio-path={path}>
      <ToggleField
        label={`Own ${label.toLowerCase()}`}
        description={
          value === null
            ? "Follows the theme colors."
            : "Kept whatever the theme."
        }
        checked={value !== null}
        onChange={(own) => onChange(own ? fallback.toLowerCase() : null)}
      />
      {value !== null && (
        <ColorField label={label} value={value} onChange={onChange} />
      )}
    </div>
  );
}
