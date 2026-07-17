'use client';

import { cn } from '@tms/ui';
import { ChevronDown } from 'lucide-react';
import { type ReactNode, useId, useState } from 'react';

/**
 * A collapsible section (the Nextgen / AURORA product-detail pattern): a header button toggles a
 * region that expands with a real height transition instead of snapping.
 *
 * The height animation uses the `grid-template-rows: 0fr → 1fr` trick, which animates to
 * content height without a hard-coded pixel value and degrades to instant under reduced motion.
 * Purpose (per the animation gate): state indication, at an occasional frequency — eligible.
 * The button is a real `<button aria-expanded>` controlling the region, so it is keyboard- and
 * screen-reader-correct.
 */
export function Accordion({
  title,
  children,
  defaultOpen = false,
}: {
  title: string;
  children: ReactNode;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);
  const regionId = useId();

  return (
    <div className="border-b border-line">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={regionId}
        className="flex w-full items-center justify-between gap-3 py-4 text-left outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      >
        <span className="font-display text-sm font-bold uppercase tracking-wide text-ink">
          {title}
        </span>
        <ChevronDown
          className={cn(
            'size-4 shrink-0 text-muted transition-transform duration-[var(--duration-base)] ease-[var(--ease-emphasis)] motion-reduce:transition-none',
            open && 'rotate-180',
          )}
          aria-hidden
        />
      </button>
      <div
        id={regionId}
        className={cn(
          'grid transition-[grid-template-rows] duration-[var(--duration-base)] ease-[var(--ease-emphasis)] motion-reduce:transition-none',
          open ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]',
        )}
      >
        <div className="overflow-hidden">
          <div className="pb-5">{children}</div>
        </div>
      </div>
    </div>
  );
}
