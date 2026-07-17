import { Container } from '@tms/ui';
import type { Metadata } from 'next';
import { CartView } from '@/components/cart/cart-view';
import { PageHeader } from '@/components/site/page-header';

export const metadata: Metadata = {
  title: 'Your bag',
  description: 'Review the pieces in your bag, apply a promotion, and continue to checkout.',
  robots: { index: false, follow: false },
};

export default function CartPage() {
  return (
    <Container className="py-10">
      <div className="mb-8">
        <PageHeader eyebrow="Bag" title="Your bag" contained={false} />
      </div>
      <CartView />
    </Container>
  );
}
