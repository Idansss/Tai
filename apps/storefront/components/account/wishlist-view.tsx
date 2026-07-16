'use client';

import { Eyebrow, EmptyState, Heading, Price, Text } from '@tms/ui';
import { Heart, Trash2 } from 'lucide-react';
import Link from 'next/link';
import { ArtworkVisual } from '@/components/artwork/artwork-visual';
import { AccountShell } from './account-shell';
import { useRequireAuth } from './use-require-auth';
import { useWishlist } from './wishlist-provider';

export function WishlistView() {
  const { user, ready } = useRequireAuth('/account/wishlist');
  const { items, ready: wishlistReady, remove } = useWishlist();

  const loading = !ready || !user || !wishlistReady;

  return (
    <AccountShell
      title="Wishlist"
      description="Pieces you’ve saved to consider or come back to."
      loading={loading}
    >
      {items.length === 0 ? (
        <EmptyState
          icon={<Heart className="size-6" aria-hidden />}
          title="Your wishlist is empty"
          description="Tap the heart on any product to save it here."
          action={
            <Link
              href="/shop"
              className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              Browse the shop
            </Link>
          }
        />
      ) : (
        <ul className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => (
            <li
              key={item.slug}
              className="flex flex-col overflow-hidden rounded-[var(--radius-lg)] border border-line bg-canvas-2"
            >
              <Link
                href={`/products/${item.slug}`}
                className="block aspect-[3/4] w-full overflow-hidden bg-canvas-2 outline-none focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                aria-label={`${item.title}, view product`}
              >
                <ArtworkVisual seed={item.slug} title={item.title} label={item.garment} />
              </Link>
              <div className="flex flex-1 flex-col gap-1 p-4">
                <Eyebrow>{item.garment}</Eyebrow>
                <Link
                  href={`/products/${item.slug}`}
                  className="rounded-sm outline-none focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                >
                  <Heading as={2} size="md">
                    {item.title}
                  </Heading>
                </Link>
                <Text size="sm" tone="muted">
                  {item.collection}
                </Text>
                <div className="mt-2 flex items-center justify-between gap-2">
                  <Price
                    amountMinor={item.priceMinor}
                    currency={item.currency}
                    className="text-ink"
                  />
                  <button
                    type="button"
                    onClick={() => remove(item.slug)}
                    aria-label={`Remove ${item.title} from wishlist`}
                    className="grid size-10 shrink-0 place-items-center rounded-md border border-line-2 text-muted outline-none hover:text-error focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
                  >
                    <Trash2 className="size-4" aria-hidden />
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </AccountShell>
  );
}
