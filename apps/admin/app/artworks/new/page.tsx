import type { Metadata } from 'next';
import { ArtworkUpload } from '@/components/artwork-upload';

export const metadata: Metadata = {
  title: 'New artwork',
  robots: { index: false, follow: false, nocache: true },
};

export default function NewArtworkPage() {
  return <ArtworkUpload />;
}
