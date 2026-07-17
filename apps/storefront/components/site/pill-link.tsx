import { cn } from '@tms/ui';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

/**
 * The primary call-to-action of the streetwear direction: a rounded pill with a small circular
 * arrow badge (see docs/frontend/UI_DIRECTION.md §7). One per view.
 *
 * Two tones, so the same shape works on both grounds:
 * - `dark`  → near-black pill on a light (paper) surface. The default.
 * - `light` → white pill on a dark stage (hero, accent panel).
 *
 * The arrow badge always inverts the pill, so it reads as a button-within-a-button either way.
 */
export function PillLink({
  href,
  children,
  tone = 'dark',
  icon,
  className,
}: {
  href: string;
  children: ReactNode;
  tone?: 'dark' | 'light';
  /** Override the arrow (e.g. ArrowUpRight for "open in place"). */
  icon?: ReactNode;
  className?: string;
}) {
  const light = tone === 'light';
  return (
    <Link
      href={href}
      className={cn(
        'group inline-flex items-center gap-3 rounded-full py-2 pl-6 pr-2 text-sm font-semibold uppercase tracking-[0.08em] outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2',
        light
          ? 'bg-white text-neutral-950 hover:bg-white/90 focus-visible:outline-white'
          : 'bg-neutral-950 text-white hover:bg-neutral-800 focus-visible:outline-[var(--color-focus-ring)]',
        className,
      )}
    >
      {children}
      <span
        className={cn(
          'grid size-8 place-items-center rounded-full transition-transform group-hover:translate-x-0.5',
          light ? 'bg-neutral-950 text-white' : 'bg-white text-neutral-950',
        )}
      >
        {icon ?? <ArrowRight className="size-4" aria-hidden />}
      </span>
    </Link>
  );
}
