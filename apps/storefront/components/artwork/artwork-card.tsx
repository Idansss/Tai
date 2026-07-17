import { Price } from '@tms/ui';
import Link from 'next/link';
import type { ArtworkSummary } from '@/lib/data';
import { Plate } from './plate';

/**
 * One piece on the wall.
 *
 * The card is a mat around a picture, not a container with a badge (see
 * docs/frontend/UI_DIRECTION.md). What used to be here — a coloured availability badge, a story
 * excerpt and a bordered card — was marketplace furniture competing with the drawing. The Plate
 * carries the work and its caption; this adds only what a buyer needs: the price, and whether the
 * piece can be had.
 */
export function ArtworkCard({
  artwork,
  /** How wide this card will render, from the panel it sits in. See gallery/panel-grid.tsx. */
  sizes,
  priority = false,
}: {
  artwork: ArtworkSummary;
  sizes?: string;
  priority?: boolean;
}) {
  return (
    <Link
      href={`/artworks/${artwork.slug}`}
      className="group block rounded-[var(--radius-sm)] outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <Plate
        slug={artwork.slug}
        title={artwork.title}
        city={artwork.collection}
        medium="Pencil on paper"
        {...(sizes ? { sizes } : {})}
        priority={priority}
      />
      <div className="mt-1.5 flex items-baseline justify-between gap-3">
        {/* Null price is not ₦0: ADR-015 puts price on the approved artwork+garment pair, so the
            API's artwork response carries none. Render nothing rather than invent a number. */}
        {artwork.startingPriceMinor !== null && artwork.currency ? (
          <Price amountMinor={artwork.startingPriceMinor} currency={artwork.currency} />
        ) : (
          <span />
        )}
        {/* Sold out is information a buyer needs; it does not need to be red to say so. */}
        {artwork.availability === 'sold_out' ? (
          <span className="text-xs text-muted">Sold out</span>
        ) : artwork.limitedEdition ? (
          <span className="text-xs text-muted">Limited edition</span>
        ) : null}
      </div>
    </Link>
  );
}
