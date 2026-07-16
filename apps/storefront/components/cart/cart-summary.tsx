'use client';

import { Price } from '@tms/ui';
import { Tag, X } from 'lucide-react';
import { useId, useState } from 'react';
import { useAuth } from '@/components/account/auth-provider';
import { MadeToOrderNote } from '@/components/fulfilment/made-to-order-note';
import { useCart } from './cart-provider';

/** Promotion entry + subtotal/total breakdown, shared by the drawer and page. */
export function CartSummary({ onCheckout }: { onCheckout?: () => void }) {
  const { user } = useAuth();
  const {
    items,
    subtotalMinor,
    estimatedTotalMinor,
    promotion,
    promoError,
    applyPromotion,
    clearPromotion,
  } = useCart();
  const [code, setCode] = useState('');
  const inputId = useId();
  const currency = items[0]?.currency ?? 'NGN';
  const discount = subtotalMinor - estimatedTotalMinor;

  function onSubmit(event: React.FormEvent) {
    event.preventDefault();
    if (!code.trim()) return;
    if (applyPromotion(code)) setCode('');
  }

  return (
    <div className="space-y-4">
      {/* Promotion */}
      {promotion ? (
        <div className="flex items-center justify-between rounded-md border border-line-2 bg-canvas-2 px-3 py-2">
          <span className="inline-flex items-center gap-2 text-sm text-ink">
            <Tag className="size-4 text-accent-2" aria-hidden />
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
            className="font-mono text-xs uppercase tracking-[0.12em] text-muted"
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
          <div className="flex items-center justify-between text-accent-2">
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
            <Price amountMinor={estimatedTotalMinor} currency={currency} />
          </dd>
        </div>
      </dl>

      <MadeToOrderNote />

      <button
        type="button"
        onClick={onCheckout}
        className="inline-flex h-12 w-full items-center justify-center rounded-md bg-accent text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
      >
        {user ? 'Checkout' : 'Sign in to check out'}
      </button>
      <p className="text-center text-xs text-muted">
        {user
          ? 'Secure checkout · delivery and tax confirmed before payment.'
          : 'Your bag is saved — sign in and you’ll come right back to it.'}
      </p>
    </div>
  );
}
