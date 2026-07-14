import { PlaceholderPage } from '@/components/site/placeholder-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Returns',
  description: 'How returns and exchanges work, and what is eligible.',
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Help"
      title="Returns"
      body="How returns and exchanges work, and what is eligible."
      phase="F1"
    />
  );
}
