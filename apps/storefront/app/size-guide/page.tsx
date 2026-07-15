import { PlaceholderPage } from '@/components/site/placeholder-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Size guide',
  description: 'Measurements and fit guidance for every garment.',
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Help"
      title="Size guide"
      body="Measurements and fit guidance for every garment."
      phase="F1"
    />
  );
}
