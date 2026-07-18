'use client';

import { Price } from '@tms/ui';
import { Tag, X } from 'lucide-react';
import { useId, useState } from 'react';
import { MadeToOrderNote } from '@/components/fulfilment/made-to-order-note';
import { useCart } from './cart-provider';

/** Promotion entry + subtotal/total breakdown, shared by the drawer and page. */
export function CartSummary({ onCheckout }: { onCheckout?: () => void }) {
  const { cart, promoError, promoNotice, applyPromotion, clearPromotion } = useCart();
  const [code, setCode] = useState('');
  const inputId = useId();
  // Money comes from the cart view. When that is the server's cart these are the server's
  // numbers, and unavailable lines are already out of the subtotal — we do not re-add them up.
  const { subtotalMinor, totalMinor, currency, hasIssues } = cart;
  const promotion = cart.promotion;
  const discount = promotion?.discountMinor ?? 0;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    void applyPromotion(code);
    setCode('');
  }

  return (
    <div className="space-y-4">
      {/* Promotion */}
      {promotion ? (
        <div className="flex items-center justify-between rounded-md border border-line-2 bg-canvas-2 px-3 py-2">
          <span className="inline-flex items-center gap-2 text-sm text-ink">
            <Tag className="size-4 text-accent" aria-hidden />
            <span className="font-medium">{promotion.code}</span>
            <span className="text-muted">· {promotion.label}</span>
          </span>
          <button
            type="button"
            onClick={clearPromotion}
            className="grid size-7 place-items-center rounded-sm text-muted outline-none hover:text-ink focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            aria-label={`Remove promotion ${promotion.code}`}
          >
            <X className="size-4" aria-hidden />
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-1">
          <label
            htmlFor={inputId}
            className="text-xs font-medium uppercase tracking-[0.08em] text-muted"
          >
            Promotion code
          </label>
          <div className="flex gap-2">
            <input
              id={inputId}
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder="e.g. STUDIO10"
              autoComplete="off"
              aria-invalid={promoError ? true : undefined}
              aria-describedby={promoError ? `${inputId}-error` : undefined}
              className="h-10 flex-1 rounded-md border border-line-2 bg-canvas px-3 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            />
            <button
              type="submit"
              className="h-10 rounded-md border border-line-2 px-4 text-sm font-medium text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
            >
              Apply
            </button>
          </div>
          {promoError ? (
            <p id={`${inputId}-error`} role="alert" className="text-xs text-error">
              {promoError}
            </p>
          ) : null}
          {/* A valid code that does not qualify is information, not a failure — so it is not
              styled or announced as an error. */}
          {promoNotice ? (
            <p role="status" className="text-xs text-muted">
              {promoNotice}
            </p>
          ) : null}
        </form>
      )}

      {/* Breakdown */}
      <dl className="space-y-1.5 border-t border-line pt-4 text-sm">
        <div className="flex items-center justify-between">
          <dt className="text-muted">Subtotal</dt>
          <dd className="text-ink">
            <Price amountMinor={subtotalMinor} currency={currency} />
          </dd>
        </div>
        {discount > 0 ? (
          <div className="flex items-center justify-between text-accent">
            <dt>Promotion</dt>
            <dd>
              −<Price amountMinor={discount} currency={currency} />
            </dd>
          </div>
        ) : null}
        <div className="flex items-center justify-between">
          <dt className="text-muted">Delivery &amp; tax</dt>
          <dd className="text-muted">Calculated at checkout</dd>
        </div>
        <div className="flex items-center justify-between border-t border-line pt-2 text-base font-medium">
          <dt className="text-ink">Estimated total</dt>
          <dd className="text-ink">
            <Price amountMinor={totalMinor} currency={currency} />
          </dd>
        </div>
      </dl>

      <MadeToOrderNote />

      {/* Checkout must refuse while any line has an issue. */}
      {hasIssues ? (
        <p
          role="alert"
          className="rounded-md border border-line-2 bg-canvas-2 p-3 text-xs text-ink"
        >
          Some items are no longer available. Remove them, or reduce the quantity where it says so,
          to continue to checkout.
        </p>
      ) : null}

      <button
        type="button"
        onClick={onCheckout}
        disabled={hasIssues}
        aria-describedby={hasIssues ? `${inputId}-blocked` : undefined}
        className="inline-flex h-12 w-full items-center justify-center rounded-full bg-neutral-950 text-sm font-semibold uppercase tracking-[0.08em] text-white outline-none hover:bg-neutral-800 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:bg-disabled disabled:text-disabled-ink disabled:hover:bg-disabled"
      >
        Checkout
      </button>
      {hasIssues ? (
        <p id={`${inputId}-blocked`} className="sr-only">
          Checkout is unavailable until every item in your bag can be bought.
        </p>
      ) : null}
      <p className="text-center text-xs text-muted">
        Secure checkout · delivery and tax confirmed before payment.
      </p>
    </div>
  );
}
