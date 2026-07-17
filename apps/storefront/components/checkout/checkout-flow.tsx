'use client';

import { Alert, EmptyState, Heading, Price, Skeleton, Text, cn } from '@tms/ui';
import { Lock, ShoppingBag } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useAuth } from '@/components/account/auth-provider';
import { useCart } from '@/components/cart/cart-provider';
import { MadeToOrderNote } from '@/components/fulfilment/made-to-order-note';
import type { DeliveryOption } from '@/lib/data';
import {
  type CheckoutForm,
  type FieldErrors,
  type PaymentMethod,
  EMPTY_CHECKOUT_FORM,
  NIGERIAN_STATES,
  computeOrderTotals,
  validateCheckout,
} from '@/lib/checkout';
import { recordOrder } from '@/lib/account';
import { createOrderReference, type PlacedOrder, saveLastOrder } from '@/lib/order';

function Field({
  id,
  label,
  error,
  children,
  optional,
}: {
  id: string;
  label: string;
  error?: string;
  optional?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label htmlFor={id} className="block text-sm font-medium text-ink">
        {label}
        {optional ? <span className="ml-1 text-xs font-normal text-muted">(optional)</span> : null}
      </label>
      <div className="mt-1.5">{children}</div>
      {error ? (
        <p id={`${id}-error`} role="alert" className="mt-1 text-xs text-error">
          {error}
        </p>
      ) : null}
    </div>
  );
}

const inputClass =
  'h-11 w-full rounded-md border bg-canvas px-3 text-sm text-ink outline-none placeholder:text-muted focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';

