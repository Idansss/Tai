import { Container } from '@tms/ui';
import type { Metadata } from 'next';
import { OrdersList } from '@/components/account/orders-list';

export const metadata: Metadata = {
  title: 'Your orders',
  description: 'Track and revisit your orders.',
  robots: { index: false, follow: false },
};

export default function OrdersPage() {
  return (
    <Container className="py-10">
      <OrdersList />
    </Container>
  );
}
