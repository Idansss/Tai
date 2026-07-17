'use client';

import { cn } from '@tms/ui';
import { type ElementType, type ReactNode, useEffect, useRef, useState } from 'react';

/**
 * Reveal — a scroll-into-view entrance: content fades and rises the first time it enters the
 * viewport, then stays put. This is the one signature motion of the site (see
 * docs/frontend/UI_DIRECTION.md §7): it prevents sections and grids from teleporting in as the
 * user scrolls a page they see occasionally, which is exactly the frequency tier where a short
 * entrance earns its place.
 *
 * Discipline (from the find-animation-opportunities gate):
 * - transform + opacity only, on the shared `--duration-slow` / `--ease-emphasis` tokens;
 * - `delay` drives a stagger across a grid (keep it 40–80ms per item, and cap it — a long ripple
 *   reads as slow);
 * - reduced motion is honoured: the content is simply already there, no transform, no wait.
 *
 * It reveals once and disconnects; it never blocks interaction (no pointer-events games).
 */
export function Reveal({
  children,
  delay = 0,
  as: Tag = 'div' as ElementType,
  className,
}: {
  children: ReactNode;
  /** Stagger offset in ms. */
  delay?: number;
  as?: ElementType;
  className?: string;
}) {
  const ref = useRef<HTMLElement>(null);
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    // Reduced motion: no entrance. The content rests visible immediately.
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setShown(true);
      return;
    }
    const io = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) {
          setShown(true);
          io.disconnect();
        }
      },
      { threshold: 0.12, rootMargin: '0px 0px -8% 0px' },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  return (
    <Tag
      ref={ref}
      style={shown ? { transitionDelay: `${delay}ms` } : undefined}
      className={cn(
        'motion-safe:transition-[opacity,transform] motion-safe:duration-[var(--duration-slow)] motion-safe:ease-[var(--ease-emphasis)]',
        shown ? 'opacity-100 translate-y-0' : 'opacity-0 motion-safe:translate-y-4',
        className,
      )}
    >
      {children}
    </Tag>
  );
}
