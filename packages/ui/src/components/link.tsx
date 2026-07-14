import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type AnchorHTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export const linkVariants = cva(
  [
    'rounded-[2px] outline-none transition-colors duration-[var(--duration-fast)]',
    'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
  ],
  {
    variants: {
      variant: {
        inline:
          'text-accent underline underline-offset-2 decoration-[color:var(--color-border-strong)] hover:decoration-[color:var(--color-accent-primary)]',
        nav: 'font-sans text-ink hover:text-accent',
        eyebrow: 'font-sans text-xs uppercase tracking-[0.08em] text-muted hover:text-ink',
        subtle: 'text-muted hover:text-ink',
      },
    },
    defaultVariants: { variant: 'inline' },
  },
);

export interface LinkProps
  extends AnchorHTMLAttributes<HTMLAnchorElement>, VariantProps<typeof linkVariants> {}

/**
 * Presentational anchor. In Next.js apps, wrap next/link and pass its className,
 * or use `asChild`-style composition; this base keeps styling + a11y consistent.
 */
export const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link(
  { className, variant, children, ...props },
  ref,
) {
  return (
    <a ref={ref} className={cn(linkVariants({ variant }), className)} {...props}>
      {children}
    </a>
  );
});
