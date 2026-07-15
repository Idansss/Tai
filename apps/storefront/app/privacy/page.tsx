import { PlaceholderPage } from '@/components/site/placeholder-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Privacy policy',
  description: 'How we handle personal data and your choices.',
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Legal"
      title="Privacy policy"
      body="How we handle personal data and your choices."
      phase="F1"
    />
  );
}
