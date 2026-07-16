import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn.js';

export interface ErrorStateProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  title?: ReactNode;
  /** What happened, in plain language, never a raw error payload. */
  description?: ReactNode;
  /** Whether the customer's data/work was preserved (master prompt §21). */
  dataPreservedNote?: ReactNode;
  action?: ReactNode;
  /** Support/correlation reference, shown small for diagnostics. */
  reference?: string;
}

/** Human-readable error surface. Never renders stack traces or raw JSON. */
export const ErrorState = forwardRef<HTMLDivElement, ErrorStateProps>(function ErrorState(
  {
    className,
    title = 'Something went wrong',
    description = "We couldn't complete that just now. Please try again.",
    dataPreservedNote,
    action,
    reference,
    ...props
  },
  ref,
) {
  return (
    <div
      ref={ref}
      role="alert"
      className={cn(
        'flex flex-col items-center justify-center gap-3 rounded-[var(--radius-lg)] border border-line bg-surface px-6 py-14 text-center',
        className,
      )}
      {...props}
    >
      <h3 className="font-display text-lg text-ink">{title}</h3>
      <p className="max-w-prose text-sm text-ink-2">{description}</p>
      {dataPreservedNote ? <p className="text-sm text-muted">{dataPreservedNote}</p> : null}
      {action ? <div className="mt-2">{action}</div> : null}
      {reference ? (
        <p className="mt-1 text-xs text-muted">
          Reference: <span className="font-mono">{reference}</span>
        </p>
      ) : null}
    </div>
  );
});
