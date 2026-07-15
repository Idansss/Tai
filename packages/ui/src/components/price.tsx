import { forwardRef, type HTMLAttributes } from 'react';
import { cn } from '../lib/cn.js';

export interface PriceProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'children'> {
  /** Minor units (e.g. kobo/cents) to avoid float drift; formatted with Intl. */
  amountMinor: number;
  currency?: string;
  locale?: string;
  /** Optional strikethrough original price (minor units). */
  compareAtMinor?: number;
  /** Fraction digits; defaults to the currency's standard. */
  fractionDigits?: number;
}

function format(amountMinor: number, currency: string, locale: string, digits?: number): string {
  const value = amountMinor / 100;
  return new Intl.NumberFormat(locale, {
    style: 'currency',
    currency,
    ...(digits !== undefined
      ? { minimumFractionDigits: digits, maximumFractionDigits: digits }
      : {}),
  }).format(value);
}

/** Renders a formatted price. Server-safe (no client state). */
export const Price = forwardRef<HTMLSpanElement, PriceProps>(function Price(
  {
    amountMinor,
    currency = 'NGN',
    locale = 'en-NG',
    compareAtMinor,
    fractionDigits,
    className,
    ...props
  },
  ref,
) {
  const main = format(amountMinor, currency, locale, fractionDigits);
  return (
    <span ref={ref} className={cn('inline-flex items-baseline gap-2', className)} {...props}>
      <span className="font-display tabular-nums">{main}</span>
      {compareAtMinor !== undefined && compareAtMinor > amountMinor ? (
        <span className="text-sm text-muted line-through tabular-nums">
          {format(compareAtMinor, currency, locale, fractionDigits)}
        </span>
      ) : null}
    </span>
  );
});
