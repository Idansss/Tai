import Link from 'next/link';
import { TileImage } from '@/components/site/tile';
import { artworkImage } from '@/lib/artwork-images';
import type { DropSummary } from '@/lib/data';
import { dropStatus, nextMilestone } from '@/lib/drops';
import { Countdown } from './countdown';
import { DropStatusBadge } from './drop-status-badge';

/**
 * A drop tile for the index, in the streetwear tile language (docs/frontend/UI_DIRECTION.md §7).
 * `now` is shared across the grid for a consistent clock; `coverSlug` is a representative artwork
 * from the drop's pieces, supplied by the page.
 */
export function DropCard({
  drop,
  now,
  coverSlug,
}: {
  drop: DropSummary;
  now: number;
  coverSlug?: string | null;
}) {
  const status = dropStatus(drop, now);
  const milestone = nextMilestone(drop, now);
  const src = coverSlug ? artworkImage(coverSlug) : null;

  return (
    <Link
      href={`/drops/${drop.slug}`}
      className="group block rounded-2xl outline-none focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <TileImage
        src={src}
        alt={src ? `${drop.title} — drop cover` : ''}
        badge={<DropStatusBadge status={status} />}
      />
      <div className="mt-4">
        <p className="font-display text-xs font-semibold uppercase tracking-[0.14em] text-muted">
          {drop.collection} · {drop.pieceCount} {drop.pieceCount === 1 ? 'piece' : 'pieces'}
        </p>
        <h3 className="mt-1 font-display text-lg font-bold uppercase tracking-tight text-ink">
          {drop.title}
        </h3>
        <p className="mt-1 text-sm text-muted">{drop.tagline}</p>
        <div className="mt-3">
          {milestone.at !== null ? (
            <Countdown target={milestone.at} label={milestone.label} />
          ) : (
            <p className="text-sm text-muted">{milestone.label}</p>
          )}
        </div>
      </div>
    </Link>
  );
}
