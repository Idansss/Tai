import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export interface SpinnerProps extends HTMLAttributes<HTMLSpanElement> {
  /** Accessible label; omit and pass aria-hidden when decorative. */
  label?: string;
}

/** Indeterminate loading indicator. Announced via role=status unless aria-hidden. */
export const Spinner = forwardRef<HTMLSpanElement, SpinnerProps>(function Spinner(
  { className, label = 'Loading', ...props },
  ref,
) {
  const decorative = props['aria-hidden'] === true || props['aria-hidden'] === 'true';
  return (
    <span
      ref={ref}
      role={decorative ? undefined : 'status'}
      className={cn(
        'inline-block size-5 animate-spin rounded-full border-2 border-current border-t-transparent motion-reduce:animate-none',
        className,
      )}
      {...props}
    >
      {decorative ? null : <span className="sr-only">{label}</span>}
    </span>
  );
});
