import { Container, Spinner } from '@tms/ui';
import type { Metadata } from 'next';
import { Suspense } from 'react';
import { PaymentProcessing } from '@/components/checkout/payment-processing';

export const metadata: Metadata = {
  title: 'Payment',
  description: 'Completing your payment.',
  robots: { index: false, follow: false },
};

export default function CheckoutPaymentPage() {
  return (
    <Container className="py-10">
      <Suspense
        fallback={
          <div className="flex min-h-[50vh] items-center justify-center">
            <Spinner className="size-8 text-accent" />
          </div>
        }
      >
        <PaymentProcessing />
      </Suspense>
    </Container>
  );
}
