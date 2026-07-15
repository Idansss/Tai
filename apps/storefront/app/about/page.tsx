import { PlaceholderPage } from '@/components/site/placeholder-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description: 'An art-led brand where original drawings lead and garments follow.',
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Studio"
      title="About"
      body="An art-led brand where original drawings lead and garments follow."
      phase="F1"
    />
  );
}
