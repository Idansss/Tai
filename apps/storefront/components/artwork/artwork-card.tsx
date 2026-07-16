import { Badge, Eyebrow, Frame, Heading, Price, Text } from '@tms/ui';
import Link from 'next/link';
import type { ArtworkSummary } from '@/lib/data';
import { ArtworkVisual } from './artwork-visual';

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
      <Frame ratio="artwork" interactive>
        <ArtworkVisual seed={artwork.slug} title={artwork.title} label={artwork.collection} />
        <div className="pointer-events-none absolute left-3 top-3">
          <Badge tone={availabilityTone[artwork.availability]}>
            {availabilityLabel[artwork.availability]}
          </Badge>
        </div>
      </Frame>
      <div className="mt-4 space-y-1.5">
        <div className="flex items-baseline justify-between gap-3">
          <Eyebrow>{artwork.collection}</Eyebrow>
          {artwork.limitedEdition ? (
            <span className="font-mono text-[0.7rem] uppercase tracking-[0.12em] text-muted">
              Ltd
            </span>
          ) : null}
        </div>
        <Heading as={3} size="md" className="transition-colors group-hover:text-accent-2">
          {artwork.title}
        </Heading>
        <Text size="sm" tone="muted" className="line-clamp-2">
          {artwork.shortStory}
        </Text>
        <div className="flex items-baseline gap-2 pt-1">
          <span className="font-mono text-[0.7rem] uppercase tracking-[0.1em] text-muted">from</span>
          <Price
            amountMinor={artwork.startingPriceMinor}
            currency={artwork.currency}
            className="text-ink"
          />
        </div>
      </div>
    </Link>
  );
}
