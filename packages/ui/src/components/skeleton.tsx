import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export type SkeletonProps = HTMLAttributes<HTMLDivElement>;

/**
 * Layout-preserving loading placeholder. Decorative and hidden from assistive
 * technology; pair with a visible/aria status message at the region level.
 */
export const Skeleton = forwardRef<HTMLDivElement, SkeletonProps>(function Skeleton(
  { className, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      aria-hidden="true"
      className={cn(
        'animate-pulse rounded-[var(--radius-md)] bg-surface-2 motion-reduce:animate-none',
        className,
      )}
      {...props}
    />
  );
});
