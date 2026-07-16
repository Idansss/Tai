import { Container } from '@tms/ui';
import type { Metadata } from 'next';
import { CartView } from '@/components/cart/cart-view';
import { PageHeading } from '@/components/site/page-heading';

export const metadata: Metadata = {
  title: 'Your bag',
  description: 'Review the pieces in your bag, apply a promotion, and continue to checkout.',
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <Container width="wide" className="py-10 sm:py-12">
      <div className="mb-8">
        <PageHeading eyebrow="Bag" title="Your bag" />
      </div>
      <CartView />
    </Container>
  );
}
