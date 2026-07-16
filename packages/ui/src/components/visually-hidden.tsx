import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export type VisuallyHiddenProps = HTMLAttributes<HTMLSpanElement>;

/** Visually hidden but available to screen readers (Tailwind's sr-only). */
export const VisuallyHidden = forwardRef<HTMLSpanElement, VisuallyHiddenProps>(
  function VisuallyHidden({ className, ...props }, ref) {
    return <span ref={ref} className={cn('sr-only', className)} {...props} />;
  },
);
