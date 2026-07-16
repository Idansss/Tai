import { Badge, Eyebrow, Frame, Heading, Price, Text } from '@tms/ui';
import Link from 'next/link';
import { WishlistButton } from '@/components/account/wishlist-button';
import { ArtworkVisual } from '@/components/artwork/artwork-visual';
import type { ProductSummary } from '@/lib/data';

const availabilityTone = {
  available: 'success',
  limited: 'warning',
  sold_out: 'neutral',
} as const;

const availabilityLabel = {
  available: 'Available',
  limited: 'Limited',
  sold_out: 'Sold out',
} as const;

export function ProductCard({ product }: { product: ProductSummary }) {
  return (
    <div className="relative">
      <Link
        href={`/products/${product.slug}`}
        className="group block rounded-[var(--radius-lg)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      >
        <Frame ratio="product" mat="canvas" interactive>
          <ArtworkVisual
            seed={product.artworkSlug}
            title={product.artworkTitle}
            label={product.garment}
          />
          <div className="pointer-events-none absolute left-3 top-3">
            <Badge tone={availabilityTone[product.availability]}>
              {availabilityLabel[product.availability]}
            </Badge>
          </div>
        </Frame>
        <div className="mt-4 space-y-1.5">
          <Eyebrow>{product.garment}</Eyebrow>
          <Heading as={3} size="md" className="transition-colors group-hover:text-accent-2">
            {product.artworkTitle}
          </Heading>
          <Text size="sm" tone="muted">
            {product.colourCount} {product.colourCount === 1 ? 'colour' : 'colours'} ·{' '}
            {product.collection}
          </Text>
          <div className="pt-1">
            <Price
              amountMinor={product.priceMinor}
              currency={product.currency}
              className="text-ink"
            />
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
