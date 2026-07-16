import { Card, Eyebrow, Heading, Text } from '@tms/ui';
import { ArrowRight } from 'lucide-react';
import Link from 'next/link';
import type { DropSummary } from '@/lib/data';
import { dropStatus, nextMilestone } from '@/lib/drops';
import { Countdown } from './countdown';
import { DropStatusBadge } from './drop-status-badge';

/** A drop tile for the index. `now` is shared across the grid for a consistent clock. */
export function DropCard({ drop, now }: { drop: DropSummary; now: number }) {
  const status = dropStatus(drop, now);
  const milestone = nextMilestone(drop, now);

  return (
    <Link
      href={`/drops/${drop.slug}`}
      className="group block rounded-[var(--radius-lg)] outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
    >
      <Card variant="surface" interactive padded={false} className="overflow-hidden">
        <div
          className="relative aspect-[16/9] w-full bg-gradient-to-br from-canvas-2 to-surface-2"
          role="img"
          aria-label={`${drop.title} — drop cover placeholder`}
        >
          <div className="absolute left-4 top-4">
            <DropStatusBadge status={status} />
          </div>
        </div>
        <div className="space-y-2 p-5">
          <Eyebrow>
            {drop.collection} · {drop.pieceCount} {drop.pieceCount === 1 ? 'piece' : 'pieces'}
          </Eyebrow>
          <Heading as={3} size="md">
            {drop.title}
          </Heading>
          <Text size="sm" tone="muted">
            {drop.tagline}
          </Text>
          <div className="pt-2">
            {milestone.at !== null ? (
              <Countdown target={milestone.at} label={milestone.label} />
            ) : (
              <p className="text-sm text-muted">{milestone.label}</p>
            )}
          </div>
          <span className="inline-flex items-center gap-1 pt-1 text-sm text-accent group-hover:gap-2">
            View drop <ArrowRight className="size-4" aria-hidden />
          </span>
        </div>
      </Card>
    </Link>
  );
}
