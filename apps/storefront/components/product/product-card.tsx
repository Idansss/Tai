import { Badge, Card, Eyebrow, Heading, Price, Text } from '@tms/ui';
import Link from 'next/link';
import { WishlistButton } from '@/components/account/wishlist-button';
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
        <Card variant="surface" interactive padded={false} className="overflow-hidden">
          <div
            className="aspect-[3/4] w-full bg-gradient-to-br from-canvas-2 to-surface-2"
            role="img"
            aria-label={`${product.title} — product preview placeholder`}
          />
          <div className="space-y-2 p-5">
            <div className="flex items-center justify-between gap-2">
              <Eyebrow>{product.garment}</Eyebrow>
              <Badge tone={availabilityTone[product.availability]}>
                {availabilityLabel[product.availability]}
              </Badge>
            </div>
            <Heading as={3} size="md">
              {product.artworkTitle}
            </Heading>
            <Text size="sm" tone="muted">
              {product.colourCount} {product.colourCount === 1 ? 'colour' : 'colours'} ·{' '}
              {product.collection}
            </Text>
            <div className="pt-2">
              <Price
                amountMinor={product.priceMinor}
                currency={product.currency}
                className="text-ink"
              />
            </div>
          </div>
        </Card>
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
