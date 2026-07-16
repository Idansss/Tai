import { cva, type VariantProps } from 'class-variance-authority';
import { AlertTriangle, CheckCircle2, Info, XCircle } from 'lucide-react';
import { forwardRef, type HTMLAttributes, type ReactNode } from 'react';
import { cn } from '../lib/cn.js';

const alertVariants = cva('flex gap-3 rounded-[var(--radius-md)] border p-4 text-sm', {
  variants: {
    tone: {
      info: 'border-[color:var(--color-information)] bg-[color-mix(in_srgb,var(--color-information)_8%,transparent)] text-ink',
      success:
        'border-[color:var(--color-success)] bg-[color-mix(in_srgb,var(--color-success)_8%,transparent)] text-ink',
      warning:
        'border-[color:var(--color-warning)] bg-[color-mix(in_srgb,var(--color-warning)_10%,transparent)] text-ink',
      error:
        'border-[color:var(--color-error)] bg-[color-mix(in_srgb,var(--color-error)_8%,transparent)] text-ink',
    },
  },
  defaultVariants: { tone: 'info' },
});

const toneIcon = {
  info: Info,
  success: CheckCircle2,
  warning: AlertTriangle,
  error: XCircle,
} as const;

const toneIconColor = {
  info: 'text-info',
  success: 'text-success',
  warning: 'text-warning',
  error: 'text-error',
} as const;

export interface AlertProps
  extends Omit<HTMLAttributes<HTMLDivElement>, 'title'>, VariantProps<typeof alertVariants> {
  title?: ReactNode;
}

export const Alert = forwardRef<HTMLDivElement, AlertProps>(function Alert(
  { className, tone = 'info', title, children, ...props },
  ref,
) {
  const resolvedTone = tone ?? 'info';
  const Icon = toneIcon[resolvedTone];
  return (
    <div
      ref={ref}
      role={resolvedTone === 'error' ? 'alert' : 'status'}
      className={cn(alertVariants({ tone }), className)}
      {...props}
    >
      <Icon aria-hidden className={cn('mt-0.5 size-5 shrink-0', toneIconColor[resolvedTone])} />
      <div className="min-w-0">
        {title ? <p className="font-medium text-ink">{title}</p> : null}
        {children ? <div className="text-ink-2">{children}</div> : null}
      </div>
    </div>
  );
});
