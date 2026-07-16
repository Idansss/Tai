import { Badge, Eyebrow, Frame, Heading, Price, Text } from '@tms/ui';
import Link from 'next/link';
import { WishlistButton } from '@/components/account/wishlist-button';
import { ArtworkMedia } from '@/components/artwork/artwork-media';
import { ShirtMockup } from '@/components/product/shirt-mockup';
import { resolveProductImage } from '@/lib/artwork-images';
import type { ProductSummary } from '@/lib/data';

const availabilityLabel = {
  available: 'Available',
  limited: 'Limited',
  sold_out: 'Sold out',
} as const;

export function ProductCard({ product }: { product: ProductSummary }) {
  const image = resolveProductImage(product.slug, product.artworkSlug);
  const hasPhotographedMockup = image?.startsWith('/products/');
  return (
    <div className="relative">
      <Link
        href={`/products/${product.slug}`}
        className="group block rounded-[var(--radius-lg)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      >
        <Frame ratio="product" mat="canvas" interactive>
          {hasPhotographedMockup ? (
            <ArtworkMedia
              src={image}
              seed={product.artworkSlug}
              title={product.artworkTitle}
              label={product.garment}
              className="object-contain"
            />
          ) : (
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_18%,#f7f5f0,#dedad1)] p-[2%] transition-transform duration-[var(--duration-slow)] ease-[var(--ease-out)] group-hover:scale-[1.025] motion-reduce:transition-none">
              <ShirtMockup
                colourHex="#171717"
                garment={product.garment}
                print={{
                  artwork: (
                    <ArtworkMedia
                      src={image}
                      seed={product.artworkSlug}
                      title={product.artworkTitle}
                      label={product.garment}
                      className="object-contain"
                    />
                  ),
                }}
              />
            </div>
          )}
          <div className="pointer-events-none absolute left-3 top-3">
            <Badge tone="neutral">{availabilityLabel[product.availability]}</Badge>
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
