import { cn } from '@tms/ui';
import Image from 'next/image';
import type { ReactNode } from 'react';

/**
 * The image half of a product tile (see docs/frontend/UI_DIRECTION.md §7): a rounded image that
 * lifts slightly on hover, with an optional badge overlaid top-left. Expects an ancestor with the
 * `group` class (the card's Link) so the hover lift fires from the whole tile.
 *
 * When `src` is null it renders a dark type-tile ground instead of an empty frame, so content
 * types that have no drawing (a collection, a story) still get a confident tile rather than a hole.
 */
export function TileImage({
  src,
  alt,
  badge,
  overlay,
  sizes = '(min-width: 1024px) 30vw, (min-width: 640px) 45vw, 90vw',
  priority = false,
  aspect = 'aspect-[4/5]',
  className,
}: {
  src: string | null;
  alt: string;
  badge?: ReactNode;
  /** Extra content rendered above the image (e.g. a title on a dark type-tile). */
  overlay?: ReactNode;
  sizes?: string;
  priority?: boolean;
  aspect?: string;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-2xl',
        src ? 'bg-canvas-2' : 'bg-neutral-950',
        aspect,
        className,
      )}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          fill
          sizes={sizes}
          priority={priority}
          className="object-cover transition-transform duration-500 ease-out group-hover:scale-[1.03] motion-reduce:transition-none"
        />
      ) : null}
      {overlay}
      {badge ? <div className="absolute left-3 top-3 z-10 flex gap-2">{badge}</div> : null}
    </div>
  );
}

/** A pill badge overlaid on a tile. Default is the near-black streetwear chip. */
export function TileBadge({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <span
      className={cn(
        'rounded-full bg-neutral-950 px-3 py-1 text-[0.65rem] font-semibold uppercase tracking-[0.12em] text-white',
        className,
      )}
    >
      {children}
    </span>
  );
}
