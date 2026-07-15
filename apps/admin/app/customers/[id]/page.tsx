import type { Metadata } from 'next';
import { CustomerDetailView } from '@/components/customer-detail-view';

export const metadata: Metadata = {
  title: 'Customer',
  robots: { index: false, follow: false, nocache: true },
};

export default async function CustomerDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CustomerDetailView id={decodeURIComponent(id)} />;
}
