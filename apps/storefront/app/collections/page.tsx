import { PlaceholderPage } from '@/components/site/placeholder-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Collections',
  description: 'Curated bodies of work, grouped by theme and season.',
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Gallery"
      title="Collections"
      body="Curated bodies of work, grouped by theme and season."
      phase="F1"
    />
  );
}
