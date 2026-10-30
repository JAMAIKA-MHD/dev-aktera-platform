// The small pieces every Overview section shares. They read their colors from overview.css.
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { Link } from "react-router-dom";

import { PATHS } from "../../dashboard/paths";

export const ICON = {
  size: 18,
  strokeWidth: 1.75,
  className: "dz-icon",
  "aria-hidden": true,
} as const;
export const SMALL_ICON = { ...ICON, size: 14 } as const;

/** The screens a mock row can point to. */
export const ROUTES = {
  create: PATHS.create,
  campaigns: PATHS.campaigns,
  prizes: PATHS.prizes,
  support: PATHS.support,
} as const;

export function Delta({ value }: { value: string }) {
  return (
    <span className="ov-badge ov-badge-sm ov-ok">
      <ArrowUpRight {...SMALL_ICON} />
      <span className="sr-only">Up </span>
      {value}
    </span>
  );
}

export function TextLink({ to, label }: { to: string; label: string }) {
  return (
    <Link to={to} className="ov-link">
      {label}
      <ArrowRight {...SMALL_ICON} />
    </Link>
  );
}

export function Segmented<Key extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Key;
  options: { key: NoInfer<Key>; label: string }[];
  onChange: (key: NoInfer<Key>) => void;
}) {
  return (
    <div className="ov-segmented" role="tablist" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          role="tab"
          aria-selected={value === option.key}
          onClick={() => onChange(option.key)}
        >
          {option.label}
        </button>
      ))}
    </div>
  );
}

export function FilterChips<Key extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: Key;
  options: { key: NoInfer<Key>; label: string; count?: number }[];
  onChange: (key: NoInfer<Key>) => void;
}) {
  return (
    <div className="ov-chips" role="group" aria-label={label}>
      {options.map((option) => (
        <button
          key={option.key}
          type="button"
          className="ov-filter"
          aria-pressed={value === option.key}
          onClick={() => onChange(option.key)}
        >
          {option.label}
          {option.count !== undefined && <span>{option.count}</span>}
        </button>
      ))}
    </div>
  );
}

export function Sparkline({
  values,
  label,
}: {
  values: number[];
  label: string;
}) {
  const width = 96;
  const height = 36;
  const points = values.map((value, index) => {
    const x = (index / (values.length - 1)) * width;
    const y = height - 3 - value * (height - 6);
    return `${x.toFixed(1)},${y.toFixed(1)}`;
  });
  const line = `M${points.join(" L")}`;
  return (
    <svg
      className="ov-spark"
      viewBox={`0 0 ${width} ${height}`}
      width={width}
      height={height}
      role="img"
      aria-label={label}
    >
      <path
        d={`${line} L${width},${height} L0,${height} Z`}
        fill="var(--k-fill)"
        opacity={0.14}
      />
      <path
        d={line}
        fill="none"
        stroke="var(--k-fill)"
        strokeWidth={2}
        strokeLinejoin="round"
        strokeLinecap="round"
        vectorEffect="non-scaling-stroke"
      />
    </svg>
  );
}
