import { Price } from '@tms/ui';
import Link from 'next/link';
import { WishlistButton } from '@/components/account/wishlist-button';
import { TileBadge, TileImage } from '@/components/site/tile';
import { artworkImage } from '@/lib/artwork-images';
import type { ProductSummary } from '@/lib/data';

const availabilityLabel = {
  available: null,
  limited: 'Limited',
  sold_out: 'Sold out',
} as const;

/**
 * A garment carrying artwork, as a streetwear product tile (docs/frontend/UI_DIRECTION.md §7).
 * The image is the product's artwork (products have no photos; the drawing is the product).
 */
export function ProductCard({ product }: { product: ProductSummary }) {
  const src = product.image ?? artworkImage(product.artworkSlug);
  const badge = availabilityLabel[product.availability];

  return (
    <div className="relative">
      <Link
        href={`/products/${product.slug}`}
        className="group block rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus-ring)]"
      >
        <TileImage
          src={src}
          alt={
            product.image
              ? `${product.title} — product photo`
              : `${product.artworkTitle} on ${product.garment} — preview`
          }
          badge={
            badge ? (
              <TileBadge className={product.availability === 'sold_out' ? 'bg-neutral-950/80' : ''}>
                {badge}
              </TileBadge>
            ) : undefined
          }
        />
        <div className="mt-4">
          <h3 className="line-clamp-1 font-display text-sm font-bold uppercase tracking-wide text-ink">
            {product.artworkTitle}
          </h3>
          <div className="mt-1 flex items-baseline justify-between gap-2">
            <p className="min-w-0 truncate text-xs text-muted">
              {product.garment} · {product.colourCount}{' '}
              {product.colourCount === 1 ? 'colour' : 'colours'}
            </p>
            <span className="shrink-0 font-display text-sm font-semibold text-ink">
              <Price amountMinor={product.priceMinor} currency={product.currency} />
            </span>
          </div>
        </div>
      </Link>
      {/* Sibling of the link (not nested) so the card stays a valid anchor. */}
      <div className="absolute right-3 top-3 z-10">
        <WishlistButton
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
    </div>
  );
}
