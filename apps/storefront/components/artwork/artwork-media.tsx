'use client';

import { cn } from '@tms/ui';
import Image from 'next/image';
import { useState } from 'react';
import { ArtworkVisual } from './artwork-visual';

/**
 * Renders a piece's real artwork when the server resolved one (`src`), and the
 * drawn placeholder plate when it didn't — so the catalogue looks complete at
 * every stage of being populated.
 *
 * `src` is verified on the server (see `lib/artwork-images.ts`), so the happy
 * path has no 404s. The onError guard only covers a file removed mid-session.
 * The <img> fills the Frame (`object-cover`) so the Frame's ratio + hover-zoom
 * still hold.
 */
export function ArtworkMedia({
  src,
  seed,
  title,
  label,
  className,
  priority = false,
}: {
  /** Server-resolved image URL, or null to use the placeholder plate. */
  src?: string | null;
  /** Artwork slug — seeds the deterministic placeholder plate. */
  seed: string;
  title: string;
  label?: string;
  className?: string;
  /** Eager-load above-the-fold art (e.g. the hero plate). */
  priority?: boolean;
}) {
  const [failed, setFailed] = useState(false);

  if (!src || failed) {
    return <ArtworkVisual seed={seed} title={title} label={label} className={className} />;
  }

  return (
    <Image
      src={src}
      alt={label ? `${title} — ${label}` : title}
      fill
      sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
      className={cn('h-full w-full object-cover', className)}
      priority={priority}
      onError={() => setFailed(true)}
      draggable={false}
    />
  );
}
