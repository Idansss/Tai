import { cva, type VariantProps } from 'class-variance-authority';
import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn.js';
import { Spinner } from './spinner.js';

const iconButtonVariants = cva(
  [
    'inline-flex items-center justify-center rounded-[var(--radius-md)]',
    'transition-colors duration-[var(--duration-fast)] ease-[var(--ease-emphasis)]',
    'outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
    'disabled:cursor-not-allowed disabled:bg-[var(--color-disabled-background)] disabled:text-[var(--color-disabled-text)]',
  ],
  {
    variants: {
      variant: {
        solid: 'bg-accent text-on-accent hover:brightness-110',
        outline: 'border border-line-2 text-ink hover:bg-canvas-2',
        ghost: 'text-ink hover:bg-canvas-2',
      },
      size: {
        sm: 'size-9',
        md: 'size-11',
      },
    },
    defaultVariants: { variant: 'ghost', size: 'md' },
  },
);

export interface IconButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>, VariantProps<typeof iconButtonVariants> {
  /** Required accessible name, icon-only controls have no visible text. */
  label: string;
  icon: ReactNode;
  loading?: boolean;
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(function IconButton(
  { className, variant, size, label, icon, loading = false, disabled, ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type="button"
      aria-label={label}
      title={label}
      aria-busy={loading || undefined}
      disabled={disabled ?? loading}
      className={cn(iconButtonVariants({ variant, size }), className)}
      {...props}
    >
      {loading ? <Spinner className="size-4" aria-hidden /> : icon}
    </button>
  );
});
