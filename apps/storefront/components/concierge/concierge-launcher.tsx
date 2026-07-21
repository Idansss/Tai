'use client';

import { cn } from '@tms/ui';
import { useConcierge } from './concierge-provider';
import { BrandLogo } from '@/components/site/brand-logo';

export function ConciergeLauncher() {
  const { panel, open, assistantName } = useConcierge();
  if (panel === 'open') return null;

  return (
    <button
      type="button"
      onClick={open}
      aria-label={`Open ${assistantName}`}
      className={cn(
        'fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-line bg-surface px-3 py-2.5 text-sm font-medium text-ink shadow-lg outline-none',
        'transition-[transform,opacity] duration-200 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
        'motion-reduce:transition-none motion-reduce:hover:scale-100',
        'min-h-11 min-w-11',
      )}
    >
      <BrandLogo className="size-8 rounded-full" alt="" sizes="32px" />
      <span className="hidden max-w-[10rem] truncate sm:inline">{assistantName}</span>
      {panel === 'minimised' ? (
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-accent" aria-hidden />
      ) : null}
    </button>
  );
}
