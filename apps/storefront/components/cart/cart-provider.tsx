'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import {
  type CartItem,
  type CartItemInput,
  addItem as addItemPure,
  cartCount,
  estimatedTotalMinor,
  type Promotion,
  removeItem as removeItemPure,
  resolvePromotion,
  setQuantity as setQuantityPure,
  subtotalMinor,
} from '@/lib/cart';

const STORAGE_KEY = 'tms.cart.v1';

interface CartContextValue {
  items: CartItem[];
  count: number;
  subtotalMinor: number;
  estimatedTotalMinor: number;
  promotion: Promotion | null;
  promoError: string | null;
  /** True once localStorage has hydrated (avoids SSR/client badge mismatch). */
  ready: boolean;
  isOpen: boolean;
  addItem: (input: CartItemInput) => void;
  setQuantity: (id: string, quantity: number) => void;
  removeItem: (id: string) => void;
  clear: () => void;
  applyPromotion: (code: string) => boolean;
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

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [promotion, setPromotion] = useState<Promotion | null>(null);
  const [promoError, setPromoError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [ready, setReady] = useState(false);

  // Hydrate from localStorage after mount so SSR markup stays stable.
  useEffect(() => {
    const stored = readStorage();
    setItems(stored.items);
    if (stored.promoCode) setPromotion(resolvePromotion(stored.promoCode));
    setReady(true);
  }, []);

  // Persist whenever the cart or promotion changes (post-hydration only).
  useEffect(() => {
    if (!ready) return;
    const payload: PersistedCart = { items, promoCode: promotion?.code ?? null };
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(payload));
    } catch {
      // Storage full or unavailable (private mode), cart still works in-session.
    }
  }, [items, promotion, ready]);

  const addItem = useCallback((input: CartItemInput) => {
    setItems((current) => addItemPure(current, input));
    setIsOpen(true);
  }, []);

  const setQuantity = useCallback((id: string, quantity: number) => {
    setItems((current) => setQuantityPure(current, id, quantity));
  }, []);

  const removeItem = useCallback((id: string) => {
    setItems((current) => removeItemPure(current, id));
  }, []);

  const clear = useCallback(() => {
    setItems([]);
    setPromotion(null);
    setPromoError(null);
  }, []);

  const applyPromotion = useCallback((code: string) => {
    const found = resolvePromotion(code);
    if (!found) {
      setPromoError(`We couldn't find the code "${code.trim()}".`);
      return false;
    }
    setPromotion(found);
    setPromoError(null);
    return true;
  }, []);

  const clearPromotion = useCallback(() => {
    setPromotion(null);
    setPromoError(null);
  }, []);

  const openCart = useCallback(() => setIsOpen(true), []);
  const closeCart = useCallback(() => setIsOpen(false), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: cartCount(items),
      subtotalMinor: subtotalMinor(items),
      estimatedTotalMinor: estimatedTotalMinor(items, promotion),
      promotion,
      promoError,
      ready,
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
      items,
      promotion,
      promoError,
      ready,
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
