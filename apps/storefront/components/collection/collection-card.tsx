import { Eyebrow, Frame, Heading, Text } from '@tms/ui';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ArtworkMedia } from '@/components/artwork/artwork-media';
import { resolveArtworkImage } from '@/lib/artwork-images';
import type { CollectionSummary } from '@/lib/data';

// A representative piece to front each collection; falls through to a group
// heritage image and then the drawn plate if none of these files exist.
const COLLECTION_COVER: Record<string, string> = {
  'night-studies': 'midnight-in-lagos',
  'comic-line': 'paper-tigers',
  'season-sketches': 'harmattan-bloom',
  'city-portraits': 'market-day',
};

export function CollectionCard({ collection }: { collection: CollectionSummary }) {
  const cover =
    resolveArtworkImage(COLLECTION_COVER[collection.slug] ?? collection.slug) ??
    resolveArtworkImage('collection-quad');
  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="group block rounded-[var(--radius-lg)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <Frame ratio="collection" mat="canvas" interactive>
        <ArtworkMedia
          src={cover}
          seed={`collection-${collection.slug}`}
          title={collection.name}
          label={`${collection.artworkCount} ${collection.artworkCount === 1 ? 'piece' : 'pieces'}`}
          // Portrait art in a wide frame: bias the crop up so faces stay in view.
          className="object-[50%_20%]"
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
