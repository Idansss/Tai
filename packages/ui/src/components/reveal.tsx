'use client';

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type ElementType,
  type HTMLAttributes,
} from 'react';
import { cn } from '../lib/cn.js';

const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

export interface RevealProps extends HTMLAttributes<HTMLElement> {
  /** Element to render. Defaults to a div. */
  as?: ElementType;
  /** Stagger delay in ms applied to the entrance transition. */
  delay?: number;
  /** Entrance direction. */
  from?: 'up' | 'down' | 'none';
}

/**
 * Scroll-reveal wrapper (motion system, master prompt §22).
 *
 * Progressive enhancement: server-renders visible, so no-JS and reduced-motion users always
 * see content. On the client (motion allowed) it hides via opacity/transform only — never
 * layout — then animates in when scrolled into view. `useLayoutEffect` applies the hidden
 * state before paint so there is no visible→hidden flash, and only transform/opacity move so
 * there is zero CLS.
 */
export function Reveal({
  as,
  delay = 0,
  from = 'up',
  className,
  children,
  style,
  ...props
}: RevealProps) {
  const Tag = (as ?? 'div') as ElementType;
  const ref = useRef<HTMLElement>(null);
  const [enabled, setEnabled] = useState(false);
  const [shown, setShown] = useState(false);

  useIsoLayoutEffect(() => {
    const media = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (media.matches) return; // stay visible, no animation
    setEnabled(true);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            setShown(true);
            io.disconnect();
          }
        }
      },
      { rootMargin: '0px 0px -8% 0px', threshold: 0.12 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [enabled]);

  const offset = from === 'down' ? '-translate-y-4' : from === 'up' ? 'translate-y-4' : '';

  return (
    <Tag
      ref={ref}
      data-reveal=""
      data-revealed={shown || undefined}
      style={enabled ? { transitionDelay: `${delay}ms`, ...style } : style}
      className={cn(
        enabled &&
          'transition-[opacity,transform] duration-[var(--duration-slower)] ease-[var(--ease-out)] motion-reduce:transition-none',
        enabled && !shown && `opacity-0 ${offset}`,
        enabled && shown && 'opacity-100 translate-y-0',
        className,
      )}
      {...props}
    >
      {children}
    </Tag>
  );
}
