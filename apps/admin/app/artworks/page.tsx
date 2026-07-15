import type { Metadata } from 'next';
import { SectionPlaceholder } from '@/components/section-placeholder';

export const metadata: Metadata = { title: 'Artworks' };

export default function ArtworksPage() {
  return (
    <SectionPlaceholder
      eyebrow="Catalogue"
      title="Artwork manager"
      description="Upload artwork, track processing and validation, manage story, tags, collections and versions, approve mockups, and publish, schedule or archive."
      task="TMS-F4-003"
    />
  );
}
