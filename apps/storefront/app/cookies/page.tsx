import { PlaceholderPage } from '@/components/site/placeholder-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Cookie policy',
  description: 'How we use cookies and how to control them.',
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Legal"
      title="Cookie policy"
      body="How we use cookies and how to control them."
      phase="F1"
    />
  );
}
