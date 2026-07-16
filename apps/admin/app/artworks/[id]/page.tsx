import type { Metadata } from 'next';
import { ArtworkDetailView } from '@/components/artwork-detail-view';

export const metadata: Metadata = {
  title: 'Artwork',
  robots: { index: false, follow: false, nocache: true },
};

export default async function ArtworkDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ArtworkDetailView id={decodeURIComponent(id)} />;
}
