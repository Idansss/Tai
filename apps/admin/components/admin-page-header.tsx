import { cn } from '@tms/ui';
import type { ReactNode } from 'react';

/**
 * Page opening matched to the storefront PageHeader voice: wide-tracked display
 * eyebrow, bold uppercase title, quiet lead. Keeps admin chrome on the same
 * typographic system as the customer site.
 */
export function AdminPageHeader({
  eyebrow,
  title,
  lead,
  action,
  className,
}: {
  eyebrow?: string;
  title: ReactNode;
  lead?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={cn('flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between', className)}
    >
      <div className="max-w-2xl">
        {eyebrow ? (
          <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted">
            {eyebrow}
          </p>
        ) : null}
        <h1
          className={cn(
            'font-display text-4xl font-bold uppercase leading-[0.95] tracking-tight text-ink sm:text-5xl',
            eyebrow ? 'mt-3' : null,
          )}
        >
          {title}
        </h1>
        {lead ? <p className="mt-4 text-sm text-muted sm:text-base">{lead}</p> : null}
      </div>
      {action ? <div className="shrink-0">{action}</div> : null}
    </div>
  );
}