export function CheckoutFlow({ deliveryOptions }: { deliveryOptions: DeliveryOption[] }) {
  const { items, ready, cart, promotion } = useCart();
  const { subtotalMinor, totalMinor: estimatedTotalMinor } = cart;
  const { user } = useAuth();
  const router = useRouter();
  const [form, setForm] = useState<CheckoutForm>(EMPTY_CHECKOUT_FORM);
  const [errors, setErrors] = useState<FieldErrors>({});
  const [submitting, setSubmitting] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const prefilled = useRef(false);

  // Prefill contact + recipient from the signed-in session (once, only empties).
  useEffect(() => {
    if (!user || prefilled.current) return;
    prefilled.current = true;
    setForm((f) => ({
      ...f,
      contact: { ...f.contact, email: f.contact.email || user.email },
      delivery: { ...f.delivery, fullName: f.delivery.fullName || user.name },
    }));
  }, [user]);

  const currency = items[0]?.currency ?? 'NGN';
  const discountMinor = subtotalMinor - estimatedTotalMinor;
  const selectedDelivery = deliveryOptions.find((o) => o.id === form.delivery.deliveryOptionId);
  const totals = useMemo(
    () =>
      computeOrderTotals({
        subtotalMinor,
        discountMinor,
        deliveryMinor: selectedDelivery?.priceMinor ?? 0,
      }),
    [subtotalMinor, discountMinor, selectedDelivery],
  );

  function setContact<K extends keyof CheckoutForm['contact']>(key: K, value: string) {
    setForm((f) => ({ ...f, contact: { ...f.contact, [key]: value } }));
  }
  function setDelivery<K extends keyof CheckoutForm['delivery']>(key: K, value: string) {
    setForm((f) => ({ ...f, delivery: { ...f.delivery, [key]: value } }));
  }

  function placeOrder(event: React.FormEvent) {
    event.preventDefault();
    const found = validateCheckout(form);
    setErrors(found);
    if (Object.keys(found).length > 0) {
      const firstKey = Object.keys(found)[0]?.split('.').pop();
      formRef.current?.querySelector<HTMLElement>(`#${firstKey}`)?.focus();
      return;
    }
    setSubmitting(true);
    const order: PlacedOrder = {
      reference: createOrderReference(),
      placedAt: new Date().toISOString(),
      currency,
      items,
      contact: form.contact,
      delivery: form.delivery,
      deliveryOptionLabel: selectedDelivery?.label ?? '',
      deliveryEta: selectedDelivery?.eta ?? '',
      paymentMethod: form.paymentMethod,
      totals,
      status: 'AWAITING_PAYMENT',
      paymentStatus: 'CREATED',
    };
    // Persist the order and hand off to the (mock) payment step. The bag is
    // kept until payment resolves so a failed payment can be retried. The order
    // is also recorded in account history (keyed by contact email) so it shows
    // under /account/orders regardless of sign-in state.
    saveLastOrder(order);
    recordOrder(order);
    router.push('/checkout/payment');
  }

  if (!ready) {
    return (
      <div className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <Skeleton className="h-96 w-full" />
        <Skeleton className="h-72 w-full" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <EmptyState
        icon={<ShoppingBag className="size-6" aria-hidden />}
        title="Your bag is empty"
        description="Add a piece to your bag before checking out."
        action={
          <Link
            href="/shop"
            className="inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]"
          >
            Browse the shop
          </Link>
        }
      />
    );
  }

  const err = (key: string) => errors[key];

  return (
    <form
      ref={formRef}
      onSubmit={placeOrder}
      noValidate
      className="grid gap-10 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start"
    >
      <div className="space-y-10">
        {/* Contact */}
        <section aria-labelledby="contact-heading">
          <Heading as={2} id="contact-heading" size="md">
            Contact
          </Heading>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <Field id="email" label="Email" error={err('contact.email')}>
              <input
                id="email"
                type="email"
                autoComplete="email"
                value={form.contact.email}
                onChange={(e) => setContact('email', e.target.value)}
                aria-invalid={err('contact.email') ? true : undefined}
                aria-describedby={err('contact.email') ? 'email-error' : undefined}
                className={cn(inputClass, err('contact.email') ? 'border-error' : 'border-line-2')}
              />
            </Field>
            <Field id="phone" label="Phone" error={err('contact.phone')}>
              <input
                id="phone"
                type="tel"
                autoComplete="tel"
                placeholder="0803 000 0000"
                value={form.contact.phone}
                onChange={(e) => setContact('phone', e.target.value)}
                aria-invalid={err('contact.phone') ? true : undefined}
                aria-describedby={err('contact.phone') ? 'phone-error' : undefined}
                className={cn(inputClass, err('contact.phone') ? 'border-error' : 'border-line-2')}
              />
            </Field>
          </div>
        </section>

        {/* Delivery address */}
        <section aria-labelledby="address-heading">
          <Heading as={2} id="address-heading" size="md">
            Delivery address
          </Heading>
          <div className="mt-4 grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <Field id="fullName" label="Full name" error={err('delivery.fullName')}>
                <input
                  id="fullName"
                  autoComplete="name"
                  value={form.delivery.fullName}
                  onChange={(e) => setDelivery('fullName', e.target.value)}
                  aria-invalid={err('delivery.fullName') ? true : undefined}
                  aria-describedby={err('delivery.fullName') ? 'fullName-error' : undefined}
                  className={cn(
                    inputClass,
                    err('delivery.fullName') ? 'border-error' : 'border-line-2',
                  )}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field id="addressLine1" label="Street address" error={err('delivery.addressLine1')}>
                <input
                  id="addressLine1"
                  autoComplete="address-line1"
                  value={form.delivery.addressLine1}
                  onChange={(e) => setDelivery('addressLine1', e.target.value)}
                  aria-invalid={err('delivery.addressLine1') ? true : undefined}
                  aria-describedby={err('delivery.addressLine1') ? 'addressLine1-error' : undefined}
                  className={cn(
                    inputClass,
                    err('delivery.addressLine1') ? 'border-error' : 'border-line-2',
                  )}
                />
              </Field>
            </div>
            <div className="sm:col-span-2">
              <Field id="addressLine2" label="Apartment, suite, etc." optional>
                <input
                  id="addressLine2"
                  autoComplete="address-line2"
                  value={form.delivery.addressLine2}
                  onChange={(e) => setDelivery('addressLine2', e.target.value)}
                  className={cn(inputClass, 'border-line-2')}
                />
              </Field>
            </div>
            <Field id="city" label="City / town" error={err('delivery.city')}>
              <input
                id="city"
                autoComplete="address-level2"
                value={form.delivery.city}
                onChange={(e) => setDelivery('city', e.target.value)}
                aria-invalid={err('delivery.city') ? true : undefined}
                aria-describedby={err('delivery.city') ? 'city-error' : undefined}
                className={cn(inputClass, err('delivery.city') ? 'border-error' : 'border-line-2')}
              />
            </Field>
            <Field id="state" label="State" error={err('delivery.state')}>
              <select
                id="state"
                autoComplete="address-level1"
                value={form.delivery.state}
                onChange={(e) => setDelivery('state', e.target.value)}
                aria-invalid={err('delivery.state') ? true : undefined}
                aria-describedby={err('delivery.state') ? 'state-error' : undefined}
                className={cn(inputClass, err('delivery.state') ? 'border-error' : 'border-line-2')}
              >
                <option value="">Select a state…</option>
                {NIGERIAN_STATES.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
            </Field>
          </div>
        </section>

        {/* Delivery method */}
        <section aria-labelledby="delivery-heading">
          <Heading as={2} id="delivery-heading" size="md">
            Delivery method
          </Heading>
          {err('delivery.deliveryOptionId') ? (
            <p role="alert" className="mt-2 text-xs text-error">
              {err('delivery.deliveryOptionId')}
            </p>
          ) : null}
          <fieldset className="mt-4 space-y-3">
            <legend className="sr-only">Choose a delivery method</legend>
            {deliveryOptions.map((option) => (
              <label
                key={option.id}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-4 transition-colors',
                  form.delivery.deliveryOptionId === option.id
                    ? 'border-[var(--color-accent-primary)] bg-canvas-2'
                    : 'border-line-2 hover:bg-canvas-2',
                )}
              >
                <input
                  type="radio"
                  name="deliveryOption"
                  value={option.id}
                  checked={form.delivery.deliveryOptionId === option.id}
                  onChange={() => setDelivery('deliveryOptionId', option.id)}
                  className="mt-1 accent-[var(--color-accent-primary)]"
                />
                <span className="flex-1">
                  <span className="flex items-center justify-between gap-3">
                    <span className="text-sm font-medium text-ink">{option.label}</span>
                    <span className="text-sm text-ink">
                      {option.priceMinor === 0 ? (
                        'Free'
                      ) : (
                        <Price amountMinor={option.priceMinor} currency={option.currency} />
                      )}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-xs text-muted">{option.description}</span>
                  <span className="mt-0.5 block text-xs text-ink-2">{option.eta}</span>
                </span>
              </label>
            ))}
          </fieldset>
        </section>

        {/* Payment */}
        <section aria-labelledby="payment-heading">
          <Heading as={2} id="payment-heading" size="md">
            Payment
          </Heading>
          <fieldset className="mt-4 space-y-3">
            <legend className="sr-only">Choose a payment method</legend>
            {(
              [
                ['card', 'Card', 'Pay securely by debit or credit card via Flutterwave.'],
                ['transfer', 'Bank transfer', 'Pay by instant bank transfer via Flutterwave.'],
              ] as [PaymentMethod, string, string][]
            ).map(([value, label, description]) => (
              <label
                key={value}
                className={cn(
                  'flex cursor-pointer items-start gap-3 rounded-[var(--radius-md)] border p-4 transition-colors',
                  form.paymentMethod === value
                    ? 'border-[var(--color-accent-primary)] bg-canvas-2'
                    : 'border-line-2 hover:bg-canvas-2',
                )}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value={value}
                  checked={form.paymentMethod === value}
                  onChange={() => setForm((f) => ({ ...f, paymentMethod: value }))}
                  className="mt-1 accent-[var(--color-accent-primary)]"
                />
                <span className="flex-1">
                  <span className="block text-sm font-medium text-ink">{label}</span>
                  <span className="mt-0.5 block text-xs text-muted">{description}</span>
                </span>
              </label>
            ))}
          </fieldset>
          <Alert tone="info" title="Test checkout" className="mt-4">
            This is a preview checkout — placing the order records it but does not take payment.
            Secure Flutterwave payment and success/pending/failure states arrive in the next
            release.
          </Alert>
        </section>
      </div>

      {/* Order summary */}
      <aside
        aria-label="Order summary"
        className="rounded-[var(--radius-lg)] border border-line bg-canvas-2 p-5 lg:sticky lg:top-24"
      >
        <Heading as={2} size="md" className="mb-4">
          Order summary
        </Heading>
        <ul className="mb-4 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <span className="min-w-0">
                <span className="block truncate text-ink">{item.artworkTitle}</span>
                <span className="block text-xs text-muted">
                  {item.garment} · {item.colour} · {item.size} · ×{item.quantity}
                </span>
              </span>
              <Price
                amountMinor={item.priceMinor * item.quantity}
                currency={currency}
                className="shrink-0 text-ink"
              />
            </li>
          ))}
        </ul>

        <dl className="space-y-1.5 border-t border-line pt-4 text-sm">
          <div className="flex items-center justify-between">
            <dt className="text-muted">Subtotal</dt>
            <dd className="text-ink">
              <Price amountMinor={totals.subtotalMinor} currency={currency} />
            </dd>
          </div>
          {totals.discountMinor > 0 ? (
            <div className="flex items-center justify-between text-accent">
              <dt>Promotion{promotion ? ` · ${promotion.code}` : ''}</dt>
              <dd>
                −<Price amountMinor={totals.discountMinor} currency={currency} />
              </dd>
            </div>
          ) : null}
          <div className="flex items-center justify-between">
            <dt className="text-muted">Delivery</dt>
            <dd className="text-ink">
              {selectedDelivery ? (
                totals.deliveryMinor === 0 ? (
                  'Free'
                ) : (
                  <Price amountMinor={totals.deliveryMinor} currency={currency} />
                )
              ) : (
                <span className="text-muted">Choose a method</span>
              )}
            </dd>
          </div>
          <div className="flex items-center justify-between">
            <dt className="text-muted">VAT (7.5%)</dt>
            <dd className="text-ink">
              <Price amountMinor={totals.taxMinor} currency={currency} />
            </dd>
          </div>
          <div className="flex items-center justify-between border-t border-line pt-2 text-base font-medium">
            <dt className="text-ink">Total</dt>
            <dd className="text-ink">
              <Price amountMinor={totals.totalMinor} currency={currency} />
            </dd>
          </div>
        </dl>

        <MadeToOrderNote className="mt-5" />

        <button
          type="submit"
          disabled={submitting}
          className="mt-5 inline-flex h-12 w-full items-center justify-center gap-2 rounded-md bg-accent text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)] disabled:cursor-not-allowed disabled:opacity-60"
        >
          <Lock className="size-4" aria-hidden />
          {submitting ? 'Placing order…' : 'Place order'}
        </button>
        <Text size="sm" tone="muted" className="mt-3 text-center">
          <Link href="/cart" className="underline-offset-2 hover:underline">
            Back to bag
          </Link>
        </Text>
      </aside>
    </form>
  );
}
