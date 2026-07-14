import { PlaceholderPage } from '@/components/site/placeholder-page';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'The artist',
  description: 'The hand behind the work, the process, and the ideas.',
};

export default function Page() {
  return (
    <PlaceholderPage
      eyebrow="Studio"
      title="The artist"
      body="The hand behind the work, the process, and the ideas."
      phase="F1"
    />
  );
}
