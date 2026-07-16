import { Container } from '@tms/ui';
import type { Metadata } from 'next';
import { OrderConfirmation } from '@/components/checkout/order-confirmation';

export const metadata: Metadata = {
  title: 'Order received',
  description: 'Your order confirmation.',
  robots: { index: false, follow: false },
};

export default function CheckoutSuccessPage() {
  return (
    <Container className="py-10">
      <OrderConfirmation />
    </Container>
  );
}
