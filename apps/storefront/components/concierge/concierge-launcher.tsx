'use client';

import { cn } from '@tms/ui';
import { MessageCircle } from 'lucide-react';
import { useConcierge } from './concierge-provider';

export function ConciergeLauncher() {
  const { panel, open, assistantName } = useConcierge();
  if (panel === 'open') return null;

  return (
    <button
      type="button"
      onClick={open}
      aria-label={`Open ${assistantName}`}
      className={cn(
        'fixed bottom-5 right-5 z-40 flex items-center gap-2 rounded-full border border-line bg-ink px-4 py-3 text-sm font-medium text-canvas shadow-lg outline-none',
        'transition-[transform,opacity] duration-200 hover:scale-[1.02] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
        'motion-reduce:transition-none motion-reduce:hover:scale-100',
        'min-h-11 min-w-11',
      )}
    >
      <MessageCircle className="size-5" aria-hidden />
      <span className="hidden sm:inline">{assistantName}</span>
      {panel === 'minimised' ? (
        <span className="absolute -right-0.5 -top-0.5 size-2.5 rounded-full bg-accent" aria-hidden />
      ) : null}
    </button>
  );
}
