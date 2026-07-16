import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn.js';

const badgeVariants = cva(
  'inline-flex items-center gap-1.5 rounded-[var(--radius-pill)] px-2.5 py-0.5 text-xs font-medium tracking-[0.02em] border',
  {
    variants: {
      tone: {
        neutral: 'bg-surface-2 text-ink-2 border-line',
        accent: 'bg-accent text-on-accent border-transparent',
        success: 'bg-transparent text-success border-[color:var(--color-success)]',
        warning: 'bg-transparent text-warning border-[color:var(--color-warning)]',
        error: 'bg-transparent text-error border-[color:var(--color-error)]',
        info: 'bg-transparent text-info border-[color:var(--color-information)]',
      },
    },
    defaultVariants: { tone: 'neutral' },
  },
);

export interface BadgeProps
  extends HTMLAttributes<HTMLSpanElement>, VariantProps<typeof badgeVariants> {
  /** Optional leading icon/dot. Status is also conveyed by text, never colour alone. */
  icon?: ReactNode;
}

export const Badge = forwardRef<HTMLSpanElement, BadgeProps>(function Badge(
  { className, tone, icon, children, ...props },
  ref,
) {
  return (
    <span ref={ref} className={cn(badgeVariants({ tone }), className)} {...props}>
      {icon}
      {children}
    </span>
  );
});
