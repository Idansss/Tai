import { PlaceholderPage } from '@/components/site/placeholder-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Delivery',
  description: 'Where we ship, how long it takes, and what it costs.',
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Help"
      title="Delivery"
      body="Where we ship, how long it takes, and what it costs."
      phase="F1"
    />
  );
}
