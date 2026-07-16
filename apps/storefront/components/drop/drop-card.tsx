import { Eyebrow, Frame, Heading, Text } from '@tms/ui';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import { ArtworkMedia } from '@/components/artwork/artwork-media';
import { resolveDropImage } from '@/lib/artwork-images';
import type { DropSummary } from '@/lib/data';
import { dropStatus, nextMilestone } from '@/lib/drops';
import { Countdown } from './countdown';
import { DropStatusBadge } from './drop-status-badge';

/** A drop tile for the index. `now` is shared across the grid for a consistent clock. */
export function DropCard({ drop, now }: { drop: DropSummary; now: number }) {
  const status = dropStatus(drop, now);
  const milestone = nextMilestone(drop, now);
  const image = resolveDropImage(drop.slug, drop.collection);

  return (
    <Link
      href={`/drops/${drop.slug}`}
      className="group block rounded-[var(--radius-lg)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <Frame ratio="collection" mat="canvas" interactive>
        <ArtworkMedia
          src={image}
          seed={`drop-${drop.slug}`}
          title={drop.title}
          label={drop.collection}
          className="object-[50%_20%]"
        />
        <div className="pointer-events-none absolute left-3 top-3">
          <DropStatusBadge status={status} />
        </div>
      </Frame>
      <div className="mt-4 space-y-1.5">
        <Eyebrow>
          {drop.collection} · {drop.pieceCount} {drop.pieceCount === 1 ? 'piece' : 'pieces'}
        </Eyebrow>
        <Heading as={3} size="md" className="transition-colors group-hover:text-accent-2">
          {drop.title}
        </Heading>
        <Text size="sm" tone="muted" className="line-clamp-2">
          {drop.tagline}
        </Text>
        <div className="pt-1">
          {milestone.at !== null ? (
            <Countdown target={milestone.at} label={milestone.label} />
          ) : (
            <p className="font-mono text-xs uppercase tracking-[0.1em] text-muted">
              {milestone.label}
            </p>
          )}
        </div>
        <span className="inline-flex items-center gap-1 pt-1 font-mono text-xs uppercase tracking-[0.1em] text-ink transition-all group-hover:gap-2 group-hover:text-accent-2">
          View drop <ArrowRight className="size-3.5" aria-hidden />
        </span>
      </div>
    </Link>
  );
}
