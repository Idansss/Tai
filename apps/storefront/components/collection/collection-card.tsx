import { Eyebrow, Frame, Heading, Text } from '@tms/ui';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ArtworkVisual } from '@/components/artwork/artwork-visual';
import type { CollectionSummary } from '@/lib/data';

export function CollectionCard({ collection }: { collection: CollectionSummary }) {
  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="group block rounded-[var(--radius-lg)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <Frame ratio="collection" mat="canvas" interactive>
        <ArtworkVisual
          seed={`collection-${collection.slug}`}
          title={collection.name}
          label={`${collection.artworkCount} ${collection.artworkCount === 1 ? 'piece' : 'pieces'}`}
        />
      </Frame>
      <div className="mt-4 space-y-1.5">
        <Eyebrow>
          {collection.artworkCount} {collection.artworkCount === 1 ? 'piece' : 'pieces'}
        </Eyebrow>
        <Heading as={3} size="md" className="transition-colors group-hover:text-accent-2">
          {collection.name}
        </Heading>
        <Text size="sm" tone="muted" className="line-clamp-2">
          {collection.description}
        </Text>
        <span className="inline-flex items-center gap-1 pt-1 font-mono text-xs uppercase tracking-[0.1em] text-ink transition-all group-hover:gap-2 group-hover:text-accent-2">
          View collection <ArrowRight className="size-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
