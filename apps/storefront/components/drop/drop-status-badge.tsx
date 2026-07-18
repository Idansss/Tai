import { cn } from '@tms/ui';
import { TileBadge } from '@/components/site/tile';
import { type DropStatus, dropStatusLabel } from '@/lib/drops';

/**
 * Presentational status pill. These sit on top of full-bleed artwork on the drop tiles, so the
 * chip is a solid near-black ground (the streetwear chip from TileImage) rather than a tinted,
 * transparent tone — a see-through badge is illegible over a busy drawing. Status is carried by
 * the text; the coloured dot is a supplementary at-a-glance cue, never the only signal.
 */
const dotColor: Record<DropStatus, string> = {
  live: 'bg-emerald-400',
  early_access: 'bg-amber-300',
  upcoming: 'bg-sky-300',
  ended: 'bg-stone-400',
  sold_out: 'bg-rose-400',
};

export function DropStatusBadge({ status }: { status: DropStatus }) {
  return (
    <TileBadge className="inline-flex items-center gap-1.5">
      <span aria-hidden className={cn('size-1.5 rounded-full', dotColor[status])} />
      {dropStatusLabel(status)}
    </TileBadge>
  );
}
