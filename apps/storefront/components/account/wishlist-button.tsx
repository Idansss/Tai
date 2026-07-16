'use client';

import { cn } from '@tms/ui';
import { Heart } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { type MouseEvent, useState } from 'react';
import type { WishlistItem } from '@/lib/account';
import { useWishlist } from './wishlist-provider';

type WishlistTarget = Omit<WishlistItem, 'addedAt'>;

/**
 * Heart toggle that saves a product to the signed-in customer's wishlist.
 * Guests are sent to sign in (with a `?next=` back to where they were). Used
 * both as an icon-only overlay on product cards and a labelled button on the
 * product page.
 */
export function WishlistButton({
  item,
  variant = 'icon',
  next,
  className,
}: {
  item: WishlistTarget;
  variant?: 'icon' | 'labelled';
  /** Where to return after signing in; defaults to the product page. */
  next?: string;
  className?: string;
}) {
  const { has, toggle, signedIn, ready } = useWishlist();
  const router = useRouter();
  const [announce, setAnnounce] = useState<string | null>(null);
  const active = ready && has(item.slug);

  function onClick(event: MouseEvent) {
    // Stop the click bubbling to an enclosing product-card link.
    event.preventDefault();
    event.stopPropagation();
    if (!signedIn) {
      router.push(`/login?next=${encodeURIComponent(next ?? `/products/${item.slug}`)}`);
      return;
    }
    const nowActive = toggle({ ...item, addedAt: new Date().toISOString() });
    setAnnounce(
      nowActive ? `${item.title} added to wishlist` : `${item.title} removed from wishlist`,
    );
  }

  const label = active ? `Remove ${item.title} from wishlist` : `Add ${item.title} to wishlist`;

  if (variant === 'labelled') {
    return (
      <>
        <button
          type="button"
          onClick={onClick}
          aria-pressed={active}
          aria-label={label}
          className={cn(
            'inline-flex h-12 items-center justify-center gap-2 rounded-md border px-5 text-sm font-medium outline-none transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
            active
              ? 'border-[var(--color-accent-primary)] text-accent'
              : 'border-line-2 text-ink hover:bg-canvas-2',
            className,
          )}
        >
          <Heart className={cn('size-4', active && 'fill-current')} aria-hidden />
          {active ? 'Saved' : 'Save'}
        </button>
        <span aria-live="polite" className="sr-only">
          {announce}
        </span>
      </>
    );
  }

  return (
    <>
      <button
        type="button"
        onClick={onClick}
        aria-pressed={active}
        aria-label={label}
        className={cn(
          'grid size-9 place-items-center rounded-full border border-line bg-canvas/90 text-ink outline-none backdrop-blur transition-colors hover:bg-canvas focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]',
          active && 'text-accent',
          className,
        )}
      >
        <Heart className={cn('size-4', active && 'fill-current')} aria-hidden />
      </button>
      <span aria-live="polite" className="sr-only">
        {announce}
      </span>
    </>
  );
}
