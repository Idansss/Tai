import { cn } from '@tms/ui';

/**
 * A seamless brand ticker. The animated track holds the phrase list twice and translates by -50%,
 * so copy two lands exactly where copy one began — no seam. The CSS (globals.css) pauses it on
 * hover and disables it entirely under reduced motion.
 *
 * Purely decorative and marketing-only, so it is `aria-hidden`: a screen reader gets nothing from
 * a scrolling loop of the same four words.
 */
export function Marquee({
  phrases,
  className,
}: {
  phrases: string[];
  className?: string;
}) {
  const copy = phrases.map((phrase, i) => (
    <span key={i} className="flex items-center gap-8 px-8">
      <span className="font-display text-2xl font-bold uppercase tracking-tight sm:text-3xl">
        {phrase}
      </span>
      <span className="text-accent" aria-hidden>
        ✳
      </span>
    </span>
  ));

  return (
    <div
      aria-hidden
      className={cn('tms-marquee overflow-hidden whitespace-nowrap', className)}
    >
      <div className="tms-marquee-track">
        {copy}
        {copy}
      </div>
    </div>
  );
}
