import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

const cardVariants = cva('rounded-[var(--radius-lg)] transition-shadow', {
  variants: {
    variant: {
      surface: 'bg-surface border border-line',
      elevated: 'bg-elevated border border-line shadow-sm',
      outline: 'bg-transparent border border-line',
      ghost: 'bg-transparent',
    },
    interactive: {
      true: 'cursor-pointer hover:shadow-md focus-within:shadow-md',
      false: '',
    },
    padded: {
      true: 'p-5',
      false: '',
    },
  },
  defaultVariants: { variant: 'surface', interactive: false, padded: true },
});

export interface CardProps
  extends HTMLAttributes<HTMLDivElement>, VariantProps<typeof cardVariants> {}

export const Card = forwardRef<HTMLDivElement, CardProps>(function Card(
  { className, variant, interactive, padded, ...props },
  ref,
) {
  return (
    <div
      ref={ref}
      className={cn(cardVariants({ variant, interactive, padded }), className)}
      {...props}
    />
  );
});
