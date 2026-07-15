import { Container } from '@tms/ui';
import type { Metadata } from 'next';
import { OrderDetail } from '@/components/account/order-detail';

export const metadata: Metadata = {
  title: 'Order',
  description: 'Order detail and tracking.',
  robots: { index: false, follow: false },
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return (
    <Container className="py-10">
      <OrderDetail reference={decodeURIComponent(reference)} />
    </Container>
  );
}
