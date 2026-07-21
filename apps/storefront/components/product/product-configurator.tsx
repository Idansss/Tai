'use client';

import { Alert, Badge, Price, cn } from '@tms/ui';
import { Minus, Plus, ShoppingBag } from 'lucide-react';
import Image from 'next/image';
import { useMemo, useRef, useState } from 'react';
import { WishlistButton } from '@/components/account/wishlist-button';
import { Accordion } from '@/components/site/accordion';
import { useCart } from '@/components/cart/cart-provider';
import { MadeToOrderNote } from '@/components/fulfilment/made-to-order-note';
import { WaitlistForm } from '@/components/waitlist/waitlist-form';
import { GarmentMockup } from '@/components/garment/garment-mockup';
import type { ProductDetail } from '@/lib/data';
import { artworkImage } from '@/lib/artwork-images';
import { waitlistKey } from '@/lib/waitlist';

type View = 'front' | 'back';

export function ProductConfigurator({ product }: { product: ProductDetail }) {
  const { addItem } = useCart();
  const firstAvailableColour = useMemo(
    () => product.colours.find((c) => c.available)?.name ?? product.colours[0]?.name,
    [product.colours],
  );

  const [colour, setColour] = useState<string | undefined>(firstAvailableColour);
  const [size, setSize] = useState<string | undefined>(undefined);
  const [view, setView] = useState<View>('front');
  const [quantity, setQuantity] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const sizeGroupRef = useRef<HTMLFieldSetElement>(null);

  const selectedColour = product.colours.find((c) => c.name === colour);
  const soldOut = product.availability === 'sold_out';
  const print = artworkImage(product.artworkSlug);
  const frontPhoto = product.image ?? null;
  const backPhoto = product.imageBack ?? null;
  const activePhoto = view === 'front' ? frontPhoto : backPhoto;
  // Studio photos cover the front; when a side has no photo we fall back to the garment mockup
  // so every shop shirt still has an inspectable Front and Back.
  const showPhoto = Boolean(activePhoto);

  function addToBag() {
    if (soldOut) return;
    if (!colour) {
      setStatus(null);
      setError('Please select an available colour to continue.');
      return;
    }
    if (!size) {
      setStatus(null);
      setError('Please select a size to continue.');
      sizeGroupRef.current?.querySelector<HTMLInputElement>('input:not(:disabled)')?.focus();
      return;
    }
    setError(null);
    addItem({
      productSlug: product.slug,
      artworkTitle: product.artworkTitle,
      garment: product.garment,
      colour,
      size,
      priceMinor: product.priceMinor,
      currency: product.currency,
      quantity,
      // So the cart thumbnail shows the actual piece, not a blank garment.
      artworkSlug: product.artworkSlug,
      printView: 'front',
      printScale: 0.8,
    });
    setStatus(
      `Added to your bag: ${product.artworkTitle} on ${product.garment}, ${colour}, size ${size}, ×${quantity}.`,
    );
  }

  return (
    <div className="grid gap-10 lg:grid-cols-2">
      {/* Preview — always offers Front / Back for shop and catalogue shirts. */}
      <div>
        <div
          className="relative w-full overflow-hidden rounded-[var(--radius-lg)] border border-line bg-canvas-2"
          role="img"
          aria-label={
            showPhoto
              ? `${product.title} ${view} product photo`
              : `${product.artworkTitle} on ${colour ?? 'garment'}, ${view} view`
          }
        >
          {showPhoto && activePhoto ? (
            <div className="relative aspect-[4/5] w-full">
              <Image
                src={activePhoto}
                alt={`${product.title} — ${view}`}
                fill
                priority={view === 'front'}
                sizes="(min-width: 1024px) 40vw, 90vw"
                className="object-cover"
              />
            </div>
          ) : (
            <GarmentMockup
              garment={product.garment}
              colour={colour ?? selectedColour?.hex}
              view={view}
              artwork={
                print && view === 'front'
                  ? { src: print, area: 'front', alt: '' }
                  : null
              }
              priority={view === 'front'}
              className="p-4 sm:p-6"
              sizes="(min-width: 1024px) 40vw, 90vw"
            />
          )}
          <span className="absolute left-3 top-3 rounded-full bg-black/40 px-2 py-0.5 text-xs uppercase tracking-[0.08em] text-white">
            {view}
          </span>
        </div>

        <div
          className="mt-3 inline-flex rounded-md border border-line p-1"
          role="group"
          aria-label="Garment view"
        >
          {(['front', 'back'] as View[]).map((v) => (
            <button
              key={v}
              type="button"
              onClick={() => setView(v)}
              aria-pressed={view === v}
              className={cn(
                'rounded px-3 py-1.5 text-sm capitalize outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
                view === v ? 'bg-accent text-on-accent' : 'text-ink-2 hover:text-ink',
              )}
            >
              {v}
            </button>
          ))}
        </div>
        <p className="mt-2 text-xs text-muted">
          {view === 'front' && frontPhoto
            ? 'Studio front photograph.'
            : view === 'back' && backPhoto
              ? 'Studio back photograph.'
              : view === 'back'
                ? 'Back view — print sits on the front of this piece.'
                : 'Preview of the print on the garment.'}
        </p>
      </div>

      {/* Configuration */}
      <div>
        <div className="flex flex-wrap items-center gap-3">
          <Price
            amountMinor={product.priceMinor}
            currency={product.currency}
            className="text-ink"
          />
          {soldOut ? <Badge tone="neutral">Sold out</Badge> : null}
          {product.availability === 'limited' ? <Badge tone="warning">Limited</Badge> : null}
        </div>

        {/* Colour */}
        <fieldset className="mt-6">
          <legend className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Colour: <span className="text-ink-2">{colour}</span>
          </legend>
          <div className="mt-3 flex flex-wrap gap-3">
            {product.colours.map((c) => (
              <label
                key={c.name}
                title={c.available ? c.name : `${c.name} (unavailable)`}
                className={cn(
                  'relative grid size-9 cursor-pointer place-items-center rounded-full',
                  !c.available && 'cursor-not-allowed',
                )}
              >
                <input
                  type="radio"
                  name="colour"
                  value={c.name}
                  checked={colour === c.name}
                  disabled={!c.available}
                  onChange={() => setColour(c.name)}
                  className="peer sr-only"
                />
                <span
                  aria-hidden
                  style={{ backgroundColor: c.hex }}
                  className={cn(
                    'size-7 rounded-full border border-line-2 ring-offset-2 ring-offset-[var(--color-background-primary)] peer-checked:ring-2 peer-checked:ring-[var(--color-accent-primary)] peer-focus-visible:ring-2 peer-focus-visible:ring-[var(--color-focus-ring)]',
                    !c.available && 'opacity-40',
                  )}
                />
                <span className="sr-only">
                  {c.name}
                  {c.available ? '' : ' (unavailable)'}
                </span>
              </label>
            ))}
          </div>
        </fieldset>

        {/* Size */}
        <fieldset
          ref={sizeGroupRef}
          className="mt-6"
          aria-describedby={error ? 'size-error' : undefined}
        >
          <div className="flex items-center justify-between">
            <legend className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
              Size
            </legend>
            <a
              href="/size-guide"
              className="rounded-sm text-xs text-muted underline-offset-2 hover:text-ink hover:underline"
            >
              Size guide
            </a>
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {product.sizes.map((s) => (
              <label
                key={s.label}
                className={cn('cursor-pointer', (!s.available || soldOut) && 'cursor-not-allowed')}
              >
                <input
                  type="radio"
                  name="size"
                  value={s.label}
                  checked={size === s.label}
                  disabled={!s.available || soldOut}
                  onChange={() => {
                    setSize(s.label);
                    setError(null);
                  }}
                  className="peer sr-only"
                />
                <span
                  className={cn(
                    'grid h-10 min-w-10 place-items-center rounded-md border border-line-2 px-3 text-sm text-ink',
                    'peer-checked:border-[var(--color-accent-primary)] peer-checked:bg-accent peer-checked:text-on-accent',
                    'peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-[var(--color-focus-ring)]',
                    (!s.available || soldOut) &&
                      'text-disabled-ink line-through opacity-60 peer-checked:bg-transparent',
                  )}
                >
                  {s.label}
                </span>
              </label>
            ))}
          </div>
          {error ? (
            <p id="size-error" role="alert" className="mt-2 text-sm text-error">
              {error}
            </p>
          ) : null}
        </fieldset>

        {/* Quantity */}
        <div className="mt-6">
          <span className="text-xs font-medium uppercase tracking-[0.08em] text-muted">
            Quantity
          </span>
          <div className="mt-3 inline-flex items-center rounded-md border border-line-2">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              disabled={quantity <= 1}
              aria-label="Decrease quantity"
              className="grid size-10 place-items-center rounded-l-md text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:text-disabled-ink"
            >
              <Minus className="size-4" aria-hidden />
            </button>
            <span
              aria-live="polite"
              className="grid min-w-10 place-items-center text-sm tabular-nums"
            >
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(10, q + 1))}
              disabled={quantity >= 10}
              aria-label="Increase quantity"
              className="grid size-10 place-items-center rounded-r-md text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:text-disabled-ink"
            >
              <Plus className="size-4" aria-hidden />
            </button>
          </div>
        </div>

        {/* Add to bag (desktop) */}
        <div className="mt-8 hidden gap-3 sm:flex">
          <button
            type="button"
            onClick={addToBag}
            disabled={soldOut}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-md bg-accent text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:bg-[var(--color-disabled-background)] disabled:text-disabled-ink"
          >
            <ShoppingBag className="size-4" aria-hidden />
            {soldOut ? 'Sold out' : 'Add to bag'}
          </button>
          <WishlistButton
            variant="labelled"
            item={{
              slug: product.slug,
              title: product.artworkTitle,
              garment: product.garment,
              collection: product.collection,
              priceMinor: product.priceMinor,
              currency: product.currency,
            }}
          />
        </div>

        {soldOut ? (
          <div className="mt-4">
            <WaitlistForm
              listKey={waitlistKey('product', product.slug)}
              title="Notify me when it's back"
              description={`We’ll let you know when ${product.title} is available again.`}
              submitLabel="Notify me"
            />
          </div>
        ) : (
          <MadeToOrderNote className="mt-4" />
        )}

        {status ? (
          <div className="mt-4" aria-live="polite">
            <Alert tone="success" title="Added to bag">
              {status}
            </Alert>
          </div>
        ) : null}

        {/* Details — collapsible, the Nextgen / AURORA product-detail pattern. */}
        <div className="mt-8 border-t border-line">
          <Accordion title="Details & fit" defaultOpen>
            <DetailList
              rows={[
                ['Fabric', product.fabric],
                ['Fit', product.fit],
                ['Print', product.printMethod],
                ['Care', product.care],
              ]}
            />
          </Accordion>
          <Accordion title="Shipping & returns">
            <DetailList
              rows={[
                ['Delivery', product.deliveryEstimate],
                ['Returns', product.returnSummary],
              ]}
            />
          </Accordion>
        </div>
      </div>

      {/* Sticky mobile purchase bar */}
      <div className="fixed inset-x-0 bottom-0 z-30 border-t border-line bg-canvas/95 p-3 backdrop-blur sm:hidden">
        <div className="flex items-center gap-3">
          <Price
            amountMinor={product.priceMinor}
            currency={product.currency}
            className="shrink-0 text-ink"
          />
          <button
            type="button"
            onClick={addToBag}
            disabled={soldOut}
            className="flex h-11 flex-1 items-center justify-center gap-2 rounded-md bg-accent text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:bg-[var(--color-disabled-background)] disabled:text-disabled-ink"
          >
            <ShoppingBag className="size-4" aria-hidden />
            {soldOut ? 'Sold out' : 'Add to bag'}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The spec rows inside a details accordion — a small, quiet definition list. */
function DetailList({ rows }: { rows: readonly (readonly [string, string])[] }) {
  return (
    <dl className="space-y-3 text-sm">
      {rows.map(([label, value]) => (
        <div key={label} className="flex gap-3">
          <dt className="w-24 shrink-0 text-muted">{label}</dt>
          <dd className="text-ink-2">{value}</dd>
        </div>
      ))}
    </dl>
  );
}
