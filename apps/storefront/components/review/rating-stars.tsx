import { Star } from 'lucide-react';

const SIZES = {
  sm: 'size-3.5',
  md: 'size-4',
  lg: 'size-5',
} as const;

/**
 * Presentational star rating (TMS-F5-004). Renders five stars with a fractional
 * fill for averages like 4.3. Works in both server and client components. The
 * numeric value is exposed to assistive tech via an accessible label.
 */
export function RatingStars({
  value,
  size = 'md',
  label,
}: {
  value: number;
  size?: keyof typeof SIZES;
  label?: string;
}) {
  const clamped = Math.min(5, Math.max(0, value));
  const pct = (clamped / 5) * 100;
  const cls = SIZES[size];

  return (
    <span
      className="relative inline-flex align-middle"
      role="img"
      aria-label={label ?? `${clamped.toFixed(1)} out of 5 stars`}
    >
      <span aria-hidden className="flex text-line-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className={cls} strokeWidth={1.5} />
        ))}
      </span>
      <span
        aria-hidden
        className="absolute inset-0 flex overflow-hidden text-warning"
        style={{ width: `${pct}%` }}
      >
        {[0, 1, 2, 3, 4].map((i) => (
          <Star key={i} className={`${cls} shrink-0`} strokeWidth={1.5} fill="currentColor" />
        ))}
      </span>
    </span>
  );
}
