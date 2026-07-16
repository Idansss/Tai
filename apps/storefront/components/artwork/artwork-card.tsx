import { Badge, Card, Eyebrow, Heading, Price, Text } from '@tms/ui';
import Link from 'next/link';
import type { ArtworkSummary } from '@/lib/data';

const availabilityTone = {
  available: 'success',
  limited: 'warning',
  sold_out: 'neutral',
} as const;

const availabilityLabel = {
  available: 'Available',
  limited: 'Limited edition',
  sold_out: 'Sold out',
} as const;

export function ArtworkCard({ artwork }: { artwork: ArtworkSummary }) {
  return (
    <Link
      href={`/artworks/${artwork.slug}`}
      className="group block rounded-[var(--radius-lg)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <Card variant="surface" interactive padded={false} className="overflow-hidden">
        <div
          className="aspect-[4/5] w-full bg-gradient-to-br from-canvas-2 to-surface-2"
          role="img"
          aria-label={`${artwork.title} — artwork preview placeholder`}
        />
        <div className="space-y-2 p-5">
          <div className="flex items-center justify-between gap-2">
            <Eyebrow>{artwork.collection}</Eyebrow>
            <Badge tone={availabilityTone[artwork.availability]}>
              {availabilityLabel[artwork.availability]}
            </Badge>
          </div>
          <Heading as={3} size="md">
            {artwork.title}
          </Heading>
          <Text size="sm" tone="muted">
            {artwork.shortStory}
          </Text>
          <div className="flex items-center justify-between pt-2">
            <Price
              amountMinor={artwork.startingPriceMinor}
              currency={artwork.currency}
              className="text-ink"
            />
            <span className="text-xs text-muted">from</span>
          </div>
        </div>
      </Card>
    </Link>
  );
}
