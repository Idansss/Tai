import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

/** Uppercase, letter-spaced section label (preserves the Base44 eyebrow voice). */
export const Eyebrow = forwardRef<HTMLParagraphElement, HTMLAttributes<HTMLParagraphElement>>(
  function Eyebrow({ className, ...props }, ref) {
    return (
      <p
        ref={ref}
        className={cn(
          'font-sans text-xs font-medium uppercase tracking-[0.08em] text-muted',
          className,
        )}
        {...props}
      />
    );
  },
);

const headingVariants = cva('font-display text-ink text-balance', {
  variants: {
    size: {
      'display-2xl': 'text-[clamp(3rem,7vw,6rem)] leading-[1.02] tracking-[-0.02em]',
      'display-xl': 'text-5xl leading-[1.05] tracking-[-0.015em]',
      'display-lg': 'text-4xl leading-[1.1] tracking-[-0.01em]',
      lg: 'text-2xl leading-tight',
      md: 'text-lg font-medium leading-snug',
    },
  },
  defaultVariants: { size: 'lg' },
});

type HeadingLevel = 1 | 2 | 3 | 4 | 5 | 6;

export interface HeadingProps
  extends HTMLAttributes<HTMLHeadingElement>, VariantProps<typeof headingVariants> {
  as?: HeadingLevel;
}

export const Heading = forwardRef<HTMLHeadingElement, HeadingProps>(function Heading(
  { className, size, as = 2, ...props },
  ref,
) {
  const Tag = `h${as}` as const;
  return <Tag ref={ref} className={cn(headingVariants({ size }), className)} {...props} />;
});

const textVariants = cva('font-sans', {
  variants: {
    size: {
      lg: 'text-lg leading-relaxed',
      base: 'text-base leading-relaxed',
      sm: 'text-sm leading-normal',
    },
    tone: {
      primary: 'text-ink',
      secondary: 'text-ink-2',
      muted: 'text-muted',
    },
  },
  defaultVariants: { size: 'base', tone: 'primary' },
});

export interface TextProps
  extends HTMLAttributes<HTMLParagraphElement>, VariantProps<typeof textVariants> {}

export const Text = forwardRef<HTMLParagraphElement, TextProps>(function Text(
  { className, size, tone, ...props },
  ref,
) {
  return <p ref={ref} className={cn(textVariants({ size, tone }), className)} {...props} />;
});
