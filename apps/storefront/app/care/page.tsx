import { PlaceholderPage } from '@/components/site/placeholder-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Care',
  description: 'How to keep printed artwork looking its best.',
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Help"
      title="Care"
      body="How to keep printed artwork looking its best."
      phase="F1"
    />
  );
}
