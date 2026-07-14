'use client';

import { Alert, EmptyState, Heading, Spinner, Text } from '@tms/ui';
import { Clock, Package, XCircle } from 'lucide-react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import { useCart } from '@/components/cart/cart-provider';
import {
  type PaymentOutcome,
  outcomeToStatuses,
  parseOutcome,
  shouldClearCart,
} from '@/lib/payment';
import { readLastOrder, updateLastOrder } from '@/lib/order';

type Phase = 'loading' | 'processing' | 'pending' | 'failure' | 'no-order';

const primaryLink =
  'inline-flex h-11 items-center justify-center rounded-md bg-accent px-5 text-sm font-medium text-on-accent outline-none hover:brightness-110 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';
const secondaryLink =
  'inline-flex h-11 items-center justify-center rounded-md border border-line-2 px-5 text-sm font-medium text-ink outline-none hover:bg-canvas-2 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[var(--color-focus-ring)]';

export function PaymentProcessing() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { clear } = useCart();
  const [phase, setPhase] = useState<Phase>('loading');
  const [reference, setReference] = useState('');
  const [email, setEmail] = useState('');
  const resolvedRef = useRef(false);

  useEffect(() => {
    const order = readLastOrder();
    if (!order) {
      setPhase('no-order');
      return;
    }
    setReference(order.reference);
    setEmail(order.contact.email);
    setPhase('processing');

    const outcome: PaymentOutcome = parseOutcome(searchParams.get('outcome'));
    // Simulate the provider round-trip, then resolve exactly once.
    const timer = setTimeout(() => {
      if (resolvedRef.current) return;
      resolvedRef.current = true;
      const statuses = outcomeToStatuses(outcome);
      updateLastOrder({ status: statuses.order, paymentStatus: statuses.payment });
      if (shouldClearCart(outcome)) clear();
      if (outcome === 'success') {
        router.replace('/checkout/success');
      } else {
        setPhase(outcome);
      }
    }, 1900);

    return () => clearTimeout(timer);
  }, [router, searchParams, clear]);

  if (phase === 'loading' || phase === 'processing') {
    return (
      <div
        className="flex min-h-[50vh] flex-col items-center justify-center gap-4 text-center"
        role="status"
        aria-live="polite"
      >
        <Spinner className="size-8 text-accent" aria-hidden />
        <div>
          <Heading as={1} size="md">
            Processing payment
          </Heading>
          <Text tone="muted" className="mt-1">
            Confirming with the payment provider. Please don’t close or refresh this window.
          </Text>
        </div>
      </div>
    );
  }

  if (phase === 'no-order') {
    return (
      <EmptyState
        icon={<Package className="size-6" aria-hidden />}
        title="No payment in progress"
        description="Start a checkout to make a payment."
        action={
          <Link href="/cart" className={primaryLink}>
            Go to your bag
          </Link>
        }
      />
    );
  }

  if (phase === 'pending') {
    return (
      <div className="max-w-xl space-y-6" role="status" aria-live="polite">
        <div className="flex items-start gap-3">
          <Clock className="mt-0.5 size-7 shrink-0 text-[var(--color-warning)]" aria-hidden />
          <div>
            <Heading as={1} size="display-lg">
              Payment pending
            </Heading>
            <Text tone="secondary" className="mt-1">
              We’re confirming your bank transfer for order{' '}
              <span className="font-medium text-ink">{reference}</span>. This can take a few minutes
              — we’ll email {email} as soon as it clears. Nothing more is needed from you.
            </Text>
          </div>
        </div>
        <Alert tone="info" title="Preview build">
          Payment is simulated here — no real transfer was made. Live confirmation arrives with the
          payment integration.
        </Alert>
        <div className="flex flex-wrap gap-3">
          <Link href="/shop" className={primaryLink}>
            Continue shopping
          </Link>
          <Link href="/" className={secondaryLink}>
            Back to home
          </Link>
        </div>
      </div>
    );
  }

  // phase === 'failure'
  return (
    <div className="max-w-xl space-y-6" role="alert">
      <div className="flex items-start gap-3">
        <XCircle className="mt-0.5 size-7 shrink-0 text-[var(--color-error)]" aria-hidden />
        <div>
          <Heading as={1} size="display-lg">
            Payment unsuccessful
          </Heading>
          <Text tone="secondary" className="mt-1">
            We couldn’t complete your payment for order{' '}
            <span className="font-medium text-ink">{reference}</span> and{' '}
            <strong className="text-ink">no charge was made</strong>. Your bag has been kept so you
            can try again.
          </Text>
        </div>
      </div>
      <div className="flex flex-wrap gap-3">
        <Link href="/checkout/payment" className={primaryLink}>
          Try payment again
        </Link>
        <Link href="/cart" className={secondaryLink}>
          Back to your bag
        </Link>
      </div>
    </div>
  );
}
