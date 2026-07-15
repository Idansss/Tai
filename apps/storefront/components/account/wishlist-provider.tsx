'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  type WishlistItem,
  hasWishlisted,
  readWishlist,
  toggleWishlistItem,
  writeWishlist,
} from '@/lib/account';
import { useAuth } from './auth-provider';

interface WishlistContextValue {
  items: WishlistItem[];
  count: number;
  /** True once the wishlist has hydrated for the current session. */
  ready: boolean;
  /** True when the customer is signed in (the wishlist belongs to an account). */
  signedIn: boolean;
  has: (slug: string) => boolean;
  /** Add or remove an item; returns the resulting membership. */
  toggle: (item: WishlistItem) => boolean;
  remove: (slug: string) => void;
}

const WishlistContext = createContext<WishlistContextValue | null>(null);

export function WishlistProvider({ children }: { children: React.ReactNode }) {
  const { user, ready: authReady } = useAuth();
  const [items, setItems] = useState<WishlistItem[]>([]);
  const [ready, setReady] = useState(false);

  // (Re)hydrate whenever the signed-in customer changes.
  useEffect(() => {
    if (!authReady) return;
    setItems(user ? readWishlist(user.email) : []);
    setReady(true);
  }, [authReady, user]);

  const has = useCallback((slug: string) => hasWishlisted(items, slug), [items]);

  const toggle = useCallback(
    (item: WishlistItem) => {
      if (!user) return false;
      const next = toggleWishlistItem(items, item);
      setItems(next);
      writeWishlist(user.email, next);
      return hasWishlisted(next, item.slug);
    },
    [items, user],
  );

  const remove = useCallback(
    (slug: string) => {
      if (!user) return;
      const next = items.filter((i) => i.slug !== slug);
      setItems(next);
      writeWishlist(user.email, next);
    },
    [items, user],
  );

  const value = useMemo<WishlistContextValue>(
    () => ({
      items,
      count: items.length,
      ready,
      signedIn: Boolean(user),
      has,
      toggle,
      remove,
    }),
    [items, ready, user, has, toggle, remove],
  );

  return <WishlistContext.Provider value={value}>{children}</WishlistContext.Provider>;
}

export function useWishlist(): WishlistContextValue {
  const ctx = useContext(WishlistContext);
  if (!ctx) throw new Error('useWishlist must be used within a WishlistProvider');
  return ctx;
}
