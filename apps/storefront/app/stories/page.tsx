import { PlaceholderPage } from '@/components/site/placeholder-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Stories',
  description: 'Notes from the studio: process, releases and collaborations.',
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Editorial"
      title="Stories"
      body="Notes from the studio: process, releases and collaborations."
      phase="F1"
    />
  );
}
