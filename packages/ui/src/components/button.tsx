import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';
import { Spinner } from './spinner.js';

export const buttonVariants = cva(
  [
    'inline-flex items-center justify-center gap-2 whitespace-nowrap select-none',
    'font-sans font-medium tracking-[0.01em] rounded-[var(--radius-md)]',
    'transition-[background-color,color,border-color,box-shadow] duration-[var(--duration-fast)] ease-[var(--ease-emphasis)]',
    'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
    'disabled:cursor-not-allowed disabled:bg-[var(--color-disabled-background)] disabled:text-[var(--color-disabled-text)] disabled:border-transparent disabled:shadow-none',
  ],
  {
    variants: {
      variant: {
        primary:
          'bg-accent text-on-accent border border-transparent hover:brightness-110 active:brightness-95',
        secondary: 'bg-surface text-ink border border-line-2 hover:bg-canvas-2 active:bg-canvas-2',
        ghost:
          'bg-transparent text-ink border border-transparent hover:bg-canvas-2 active:bg-canvas-2',
        danger:
          'bg-error text-white border border-transparent hover:brightness-110 active:brightness-95',
      },
      size: {
        sm: 'h-9 px-3 text-sm',
        md: 'h-11 px-5 text-sm',
        lg: 'h-12 px-6 text-base',
      },
      fullWidth: {
        true: 'w-full',
        false: '',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
      fullWidth: false,
    },
  },
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof buttonVariants> {
  /** Shows a spinner, sets aria-busy, and disables interaction. */
  loading?: boolean;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { className, variant, size, fullWidth, loading = false, disabled, children, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      className={cn(buttonVariants({ variant, size, fullWidth }), className)}
      disabled={disabled ?? loading}
      aria-busy={loading || undefined}
      data-loading={loading || undefined}
      {...props}
    >
      {loading ? <Spinner className="size-4" aria-hidden /> : null}
      {children}
    </button>
  );
});
