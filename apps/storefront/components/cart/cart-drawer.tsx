'use client';

import { IconButton } from '@tms/ui';
import { ShoppingBag, X } from 'lucide-react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type MouseEvent, useCallback, useEffect, useRef } from 'react';
import { PillLink } from '@/components/site/pill-link';
import { CartLineList } from './cart-line-list';
import { CartSummary } from './cart-summary';
import { useCart } from './cart-provider';

/**
 * Slide-over cart built on the native <dialog> element (focus trap, Esc-close,
 * inert background). Open state lives in the cart context so any "add to bag"
 * can open it. Body scroll is locked while open.
 */
export function CartDrawer() {
  // Lines come from the cart view: the local items array is always empty in server mode.
  const { cart, count, isOpen, closeCart } = useCart();
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const pathname = usePathname();

  // Reflect context open state onto the dialog element.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) {
      dialog.showModal();
      document.body.style.overflow = 'hidden';
    } else if (!isOpen && dialog.open) {
      dialog.close();
    }
  }, [isOpen]);

  // Keep context in sync when the dialog closes by any means (Esc, backdrop).
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    const onClose = () => {
      document.body.style.overflow = '';
      closeCart();
    };
    dialog.addEventListener('close', onClose);
    return () => dialog.removeEventListener('close', onClose);
  }, [closeCart]);

  // Close when navigating away.
  useEffect(() => {
    closeCart();
  }, [pathname, closeCart]);

  const onDialogClick = useCallback(
    (event: MouseEvent<HTMLDialogElement>) => {
      if (event.target === dialogRef.current) closeCart();
    },
    [closeCart],
  );

  const goToCheckout = useCallback(() => {
    closeCart();
    router.push('/checkout');
  }, [closeCart, router]);

  return (
    <dialog
      ref={dialogRef}
      aria-label="Shopping bag"
      onClick={onDialogClick}
      className="tms-slideover m-0 ml-auto h-dvh max-h-none w-[min(28rem,92vw)] max-w-none bg-canvas p-0 text-ink open:flex open:flex-col"
    >
      <div className="flex h-16 shrink-0 items-center justify-between border-b border-line bg-canvas/90 px-5 backdrop-blur">
        <h2 className="font-display text-sm font-bold uppercase tracking-[0.12em] text-ink">
          Your bag{count > 0 ? ` · ${count}` : ''}
        </h2>
        <IconButton
          label="Close bag"
          icon={<X className="size-5" aria-hidden />}
          onClick={closeCart}
        />
      </div>

      {cart.lines.length === 0 ? (
        <div className="flex flex-1 flex-col items-center justify-center gap-6 px-6 text-center">
          <ShoppingBag className="size-8 text-ink" aria-hidden />
          <div className="max-w-xs">
            <p className="font-display text-xs font-semibold uppercase tracking-[0.2em] text-muted">
              Shopping bag
            </p>
            <h3 className="mt-3 font-display text-3xl font-bold uppercase leading-[0.95] tracking-tight text-ink">
              Empty for now
            </h3>
            <p className="mt-4 text-sm leading-relaxed text-muted">
              Explore the gallery or design your own piece in the studio.
            </p>
          </div>
          <PillLink href="/design-studio">Design studio</PillLink>
          <Link
            href="/artworks"
            onClick={closeCart}
            className="text-xs font-medium uppercase tracking-[0.08em] text-muted underline-offset-4 outline-none hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            Browse artworks
          </Link>
        </div>
      ) : (
        <>
          <div className="min-h-0 flex-1 overflow-y-auto px-5">
            <CartLineList compact />
          </div>
          <div className="shrink-0 border-t border-line p-5">
            <CartSummary onCheckout={goToCheckout} />
            <Link
              href="/cart"
              onClick={closeCart}
              className="mt-3 block rounded-sm text-center text-xs font-medium uppercase tracking-[0.08em] text-muted underline-offset-4 outline-none hover:text-ink hover:underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              View full bag
            </Link>
          </div>
        </>
      )}
    </dialog>
  );
}
