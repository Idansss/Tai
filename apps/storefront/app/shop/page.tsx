import { PlaceholderPage } from '@/components/site/placeholder-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Shop',
  description: 'Garments carrying selected artwork, ready to order.',
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Shop"
      title="Shop"
      body="Garments carrying selected artwork, ready to order."
      phase="F1"
    />
  );
}
