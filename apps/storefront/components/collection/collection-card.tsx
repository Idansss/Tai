import Link from 'next/link';
import { TileImage } from '@/components/site/tile';
import { artworkImage } from '@/lib/artwork-images';
import type { CollectionSummary } from '@/lib/data';

/**
 * A collection as a lookbook chapter cover (docs/frontend/UI_DIRECTION.md §7): a representative
 * drawing under a bottom scrim, the collection name set big and uppercase over it.
 *
 * `coverSlug` is a representative artwork the page pulls from the collection's pieces. When it is
 * absent the tile falls back to a dark type-cover — still a confident chapter, not an empty frame.
 */
export function CollectionCard({
  collection,
  coverSlug,
}: {
  collection: CollectionSummary;
  coverSlug?: string | null;
}) {
  const src = coverSlug ? artworkImage(coverSlug) : null;
  const count = `${collection.artworkCount} ${collection.artworkCount === 1 ? 'piece' : 'pieces'}`;

  return (
    <Link
      href={`/collections/${collection.slug}`}
      className="group block rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <TileImage
        src={src}
        alt={src ? `${collection.name} — collection cover` : ''}
        overlay={
          <>
            <div
              aria-hidden
              className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent"
            />
            <div className="absolute inset-x-0 bottom-0 z-10 p-5">
              <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-white/70">
                {count}
              </p>
              <h3 className="mt-1 font-display text-2xl font-bold uppercase leading-none tracking-tight text-white">
                {collection.name}
              </h3>
            </div>
          </>
        }
      />
      <p className="mt-3 text-sm text-muted">{collection.description}</p>
    </Link>
  );
}
