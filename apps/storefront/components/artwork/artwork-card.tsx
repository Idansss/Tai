import { Price } from '@tms/ui';
import Link from 'next/link';
import { TileBadge, TileImage } from '@/components/site/tile';
import { artworkImage } from '@/lib/artwork-images';
import type { ArtworkSummary } from '@/lib/data';

/**
 * One piece on the wall, as a streetwear product tile (docs/frontend/UI_DIRECTION.md §7):
 * a colour image that lifts on hover, a status badge, an uppercase title and the price.
 *
 * The old paper-mat "Plate" with its graphite-to-colour reveal belonged to the gallery direction;
 * this direction shows the work in colour, loud, from the first frame.
 */
export function ArtworkCard({
  artwork,
  /** How wide this card will render, passed to the image for a correct source size. */
  sizes,
  priority = false,
}: {
  artwork: ArtworkSummary;
  sizes?: string;
  priority?: boolean;
}) {
  const src = artworkImage(artwork.slug);
  const soldOut = artwork.availability === 'sold_out';

  return (
    <Link
      href={`/artworks/${artwork.slug}`}
      className="group block rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <TileImage
        src={src}
        alt={`${artwork.title} — artwork`}
        priority={priority}
        {...(sizes ? { sizes } : {})}
        badge={
          soldOut ? (
            <TileBadge className="bg-neutral-950/80">Sold out</TileBadge>
          ) : artwork.limitedEdition ? (
            <TileBadge>Limited</TileBadge>
          ) : undefined
        }
      />
      <div className="mt-4">
        <h3 className="line-clamp-1 font-display text-sm font-bold uppercase tracking-wide text-ink">
          {artwork.title}
        </h3>
        <div className="mt-1 flex items-baseline justify-between gap-2">
          <p className="min-w-0 truncate text-xs text-muted">{artwork.collection}</p>
          {/* Null price is not ₦0: ADR-015 puts price on the approved artwork+garment pair, so the
              artwork response may carry none. Render nothing rather than invent a number. */}
          {artwork.startingPriceMinor !== null && artwork.currency ? (
            <span className="shrink-0 font-display text-sm font-semibold text-ink">
              <Price amountMinor={artwork.startingPriceMinor} currency={artwork.currency} />
            </span>
          ) : null}
        </div>
      </div>
    </Link>
  );
}
