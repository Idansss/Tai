import type { Metadata } from 'next';
import { ArtworksView } from '@/components/artworks-view';

export const metadata: Metadata = { title: 'Artworks' };

export default function ArtworksPage() {
  return <ArtworksView />;
}
