'use client';

import type { Artwork, Cart, GarmentTemplate } from '@tms/contracts';
import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  type CartItem,
  type CartItemInput,
  addItem as addItemPure,
  cartCount,
  type Promotion,
  removeItem as removeItemPure,
  resolvePromotion,
  setQuantity as setQuantityPure,
} from '@/lib/cart';
import {
  addCartItem,
  applyPromotion as applyPromotionApi,
  fetchCart,
  removeCartItem,
  removePromotion as removePromotionApi,
  updateCartItemQuantity,
} from '@/lib/cart-api';
import {
  buildCartLabelIndex,
  type CartLabelIndex,
  type CartView,
  toCartView,
  toLocalCartView,
} from '@/lib/cart-view';
import { ApiNetworkError, ApiRequestError, apiFetch } from '@/lib/data/http';

const STORAGE_KEY = 'tms.cart.v1';

const EMPTY_VIEW: CartView = {
  lines: [],
  count: 0,
  subtotalMinor: 0,
  totalMinor: 0,
  currency: 'NGN',
  promotion: null,
  hasIssues: false,
};

interface CartContextValue {
  /**
   * The cart to render, in one shape whichever source produced it. Components read money from
   * here and never recompute it: when this is the server's cart, these are the server's numbers.
   */
  cart: CartView;
  items: CartItem[];
  count: number;
  promotion: Promotion | null;
  promoError: string | null;
  /** Set when a promotion is valid but does not apply to this order — not an error. */
  promoNotice: string | null;
  /** Set when the cart could not be reached or a change was rejected. */
  error: string | null;
  /** True once the cart has loaded (avoids an SSR/client badge mismatch). */
  ready: boolean;
  /** True while a change is in flight against the server. */
  busy: boolean;
  isOpen: boolean;
  addItem: (input: CartItemInput) => void;
  setQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  applyPromotion: (code: string) => void | Promise<void>;
  clearPromotion: () => void;
  openCart: () => void;
  closeCart: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

interface PersistedCart {
  items: CartItem[];
  promoCode: string | null;
}

function readStorage(): PersistedCart {
  if (typeof window === 'undefined') return { items: [], promoCode: null };
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return { items: [], promoCode: null };
    const parsed = JSON.parse(raw) as Partial<PersistedCart>;
    return {
      items: Array.isArray(parsed.items) ? parsed.items : [],
      promoCode: typeof parsed.promoCode === 'string' ? parsed.promoCode : null,
    };
  } catch {
    return { items: [], promoCode: null };
  }
}

/** Turn a failure into something a shopper can act on, never a raw code. */
function messageFor(error: unknown): string {
  if (error instanceof ApiNetworkError) {
    return 'We could not reach your bag. Check your connection and try again.';
  }
  if (error instanceof ApiRequestError) {
    if (error.code === 'INVENTORY_UNAVAILABLE') return 'That is no longer available.';
    if (error.code === 'CONFIGURATION_NOT_APPROVED')
      return 'That combination is no longer offered.';
    return error.message;
  }
  return 'Something went wrong with your bag. Please try again.';
}

/**
 * The server cart.
 *
 * A cart line is only identifiers, so the labels are joined in from the catalogue
 * (see lib/cart-view.ts and TMS-FBR-020). The lookup is fetched once and reused: it changes far
 * more slowly than the cart does.
 */
