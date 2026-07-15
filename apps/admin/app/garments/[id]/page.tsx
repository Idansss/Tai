import type { Metadata } from 'next';
import { GarmentDetailView } from '@/components/garment-detail-view';

export const metadata: Metadata = {
  title: 'Garment',
  robots: { index: false, follow: false, nocache: true },
};

export default async function GarmentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <GarmentDetailView id={decodeURIComponent(id)} />;
}
