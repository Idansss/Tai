import { PlaceholderPage } from '@/components/site/placeholder-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Design Studio',
  description: 'Choose an artwork, garment, colour, size and placement with a live preview.',
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Interactive"
      title="Design Studio"
      body="Choose an artwork, garment, colour, size and placement with a live preview."
      phase="F2"
    />
  );
}