function useServerCart(enabled: boolean) {
  const [cart, setCart] = useState<Cart | null>(null);
  const [index, setIndex] = useState<CartLabelIndex>(() => buildCartLabelIndex([], []));
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [promoNotice, setPromoNotice] = useState<string | null>(null);

  useEffect(() => {
    // Hooks cannot be conditional, so the switch lives here: with no API there is nothing to
    // fetch, and firing these requests would fail loudly on every mock-backed page load.
    if (!enabled) return;
    let cancelled = false;
    (async () => {
      try {
        // The cart read also mints the guest cookie, and signing in merges the guest cart on
        // this call — there is no merge to request.
        const [serverCart, artworks, garments] = await Promise.all([
          fetchCart(),
          apiFetch<{ items: Artwork[] }>('/api/v1/artworks', { query: { limit: 100 } }),
          apiFetch<{ items: GarmentTemplate[] }>('/api/v1/garments', { query: { limit: 100 } }),
        ]);
        if (cancelled) return;
        setCart(serverCart);
        setIndex(buildCartLabelIndex(artworks.items ?? [], garments.items ?? []));
      } catch (cause) {
        if (!cancelled) setError(messageFor(cause));
      } finally {
        if (!cancelled) setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enabled]);

  /** Run a mutation and adopt the cart it returns: the server's cart is the only truth. */
  const mutate = useCallback(async (run: () => Promise<Cart>) => {
    setBusy(true);
    setError(null);
    try {
      setCart(await run());
    } catch (cause) {
      setError(messageFor(cause));
    } finally {
      setBusy(false);
    }
  }, []);

  const applyPromotion = useCallback(async (code: string) => {
    setPromoError(null);
    setPromoNotice(null);
    setBusy(true);
    try {
      const next = await applyPromotionApi(code);
      setCart(next);
      // A valid code that does not qualify comes back 200 with promotion: null. That is not
      // an error — it means "this code does not apply to this order".
      if (!next.promotion) {
        setPromoNotice(`"${code.trim()}" doesn't apply to this order.`);
      }
    } catch (cause) {
      // 422 PROMOTION_INVALID is ONE message for unknown, ended and unlaunched codes. The
      // server deliberately does not distinguish them, so neither do we.
      if (cause instanceof ApiRequestError && cause.code === 'PROMOTION_INVALID') {
        setPromoError(`"${code.trim()}" is not a valid code.`);
      } else {
        setError(messageFor(cause));
      }
    } finally {
      setBusy(false);
    }
  }, []);

  const view = useMemo(() => (cart ? toCartView(cart, index) : EMPTY_VIEW), [cart, index]);

  return {
    view,
    ready,
    busy,
    error,
    promoError,
    promoNotice,
    mutate,
    applyPromotion,
    clearPromotion: useCallback(() => {
      setPromoError(null);
      setPromoNotice(null);
      void mutate(() => removePromotionApi());
    }, [mutate]),
  };
}

export function CartProvider({
  children,
  serverBacked = false,
}: {
  children: React.ReactNode;
  /** Set by the root layout from DATA_SOURCE, so there is one flag for "is there an API". */
  serverBacked?: boolean;
}) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [localPromoError, setLocalPromoError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [localReady, setLocalReady] = useState(false);

  const server = useServerCart(serverBacked);

  // Hydrate the local cart after mount so SSR markup stays stable. Skipped entirely when the
  // server owns the cart.
  useEffect(() => {
    if (serverBacked) return;
    const stored = readStorage();
    setItems(stored.items);
    if (stored.promoCode) setPromotion(resolvePromotion(stored.promoCode));
    setLocalReady(true);
  }, [serverBacked]);

  useEffect(() => {
    if (serverBacked || !localReady) return;
    const payload: PersistedCart = { items, promoCode: promotion?.code ?? null };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage full or unavailable (private mode) — cart still works in-session.
    }
  }, [items, promotion, localReady, serverBacked]);

  const addItem = useCallback(
    (input: CartItemInput) => {
      setIsOpen(true);
      if (serverBacked) {
        // Only a configuration carrying the approved tuple can go to the server; the tuple is
        // the whole request (never a price).
        const configuration = input.configuration;
        if (!configuration) return;
        void server.mutate(() =>
          addCartItem({
            artworkVersionId: configuration.artworkVersionId,
            garmentVariantId: configuration.garmentVariantId,
            placementId: configuration.placementId,
            scalePreset: configuration.scalePresetId,
            view: configuration.view,
            quantity: input.quantity ?? 1,
          }),
        );
        return;
      }
      setItems((current) => addItemPure(current, input));
    },
    [serverBacked, server],
  );

  const setQuantity = useCallback(
    (id: string, quantity: number) => {
      if (serverBacked) {
        void server.mutate(() =>
          quantity <= 0 ? removeCartItem(id) : updateCartItemQuantity(id, quantity),
        );
        return;
      }
      setItems((current) => setQuantityPure(current, id, quantity));
    },
    [serverBacked, server],
  );

  const removeItem = useCallback(
    (id: string) => {
      if (serverBacked) {
        void server.mutate(() => removeCartItem(id));
        return;
      }
      setItems((current) => removeItemPure(current, id));
    },
    [serverBacked, server],
  );

  const clear = useCallback(() => {
    setItems([]);
    setPromotion(null);
    setLocalPromoError(null);
  }, []);

  const applyPromotion = useCallback(
    (code: string) => {
      if (serverBacked) return server.applyPromotion(code);
      const found = resolvePromotion(code);
      if (!found) {
        setLocalPromoError(`We couldn't find the code "${code.trim()}".`);
        return;
      }
      setPromotion(found);
      setLocalPromoError(null);
    },
    [serverBacked, server],
  );

  const clearPromotion = useCallback(() => {
    if (serverBacked) {
      server.clearPromotion();
      return;
    }
    setPromotion(null);
    setLocalPromoError(null);
  }, [serverBacked, server]);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const localView = useMemo(() => toLocalCartView(items, promotion), [items, promotion]);
  const cart = serverBacked ? server.view : localView;

  const value = useMemo<CartContextValue>(
    () => ({
      cart,
      items,
      count: serverBacked ? cart.count : cartCount(items),
      // The local preview promotion. Components render the applied promotion from
      // `cart.promotion`, which both modes populate; this stays for the local-only helpers.
      promotion,
      promoError: serverBacked ? server.promoError : localPromoError,
      promoNotice: serverBacked ? server.promoNotice : null,
      error: serverBacked ? server.error : null,
      ready: serverBacked ? server.ready : localReady,
      busy: serverBacked ? server.busy : false,
      isOpen,
      addItem,
      setQuantity,
      removeItem,
      clear,
      applyPromotion,
      clearPromotion,
      openCart,
      closeCart,
    }),
    [
      cart,
      items,
      serverBacked,
      server,
      promotion,
      localPromoError,
      localReady,
      isOpen,
      addItem,
      setQuantity,
      removeItem,
      clear,
      applyPromotion,
      clearPromotion,
      openCart,
      closeCart,
    ],
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within a CartProvider');
  return ctx;
}
