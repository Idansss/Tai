import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export interface EmptyStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  icon?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  /** Recovery action(s), e.g. clear filters / browse all. */
  action?: ReactNode;
}

/** Deliberate empty state (master prompt §21). Offers a recovery path. */
export const EmptyState = forwardRef<HTMLDivElement, EmptyStateProps>(function EmptyState(
  { className, icon, title, description, action, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-dashed border-line px-6 py-14 text-center',
        className,
      )}
      {...props}
    >
      {icon ? <div className="text-muted [&_svg]:size-8">{icon}</div> : null}
      <h3 className="font-display text-lg text-ink">{title}</h3>
      {description ? <p className="max-w-prose text-sm text-muted">{description}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
    </div>
  );
});
