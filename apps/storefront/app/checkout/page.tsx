import { Container, Eyebrow, Heading } from '@tms/ui';
import type { Metadata } from 'next';
import { CheckoutPlaceholder } from '@/components/cart/checkout-placeholder';

export const metadata: Metadata = {
  title: 'Checkout',
  description: 'Review your order and continue to secure payment.',
  robots: { index: false, follow: false },
};

export default function CheckoutPage() {
  return (
    <Container className="py-10">
      <header className="mb-8">
        <Eyebrow>Checkout</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          Checkout
        </Heading>
      </header>
      <CheckoutPlaceholder />
    </Container>
  );
}
