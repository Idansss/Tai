'use client';

import { Price, cn } from '@tms/ui';
import { Minus, Plus, Trash2, TriangleAlert } from 'lucide-react';
import Link from 'next/link';
import { GarmentMockup } from '@/components/garment/garment-mockup';
import { artworkImage } from '@/lib/artwork-images';
import { MAX_LINE_QUANTITY } from '@/lib/cart';
import { cartIssueMessage, isRecoverableByQuantity } from '@/lib/cart-api';
import type { CartLineView } from '@/lib/cart-view';
import { useCart } from './cart-provider';

/** Human summary of a line's configuration (colour · size · placement · scale). */
function lineDetail(line: CartLineView): string {
  return [line.colour, `Size ${line.size}`, line.placement, line.scale].filter(Boolean).join(' · ');
}

/** Does this line carry a print on the given side? */
function sideHasDesign(line: CartLineView, side: 'front' | 'back'): boolean {
  return Boolean(line.artworkSlug) && (line.printView ?? 'front') === side;
}

/**
 * One side of the garment as a small mockup — the exact piece the customer built (same renderer,
 * registry and free transform as the Studio) when this side is printed, or the blank garment when
 * it is not. Shown for both sides so the customer always sees front *and* back and which carries
 * the artwork.
 */
function GarmentSide({
  line,
  side,
  size,
}: {
  line: CartLineView;
  side: 'front' | 'back';
  size: number;
}) {
  const designed = sideHasDesign(line, side);
  const print = designed && line.artworkSlug ? artworkImage(line.artworkSlug) : null;
  const t = designed ? line.transform : undefined;
  return (
    <div className="flex flex-col items-center gap-1">
      <div
        className={cn(
          'grid place-items-center overflow-hidden rounded-md border bg-canvas',
          designed ? 'border-line' : 'border-dashed border-line-2',
        )}
        style={{ width: size, height: size }}
      >
        <GarmentMockup
          garment={line.garment}
          colour={line.colour}
          view={side}
          artwork={
            print
              ? {
                  src: print,
                  area: side,
                  scale: (line.printScale ?? 0.8) * (t?.scale ?? 1),
                  offset: t ? { xPct: t.dx, yPct: t.dy } : undefined,
                  rotation: t?.rotation ?? 0,
                  crop: t
                    ? { top: t.cropTop, right: t.cropRight, bottom: t.cropBottom, left: t.cropLeft }
                    : undefined,
                  clipToBody: true,
                  alt: '',
                }
              : null
          }
          sizes={`${size}px`}
        />
      </div>
      <span
        className={cn(
          'text-[10px] uppercase tracking-wide',
          designed ? 'font-medium text-ink-2' : 'text-muted',
        )}
      >
        {side} {designed ? '· art' : '· blank'}
      </span>
    </div>
  );
}

/** Front and back of the configured garment, side by side. */
function LineSides({ line, compact }: { line: CartLineView; compact: boolean }) {
  const size = compact ? 52 : 64;
  return (
    <div className="flex items-start gap-2">
      <GarmentSide line={line} side="front" size={size} />
      <GarmentSide line={line} side="back" size={size} />
    </div>
  );
}

function QuantityStepper({ line }: { line: CartLineView }) {
  const { setQuantity } = useCart();
  // Never offer more than the server says is sellable. Nothing is reserved (ADR-017), so this is
  // what is available now, not what is being held for this shopper.
  const max = Math.min(MAX_LINE_QUANTITY, line.availableQuantity ?? MAX_LINE_QUANTITY);
  return (
    <div className="inline-flex items-center rounded-md border border-line-2">
      <button
        type="button"
        onClick={() => setQuantity(line.id, line.quantity - 1)}
        aria-label={`Decrease quantity of ${line.artworkTitle}, ${line.colour}, size ${line.size}`}
        className="grid size-9 place-items-center rounded-l-md text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <span aria-live="polite" className="grid min-w-9 place-items-center text-sm tabular-nums">
        {line.quantity}
      </span>
      <button
        type="button"
        onClick={() => setQuantity(line.id, line.quantity + 1)}
        disabled={line.quantity >= max}
        aria-label={`Increase quantity of ${line.artworkTitle}, ${line.colour}, size ${line.size}`}
        className="grid size-9 place-items-center rounded-r-md text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:text-disabled-ink"
      >
        <Plus className="size-4" aria-hidden />
      </button>
    </div>
  );
}

export function CartLineList({ compact = false }: { compact?: boolean }) {
  const { cart, removeItem } = useCart();

  return (
    <ul className="divide-y divide-line">
      {cart.lines.map((line) => {
        const href = line.href ?? '#';
        const unavailable = line.issue !== null;
        return (
          <li key={line.id} className={cn('flex gap-4', compact ? 'py-4' : 'py-6')}>
            {/* Both sides of the exact configured piece, drawn with the same mockup as the Studio,
                so the customer sees front and back and which side carries the artwork. */}
            <Link
              href={href}
              aria-hidden
              tabIndex={-1}
              className={cn(
                'shrink-0 rounded-md',
                // Dim it, but keep the line: a line that vanishes is worse than one that explains.
                unavailable && 'opacity-50',
              )}
            >
              <LineSides line={line} compact={compact} />
            </Link>

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <Link
                    href={href}
                    className={cn(
                      'rounded-sm text-sm font-medium outline-none hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                      unavailable ? 'text-ink-2' : 'text-ink',
                    )}
                  >
                    {line.artworkTitle}
                  </Link>
                  <p className="text-xs text-muted">{line.garment}</p>
                  <p className="mt-1 text-xs text-ink-2">
                    {lineDetail(line)}
                    {line.transform ? ' · Custom placement' : ''}
                  </p>
                  {line.note ? (
                    <p className="mt-1 text-xs italic text-muted">“{line.note}”</p>
                  ) : null}
                </div>
                {/* An unavailable line contributes nothing to the subtotal, so it shows no total. */}
                {!unavailable && line.lineTotalMinor !== null ? (
                  <Price
                    amountMinor={line.lineTotalMinor}
                    currency={line.currency}
                    className="shrink-0 text-sm text-ink"
                  />
                ) : null}
              </div>

              {line.issue ? (
                <p
                  role="status"
                  className="mt-2 inline-flex items-start gap-1.5 text-xs font-medium text-error"
                >
                  <TriangleAlert className="mt-px size-3.5 shrink-0" aria-hidden />
                  <span>{cartIssueMessage(line.issue, line.availableQuantity ?? 0)}</span>
                </p>
              ) : null}

              <div className="mt-3 flex items-center justify-between gap-3">
                {/* Only offer the stepper where changing the quantity can actually help. */}
                {!unavailable || isRecoverableByQuantity(line.issue) ? (
                  <QuantityStepper line={line} />
                ) : (
                  <span className="text-xs text-muted">Remove this to continue</span>
                )}
                <button
                  type="button"
                  onClick={() => removeItem(line.id)}
                  className="inline-flex items-center gap-1 rounded-sm text-xs text-muted outline-none hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                >
                  <Trash2 className="size-3.5" aria-hidden />
                  <span>
                    Remove
                    <span className="sr-only">
                      {' '}
                      {line.artworkTitle}, {line.colour}, size {line.size}
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
