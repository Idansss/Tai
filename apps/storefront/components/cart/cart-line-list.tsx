'use client';

import { Price, cn } from '@tms/ui';
import { Minus, Plus, Trash2 } from 'lucide-react';
import Link from 'next/link';
import type { CartItem } from '@/lib/cart';
import { MAX_LINE_QUANTITY } from '@/lib/cart';
import { useCart } from './cart-provider';

/** Human summary of a line's configuration (colour · size · placement · scale). */
function lineDetail(item: CartItem): string {
  return [item.colour, `Size ${item.size}`, item.placement, item.scale].filter(Boolean).join(' · ');
}

function QuantityStepper({ item }: { item: CartItem }) {
  const { setQuantity } = useCart();
  return (
    <div className="inline-flex items-center rounded-md border border-line-2">
      <button
        type="button"
        onClick={() => setQuantity(item.id, item.quantity - 1)}
        aria-label={`Decrease quantity of ${item.artworkTitle}, ${item.colour}, size ${item.size}`}
        className="grid size-9 place-items-center rounded-l-md text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span aria-live="polite" className="grid min-w-9 place-items-center text-sm tabular-nums">
        {item.quantity}
      </span>
      <button
        type="button"
        onClick={() => setQuantity(item.id, item.quantity + 1)}
        disabled={item.quantity >= MAX_LINE_QUANTITY}
        aria-label={`Increase quantity of ${item.artworkTitle}, ${item.colour}, size ${item.size}`}
        className="grid size-9 place-items-center rounded-r-md text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:text-disabled-ink"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export function CartLineList({ compact = false }: { compact?: boolean }) {
  const { items, removeItem } = useCart();

  return (
    <ul className="divide-y divide-line">
      {items.map((item) => {
        const href = item.href ?? `/products/${item.productSlug}`;
        return (
          <li key={item.id} className={cn('flex gap-4', compact ? 'py-4' : 'py-6')}>
            {/* Swatch stand-in for the configured garment. */}
            <Link
              href={href}
              aria-hidden
              tabIndex={-1}
              className={cn(
                'shrink-0 overflow-hidden rounded-md border border-line',
                compact ? 'size-16' : 'size-20',
              )}
            >
              <span
                className="block size-full"
                style={{ backgroundColor: 'var(--color-surface-secondary)' }}
              />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={href}
                    className="rounded-sm text-sm font-medium text-ink outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                  >
                    {item.artworkTitle}
                  </Link>
                  <p className="text-xs text-muted">{item.garment}</p>
                  <p className="mt-1 text-xs text-ink-2">{lineDetail(item)}</p>
                </div>
                <Price
                  amountMinor={item.priceMinor * item.quantity}
                  currency={item.currency}
                  className="shrink-0 text-sm text-ink"
                />
              </div>

              <div className="mt-3 flex items-center justify-between gap-3">
                <QuantityStepper item={item} />
                <button
                  type="button"
                  onClick={() => removeItem(item.id)}
                  className="inline-flex items-center gap-1 rounded-sm text-xs text-muted outline-none hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  <span>
                    Remove
                    <span className="sr-only">
                      {' '}
                      {item.artworkTitle}, {item.colour}, size {item.size}
                    </span>
                  </span>
                </button>
              </div>
            </div>
          </li>
        );
      })}
    </ul>
  );
}
