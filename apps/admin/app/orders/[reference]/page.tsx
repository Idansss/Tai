import type { Metadata } from 'next';
import { OrderDetailView } from '@/components/order-detail-view';

export const metadata: Metadata = {
  title: 'Order',
  robots: { index: false, follow: false, nocache: true },
};

export default async function OrderDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = await params;
  return <OrderDetailView reference={decodeURIComponent(reference)} />;
}
