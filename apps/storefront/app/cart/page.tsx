import { Container, Eyebrow, Heading } from '@tms/ui';
import type { Metadata } from 'next';
import { CartView } from '@/components/cart/cart-view';

export const metadata: Metadata = {
  title: 'Your bag',
  description: 'Review the pieces in your bag, apply a promotion, and continue to checkout.',
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <Container className="py-10">
      <header className="mb-8">
        <Eyebrow>Bag</Eyebrow>
        <Heading as={1} size="display-lg" className="mt-2">
          Your bag
        </Heading>
      </header>
      <CartView />
    </Container>
  );
}
