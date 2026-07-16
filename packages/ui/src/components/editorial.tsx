import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn.js';

/**
 * Mono numeric section marker, e.g. `01`. Part of the Gallery Press editorial rhythm —
 * numbered indices make a page read as a composed catalogue rather than stacked sections.
 */
export interface SectionIndexProps extends HTMLAttributes<HTMLSpanElement> {
  /** 1-based index; rendered zero-padded to two digits. */
  index: number;
}

export const SectionIndex = forwardRef<HTMLSpanElement, SectionIndexProps>(function SectionIndex(
  { index, className, ...props },
  ref,
) {
  return (
    <span
      ref={ref}
      data-numeric=""
      className={cn(
        'font-mono text-xs font-medium tracking-[0.14em] text-muted tabular-nums',
        className,
      )}
      {...props}
    >
      {String(index).padStart(2, '0')}
    </span>
  );
});

/** A hairline rule; optionally carries a label centred over the line. */
export interface RuleProps extends HTMLAttributes<HTMLDivElement> {
  label?: ReactNode;
}

export const Rule = forwardRef<HTMLDivElement, RuleProps>(function Rule(
  { label, className, ...props },
  ref,
) {
  if (!label) {
    return <hr ref={ref as never} className={cn('border-0 border-t border-line', className)} {...props} />;
  }
  return (
    <div ref={ref} className={cn('flex items-center gap-4', className)} {...props}>
      <span className="h-px flex-1 bg-line" />
      <span className="font-mono text-xs uppercase tracking-[0.14em] text-muted">{label}</span>
      <span className="h-px flex-1 bg-line" />
    </div>
  );
});

/**
 * Announcement marquee (drop / studio-notes ticker). CSS-driven, GPU-only transform.
 * Duplicates content so the loop is seamless; pauses on hover; the `@media reduced-motion`
 * rule in theme.css halts the animation for reduced-motion users (content stays legible).
 */
export interface MarqueeProps extends HTMLAttributes<HTMLDivElement> {
  items: ReactNode[];
  /** Seconds for one full loop. */
  speed?: number;
}

export function Marquee({ items, speed = 32, className, ...props }: MarqueeProps) {
  const sequence = [...items, ...items];
  return (
    <div className={cn('group overflow-hidden', className)} aria-label="Announcements" {...props}>
      <div
        className="flex w-max items-center gap-10 [animation:tms-marquee_var(--tms-marquee-speed)_linear_infinite] group-hover:[animation-play-state:paused] motion-reduce:[animation:none]"
        style={{ ['--tms-marquee-speed' as string]: `${speed}s` }}
      >
        {sequence.map((item, i) => (
          <span
            key={i}
            className="flex shrink-0 items-center gap-3 font-mono text-xs uppercase tracking-[0.14em] text-muted"
            aria-hidden={i >= items.length || undefined}
          >
            {item}
            <span className="text-accent-2" aria-hidden>
              &#9670;
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
